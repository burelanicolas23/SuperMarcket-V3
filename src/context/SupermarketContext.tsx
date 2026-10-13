import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import {
  Product,
  Supplier,
  Sale,
  InventoryMovement,
  StoreSettings,
  defaultSettings,
} from '../models';
import {
  StorageService,
  ProductService,
  SalesService,
  InventoryService,
  SupplierService,
  StockAdjustmentInput,
  CreateSaleInput,
} from '../services';
import { CloudSyncService } from '../services/cloudSyncService';
import { scannerAudio } from '../lib/scannerAudio';
import { useAuth } from './AuthContext';

export type SectionId =
  | 'inicio'
  | 'caja'
  | 'productos'
  | 'stock'
  | 'faltantes'
  | 'proveedores'
  | 'reportes'
  | 'configuracion';

export interface ToastNotification {
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
  title?: string;
}

export interface CartItem {
  product: Product;
  quantity: number;
}

interface SupermarketContextType {
  // Navigation
  activeSection: SectionId;
  setActiveSection: (section: SectionId) => void;

  // Data
  products: Product[];
  suppliers: Supplier[];
  sales: Sale[];
  movements: InventoryMovement[];
  settings: StoreSettings;

  // Shared Cart State for POS & Scanner
  cart: CartItem[];
  addToCart: (product: Product, quantity?: number) => boolean;
  addToCartByCode: (code: string) => boolean;
  updateCartQuantity: (productId: string, delta: number) => void;
  removeFromCart: (productId: string) => void;
  clearCart: () => void;

  // Sound preference
  soundEnabled: boolean;
  setSoundEnabled: (enabled: boolean) => void;

  // Metrics
  todaySalesTotal: number;
  todaySalesCount: number;
  todayItemsCount: number;
  totalProductsCount: number;
  lowStockCount: number;
  outOfStockCount: number;
  missingProducts: Product[];
  lowStockProducts: Product[];
  outOfStockProducts: Product[];
  recentSales: Sale[];

  // Core Actions
  addProduct: (product: Omit<Product, 'id' | 'status' | 'createdAt' | 'updatedAt'>) => Product;
  updateProduct: (product: Omit<Product, 'status' | 'createdAt' | 'updatedAt'> & { id: string }) => Product;
  deleteProduct: (id: string) => void;
  registerSale: (input: CreateSaleInput) => Promise<Sale>;
  cancelSale: (saleId: string, reason: string) => void;
  adjustStock: (input: StockAdjustmentInput) => void;
  addSupplier: (supplier: Omit<Supplier, 'id' | 'createdAt'>) => Supplier;
  updateSupplier: (supplier: Omit<Supplier, 'createdAt'> & { id: string }) => Supplier;
  deleteSupplier: (id: string) => void;
  updateSettings: (newSettings: Partial<StoreSettings>) => void;
  importBackupData: (json: string) => boolean;
  refreshAllData: () => void;

  // Missing Products & Replenishment actions
  toggleManualMissing: (productId: string, isMissing: boolean) => void;
  updateOrderStatus: (productId: string, orderStatus: 'pendiente' | 'solicitado' | 'recibido') => void;
  bulkUpdateOrderStatus: (productIds: string[], orderStatus: 'pendiente' | 'solicitado' | 'recibido') => void;
  updateCustomReplenishQty: (productId: string, qty: number) => void;
  receiveStockOrder: (items: { productId: string; quantity: number }[], notes?: string) => void;

  // Toast
  notification: ToastNotification | null;
  showNotification: (type: 'success' | 'error' | 'warning' | 'info', message: string, title?: string) => void;
  clearNotification: () => void;

  // Multi-PC & Cloud Sync Status
  activeTerminalsCount: number;
  isCloudConnected: boolean;
  triggerCloudSync: () => Promise<void>;

  // Interactive Modals
  isProductModalOpen: boolean;
  selectedProductForEdit: Product | null;
  scannedCodeForRegistration: string | null;
  openProductModal: (product?: Product) => void;
  openProductModalWithCode: (code: string) => void;
  closeProductModal: () => void;

  isStockModalOpen: boolean;
  selectedProductForStock: Product | null;
  openStockModal: (product?: Product) => void;
  closeStockModal: () => void;

  isSupplierModalOpen: boolean;
  selectedSupplierForEdit: Supplier | null;
  openSupplierModal: (supplier?: Supplier) => void;
  closeSupplierModal: () => void;
isTicketModalOpen: boolean;
  selectedSaleForTicket: Sale | null;
  openTicketModal: (sale: Sale) => void;
  closeTicketModal: () => void;

  isAuditModalOpen: boolean;
  setIsAuditModalOpen: (open: boolean) => void;

  isAuthModalOpen: boolean;
  setIsAuthModalOpen: (open: boolean) => void;
}

const SupermarketContext = createContext<SupermarketContextType | undefined>(undefined);

export const SupermarketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser, activeProfile } = useAuth();
  const [activeSection, setActiveSection] = useState<SectionId>('inicio');

  // State loaded from StorageService
  const [products, setProducts] = useState<Product[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [movements, setMovements] = useState<InventoryMovement[]>([]);
  const [settings, setSettings] = useState<StoreSettings>(defaultSettings);

  // Cloud & Multi-PC state
  const [activeTerminalsCount, setActiveTerminalsCount] = useState<number>(1);
  const [isCloudConnected, setIsCloudConnected] = useState<boolean>(true);

  // Cart state
  const [cart, setCart] = useState<CartItem[]>([]);

  // Sound preference
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);

  // Toast Notification
  const [notification, setNotification] = useState<ToastNotification | null>(null);

  // Modals
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [selectedProductForEdit, setSelectedProductForEdit] = useState<Product | null>(null);
  const [scannedCodeForRegistration, setScannedCodeForRegistration] = useState<string | null>(null);

  const [isStockModalOpen, setIsStockModalOpen] = useState(false);
  const [selectedProductForStock, setSelectedProductForStock] = useState<Product | null>(null);

  const [isSupplierModalOpen, setIsSupplierModalOpen] = useState(false);
  const [selectedSupplierForEdit, setSelectedSupplierForEdit] = useState<Supplier | null>(null);
const [isTicketModalOpen, setIsTicketModalOpen] = useState(false);
  const [selectedSaleForTicket, setSelectedSaleForTicket] = useState<Sale | null>(null);

  const [isAuditModalOpen, setIsAuditModalOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  const showNotification = useCallback(
    (type: 'success' | 'error' | 'warning' | 'info', message: string, title?: string) => {
      setNotification({ type, message, title });
    },
    []
  );

  const clearNotification = useCallback(() => {
    setNotification(null);
  }, []);

  const refreshAllData = useCallback(() => {
    setProducts(StorageService.getProducts());
    setSuppliers(StorageService.getSuppliers());
    setSales(StorageService.getSales());
    setMovements(StorageService.getInventoryMovements());
    setSettings(StorageService.getSettings());
  }, []);

  useEffect(() => {
    refreshAllData();
    // Guardar backup automático de inicio
    StorageService.saveAutomaticBackupSnapshot('Inicio de Sesión');
  }, [refreshAllData]);

  // Sincronización en tiempo real desde Firestore Multi-PC
  useEffect(() => {
    if (!currentUser || !activeProfile) {
      setActiveTerminalsCount(0);
      setIsCloudConnected(false);
      return;
    }

    // 1. Escuchar terminales activas
    const unsubTerminals = CloudSyncService.subscribeToActiveTerminals((list) => {
      setActiveTerminalsCount(Math.max(1, list.length));
      setIsCloudConnected(true);
    });

    // 2. Escuchar productos en tiempo real si hay Firestore
    const unsubProducts = CloudSyncService.subscribeToProducts((cloudProds) => {
      if (cloudProds && cloudProds.length > 0) {
        setProducts(cloudProds);
        StorageService.saveProducts(cloudProds);
      }
    });

    // 3. Backup automático cada 60 minutos
    const backupTimer = setInterval(() => {
      StorageService.saveAutomaticBackupSnapshot('Periódico 1h');
    }, 60 * 60 * 1000);

    return () => {
      unsubTerminals();
      unsubProducts();
      clearInterval(backupTimer);
    };
  }, [currentUser, activeProfile]);

  // Forzar sincronización manual con la nube
  const triggerCloudSync = async () => {
    try {
      const localProds = StorageService.getProducts();
      await CloudSyncService.pushLocalCatalogToCloud(localProds);
      refreshAllData();
      showNotification('success', 'Catálogo sincronizado exitosamente con la base de datos central.', 'Sincronización Cloud');
    } catch (e: any) {
      showNotification('warning', 'Operando en modo local sincronizable: ' + e.message);
    }
  };

  // Derived metrics
  const todayMetrics = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todaySales = sales.filter(s => {
      const d = new Date(s.date);
      d.setHours(0, 0, 0, 0);
      return d.getTime() === today.getTime() && s.status === 'completada';
    });

    const totalAmount = todaySales.reduce((acc, s) => acc + s.total, 0);
    const itemsCount = todaySales.reduce((acc, s) => acc + s.itemCount, 0);

    return {
      totalAmount,
      salesCount: todaySales.length,
      itemsCount,
    };
  }, [sales]);

  const lowStockProducts = useMemo(() => {
    return products.filter(p => p.stock > 0 && p.stock <= p.minStock);
  }, [products]);

  const outOfStockProducts = useMemo(() => {
    return products.filter(p => p.stock <= 0);
  }, [products]);

  const missingProducts = useMemo(() => {
    const map = new Map<string, Product>();
    for (const p of products) {
      if (p.stock <= p.minStock || p.stock <= 0 || p.isManuallyMarkedMissing) {
        map.set(p.id, p);
      }
    }
    return Array.from(map.values());
  }, [products]);

  const recentSales = useMemo(() => {
    return sales.slice(0, 8);
  }, [sales]);

  // Cart operations
  const addToCart = useCallback(
    (product: Product, quantity = 1): boolean => {
      if (product.stock <= 0) {
        showNotification(
          'error',
          `El producto "${product.name}" está agotado (0 unidades en stock).`,
          'Stock agotado'
        );
        scannerAudio.playErrorBeep();
        return false;
      }

      let success = true;

      setCart(prev => {
        const existing = prev.find(item => item.product.id === product.id);
        const currentQty = existing ? existing.quantity : 0;
        const requestedTotal = currentQty + quantity;

        if (requestedTotal > product.stock) {
          showNotification(
            'warning',
            `Stock insuficiente para "${product.name}". Disponible: ${product.stock}, en changuito: ${currentQty}.`,
            'Límite de stock alcanzado'
          );
          scannerAudio.playErrorBeep();
          success = false;
          return prev;
        }

        scannerAudio.playSuccessBeep();
        if (existing) {
          return prev.map(item =>
            item.product.id === product.id
              ? { ...item, quantity: requestedTotal }
              : item
          );
        }
        return [...prev, { product, quantity }];
      });

      return success;
    },
    [showNotification]
  );

  const addToCartByCode = useCallback(
    (code: string): boolean => {
      const p = ProductService.getByCode(code);
      if (!p) {
        showNotification('error', `No se encontró producto con código "${code}".`, 'Código no encontrado');
        return false;
      }
      return addToCart(p, 1);
    },
    [addToCart, showNotification]
  );

  const updateCartQuantity = useCallback(
    (productId: string, delta: number) => {
      setCart(prev => {
        const item = prev.find(i => i.product.id === productId);
        if (!item) return prev;

        const newQty = item.quantity + delta;
        if (newQty <= 0) {
          return prev.filter(i => i.product.id !== productId);
        }

        if (newQty > item.product.stock) {
          showNotification(
            'warning',
            `No puede superar el stock físico disponible (${item.product.stock} u.).`,
            'Stock máximo'
          );
          return prev;
        }

        return prev.map(i =>
          i.product.id === productId ? { ...i, quantity: newQty } : i
        );
      });
    },
    [showNotification]
  );

  const removeFromCart = useCallback((productId: string) => {
    setCart(prev => prev.filter(i => i.product.id !== productId));
  }, []);

  const clearCart = useCallback(() => {
    setCart([]);
  }, []);

  // Product Operations
  const addProduct = useCallback(
    (productData: Omit<Product, 'id' | 'status' | 'createdAt' | 'updatedAt'>): Product => {
      try {
        const created = ProductService.save(productData);
        refreshAllData();
        showNotification(
          'success',
          `Producto "${created.name}" guardado exitosamente.`,
          '¡Operación exitosa!'
        );
        return created;
      } catch (err: any) {
        showNotification('error', err.message || 'Error al guardar el producto.', 'No se pudo guardar');
        throw err;
      }
    },
    [refreshAllData, showNotification]
  );

  const updateProduct = useCallback(
    (productData: Omit<Product, 'status' | 'createdAt' | 'updatedAt'> & { id: string }): Product => {
      try {
        const updated = ProductService.save(productData);
        refreshAllData();
        showNotification(
          'success',
          `Producto "${updated.name}" actualizado correctamente.`,
          'Cambios guardados'
        );
        return updated;
      } catch (err: any) {
        showNotification('error', err.message || 'Error al actualizar el producto.', 'Error');
        throw err;
      }
    },
    [refreshAllData, showNotification]
  );

  const deleteProduct = useCallback(
    (id: string) => {
      try {
        const target = products.find(p => p.id === id);
        ProductService.delete(id);
        refreshAllData();
        showNotification(
          'info',
          `El producto "${target?.name || id}" ha sido eliminado.`,
          'Producto eliminado'
        );
      } catch (err: any) {
        showNotification('error', err.message || 'Error al eliminar el producto.', 'Error');
      }
    },
    [products, refreshAllData, showNotification]
  );

  // Sales Operations
  const registerSale = useCallback(
    async (input: CreateSaleInput): Promise<Sale> => {
      try {
        const sale = await SalesService.registerSale(input);
        refreshAllData();
        setCart([]); // Clear shared cart on sale success
        showNotification(
          'success',
          `Comprobante ARCA ${sale.receiptNumber || sale.saleNumber} por $${sale.total.toLocaleString('es-AR')} autorizado con éxito.`,
          '¡Venta completada!'
        );
        return sale;
      } catch (err: any) {
        showNotification('error', err.message || 'Error al procesar la venta.', 'Error en la venta');
        throw err;
      }
    },
    [refreshAllData, showNotification]
  );

  const cancelSale = useCallback(
    (saleId: string, reason: string) => {
      try {
        const canceled = SalesService.cancelSale(saleId, reason);
        refreshAllData();
        showNotification(
          'info',
          `La venta ${canceled.saleNumber} ha sido anulada y el stock fue restaurado.`,
          'Venta anulada'
        );
      } catch (err: any) {
        showNotification('error', err.message || 'Error al anular la venta.', 'Error');
      }
    },
    [refreshAllData, showNotification]
  );

  // Inventory Adjustment
  const adjustStock = useCallback(
    (input: StockAdjustmentInput) => {
      try {
        const movement = InventoryService.adjustStock(
          input.productId,
          input.quantity,
          input.type,
          input.reason,
          input.referenceDoc
        );
        refreshAllData();
        showNotification(
          'success',
          `Movimiento registrado: ${movement.type} (${movement.quantity > 0 ? '+' : ''}${movement.quantity} u.). Nuevo stock: ${movement.newStock}.`,
          'Inventario actualizado'
        );
      } catch (err: any) {
        showNotification('error', err.message || 'Error al ajustar el inventario.', 'Error');
      }
    },
    [refreshAllData, showNotification]
  );

  // Missing Products & Replenishment actions
  const toggleManualMissing = useCallback(
    (productId: string, isMissing: boolean) => {
      try {
        ProductService.toggleManualMissing(productId, isMissing);
        refreshAllData();
        showNotification(
          'info',
          isMissing
            ? 'Producto marcado para reposición en la lista de faltantes.'
            : 'Producto desmarcado de la lista de faltantes.',
          'Gestión de faltantes'
        );
      } catch (err: any) {
        showNotification('error', err.message || 'Error al actualizar estado del producto.');
      }
    },
    [refreshAllData, showNotification]
  );

  const updateOrderStatus = useCallback(
    (productId: string, orderStatus: 'pendiente' | 'solicitado' | 'recibido') => {
      try {
        ProductService.updateOrderStatus(productId, orderStatus);
        refreshAllData();
        showNotification('success', `Estado de pedido actualizado a "${orderStatus}".`, 'Pedido actualizado');
      } catch (err: any) {
        showNotification('error', err.message || 'Error al actualizar estado del pedido.');
      }
    },
    [refreshAllData, showNotification]
  );

  const bulkUpdateOrderStatus = useCallback(
    (productIds: string[], orderStatus: 'pendiente' | 'solicitado' | 'recibido') => {
      try {
        ProductService.bulkUpdateOrderStatus(productIds, orderStatus);
        refreshAllData();
        showNotification(
          'success',
          `${productIds.length} productos actualizados a estado "${orderStatus}".`,
          'Pedidos actualizados'
        );
      } catch (err: any) {
        showNotification('error', err.message || 'Error al actualizar pedidos masivamente.');
      }
    },
    [refreshAllData, showNotification]
  );

  const updateCustomReplenishQty = useCallback(
    (productId: string, qty: number) => {
      try {
        ProductService.updateCustomReplenishQty(productId, qty);
        refreshAllData();
        showNotification('success', `Cantidad sugerida guardada: ${qty} unidades.`, 'Cantidad actualizada');
      } catch (err: any) {
        showNotification('error', err.message || 'Error al actualizar cantidad.');
      }
    },
    [refreshAllData, showNotification]
  );

  const receiveStockOrder = useCallback(
    (items: { productId: string; quantity: number }[], notes?: string) => {
      try {
        let totalItemsReceived = 0;
        for (const item of items) {
          if (item.quantity > 0) {
            InventoryService.adjustStock(
              item.productId,
              item.quantity,
              'COMPRA',
              notes ? `Recepción de mercadería: ${notes}` : 'Recepción de pedido de reposición'
            );
            ProductService.updateOrderStatus(item.productId, 'recibido');
            const prod = ProductService.getById(item.productId);
            if (prod && prod.stock > prod.minStock && prod.isManuallyMarkedMissing) {
              ProductService.toggleManualMissing(item.productId, false);
            }
            totalItemsReceived += item.quantity;
          }
        }
        refreshAllData();
        showNotification(
          'success',
          `Recepción registrada exitosamente. Se ingresaron ${totalItemsReceived} unidades al inventario.`,
          '¡Mercadería recibida!'
        );
      } catch (err: any) {
        showNotification('error', err.message || 'Error al procesar la recepción de mercadería.');
      }
    },
    [refreshAllData, showNotification]
  );

  // Supplier Operations
  const addSupplier = useCallback(
    (supplierData: Omit<Supplier, 'id' | 'createdAt'>): Supplier => {
      try {
        const created = SupplierService.save(supplierData);
        refreshAllData();
        showNotification(
          'success',
          `Proveedor "${created.name}" registrado correctamente.`,
          'Proveedor añadido'
        );
        return created;
      } catch (err: any) {
        showNotification('error', err.message || 'Error al guardar el proveedor.', 'Error');
        throw err;
      }
    },
    [refreshAllData, showNotification]
  );

  const updateSupplier = useCallback(
    (supplierData: Omit<Supplier, 'createdAt'> & { id: string }): Supplier => {
      try {
        const updated = SupplierService.save(supplierData);
        refreshAllData();
        showNotification(
          'success',
          `Proveedor "${updated.name}" actualizado con éxito.`,
          'Cambios guardados'
        );
        return updated;
      } catch (err: any) {
        showNotification('error', err.message || 'Error al actualizar el proveedor.', 'Error');
        throw err;
      }
    },
    [refreshAllData, showNotification]
  );

  const deleteSupplier = useCallback(
    (id: string) => {
      try {
        const target = suppliers.find(s => s.id === id);
        SupplierService.delete(id);
        refreshAllData();
        showNotification(
          'info',
          `El proveedor "${target?.name || id}" ha sido eliminado.`,
          'Proveedor eliminado'
        );
      } catch (err: any) {
        showNotification('error', err.message || 'Error al eliminar el proveedor.', 'Error');
      }
    },
    [suppliers, refreshAllData, showNotification]
  );

  // Settings
  const updateSettings = useCallback(
    (newSettings: Partial<StoreSettings>) => {
      try {
        const updated = { ...settings, ...newSettings };
        StorageService.saveSettings(updated);
        setSettings(updated);
        showNotification('success', 'Configuración del supermercado actualizada.', 'Cambios guardados');
      } catch (err: any) {
        showNotification('error', err.message || 'Error al guardar configuración.', 'Error');
      }
    },
    [settings, showNotification]
  );

  const importBackupData = useCallback(
    (json: string): boolean => {
      const res = StorageService.importBackup(json);
      if (res.success) {
        refreshAllData();
        setCart([]);
        showNotification(
          'success',
          'La copia de seguridad ha sido validada e importada exitosamente.',
          'Restauración completa'
        );
        return true;
      }
      showNotification('error', res.error || 'El archivo no contiene un formato de respaldo válido.', 'Error de importación');
      return false;
    },
    [refreshAllData, showNotification]
  );

  // Modal controls
  const openProductModal = useCallback((product?: Product) => {
    setSelectedProductForEdit(product || null);
    setScannedCodeForRegistration(null);
    setIsProductModalOpen(true);
  }, []);

  const openProductModalWithCode = useCallback((code: string) => {
    setSelectedProductForEdit(null);
    setScannedCodeForRegistration(code);
    setIsProductModalOpen(true);
  }, []);

  const closeProductModal = useCallback(() => {
    setIsProductModalOpen(false);
    setSelectedProductForEdit(null);
    setScannedCodeForRegistration(null);
  }, []);

  const openStockModal = useCallback((product?: Product) => {
    setSelectedProductForStock(product || null);
    setIsStockModalOpen(true);
  }, []);

  const closeStockModal = useCallback(() => {
    setIsStockModalOpen(false);
    setSelectedProductForStock(null);
  }, []);

  const openSupplierModal = useCallback((supplier?: Supplier) => {
    setSelectedSupplierForEdit(supplier || null);
    setIsSupplierModalOpen(true);
  }, []);

  const closeSupplierModal = useCallback(() => {
    setIsSupplierModalOpen(false);
    setSelectedSupplierForEdit(null);
  }, []);

  const openTicketModal = useCallback((sale: Sale) => {
    setSelectedSaleForTicket(sale);
    setIsTicketModalOpen(true);
  }, []);

  const closeTicketModal = useCallback(() => {
    setIsTicketModalOpen(false);
    setSelectedSaleForTicket(null);
  }, []);

  const contextValue: SupermarketContextType = {
    activeSection,
    setActiveSection,
    products,
    suppliers,
    sales,
    movements,
    settings,
    cart,
    addToCart,
    addToCartByCode,
    updateCartQuantity,
    removeFromCart,
    clearCart,
    soundEnabled,
    setSoundEnabled,
    todaySalesTotal: todayMetrics.totalAmount,
    todaySalesCount: todayMetrics.salesCount,
    todayItemsCount: todayMetrics.itemsCount,
    totalProductsCount: products.length,
    lowStockCount: lowStockProducts.length,
    outOfStockCount: outOfStockProducts.length,
    missingProducts,
    lowStockProducts,
    outOfStockProducts,
    recentSales,
    addProduct,
    updateProduct,
    deleteProduct,
    registerSale,
    cancelSale,
    adjustStock,
    addSupplier,
    updateSupplier,
    deleteSupplier,
    updateSettings,
    importBackupData,
    refreshAllData,
    toggleManualMissing,
    updateOrderStatus,
    bulkUpdateOrderStatus,
    updateCustomReplenishQty,
    receiveStockOrder,
    notification,
    showNotification,
    clearNotification,
    activeTerminalsCount,
    isCloudConnected,
    triggerCloudSync,
    isProductModalOpen,
    selectedProductForEdit,
    scannedCodeForRegistration,
    openProductModal,
    openProductModalWithCode,
    closeProductModal,
    isStockModalOpen,
    selectedProductForStock,
    openStockModal,
    closeStockModal,
    isSupplierModalOpen,
    selectedSupplierForEdit,
    openSupplierModal,
    closeSupplierModal,
isTicketModalOpen,
    selectedSaleForTicket,
    openTicketModal,
    closeTicketModal,
    isAuditModalOpen,
    setIsAuditModalOpen,
    isAuthModalOpen,
    setIsAuthModalOpen,
  };

  return (
    <SupermarketContext.Provider value={contextValue}>
      {children}
    </SupermarketContext.Provider>
  );
};

export const useSupermarket = () => {
  const context = useContext(SupermarketContext);
  if (!context) {
    throw new Error('useSupermarket must be used within a SupermarketProvider');
  }
  return context;
};
