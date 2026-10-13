import { Sale, SaleItem, PaymentMethod } from '../models';
import { StorageService } from './storageService';
import { ProductService } from './productService';
import { InventoryService } from './inventoryService';
import { ReceptorFiscal, TipoComprobanteAfip } from './arcaService';
import { CloudSyncService } from './cloudSyncService';
import { auth } from '../lib/firebase';

export interface CreateSaleInput {
  items: Array<{
    productId: string;
    quantity: number;
    customUnitPrice?: number;
  }>;
  paymentMethod: PaymentMethod;
  invoiceType?: TipoComprobanteAfip;
  customer?: ReceptorFiscal;
  cashTendered?: number;
  discount?: number;
  cashierName?: string;
  cashierId?: string;
  notes?: string;
}

export interface SaleFilterOptions {
  query?: string; // Search by ticket number (TK-0001042), cashier name, or product name
  date?: string; // Format YYYY-MM-DD
  paymentMethod?: string; // PaymentMethod or 'todos'
  status?: string; // 'completada' | 'anulada' | 'todos'
}

export class SalesService {
  public static getAll(): Sale[] {
    const sales = StorageService.getSales();
    return sales.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }

  public static getById(id: string): Sale | undefined {
    const sales = this.getAll();
    return sales.find(s => s.id === id);
  }

  public static getTodaySales(): Sale[] {
    const sales = this.getAll();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return sales.filter(s => {
      const saleDate = new Date(s.date);
      saleDate.setHours(0, 0, 0, 0);
      return saleDate.getTime() === today.getTime() && s.status === 'completada';
    });
  }

  public static getRecentSales(limit = 10): Sale[] {
    const sales = this.getAll();
    return sales.slice(0, limit);
  }

  /**
   * Filter sales by ticket number, date, payment method, or item name
   */
  public static filterSales(options: SaleFilterOptions): Sale[] {
    const sales = this.getAll();
    const { query = '', date = '', paymentMethod = 'todos', status = 'todos' } = options;

    const q = query.trim().toLowerCase();

    return sales.filter(sale => {
      // Status filter
      if (status !== 'todos' && sale.status !== status) {
        return false;
      }

      // Payment method filter
      if (paymentMethod !== 'todos' && sale.paymentMethod !== paymentMethod) {
        return false;
      }

      // Date filter (matches YYYY-MM-DD)
      if (date) {
        const saleDateStr = new Date(sale.date).toISOString().split('T')[0];
        if (saleDateStr !== date) {
          return false;
        }
      }

      // Query filter: Ticket number, cashier, notes, or product name
      if (q) {
        const matchesTicket = sale.saleNumber.toLowerCase().includes(q) || (sale.receiptNumber && sale.receiptNumber.toLowerCase().includes(q));
        const matchesCashier = sale.cashierName ? sale.cashierName.toLowerCase().includes(q) : false;
        const matchesNotes = sale.notes ? sale.notes.toLowerCase().includes(q) : false;
        const matchesCae = sale.afipAuth?.cae?.includes(q) || false;
        const matchesItems = sale.items.some(
          item =>
            item.name.toLowerCase().includes(q) ||
            item.code.toLowerCase().includes(q)
        );

        if (!matchesTicket && !matchesCashier && !matchesNotes && !matchesCae && !matchesItems) {
          return false;
        }
      }

      return true;
    });
  }

  public static getTodayMetrics(): {
    totalAmount: number;
    salesCount: number;
    itemsSoldCount: number;
    averageTicket: number;
  } {
    const todaySales = this.getTodaySales();
    const totalAmount = todaySales.reduce((acc, s) => acc + s.total, 0);
    const itemsSoldCount = todaySales.reduce((acc, s) => acc + s.itemCount, 0);
    const salesCount = todaySales.length;
    const averageTicket = salesCount > 0 ? Math.round(totalAmount / salesCount) : 0;

    return { totalAmount, salesCount, itemsSoldCount, averageTicket };
  }

  /**
   * Registers a sale with atomic stock verification, ARCA electronic invoicing,
   * and multi-PC cloud transaction synchronization
   */
  public static async createMercadoPagoPreference(input: {
    items: Array<{ productId: string; name: string; quantity: number; unitPrice: number; subtotal: number }>;
    total: number;
    cashierId?: string;
    terminalId?: string;
  }): Promise<{ initPoint: string; externalReference: string }> {
    const token = auth.currentUser ? await auth.currentUser.getIdToken() : '';
    const response = await fetch('/api/payments/mercadopago/preference', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}) },
      body: JSON.stringify(input),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data.initPoint || !data.externalReference) {
      throw new Error(data.error || 'No se pudo iniciar Mercado Pago.');
    }
    return { initPoint: String(data.initPoint), externalReference: String(data.externalReference) };
  }

  public static async waitForMercadoPagoApproval(externalReference: string, timeoutMs = 120000): Promise<string> {
    const startedAt = Date.now();
    while (Date.now() - startedAt < timeoutMs) {
      const token = auth.currentUser ? await auth.currentUser.getIdToken() : '';
      const response = await fetch('/api/payments/mercadopago/status?externalReference=' + encodeURIComponent(externalReference), {
        headers: token ? { Authorization: 'Bearer ' + token } : {},
      });
      const data = await response.json().catch(() => ({}));
      if (response.ok && data.approved && data.paymentId) return String(data.paymentId);
      if (response.ok && ['rejected', 'cancelled', 'refunded', 'charged_back'].includes(String(data.status))) {
        throw new Error('Mercado Pago rechazó o canceló el pago.');
      }
      await new Promise(resolve => setTimeout(resolve, 3000));
    }
    throw new Error('Tiempo de espera agotado. El pago no fue aprobado; no se emitió el ticket.');
  }
  public static async registerSale(input: CreateSaleInput): Promise<Sale> {
    if (!input.items || input.items.length === 0) {
      throw new Error('No se puede confirmar una venta vacía. Agregue productos al changuito.');
    }

    const saleItems: SaleItem[] = [];
    let subtotal = 0;
    let itemCount = 0;

    // 1. Transactional check: Validate all items and their physical stock BEFORE modifying anything
    for (const item of input.items) {
      if (item.quantity <= 0) {
        throw new Error('La cantidad de cada producto debe ser mayor a cero.');
      }

      const product = ProductService.getById(item.productId);
      if (!product) {
        throw new Error(`Producto con ID ${item.productId} no encontrado en el catálogo.`);
      }

      if (product.stock < item.quantity) {
        throw new Error(
          `Stock insuficiente para "${product.name}". Solicitado: ${item.quantity} ${product.unit}, Disponible en góndola: ${product.stock} ${product.unit}`
        );
      }

      const unitPrice = item.customUnitPrice ?? product.sellingPrice;
      const itemSubtotal = unitPrice * item.quantity;

      saleItems.push({
        productId: product.id,
        code: product.code,
        name: product.name,
        unitPrice,
        costPrice: product.costPrice,
        quantity: item.quantity,
        subtotal: itemSubtotal,
      });

      subtotal += itemSubtotal;
      itemCount += item.quantity;
    }

    const discount = Math.max(0, input.discount ?? 0);
    const total = Math.max(0, subtotal - discount);

    // Validate cash tendered
    let changeDue = 0;
    if (input.paymentMethod === 'efectivo') {
      if (input.cashTendered === undefined || input.cashTendered < total) {
        const tendered = input.cashTendered ?? 0;
        throw new Error(
          `Importe entregado insuficiente. Total: $${total.toLocaleString('es-AR')}, Entregado: $${tendered.toLocaleString('es-AR')}`
        );
      }
      changeDue = input.cashTendered - total;
    }

    const now = new Date().toISOString();
    const allSales = StorageService.getSales();
    const nextTicketNumber = `TK-${String(allSales.length + 1042).padStart(7, '0')}`;
    const invoiceType = input.invoiceType || 'FACTURA_B';
    const terminalId = CloudSyncService.getTerminalId();
    const tenantId = CloudSyncService.getTenantId();

    // 2. Intentar procesar la venta a través del backend autoritativo (Frontend -> Backend -> Firestore Transaction)
    let newSale: Sale | null = null;
    try {
      const resp = await fetch('/api/sales/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(auth.currentUser ? { Authorization: `Bearer ${await auth.currentUser.getIdToken()}` } : {}),
        },
        body: JSON.stringify({
          tenantId,
          items: saleItems,
          paymentMethod: input.paymentMethod,
          invoiceType,
          customer: input.customer,
          cashTendered: input.cashTendered,
          discount,
          cashierId: input.cashierId,
          cashierName: input.cashierName,
          terminalId,
          notes: input.notes,
        }),
      });
      if (resp.ok) {
        const data = await resp.json();
        if (data.success && data.sale) {
          newSale = data.sale;
        }
      }
    } catch (_backendErr) {}

    // No se generan comprobantes ni CAE localmente: una venta solo se confirma
    // cuando el backend autorizado responde correctamente.
    if (!newSale) {
      throw new Error('El servicio de ventas no está disponible. La operación no fue registrada.');
    }

    // 4. Atomically decrement stock and register Kardex movement for each sold item
    for (const item of saleItems) {
      InventoryService.adjustStock(
        item.productId,
        -item.quantity,
        'VENTA',
        `Venta #${newSale.saleNumber} (${newSale.receiptNumber}) - ${newSale.cashierName}`,
        newSale.id
      );
    }

    // 5. Save sale to persistent storage
    StorageService.saveSale(newSale);

    // 6. Transacción atómica en Firestore en el tenant
    CloudSyncService.executeAtomicSale({
      saleId: newSale.id,
      receiptNumber: newSale.saleNumber,
      invoiceType,
      tenantId,
      afipAuth: newSale.afipAuth,
      items: saleItems.map(it => ({
        productId: it.productId,
        code: it.code,
        productName: it.name,
        quantity: it.quantity,
        unitPrice: it.unitPrice,
        subtotal: it.subtotal,
      })),
      total,
      paymentMethod: input.paymentMethod,
      cashierId: newSale.cashierId || 'cajero-001',
      cashierName: newSale.cashierName,
      customerData: input.customer,
    }).catch(err => {
      console.warn('[CloudSync] Venta guardada localmente, sincronizará en segundo plano:', err.message);
    });

    return newSale;
  }

  /**
   * Anula una venta registrada restaurando el stock
   */
  public static cancelSale(id: string, reason: string): Sale {
    const sale = this.getById(id);
    if (!sale) {
      throw new Error(`Venta con ID ${id} no encontrada.`);
    }

    if (sale.status === 'anulada') {
      throw new Error('Esta venta ya se encuentra anulada.');
    }

    // Reintegrar stock de cada ítem
    for (const item of sale.items) {
      InventoryService.adjustStock(
        item.productId,
        item.quantity,
        'DEVOLUCION',
        `Anulación de Venta #${sale.saleNumber} - Motivo: ${reason}`,
        sale.id
      );
    }

    const updatedSale: Sale = {
      ...sale,
      status: 'anulada',
      notes: sale.notes ? `${sale.notes} | Anulada: ${reason}` : `Anulada: ${reason}`,
    };

    StorageService.updateSale(updatedSale);

    CloudSyncService.logAudit({
      userId: 'supervisor',
      userName: 'Encargado / Supervisor',
      userRole: 'ENCARGADO',
      terminalId: CloudSyncService.getTerminalId(),
      action: 'VENTA_ANULADA',
      entityType: 'venta',
      entityId: sale.id,
      details: `Anulación de venta #${sale.saleNumber} por $${sale.total}. Motivo: ${reason}`,
    });

    return updatedSale;
  }
}
