import React, { useState, useMemo } from 'react';
import { useSupermarket } from '../../context/SupermarketContext';
import { StockBadge } from '../common/Badge';
import { ExportService } from '../../services';
import { Product, calculateSuggestedQuantity, OrderStatus } from '../../models';
import {
  AlertCircle,
  AlertTriangle,
  AlertOctagon,
  FileSpreadsheet,
  CheckSquare,
  Square,
  Truck,
  Phone,
  MessageCircle,
  Mail,
  Printer,
  CheckCircle2,
  PackageCheck,
  Plus,
  Minus,
  Edit3,
  X,
  Search,
  BookmarkCheck,
  RefreshCw,
  Send,
  DollarSign,
  Package,
} from 'lucide-react';

export const ProductosFaltantesView: React.FC = () => {
  const {
    products,
    missingProducts,
    outOfStockProducts,
    lowStockProducts,
    suppliers,
    toggleManualMissing,
    updateOrderStatus,
    bulkUpdateOrderStatus,
    updateCustomReplenishQty,
    receiveStockOrder,
    openStockModal,
    showNotification,
  } = useSupermarket();

  // Search & Filters
  const [search, setSearch] = useState('');
  const [tabFilter, setTabFilter] = useState<'todos' | 'agotados' | 'bajo' | 'manuales'>('todos');
  const [supplierFilter, setSupplierFilter] = useState<string>('todos');

  // Selected items state
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Modals inside faltantes
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);
  const [isReceiveModalOpen, setIsReceiveModalOpen] = useState(false);
  const [isAddManualModalOpen, setIsAddManualModalOpen] = useState(false);
  const [deliveryNote, setDeliveryNote] = useState('');

  // Editing quantities mode
  const [isEditingQty, setIsEditingQty] = useState(false);

  // Manual search in add manual modal
  const [manualSearch, setManualSearch] = useState('');

  // Filter missing products
  const filteredProducts = useMemo(() => {
    const q = search.trim().toLowerCase();
    return missingProducts.filter(p => {
      // Tab filter
      if (tabFilter === 'agotados' && p.stock > 0) return false;
      if (tabFilter === 'bajo' && (p.stock <= 0 || p.stock > p.minStock)) return false;
      if (tabFilter === 'manuales' && !p.isManuallyMarkedMissing) return false;

      // Supplier filter
      if (supplierFilter !== 'todos' && p.supplierId !== supplierFilter) return false;

      // Query filter
      if (q) {
        const matchesName = p.name.toLowerCase().includes(q);
        const matchesCode = p.code.toLowerCase().includes(q);
        const matchesInternal = p.internalCode ? p.internalCode.toLowerCase().includes(q) : false;
        const matchesSupplier = p.supplierName ? p.supplierName.toLowerCase().includes(q) : false;
        if (!matchesName && !matchesCode && !matchesInternal && !matchesSupplier) {
          return false;
        }
      }

      return true;
    });
  }, [missingProducts, tabFilter, supplierFilter, search]);

  // Quantities helper
  const getProductReplenishQty = (p: Product) => {
    if (p.customReplenishQty && p.customReplenishQty > 0) {
      return p.customReplenishQty;
    }
    return calculateSuggestedQuantity(p);
  };

  // Selection handlers
  const handleToggleSelect = (id: string) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (selectedIds.length === filteredProducts.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredProducts.map(p => p.id));
    }
  };

  const handleDeselectAll = () => {
    setSelectedIds([]);
  };

  // Action: Marcar seleccionados como solicitado
  const handleMarkSelectedAsRequested = () => {
    if (selectedIds.length === 0) {
      showNotification('warning', 'Seleccione al menos un producto para marcar como solicitado.', 'Sin selección');
      return;
    }
    bulkUpdateOrderStatus(selectedIds, 'solicitado');
  };

  // Action: Exportar seleccionados o todos a Excel
  const handleExport = () => {
    const prodsToExport = selectedIds.length > 0
      ? missingProducts.filter(p => selectedIds.includes(p.id))
      : missingProducts;

    ExportService.exportMissingProductsToExcel(prodsToExport);
  };

  // Prepare Order items
  const orderProducts = useMemo(() => {
    const targetList = selectedIds.length > 0
      ? missingProducts.filter(p => selectedIds.includes(p.id))
      : filteredProducts;

    return targetList.map(p => ({
      product: p,
      quantity: getProductReplenishQty(p),
      subtotal: getProductReplenishQty(p) * p.costPrice,
    }));
  }, [selectedIds, missingProducts, filteredProducts]);

  // Grouped by supplier for Prepare Order modal
  const groupedBySupplier = useMemo(() => {
    const map = new Map<string, { supplierName: string; supplierPhone: string; supplierEmail?: string; items: typeof orderProducts }>();

    for (const item of orderProducts) {
      const supKey = item.product.supplierName || 'Sin Proveedor Asignado';
      const existing = map.get(supKey);
      const supplierObj = suppliers.find(s => s.id === item.product.supplierId);

      if (existing) {
        existing.items.push(item);
      } else {
        map.set(supKey, {
          supplierName: supKey,
          supplierPhone: supplierObj?.phone || '',
          supplierEmail: supplierObj?.email || '',
          items: [item],
        });
      }
    }

    return Array.from(map.entries()).map(([name, data]) => ({
      name,
      ...data,
      totalCost: data.items.reduce((sum, i) => sum + i.subtotal, 0),
      totalUnits: data.items.reduce((sum, i) => sum + i.quantity, 0),
    }));
  }, [orderProducts, suppliers]);

  const totalEstimatedCost = useMemo(() => {
    return orderProducts.reduce((sum, i) => sum + i.subtotal, 0);
  }, [orderProducts]);

  // Receive merchandise items state
  const [receiveQuantities, setReceiveQuantities] = useState<Record<string, number>>({});

  const handleOpenReceiveModal = () => {
    const targetList = selectedIds.length > 0
      ? missingProducts.filter(p => selectedIds.includes(p.id))
      : filteredProducts;

    if (targetList.length === 0) {
      showNotification('warning', 'No hay productos para recibir.', 'Atención');
      return;
    }

    const initMap: Record<string, number> = {};
    for (const p of targetList) {
      initMap[p.id] = getProductReplenishQty(p);
    }
    setReceiveQuantities(initMap);
    setDeliveryNote('');
    setIsReceiveModalOpen(true);
  };

  const handleConfirmReceive = () => {
    const items = Object.entries(receiveQuantities)
      .map(([productId, quantity]) => ({ productId, quantity: Number(quantity) || 0 }))
      .filter(item => item.quantity > 0);

    if (items.length === 0) {
      showNotification('warning', 'Ingrese al menos una cantidad mayor a 0 para recibir.', 'Cantidades vacías');
      return;
    }

    receiveStockOrder(items, deliveryNote ? `Remito/Factura N°: ${deliveryNote}` : undefined);
    setIsReceiveModalOpen(false);
    setSelectedIds([]);
  };

  // WhatsApp share link generator
  const getWhatsAppLink = (group: (typeof groupedBySupplier)[0]) => {
    const cleanPhone = group.supplierPhone.replace(/\D/g, '');
    const itemsText = group.items
      .map(i => `• ${i.product.name} (Cód: ${i.product.code}): ${i.quantity} ${i.product.unit}`)
      .join('%0A');

    const message = `Hola ${group.name}, te envío el pedido de reposición de SuperMarcket:%0A%0A${itemsText}%0A%0ATotal de artículos: ${group.totalUnits}%0A¡Muchas gracias!`;
    return cleanPhone ? `https://wa.me/${cleanPhone}?text=${message}` : `https://wa.me/?text=${message}`;
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* 1. Header with Title and Global Actions */}
      <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-3 bg-rose-100 text-rose-700 rounded-2xl">
              <AlertCircle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-xl sm:text-2xl font-black text-slate-900">
                Productos Faltantes y Reposición
              </h3>
              <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                Detección automática por stock mínimo, preparación de pedidos y recepción de mercadería
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => setIsAddManualModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-300 bg-slate-50 hover:bg-slate-100 text-slate-800 font-bold text-xs sm:text-sm transition-colors shadow-xs"
            title="Marcar manualmente un producto que requiere reposición"
          >
            <BookmarkCheck className="w-4 h-4 text-emerald-600" />
            <span>Marcar Faltante Manual</span>
          </button>

          <button
            onClick={handleExport}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-emerald-300 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold text-xs sm:text-sm transition-colors shadow-xs"
            title="Exportar lista de reposición a Excel"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span>Exportar Excel</span>
          </button>
        </div>
      </div>

      {/* 2. Top Summary Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div
          onClick={() => setTabFilter('todos')}
          className={`p-5 rounded-2xl border cursor-pointer transition-all ${
            tabFilter === 'todos'
              ? 'bg-slate-900 text-white border-slate-900 shadow-md'
              : 'bg-white border-slate-200 hover:border-slate-400'
          }`}
        >
          <div className="flex items-center justify-between">
            <span
              className={`text-xs font-bold uppercase tracking-wider ${
                tabFilter === 'todos' ? 'text-slate-300' : 'text-slate-500'
              }`}
            >
              Total a Reponer
            </span>
            <AlertCircle className={`w-5 h-5 ${tabFilter === 'todos' ? 'text-emerald-400' : 'text-slate-400'}`} />
          </div>
          <p className="text-3xl font-black mt-2">{missingProducts.length}</p>
          <p className={`text-xs mt-1 ${tabFilter === 'todos' ? 'text-slate-400' : 'text-slate-500'}`}>
            Stock bajo, agotados o manuales
          </p>
        </div>

        <div
          onClick={() => setTabFilter('agotados')}
          className={`p-5 rounded-2xl border cursor-pointer transition-all ${
            tabFilter === 'agotados'
              ? 'bg-rose-50 border-rose-500 ring-2 ring-rose-500/30'
              : 'bg-white border-slate-200 hover:border-rose-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-rose-800 uppercase tracking-wider">
              Agotados (Stock 0)
            </span>
            <AlertOctagon className="w-5 h-5 text-rose-600" />
          </div>
          <p className="text-3xl font-black text-rose-900 mt-2">{outOfStockProducts.length}</p>
          <p className="text-xs text-rose-700 mt-1">Urgencia máxima: 0 unidades</p>
        </div>

        <div
          onClick={() => setTabFilter('bajo')}
          className={`p-5 rounded-2xl border cursor-pointer transition-all ${
            tabFilter === 'bajo'
              ? 'bg-amber-50 border-amber-500 ring-2 ring-amber-500/30'
              : 'bg-white border-slate-200 hover:border-amber-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-800 uppercase tracking-wider">
              Stock Bajo
            </span>
            <AlertTriangle className="w-5 h-5 text-amber-600" />
          </div>
          <p className="text-3xl font-black text-amber-900 mt-2">{lowStockProducts.length}</p>
          <p className="text-xs text-amber-700 mt-1">Menor o igual al stock mínimo</p>
        </div>

        <div className="p-5 rounded-2xl border border-slate-200 bg-white shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Inversión Estimada
            </span>
            <DollarSign className="w-5 h-5 text-emerald-600" />
          </div>
          <p className="text-2xl sm:text-3xl font-black text-slate-900 mt-2">
            ${totalEstimatedCost.toLocaleString('es-AR')}
          </p>
          <p className="text-xs text-slate-500 mt-1">Costo total de reposición sugerida</p>
        </div>
      </div>

      {/* 3. Search and Quick Filters */}
      <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar faltante por nombre, código de barras, SKU o proveedor..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500 text-sm font-medium"
            />
          </div>

          <div className="w-full md:w-64">
            <select
              value={supplierFilter}
              onChange={e => setSupplierFilter(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500 text-sm font-medium"
            >
              <option value="todos">Todos los Proveedores</option>
              {suppliers.map(s => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Tab Filters */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-1 border-t border-slate-100">
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setTabFilter('todos')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                tabFilter === 'todos'
                  ? 'bg-slate-900 text-white'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              Todos ({missingProducts.length})
            </button>
            <button
              onClick={() => setTabFilter('agotados')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                tabFilter === 'agotados'
                  ? 'bg-rose-600 text-white'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              Solo Agotados ({outOfStockProducts.length})
            </button>
            <button
              onClick={() => setTabFilter('bajo')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                tabFilter === 'bajo'
                  ? 'bg-amber-600 text-white'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              Solo Stock Bajo ({lowStockProducts.length})
            </button>
            <button
              onClick={() => setTabFilter('manuales')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                tabFilter === 'manuales'
                  ? 'bg-emerald-700 text-white'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              Marcados Manuales ({missingProducts.filter(p => p.isManuallyMarkedMissing).length})
            </button>
          </div>

          <button
            onClick={() => setIsEditingQty(prev => !prev)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${
              isEditingQty
                ? 'bg-emerald-100 text-emerald-800 border-emerald-300 ring-2 ring-emerald-500/20'
                : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
            }`}
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>{isEditingQty ? 'Terminar edición de cantidades' : 'Editar cantidades'}</span>
          </button>
        </div>
      </div>

      {/* 4. Action Toolbar for Missing Products */}
      <div className="bg-slate-900 text-white p-4 rounded-3xl shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={handleSelectAll}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold transition-colors"
          >
            {selectedIds.length === filteredProducts.length && filteredProducts.length > 0 ? (
              <CheckSquare className="w-4 h-4 text-emerald-400" />
            ) : (
              <Square className="w-4 h-4 text-slate-400" />
            )}
            <span>
              {selectedIds.length === filteredProducts.length && filteredProducts.length > 0
                ? 'Deseleccionar todos'
                : 'Seleccionar todos'}
            </span>
          </button>

          {selectedIds.length > 0 && (
            <span className="text-xs font-bold text-emerald-400 bg-emerald-950/60 px-3 py-1 rounded-xl border border-emerald-800/40">
              {selectedIds.length} seleccionados
            </span>
          )}

          {selectedIds.length > 0 && (
            <button
              onClick={handleDeselectAll}
              className="text-xs text-slate-400 hover:text-white underline font-medium"
            >
              Quitar selección
            </button>
          )}
        </div>

        {/* Core required buttons for faltantes */}
        <div className="flex flex-wrap items-center gap-2">
          {/* 1. Preparar Pedido */}
          <button
            onClick={() => setIsOrderModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs sm:text-sm shadow-md transition-all active:scale-98"
          >
            <Truck className="w-4 h-4" />
            <span>Preparar Pedido {selectedIds.length > 0 ? `(${selectedIds.length})` : ''}</span>
          </button>

          {/* 2. Marcar como Solicitado */}
          <button
            onClick={handleMarkSelectedAsRequested}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs transition-colors"
            title="Marcar los productos seleccionados como solicitados al proveedor"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Marcar como Solicitado</span>
          </button>

          {/* 3. Registrar Mercadería Recibida */}
          <button
            onClick={handleOpenReceiveModal}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500/20 border border-emerald-400/40 hover:bg-emerald-500/30 text-emerald-300 font-bold text-xs sm:text-sm transition-colors"
          >
            <PackageCheck className="w-4 h-4 text-emerald-400" />
            <span>Registrar Mercadería Recibida</span>
          </button>
        </div>
      </div>

      {/* 5. Missing Products Table */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 text-xs font-bold uppercase tracking-wider">
              <tr>
                <th className="py-4 px-3 sm:px-4 text-center w-12">
                  <span className="sr-only">Selección</span>
                </th>
                <th className="py-4 px-4 sm:px-6">Producto y Códigos</th>
                <th className="py-4 px-4 sm:px-6 text-center">Stock Actual</th>
                <th className="py-4 px-4 sm:px-6 text-center">Mínimo / Objetivo</th>
                <th className="py-4 px-4 sm:px-6 text-center">Cantidad Sugerida</th>
                <th className="py-4 px-4 sm:px-6">Proveedor</th>
                <th className="py-4 px-4 sm:px-6 text-center">Estado del Pedido</th>
                <th className="py-4 px-4 sm:px-6 text-right">Inversión Estimada</th>
                <th className="py-4 px-4 sm:px-6 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-14 text-center text-slate-400">
                    <CheckCircle2 className="w-12 h-12 mx-auto mb-2 text-emerald-500" />
                    <p className="font-bold text-base text-slate-800">No hay productos faltantes en este filtro</p>
                    <p className="text-xs text-slate-500 mt-1">
                      El inventario se encuentra al día o no hay coincidencias con la búsqueda.
                    </p>
                  </td>
                </tr>
              ) : (
                filteredProducts.map(prod => {
                  const isSelected = selectedIds.includes(prod.id);
                  const suggested = getProductReplenishQty(prod);
                  const supplier = suppliers.find(s => s.id === prod.supplierId);
                  const itemEstimatedCost = suggested * prod.costPrice;
                  const target = prod.targetStock || Math.max(prod.minStock * 2, prod.minStock + 10);
                  const orderStatus: OrderStatus = prod.orderStatus || 'pendiente';

                  return (
                    <tr
                      key={prod.id}
                      className={`transition-colors ${
                        isSelected
                          ? 'bg-emerald-50/60'
                          : prod.stock <= 0
                          ? 'bg-rose-50/20 hover:bg-rose-50/40'
                          : 'hover:bg-slate-50'
                      }`}
                    >
                      {/* Checkbox */}
                      <td className="py-4 px-3 sm:px-4 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleSelect(prod.id)}
                          className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500 cursor-pointer"
                        />
                      </td>

                      {/* Producto y Códigos */}
                      <td className="py-4 px-4 sm:px-6">
                        <div className="flex items-center gap-2">
                          <p className="font-black text-slate-900 text-sm sm:text-base leading-snug">
                            {prod.name}
                          </p>
                          {prod.isManuallyMarkedMissing && (
                            <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full">
                              Manual
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-slate-500 font-mono mt-0.5">
                          <span>{prod.code}</span>
                          <span>&bull;</span>
                          <span className="text-slate-600">{prod.brand}</span>
                          <span>&bull;</span>
                          <span className="text-slate-500">{prod.category}</span>
                        </div>
                      </td>

                      {/* Stock Actual */}
                      <td className="py-4 px-4 sm:px-6 text-center">
                        <span
                          className={`font-black text-base ${
                            prod.stock <= 0 ? 'text-rose-600' : 'text-amber-700'
                          }`}
                        >
                          {prod.stock}
                        </span>
                        <span className="text-xs text-slate-400 block font-medium">
                          {prod.unit}
                        </span>
                      </td>

                      {/* Mínimo / Objetivo */}
                      <td className="py-4 px-4 sm:px-6 text-center text-xs font-semibold text-slate-600">
                        <div>
                          Mín: <strong className="text-slate-800">{prod.minStock}</strong>
                        </div>
                        <div className="text-[11px] text-slate-400">
                          Objetivo: <strong className="text-emerald-700">{target}</strong>
                        </div>
                      </td>

                      {/* Cantidad Sugerida (Editable) */}
                      <td className="py-4 px-4 sm:px-6 text-center">
                        {isEditingQty ? (
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => updateCustomReplenishQty(prod.id, Math.max(1, suggested - 1))}
                              className="w-7 h-7 flex items-center justify-center rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold"
                            >
                              <Minus className="w-3 h-3" />
                            </button>
                            <input
                              type="number"
                              min="1"
                              value={suggested}
                              onChange={e => updateCustomReplenishQty(prod.id, Number(e.target.value) || 1)}
                              className="w-16 px-2 py-1 text-center font-black text-sm rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-500"
                            />
                            <button
                              onClick={() => updateCustomReplenishQty(prod.id, suggested + 1)}
                              className="w-7 h-7 flex items-center justify-center rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold"
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>
                        ) : (
                          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-emerald-50 text-emerald-800 font-black text-sm border border-emerald-200">
                            <span>+{suggested} {prod.unit}</span>
                          </div>
                        )}
                        <span className="block text-[11px] text-slate-400 mt-0.5">
                          Obj ({target}) - Act ({prod.stock})
                        </span>
                      </td>

                      {/* Proveedor */}
                      <td className="py-4 px-4 sm:px-6">
                        {supplier ? (
                          <div>
                            <p className="font-bold text-slate-900 text-xs sm:text-sm flex items-center gap-1.5">
                              <Truck className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                              <span className="truncate max-w-[150px]">{supplier.name}</span>
                            </p>
                            <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1">
                              <Phone className="w-3 h-3 text-slate-400" />
                              <span>{supplier.phone}</span>
                            </p>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400 italic">Sin proveedor</span>
                        )}
                      </td>

                      {/* Estado del Pedido */}
                      <td className="py-4 px-4 sm:px-6 text-center">
                        <select
                          value={orderStatus}
                          onChange={e => updateOrderStatus(prod.id, e.target.value as OrderStatus)}
                          className={`text-xs font-bold px-2.5 py-1 rounded-xl border transition-colors cursor-pointer ${
                            orderStatus === 'solicitado'
                              ? 'bg-blue-50 text-blue-700 border-blue-300'
                              : orderStatus === 'recibido'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                              : 'bg-amber-50 text-amber-800 border-amber-300'
                          }`}
                        >
                          <option value="pendiente">Pendiente</option>
                          <option value="solicitado">Solicitado</option>
                          <option value="recibido">Recibido</option>
                        </select>
                      </td>

                      {/* Inversión Estimada */}
                      <td className="py-4 px-4 sm:px-6 text-right font-black text-slate-900 text-sm sm:text-base">
                        ${itemEstimatedCost.toLocaleString('es-AR')}
                        <span className="block text-[11px] font-normal text-slate-500">
                          (${prod.costPrice} c/u)
                        </span>
                      </td>

                      {/* Acciones */}
                      <td className="py-4 px-4 sm:px-6 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => {
                              setSelectedIds([prod.id]);
                              handleOpenReceiveModal();
                            }}
                            className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1 shadow-xs transition-colors"
                            title="Recibir mercadería de este producto"
                          >
                            <PackageCheck className="w-3.5 h-3.5" />
                            <span>Recibir</span>
                          </button>

                          {prod.isManuallyMarkedMissing && (
                            <button
                              onClick={() => toggleManualMissing(prod.id, false)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                              title="Quitar de faltantes manuales"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 6. MODAL: Preparar Pedido Consolidado por Proveedor */}
      {isOrderModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-3xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="bg-slate-900 text-white p-5 sm:p-6 flex items-center justify-between">
              <div>
                <h4 className="text-xl font-black flex items-center gap-2">
                  <Truck className="w-6 h-6 text-emerald-400" />
                  <span>Preparación de Pedido de Reposición</span>
                </h4>
                <p className="text-xs text-slate-400 mt-0.5">
                  Consolidado de {orderProducts.length} productos agrupados por proveedor
                </p>
              </div>
              <button
                onClick={() => setIsOrderModalOpen(false)}
                className="text-slate-400 hover:text-white p-2 rounded-xl hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-5 sm:p-6 overflow-y-auto space-y-6 flex-1">
              <div className="flex items-center justify-between bg-emerald-50 border border-emerald-200 p-4 rounded-2xl">
                <div>
                  <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider">
                    Total Inversión Estimada
                  </span>
                  <p className="text-2xl sm:text-3xl font-black text-emerald-950">
                    ${totalEstimatedCost.toLocaleString('es-AR')}
                  </p>
                </div>
                <div className="text-right text-xs text-emerald-800">
                  <p className="font-bold">
                    {orderProducts.reduce((acc, i) => acc + i.quantity, 0)} unidades en total
                  </p>
                  <p>{groupedBySupplier.length} proveedores involucrados</p>
                </div>
              </div>

              {groupedBySupplier.map(group => (
                <div key={group.name} className="border border-slate-200 rounded-2xl p-4 sm:p-5 bg-slate-50/50">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
                    <div>
                      <h5 className="font-black text-base text-slate-900 flex items-center gap-2">
                        <Truck className="w-4 h-4 text-emerald-600" />
                        <span>{group.name}</span>
                      </h5>
                      {group.supplierPhone && (
                        <p className="text-xs text-slate-500 mt-0.5">Tel: {group.supplierPhone}</p>
                      )}
                    </div>

                    {/* Direct Contact Buttons */}
                    <div className="flex items-center gap-2">
                      {group.supplierPhone && (
                        <a
                          href={getWhatsAppLink(group)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition-colors"
                          title="Enviar pedido por WhatsApp"
                        >
                          <MessageCircle className="w-3.5 h-3.5" />
                          <span>WhatsApp</span>
                        </a>
                      )}

                      {group.supplierEmail && (
                        <a
                          href={`mailto:${group.supplierEmail}?subject=Pedido SuperMarcket&body=Estimado ${group.name}, adjunto lista de pedido.`}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs transition-colors"
                          title="Enviar pedido por Email"
                        >
                          <Mail className="w-3.5 h-3.5" />
                          <span>Email</span>
                        </a>
                      )}
                    </div>
                  </div>

                  {/* Group items */}
                  <div className="mt-3 divide-y divide-slate-100 text-xs">
                    {group.items.map(item => (
                      <div key={item.product.id} className="py-2 flex items-center justify-between">
                        <div>
                          <p className="font-bold text-slate-900">{item.product.name}</p>
                          <p className="text-[11px] text-slate-400 font-mono">
                            Cód: {item.product.code} &bull; Stock actual: {item.product.stock}
                          </p>
                        </div>
                        <div className="text-right">
                          <span className="font-black text-emerald-800 text-sm">
                            {item.quantity} {item.product.unit}
                          </span>
                          <span className="block text-[11px] text-slate-500">
                            ${item.subtotal.toLocaleString('es-AR')} (${item.product.costPrice} c/u)
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-3 pt-3 border-t border-slate-200 flex items-center justify-between text-xs font-bold">
                    <span className="text-slate-600">Subtotal Proveedor:</span>
                    <span className="text-slate-900 text-sm">
                      ${group.totalCost.toLocaleString('es-AR')}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Footer */}
            <div className="p-4 sm:p-5 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
              <button
                onClick={() => ExportService.exportMissingProductsToExcel(orderProducts.map(i => i.product))}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 font-bold text-xs sm:text-sm text-slate-700 transition-colors"
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                <span>Exportar Orden a Excel</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    const idsToMark = orderProducts.map(i => i.product.id);
                    bulkUpdateOrderStatus(idsToMark, 'solicitado');
                    setIsOrderModalOpen(false);
                  }}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs sm:text-sm shadow-md transition-colors"
                >
                  <Send className="w-4 h-4" />
                  <span>Marcar Todo como Solicitado</span>
                </button>

                <button
                  onClick={() => setIsOrderModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 font-bold text-xs sm:text-sm text-slate-700 transition-colors"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 7. MODAL: Registrar Mercadería Recibida */}
      {isReceiveModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="bg-emerald-700 text-white p-5 sm:p-6 flex items-center justify-between">
              <div>
                <h4 className="text-xl font-black flex items-center gap-2">
                  <PackageCheck className="w-6 h-6" />
                  <span>Registrar Recepción de Mercadería</span>
                </h4>
                <p className="text-xs text-emerald-100 mt-0.5">
                  Ingrese las unidades recibidas para actualizar el inventario automáticamente
                </p>
              </div>
              <button
                onClick={() => setIsReceiveModalOpen(false)}
                className="text-emerald-100 hover:text-white p-2 rounded-xl hover:bg-emerald-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 sm:p-6 overflow-y-auto space-y-4 flex-1">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">
                  Número de Remito / Factura del Proveedor (Opcional)
                </label>
                <input
                  type="text"
                  placeholder="Ej: REM-0001-0004521"
                  value={deliveryNote}
                  onChange={e => setDeliveryNote(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500 text-sm font-semibold"
                />
              </div>

              <div className="border border-slate-200 rounded-2xl overflow-hidden">
                <table className="w-full text-left text-xs sm:text-sm">
                  <thead className="bg-slate-50 border-b border-slate-200 font-bold text-slate-600">
                    <tr>
                      <th className="py-3 px-4">Producto</th>
                      <th className="py-3 px-4 text-center">Stock Actual</th>
                      <th className="py-3 px-4 text-center">Unidades Recibidas</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {Object.keys(receiveQuantities).map(id => {
                      const prod = products.find(p => p.id === id);
                      if (!prod) return null;
                      return (
                        <tr key={id} className="hover:bg-slate-50">
                          <td className="py-3 px-4">
                            <p className="font-bold text-slate-900">{prod.name}</p>
                            <p className="text-[11px] text-slate-400 font-mono">{prod.code}</p>
                          </td>
                          <td className="py-3 px-4 text-center font-bold text-slate-600">
                            {prod.stock} {prod.unit}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <input
                              type="number"
                              min="0"
                              value={receiveQuantities[id] || 0}
                              onChange={e =>
                                setReceiveQuantities(prev => ({
                                  ...prev,
                                  [id]: Math.max(0, parseInt(e.target.value, 10) || 0),
                                }))
                              }
                              className="w-20 px-2.5 py-1.5 text-center font-black text-sm rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500 bg-white"
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="p-4 sm:p-5 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-3">
              <button
                onClick={() => setIsReceiveModalOpen(false)}
                className="px-4 py-2.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 font-bold text-xs sm:text-sm text-slate-700 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmReceive}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm shadow-md transition-colors"
              >
                <PackageCheck className="w-4 h-4" />
                <span>Confirmar e Ingresar a Stock</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 8. MODAL: Marcar Producto Faltante Manualmente */}
      {isAddManualModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-xl w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="bg-slate-900 text-white p-5 flex items-center justify-between">
              <div>
                <h4 className="text-lg font-black flex items-center gap-2">
                  <BookmarkCheck className="w-5 h-5 text-emerald-400" />
                  <span>Marcar Producto como Faltante</span>
                </h4>
                <p className="text-xs text-slate-400">
                  Agregue cualquier producto al listado de faltantes aunque aún tenga stock
                </p>
              </div>
              <button
                onClick={() => setIsAddManualModalOpen(false)}
                className="text-slate-400 hover:text-white p-1.5 rounded-xl hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-4 flex-1">
              <div className="relative">
                <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Buscar producto por nombre o código..."
                  value={manualSearch}
                  onChange={e => setManualSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500 text-sm font-medium"
                />
              </div>

              <div className="border border-slate-200 rounded-2xl max-h-72 overflow-y-auto divide-y divide-slate-100">
                {products
                  .filter(p => {
                    const q = manualSearch.toLowerCase();
                    return (
                      !q ||
                      p.name.toLowerCase().includes(q) ||
                      p.code.toLowerCase().includes(q)
                    );
                  })
                  .slice(0, 15)
                  .map(prod => (
                    <div
                      key={prod.id}
                      className="p-3 flex items-center justify-between hover:bg-slate-50 transition-colors"
                    >
                      <div>
                        <p className="font-bold text-slate-900 text-sm">{prod.name}</p>
                        <p className="text-xs text-slate-500 font-mono">
                          {prod.code} &bull; Stock: {prod.stock} (Mín: {prod.minStock})
                        </p>
                      </div>

                      <button
                        onClick={() => {
                          toggleManualMissing(prod.id, !prod.isManuallyMarkedMissing);
                        }}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
                          prod.isManuallyMarkedMissing
                            ? 'bg-rose-100 text-rose-800 hover:bg-rose-200'
                            : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs'
                        }`}
                      >
                        {prod.isManuallyMarkedMissing ? 'Quitar' : 'Marcar Faltante'}
                      </button>
                    </div>
                  ))}
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end">
              <button
                onClick={() => setIsAddManualModalOpen(false)}
                className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs transition-colors"
              >
                Listo
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
