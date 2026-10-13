import React, { useState, useMemo } from 'react';
import { useSupermarket } from '../../context/SupermarketContext';
import { useAuth } from '../../context/AuthContext';
import { Product, PaymentMethod } from '../../models';
import { StockBadge } from '../common/Badge';
import { BarcodeScannerService } from '../../services/barcodeScannerService';
import { SalesService } from '../../services/salesService';
import { TipoComprobanteAfip } from '../../services/arcaService';
import { CloudSyncService } from '../../services/cloudSyncService';
import { scannerAudio } from '../../lib/scannerAudio';
import { useUsbBarcodeScanner } from '../../hooks/useUsbBarcodeScanner';
import { CancelSaleConfirmModal } from '../modals/CancelSaleConfirmModal';
import {
  ShoppingCart,
  Plus,
  Minus,
  Trash2,
  Search,
  DollarSign,
  CreditCard,
  QrCode,
  CheckCircle,
  Receipt,
  X,
  History,
  RotateCcw,
  Eye,
  Calendar,
  Filter,
  CheckCircle2,
  AlertTriangle,
  AlertOctagon,
  FileText,
  User,
  XCircle,
} from 'lucide-react';

export const CajaVentasView: React.FC = () => {
  const {
    products,
    registerSale,
    sales,
    cancelSale,
    openTicketModal,

    cart,
    addToCart,
    updateCartQuantity,
    removeFromCart,
    clearCart,
    showNotification,
  } = useSupermarket();

  const { activeProfile } = useAuth();

  // Tab switch: 'cobro' vs 'historial'
  const [activeTab, setActiveTab] = useState<'cobro' | 'historial'>('cobro');

  // Search & category inside POS
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('todos');

  // ARCA Electronic Invoicing state
  const [invoiceType, setInvoiceType] = useState<TipoComprobanteAfip>('FACTURA_B');
  const [customerName, setCustomerName] = useState('');
  const [customerDocType, setCustomerDocType] = useState<'DNI' | 'CUIT'>('DNI');
  const [customerDocNumber, setCustomerDocNumber] = useState('');
  const [customerVatCond, setCustomerVatCond] = useState<'CONSUMIDOR_FINAL' | 'RESPONSABLE_INSCRIPTO' | 'MONOTRIBUTO'>('CONSUMIDOR_FINAL');

  // Checkout payment state
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('efectivo');
  const [cashTendered, setCashTendered] = useState<number | ''>('');
  const [discount, setDiscount] = useState<number | ''>('');
  const [cashierName, setCashierName] = useState('Caja 1 - Principal');
  const [notes, setNotes] = useState('');
  const [checkoutError, setCheckoutError] = useState<string | null>(null);

  // Anti-double-click protection
  const [isProcessingSale, setIsProcessingSale] = useState(false);

  // Historial search & filter state
  const [historySearch, setHistorySearch] = useState('');
  const [historyDate, setHistoryDate] = useState('');
  const [historyPaymentMethod, setHistoryPaymentMethod] = useState('todos');
  const [historyStatus, setHistoryStatus] = useState('todos');

  // Cancel sale modal state
  const [saleToCancel, setSaleToCancel] = useState<any>(null);
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [isCancelCartConfirmOpen, setIsCancelCartConfirmOpen] = useState(false);

  // USB Barcode Scanner active directly on POS register
  useUsbBarcodeScanner({
    enabled: activeTab === 'cobro',
    onScan: code => {
      const { product } = BarcodeScannerService.findProduct(code);
      if (product) {
        addToCart(product, 1);
      } else {
        scannerAudio.playErrorBeep();
        showNotification(
          'error',
          `Código "${code}" no registrado. Presione "Escanear producto" para darlo de alta.`,
          'Código no encontrado'
        );
      }
    },
  });

  // Filter available products for grid
  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const matchesCategory = selectedCategory === 'todos' || p.category === selectedCategory;
      const q = searchQuery.trim().toLowerCase();
      const matchesQuery =
        !q ||
        p.name.toLowerCase().includes(q) ||
        p.code.toLowerCase().includes(q) ||
        (p.internalCode && p.internalCode.toLowerCase().includes(q)) ||
        (p.brand && p.brand.toLowerCase().includes(q)) ||
        (p.category && p.category.toLowerCase().includes(q));

      return matchesCategory && matchesQuery;
    });
  }, [products, selectedCategory, searchQuery]);

  // Cart calculations
  const subtotal = useMemo(() => {
    return cart.reduce((acc, item) => acc + item.product.sellingPrice * item.quantity, 0);
  }, [cart]);

  const numDiscount = Number(discount) || 0;
  const total = Math.max(0, subtotal - numDiscount);

  const numCashTendered = Number(cashTendered) || 0;
  const changeDue =
    paymentMethod === 'efectivo' && numCashTendered >= total ? numCashTendered - total : 0;

  // Search or Barcode submit in search box
  const handleBarcodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    const { product } = BarcodeScannerService.findProduct(searchQuery.trim());

    if (product) {
      addToCart(product, 1);
      setSearchQuery('');
      setCheckoutError(null);
    } else {
      scannerAudio.playErrorBeep();
      setCheckoutError(`No se encontró producto con el código o término "${searchQuery}".`);
    }
  };

  // Preset quick cash buttons
  const handlePresetCash = (amount: number) => {
    setCashTendered(amount);
  };

  // Cancel current cart / clear operation
  const handleCancelOperation = () => {
    if (cart.length === 0) return;
    setIsCancelCartConfirmOpen(true);
  };

  const handleConfirmCancelOperation = () => {
    clearCart();
    setCashTendered('');
    setDiscount('');
    setNotes('');
    setCheckoutError(null);
    setIsCancelCartConfirmOpen(false);
    showNotification('info', 'Operación cancelada. El changuito fue vaciado sin modificar el stock.', 'Operación cancelada');
  };

  // Finalize Sale with double-click protection and atomic validation
  const handleCompleteSale = async () => {
    setCheckoutError(null);

    // Validation 1: empty cart
    if (cart.length === 0) {
      setCheckoutError('El changuito está vacío. Agregue al menos un producto antes de cobrar.');
      return;
    }

    // Validation 2: double click protection
    if (isProcessingSale) {
      return;
    }

    // Validation 3: Cash tendered check
    if (paymentMethod === 'efectivo' && numCashTendered < total) {
      setCheckoutError(
        `El dinero entregado ($${numCashTendered.toLocaleString(
          'es-AR'
        )}) es menor al total a pagar ($${total.toLocaleString('es-AR')}).`
      );
      return;
    }

    setIsProcessingSale(true);

    try {
      let paymentId: string | undefined;
      let externalReference: string | undefined;
      let paymentWindow: Window | null = null;

      if (paymentMethod === 'mercado_pago') {
        paymentWindow = window.open('', '_blank');
        if (!paymentWindow) {
          throw new Error('El navegador bloqueó la ventana de Mercado Pago. Permite ventanas emergentes para continuar.');
        }
        const preference = await SalesService.createMercadoPagoPreference({
          items: cart.map(i => ({
            productId: i.product.id,
            name: i.product.name,
            quantity: i.quantity,
            unitPrice: i.product.sellingPrice,
            subtotal: i.product.sellingPrice * i.quantity,
          })),
          total,
          cashierId: activeProfile?.userId,
          terminalId: CloudSyncService.getTerminalId(),
        });
        externalReference = preference.externalReference;
        paymentWindow.location.href = preference.initPoint;
        paymentId = await SalesService.waitForMercadoPagoApproval(externalReference);
        if (!paymentWindow.closed) paymentWindow.close();
      }

      const sale = await registerSale({
        items: cart.map(i => ({
          productId: i.product.id,
          quantity: i.quantity,
          customUnitPrice: i.product.sellingPrice,
        })),
        paymentMethod,
        paymentId,
        externalReference,
        invoiceType,
        customer: {
          nombre: customerName.trim() || 'Consumidor Final',
          tipoDoc: customerDocType,
          nroDoc: customerDocNumber.trim() || '0',
          condicionIva: customerVatCond,
        },
        cashTendered: paymentMethod === 'efectivo' ? numCashTendered : undefined,
        discount: numDiscount,
        cashierName: activeProfile?.displayName || cashierName,
        cashierId: activeProfile?.userId || 'cajero-001',
        notes: notes.trim() || undefined,
      });

      // Clear local payment form inputs
      setCashTendered('');
      setDiscount('');
      setNotes('');
      setCustomerName('');
      setCustomerDocNumber('');
      openTicketModal(sale);
    } catch (err: any) {
      setCheckoutError(err.message || 'Error al procesar la venta.');
    } finally {
      setIsProcessingSale(false);
    }
  };

  // Filtered sales in Historial tab using SalesService.filterSales
  const filteredSales = useMemo(() => {
    return SalesService.filterSales({
      query: historySearch,
      date: historyDate,
      paymentMethod: historyPaymentMethod,
      status: historyStatus,
    });
  }, [sales, historySearch, historyDate, historyPaymentMethod, historyStatus]);

  // Handle open cancel sale modal
  const handleOpenCancelSaleModal = (sale: any) => {
    setSaleToCancel(sale);
    setIsCancelModalOpen(true);
  };

  const handleConfirmCancelSale = (saleId: string, reason: string) => {
    cancelSale(saleId, reason);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Tab Switcher: Punto de Cobro vs Historial de Ventas */}
      <div className="flex items-center justify-between bg-white p-2 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('cobro')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all ${
              activeTab === 'cobro'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <ShoppingCart className="w-4 h-4" />
            <span>Punto de Cobro (Caja)</span>
          </button>

          <button
            onClick={() => setActiveTab('historial')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all ${
              activeTab === 'historial'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <History className="w-4 h-4" />
            <span>Historial de Ventas ({sales.length})</span>
          </button>
        </div>

        <div className="hidden sm:flex items-center gap-3 text-xs font-semibold text-slate-500 pr-3">
          <span className="flex items-center gap-1.5 text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full font-bold">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            Lector USB Activo
          </span>
          <span className="flex items-center gap-1">
            <User className="w-3.5 h-3.5 text-slate-400" />
            {cashierName}
          </span>
        </div>
      </div>

      {activeTab === 'cobro' ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* LEFT: Product Catalog & Search (7 Cols) */}
          <div className="lg:col-span-7 space-y-4">
            {/* Search Box + Scanner Button */}
            <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200 shadow-xs">
              <form onSubmit={handleBarcodeSubmit} className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3.5 top-3.5 w-5 h-5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Buscar producto o escanear código de barras (Enter para sumar)..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="w-full pl-11 pr-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-sm font-semibold"
                  />
                </div>

              </form>

              {/* Category Pills */}
              <div className="flex gap-2 overflow-x-auto pt-3 pb-1 no-scrollbar">
                <button
                  onClick={() => setSelectedCategory('todos')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                    selectedCategory === 'todos'
                      ? 'bg-slate-900 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  Todos ({products.length})
                </button>
                {Array.from(new Set(products.map(p => p.category))).map(cat => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                      selectedCategory === cat
                        ? 'bg-emerald-600 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Product Cards Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-[600px] overflow-y-auto p-1">
              {filteredProducts.map(prod => {
                const isOutOfStock = prod.stock <= 0;
                return (
                  <button
                    key={prod.id}
                    disabled={isOutOfStock}
                    onClick={() => addToCart(prod, 1)}
                    className={`p-3.5 sm:p-4 rounded-2xl border text-left transition-all flex flex-col justify-between active:scale-98 ${
                      isOutOfStock
                        ? 'bg-slate-100 border-slate-200 opacity-60 cursor-not-allowed'
                        : 'bg-white border-slate-200 hover:border-emerald-500 hover:shadow-md'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between text-[10px] text-slate-500 mb-1">
                        <span className="font-mono bg-slate-100 px-1.5 py-0.5 rounded font-bold">
                          {prod.internalCode}
                        </span>
                        <span>{prod.brand}</span>
                      </div>
                      <h4 className="font-extrabold text-slate-900 text-sm line-clamp-2 leading-snug">
                        {prod.name}
                      </h4>
                      <p className="text-[11px] text-slate-500 mt-0.5 truncate">{prod.category}</p>
                    </div>

                    <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between">
                      <span className="font-black text-emerald-800 text-base sm:text-lg">
                        ${prod.sellingPrice.toLocaleString('es-AR')}
                      </span>
                      <span
                        className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                          prod.stock <= prod.minStock
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {prod.stock} {prod.unit}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* RIGHT: Ticket / Current Cart / Checkout Panel (5 Cols) */}
          <div className="lg:col-span-5">
            <div className="bg-white rounded-3xl border border-slate-200 shadow-md p-5 sm:p-6 flex flex-col h-full">
              {/* Header with Cancel Operation button */}
              <div className="flex items-center justify-between pb-4 border-b border-slate-200">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-emerald-100 text-emerald-800 rounded-xl">
                    <Receipt className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-black text-slate-900 text-lg">Ticket de Venta</h3>
                    <p className="text-xs text-slate-500">
                      {cart.reduce((acc, i) => acc + i.quantity, 0)} unidades en changuito
                    </p>
                  </div>
                </div>

                {cart.length > 0 && (
                  <button
                    onClick={handleCancelOperation}
                    className="text-xs font-bold text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 px-3 py-1.5 rounded-xl border border-rose-200 flex items-center gap-1 transition-colors"
                    title="Cancelar venta actual y vaciar changuito"
                  >
                    <XCircle className="w-3.5 h-3.5" />
                    <span>Cancelar Operación</span>
                  </button>
                )}
              </div>

              {/* Error Message if any */}
              {checkoutError && (
                <div className="mt-3 p-3 bg-rose-50 border border-rose-300 rounded-xl text-rose-800 text-xs font-bold flex items-center justify-between">
                  <span>{checkoutError}</span>
                  <button onClick={() => setCheckoutError(null)}>
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}

              {/* Cart Items List */}
              <div className="flex-1 overflow-y-auto my-3 divide-y divide-slate-100 max-h-64">
                {cart.length === 0 ? (
                  <div className="py-12 text-center text-slate-400">
                    <ShoppingCart className="w-12 h-12 mx-auto mb-2 text-slate-300" />
                    <p className="font-bold text-sm">Changuito vacío</p>
                    <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">
                      Dispare con la pistola lectora de código de barras o haga clic en los productos para comenzar a cobrar.
                    </p>
                  </div>
                ) : (
                  cart.map(item => (
                    <div key={item.product.id} className="py-3 flex items-center justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-slate-900 text-sm truncate">
                          {item.product.name}
                        </p>
                        <p className="text-xs text-slate-500">
                          ${item.product.sellingPrice.toLocaleString('es-AR')} x {item.quantity}{' '}
                          {item.product.unit}
                        </p>
                      </div>

                      {/* Quantity Controls */}
                      <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl">
                        <button
                          onClick={() => updateCartQuantity(item.product.id, -1)}
                          className="p-1 rounded-lg bg-white text-slate-700 hover:bg-slate-200 transition-colors shadow-xs"
                          title="Reducir 1 unidad"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <span className="w-6 text-center font-black text-sm text-slate-900">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => updateCartQuantity(item.product.id, 1)}
                          className="p-1 rounded-lg bg-white text-slate-700 hover:bg-slate-200 transition-colors shadow-xs"
                          title="Aumentar 1 unidad"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Subtotal & Delete Item */}
                      <div className="text-right flex items-center gap-2">
                        <span className="font-black text-slate-900 text-sm sm:text-base w-18">
                          ${(item.product.sellingPrice * item.quantity).toLocaleString('es-AR')}
                        </span>
                        <button
                          onClick={() => removeFromCart(item.product.id)}
                          className="p-1 text-slate-400 hover:text-rose-600 rounded-lg transition-colors"
                          title="Quitar producto de la venta"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Totals Summary */}
              <div className="pt-3 border-t border-slate-200 space-y-2 text-sm">
                <div className="flex justify-between text-slate-600">
                  <span>Subtotal:</span>
                  <span className="font-semibold">${subtotal.toLocaleString('es-AR')}</span>
                </div>

                <div className="flex justify-between items-center text-slate-600">
                  <span className="text-xs">Descuento ($):</span>
                  <input
                    type="number"
                    min="0"
                    placeholder="0"
                    value={discount}
                    onChange={e => setDiscount(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-24 px-2 py-1 text-right text-xs rounded-lg border border-slate-300 font-semibold"
                  />
                </div>

                <div className="p-3 bg-emerald-50 rounded-2xl flex justify-between items-center">
                  <span className="text-base font-extrabold text-emerald-950 uppercase tracking-wider">
                    Total General:
                  </span>
                  <span className="text-2xl sm:text-3xl font-black text-emerald-900">
                    ${total.toLocaleString('es-AR')}
                  </span>
                </div>
              </div>

              {/* ARCA Fiscal Invoicing Selector */}
              <div className="mt-3 p-3 bg-slate-50 border border-slate-200 rounded-2xl">
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Comprobante Fiscal ARCA
                  </label>
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                    CAE en línea
                  </span>
                </div>

                <div className="grid grid-cols-4 gap-1.5 mb-2">
                  <button
                    type="button"
                    onClick={() => {
                      setInvoiceType('FACTURA_B');
                      setCustomerDocType('DNI');
                    }}
                    className={`py-1.5 px-2 rounded-xl text-xs font-bold border transition-all text-center ${
                      invoiceType === 'FACTURA_B'
                        ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    Factura B
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setInvoiceType('FACTURA_A');
                      setCustomerDocType('CUIT');
                      setCustomerVatCond('RESPONSABLE_INSCRIPTO');
                    }}
                    className={`py-1.5 px-2 rounded-xl text-xs font-bold border transition-all text-center ${
                      invoiceType === 'FACTURA_A'
                        ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    Factura A
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setInvoiceType('FACTURA_C');
                    }}
                    className={`py-1.5 px-2 rounded-xl text-xs font-bold border transition-all text-center ${
                      invoiceType === 'FACTURA_C'
                        ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    Factura C
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setInvoiceType('TICKET_NO_FISCAL');
                    }}
                    className={`py-1.5 px-2 rounded-xl text-xs font-bold border transition-all text-center ${
                      invoiceType === 'TICKET_NO_FISCAL'
                        ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    Ticket X
                  </button>
                </div>

                {invoiceType === 'FACTURA_A' && (
                  <div className="space-y-1.5 pt-1.5 border-t border-slate-200 animate-in fade-in duration-200">
                    <div className="text-[11px] font-bold text-slate-700">Datos del Receptor (Resp. Inscripto):</div>
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="text"
                        placeholder="Razón Social / Empresa"
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                        className="px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg outline-none focus:ring-1 focus:ring-emerald-500"
                      />
                      <input
                        type="text"
                        placeholder="CUIT (11 dígitos)"
                        value={customerDocNumber}
                        onChange={(e) => setCustomerDocNumber(e.target.value.replace(/\D/g, ''))}
                        className="px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg outline-none font-mono focus:ring-1 focus:ring-emerald-500"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Payment Methods */}
              <div className="mt-3">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                  Método de Pago
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('efectivo')}
                    className={`p-2 rounded-xl border text-xs font-bold flex items-center justify-center gap-1 transition-all ${
                      paymentMethod === 'efectivo'
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <DollarSign className="w-3.5 h-3.5" />
                    <span>Efectivo</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentMethod('tarjeta_debito')}
                    className={`p-2 rounded-xl border text-xs font-bold flex items-center justify-center gap-1 transition-all ${
                      paymentMethod === 'tarjeta_debito'
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <CreditCard className="w-3.5 h-3.5" />
                    <span>Débito</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentMethod('tarjeta_credito')}
                    className={`p-2 rounded-xl border text-xs font-bold flex items-center justify-center gap-1 transition-all ${
                      paymentMethod === 'tarjeta_credito'
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <CreditCard className="w-3.5 h-3.5" />
                    <span>Crédito</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentMethod('transferencia_qr')}
                    className={`p-2 rounded-xl border text-xs font-bold flex items-center justify-center gap-1 transition-all ${
                      paymentMethod === 'transferencia_qr'
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <QrCode className="w-3.5 h-3.5" />
                    <span>QR Pago</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentMethod('mercado_pago')}
                    className="p-2 rounded-xl border text-xs font-bold flex items-center justify-center gap-1 transition-all bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                  >
                    <QrCode className="w-3.5 h-3.5" />
                    <span>Mercado Pago</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentMethod('cuenta_corriente')}
                    className={`p-2 rounded-xl border text-xs font-bold flex items-center justify-center gap-1 transition-all ${
                      paymentMethod === 'cuenta_corriente'
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>Cta. Cte.</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentMethod('otro')}
                    className={`p-2 rounded-xl border text-xs font-bold flex items-center justify-center gap-1 transition-all ${
                      paymentMethod === 'otro'
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <span>Vales/Otro</span>
                  </button>
                </div>
              </div>

              {/* Cash tender & change calculator */}
              {paymentMethod === 'efectivo' && (
                <div className="mt-3 p-3 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold text-slate-700">Importe recibido ($):</span>
                    <input
                      type="number"
                      placeholder="0"
                      value={cashTendered}
                      onChange={e =>
                        setCashTendered(e.target.value === '' ? '' : Number(e.target.value))
                      }
                      className="w-32 px-3 py-1.5 rounded-xl border border-slate-300 font-extrabold text-right text-base focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>

                  {/* Preset quick cash buttons */}
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {[total, 2000, 5000, 10000, 20000].map((amt, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handlePresetCash(amt)}
                        className="px-2 py-1 rounded-lg bg-white border border-slate-300 text-[11px] font-bold hover:bg-emerald-50 text-slate-700"
                      >
                        {idx === 0 ? 'Exacto' : `$${amt.toLocaleString('es-AR')}`}
                      </button>
                    ))}
                  </div>

                  {/* Change due display */}
                  <div className="pt-2 border-t border-slate-200 flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-500 uppercase">Vuelto a entregar:</span>
                    <span className="text-lg font-black text-emerald-800">
                      ${changeDue.toLocaleString('es-AR')}
                    </span>
                  </div>
                </div>
              )}

              {/* BIG CONFIRMAR VENTA BUTTON with double-click protection */}
              <button
                type="button"
                disabled={isProcessingSale || cart.length === 0}
                onClick={handleCompleteSale}
                className={`w-full mt-4 py-4 rounded-2xl font-black text-lg sm:text-xl shadow-xl transition-all flex items-center justify-center gap-2 ${
                  cart.length === 0
                    ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                    : isProcessingSale
                    ? 'bg-emerald-400 text-white cursor-wait'
                    : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-700/25 active:scale-98'
                }`}
              >
                <CheckCircle className="w-6 h-6" />
                <span>
                  {isProcessingSale ? 'REGISTRANDO VENTA...' : 'CONFIRMAR VENTA / COBRAR'}
                </span>
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* HISTORIAL DE VENTAS TAB (Buscador por número de operación, fecha, medio de pago) */
        <div className="bg-white rounded-3xl border border-slate-200 shadow-xs p-5 sm:p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-lg font-black text-slate-900">Historial de Ventas Realizadas</h3>
              <p className="text-xs text-slate-500">
                Consulte tickets emitidos, busque por fecha o método de pago, y gestione comprobantes
              </p>
            </div>

            <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
              <span>{filteredSales.length} de {sales.length} ventas</span>
            </div>
          </div>

          {/* Historial Search & Filters */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 p-3 bg-slate-50 rounded-2xl border border-slate-200">
            {/* Search by Ticket # or product */}
            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                N° Operación / Ticket
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Ej: TK-0001042 o producto..."
                  value={historySearch}
                  onChange={e => setHistorySearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 text-xs sm:text-sm rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            {/* Filter by Date */}
            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                Filtrar por Fecha
              </label>
              <input
                type="date"
                value={historyDate}
                onChange={e => setHistoryDate(e.target.value)}
                className="w-full px-3 py-1.5 text-xs sm:text-sm rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500 font-medium"
              />
            </div>

            {/* Filter by Payment Method */}
            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                Método de Pago
              </label>
              <select
                value={historyPaymentMethod}
                onChange={e => setHistoryPaymentMethod(e.target.value)}
                className="w-full px-3 py-1.5 text-xs sm:text-sm rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500 font-medium"
              >
                <option value="todos">Todos los Medios</option>
                <option value="efectivo">Efectivo</option>
                <option value="tarjeta_debito">Tarjeta Débito</option>
                <option value="tarjeta_credito">Tarjeta Crédito</option>
                <option value="transferencia_qr">Transferencia / QR</option>
                <option value="mercado_pago">Mercado Pago</option>
                <option value="cuenta_corriente">Cuenta Corriente</option>
                <option value="otro">Vales / Otro</option>
              </select>
            </div>

            {/* Filter by Status */}
            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                Estado
              </label>
              <select
                value={historyStatus}
                onChange={e => setHistoryStatus(e.target.value)}
                className="w-full px-3 py-1.5 text-xs sm:text-sm rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500 font-medium"
              >
                <option value="todos">Todos los Estados</option>
                <option value="completada">Completadas</option>
                <option value="anulada">Anuladas</option>
              </select>
            </div>
          </div>

          {/* Sales History Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500 text-xs font-bold uppercase">
                  <th className="pb-3">Comprobante</th>
                  <th className="pb-3">Fecha y Hora</th>
                  <th className="pb-3">Detalle Productos</th>
                  <th className="pb-3">Medio de Pago</th>
                  <th className="pb-3 text-right">Total</th>
                  <th className="pb-3">Estado</th>
                  <th className="pb-3 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredSales.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400">
                      <Receipt className="w-12 h-12 mx-auto mb-2 text-slate-300" />
                      <p className="font-bold text-sm text-slate-700">No se encontraron ventas</p>
                      <p className="text-xs text-slate-400 mt-1">
                        Intente cambiar los filtros o el término de búsqueda.
                      </p>
                    </td>
                  </tr>
                ) : (
                  filteredSales.map(sale => (
                    <tr
                      key={sale.id}
                      className={sale.status === 'anulada' ? 'bg-rose-50/30 hover:bg-rose-50/50' : 'hover:bg-slate-50'}
                    >
                      <td className="py-3 font-mono font-bold text-slate-900">{sale.saleNumber}</td>
                      <td className="py-3 text-xs text-slate-500">
                        <span className="block font-medium text-slate-700">
                          {new Date(sale.date).toLocaleDateString('es-AR')}
                        </span>
                        <span>
                          {new Date(sale.date).toLocaleTimeString('es-AR', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </td>

                      <td className="py-3 text-slate-700">
                        <span className="font-semibold text-slate-900">{sale.itemCount}</span> artículos
                        <span className="block text-xs text-slate-400 max-w-sm truncate">
                          {sale.items.map(i => `${i.quantity}x ${i.name}`).join(', ')}
                        </span>
                      </td>

                      <td className="py-3 capitalize text-xs font-semibold text-slate-700">
                        {sale.paymentMethod.replace('_', ' ')}
                      </td>

                      <td className="py-3 text-right font-black text-slate-900 text-base">
                        ${sale.total.toLocaleString('es-AR')}
                      </td>

                      <td className="py-3">
                        {sale.status === 'completada' ? (
                          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
                            Completada
                          </span>
                        ) : (
                          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-800">
                            Anulada
                          </span>
                        )}
                      </td>

                      <td className="py-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {/* Consultar detalle y ticket */}
                          <button
                            onClick={() => openTicketModal(sale)}
                            className="p-1.5 text-slate-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors"
                            title="Consultar detalles y comprobante de venta"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          {/* Anular venta */}
                          {sale.status === 'completada' && (
                            <button
                              onClick={() => handleOpenCancelSaleModal(sale)}
                              className="p-1.5 text-slate-400 hover:text-amber-700 hover:bg-amber-50 rounded-lg transition-colors"
                              title="Anular venta y reponer stock al inventario"
                            >
                              <RotateCcw className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal: Confirmación de Anulación de Venta con Restitución de Stock */}
      <CancelSaleConfirmModal
        sale={saleToCancel}
        isOpen={isCancelModalOpen}
        onClose={() => {
          setIsCancelModalOpen(false);
          setSaleToCancel(null);
        }}
        onConfirm={handleConfirmCancelSale}
      />

      {/* Modal: Confirmación de Cancelación de Venta en Curso */}
      {isCancelCartConfirmOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3 text-amber-600 mb-3">
              <div className="p-2.5 bg-amber-100 rounded-2xl">
                <AlertOctagon className="w-6 h-6" />
              </div>
              <h4 className="text-lg font-black text-slate-900">¿Cancelar Venta en Curso?</h4>
            </div>

            <p className="text-sm text-slate-600 leading-relaxed">
              ¿Desea cancelar la venta actual y vaciar el changuito? Los productos no serán cobrados ni descontados del inventario.
            </p>

            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                onClick={() => setIsCancelCartConfirmOpen(false)}
                className="px-4 py-2.5 rounded-xl border border-slate-300 font-bold text-xs sm:text-sm text-slate-700 hover:bg-slate-100 transition-colors"
              >
                Volver a la venta
              </button>
              <button
                onClick={handleConfirmCancelOperation}
                className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs sm:text-sm shadow-md transition-colors"
              >
                Sí, Vaciar y Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
