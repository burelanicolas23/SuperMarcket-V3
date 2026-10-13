import React, { useState, useMemo } from 'react';
import { useSupermarket } from '../../context/SupermarketContext';
import { StockBadge } from '../common/Badge';
import { ExportService, ProductService } from '../../services';
import { Product } from '../../models';
import { ProductDetailModal } from '../modals/ProductDetailModal';
import { DeleteProductConfirmModal } from '../modals/DeleteProductConfirmModal';
import { ProductosFaltantesView } from './ProductosFaltantesView';
import {
  Package,
  Plus,
  Search,
  FileSpreadsheet,
  Edit,
  Trash2,
  Layers,
  ArrowUpDown,
  Filter,
  Eye,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  AlertOctagon,
  SlidersHorizontal,
  X,
  History,
  QrCode,
} from 'lucide-react';

export const ProductosView: React.FC = () => {
  const {
    products,
    missingProducts,
    openProductModal,
    openStockModal,
    deleteProduct,
    suppliers,

  } = useSupermarket();

  // Subsections per Prompt 5: A. Productos del local, B. Productos faltantes
  const [subSection, setSubSection] = useState<'local' | 'faltantes'>('local');

  // Search & Filter state
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('todos');
  const [statusFilter, setStatusFilter] = useState<string>('todos');
  const [selectedSupplier, setSelectedSupplier] = useState<string>('todos');

  // Sorting state
  const [sortBy, setSortBy] = useState<'name' | 'price' | 'stock' | 'date'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Modals state
  const [detailProduct, setDetailProduct] = useState<Product | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  // Top summary metrics
  const availableCount = useMemo(() => products.filter(p => p.stock > p.minStock).length, [products]);
  const lowStockCount = useMemo(() => products.filter(p => p.stock > 0 && p.stock <= p.minStock).length, [products]);
  const outOfStockCount = useMemo(() => products.filter(p => p.stock <= 0).length, [products]);

  // Filtered & sorted products using ProductService.filterAndSort
  const displayedProducts = useMemo(() => {
    return ProductService.filterAndSort({
      query: search,
      category: selectedCategory,
      status: statusFilter,
      supplierId: selectedSupplier,
      sortBy,
      sortOrder,
    });
  }, [products, search, selectedCategory, statusFilter, selectedSupplier, sortBy, sortOrder]);

  const handleOpenDetail = (prod: Product) => {
    setDetailProduct(prod);
    setIsDetailModalOpen(true);
  };

  const handleOpenDelete = (prod: Product) => {
    setProductToDelete(prod);
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDelete = (productId: string) => {
    deleteProduct(productId);
  };

  const handleResetFilters = () => {
    setSearch('');
    setSelectedCategory('todos');
    setStatusFilter('todos');
    setSelectedSupplier('todos');
    setSortBy('name');
    setSortOrder('asc');
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Subsecciones Requeridas por PROMPT 5: A. Productos del local y B. Productos faltantes */}
      <div className="bg-white p-2 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap gap-2">
        <button
          onClick={() => setSubSection('local')}
          className={`flex-1 min-w-[200px] flex items-center justify-center gap-2.5 py-3 px-4 rounded-xl font-black text-sm transition-all ${
            subSection === 'local'
              ? 'bg-emerald-600 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
          }`}
        >
          <Package className="w-5 h-5" />
          <span>A. Productos del Local ({products.length})</span>
        </button>

        <button
          onClick={() => setSubSection('faltantes')}
          className={`flex-1 min-w-[200px] flex items-center justify-center gap-2.5 py-3 px-4 rounded-xl font-black text-sm transition-all ${
            subSection === 'faltantes'
              ? 'bg-rose-600 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
          }`}
        >
          <AlertCircle className="w-5 h-5" />
          <span>B. Productos Faltantes</span>
          {missingProducts.length > 0 && (
            <span
              className={`px-2 py-0.5 rounded-full text-xs font-black ${
                subSection === 'faltantes'
                  ? 'bg-white text-rose-700'
                  : 'bg-rose-100 text-rose-700'
              }`}
            >
              {missingProducts.length}
            </span>
          )}
        </button>
      </div>

      {subSection === 'faltantes' ? (
        <ProductosFaltantesView />
      ) : (
        <>
          {/* 1. Header bar with Action buttons */}
          <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h3 className="text-xl font-black text-slate-900 flex items-center gap-2.5">
                <Package className="w-6 h-6 text-emerald-600" />
                <span>Productos del Local (Catálogo Integral)</span>
              </h3>
              <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                Todos los productos registrados con códigos de barra, marca, precios de compra/venta y stock
              </p>
            </div>

        <div className="flex flex-wrap items-center gap-2.5">

          <button
            onClick={() => ExportService.exportProductsToExcel()}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-300 bg-slate-50 hover:bg-slate-100 text-slate-800 font-bold text-xs sm:text-sm transition-colors shadow-xs"
            title="Descargar catálogo completo en Excel"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span>Exportar Excel</span>
          </button>

          <button
            onClick={() => openProductModal()}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm shadow-md shadow-emerald-700/20 active:scale-98 transition-all"
          >
            <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
            <span>Agregar Producto</span>
          </button>
        </div>
      </div>

      {/* 2. Top Summary Banner (Requerido: Total, Disponibles, Stock Bajo, Agotados) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        {/* Total productos */}
        <div
          onClick={() => setStatusFilter('todos')}
          className={`p-4 sm:p-5 rounded-2xl border transition-all cursor-pointer ${
            statusFilter === 'todos'
              ? 'bg-slate-900 text-white border-slate-900 shadow-md'
              : 'bg-white border-slate-200 hover:border-slate-400'
          }`}
        >
          <div className="flex items-center justify-between">
            <span
              className={`text-xs font-bold uppercase tracking-wider ${
                statusFilter === 'todos' ? 'text-slate-300' : 'text-slate-500'
              }`}
            >
              Total Productos
            </span>
            <Package
              className={`w-5 h-5 ${statusFilter === 'todos' ? 'text-emerald-400' : 'text-slate-400'}`}
            />
          </div>
          <p className="text-2xl sm:text-3xl font-black mt-2">{products.length}</p>
          <p
            className={`text-xs mt-0.5 ${
              statusFilter === 'todos' ? 'text-slate-400' : 'text-slate-500'
            }`}
          >
            En catálogo general
          </p>
        </div>

        {/* Disponibles */}
        <div
          onClick={() => setStatusFilter('disponible')}
          className={`p-4 sm:p-5 rounded-2xl border transition-all cursor-pointer ${
            statusFilter === 'disponible'
              ? 'bg-emerald-50 border-emerald-500 ring-2 ring-emerald-500/30'
              : 'bg-white border-slate-200 hover:border-emerald-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider">
              Disponibles
            </span>
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
          </div>
          <p className="text-2xl sm:text-3xl font-black text-emerald-900 mt-2">{availableCount}</p>
          <p className="text-xs text-emerald-700 mt-0.5">Stock en nivel óptimo</p>
        </div>

        {/* Stock Bajo */}
        <div
          onClick={() => setStatusFilter('bajo_stock')}
          className={`p-4 sm:p-5 rounded-2xl border transition-all cursor-pointer ${
            statusFilter === 'bajo_stock'
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
          <p className="text-2xl sm:text-3xl font-black text-amber-900 mt-2">{lowStockCount}</p>
          <p className="text-xs text-amber-700 mt-0.5">Próximos a agotarse</p>
        </div>

        {/* Agotados */}
        <div
          onClick={() => setStatusFilter('agotado')}
          className={`p-4 sm:p-5 rounded-2xl border transition-all cursor-pointer ${
            statusFilter === 'agotado'
              ? 'bg-rose-50 border-rose-500 ring-2 ring-rose-500/30'
              : 'bg-white border-slate-200 hover:border-rose-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-rose-800 uppercase tracking-wider">
              Agotados
            </span>
            <AlertOctagon className="w-5 h-5 text-rose-600" />
          </div>
          <p className="text-2xl sm:text-3xl font-black text-rose-900 mt-2">{outOfStockCount}</p>
          <p className="text-xs text-rose-700 mt-0.5">0 unidades en stock</p>
        </div>
      </div>

      {/* 3. Search, Filter & Sort Controls */}
      <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-4">
        {/* Main Search Input */}
        <div className="relative">
          <Search className="absolute left-3.5 top-3.5 w-5 h-5 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por Nombre, Código de Barras, Código Interno (SKU), Marca o Categoría..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-11 pr-10 py-3 rounded-2xl border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-sm font-semibold text-slate-900 placeholder:text-slate-400"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-3.5 top-3.5 text-slate-400 hover:text-slate-600 p-0.5"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Filters and Sorting Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-1">
          {/* Categoría */}
          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
              Categoría
            </label>
            <select
              value={selectedCategory}
              onChange={e => setSelectedCategory(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500 text-xs sm:text-sm font-medium"
            >
              <option value="todos">Todas las Categorías</option>
              {Array.from(new Set(products.map(p => p.category))).map(cat => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          {/* Proveedor */}
          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
              Proveedor
            </label>
            <select
              value={selectedSupplier}
              onChange={e => setSelectedSupplier(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500 text-xs sm:text-sm font-medium"
            >
              <option value="todos">Todos los Proveedores</option>
              {suppliers.map(sup => (
                <option key={sup.id} value={sup.id}>
                  {sup.name}
                </option>
              ))}
            </select>
          </div>

          {/* Estado de Stock */}
          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
              Estado de Existencias
            </label>
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500 text-xs sm:text-sm font-medium"
            >
              <option value="todos">Todos los Estados</option>
              <option value="disponible">Disponibles</option>
              <option value="bajo_stock">Stock Bajo</option>
              <option value="agotado">Agotados (0 unidades)</option>
            </select>
          </div>

          {/* Ordenamiento */}
          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
              Ordenar por
            </label>
            <div className="flex gap-1.5">
              <select
                value={sortBy}
                onChange={e => setSortBy(e.target.value as any)}
                className="flex-1 px-3 py-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500 text-xs sm:text-sm font-medium"
              >
                <option value="name">Nombre</option>
                <option value="price">Precio de Venta</option>
                <option value="stock">Cantidad Disponible</option>
                <option value="date">Fecha de Alta</option>
              </select>
              <button
                type="button"
                onClick={() => setSortOrder(prev => (prev === 'asc' ? 'desc' : 'asc'))}
                className="px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 hover:bg-slate-100 font-bold text-xs text-slate-700 transition-colors"
                title={sortOrder === 'asc' ? 'Orden Ascendente' : 'Orden Descendente'}
              >
                {sortOrder === 'asc' ? 'A-Z ↑' : 'Z-A ↓'}
              </button>
            </div>
          </div>
        </div>

        {/* Active Filters Pill Summary */}
        {(search || selectedCategory !== 'todos' || statusFilter !== 'todos' || selectedSupplier !== 'todos') && (
          <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs text-slate-500">
            <span>
              Mostrando <strong>{displayedProducts.length}</strong> de {products.length} productos
            </span>
            <button
              onClick={handleResetFilters}
              className="text-emerald-700 hover:text-emerald-800 font-bold flex items-center gap-1"
            >
              <X className="w-3.5 h-3.5" />
              Limpiar filtros
            </button>
          </div>
        )}
      </div>

      {/* 4. Products Table (Clear, readable, with alert row highlights) */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 text-xs font-bold uppercase tracking-wider">
              <tr>
                <th className="py-4 px-4 sm:px-6">Códigos</th>
                <th className="py-4 px-4 sm:px-6">Producto y Marca</th>
                <th className="py-4 px-4 sm:px-6">Categoría</th>
                <th className="py-4 px-4 sm:px-6 text-right">P. Compra</th>
                <th className="py-4 px-4 sm:px-6 text-right">P. Venta</th>
                <th className="py-4 px-4 sm:px-6 text-center">Disponible</th>
                <th className="py-4 px-4 sm:px-6">Estado</th>
                <th className="py-4 px-4 sm:px-6">Proveedor</th>
                <th className="py-4 px-4 sm:px-6 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {displayedProducts.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    <Package className="w-12 h-12 mx-auto mb-2 text-slate-300" />
                    <p className="font-bold text-base text-slate-800">
                      No se encontraron productos con estos criterios
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                      Intente modificar el buscador o reiniciar los filtros.
                    </p>
                    <button
                      onClick={handleResetFilters}
                      className="mt-3 px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs"
                    >
                      Restablecer Filtros
                    </button>
                  </td>
                </tr>
              ) : (
                displayedProducts.map(prod => {
                  const isOutOfStock = prod.stock <= 0;
                  const isLowStock = prod.stock > 0 && prod.stock <= prod.minStock;

                  const rowClass = isOutOfStock
                    ? 'bg-rose-50/40 hover:bg-rose-50/70'
                    : isLowStock
                    ? 'bg-amber-50/40 hover:bg-amber-50/70'
                    : 'hover:bg-slate-50/80';

                  return (
                    <tr key={prod.id} className={`${rowClass} transition-colors`}>
                      {/* Códigos (Interno + Barras) */}
                      <td className="py-3.5 px-4 sm:px-6">
                        <span className="font-mono text-xs font-black text-slate-900 bg-slate-100 px-2 py-0.5 rounded block w-fit">
                          {prod.internalCode}
                        </span>
                        <span className="font-mono text-[11px] text-slate-500 mt-0.5 block">
                          {prod.code}
                        </span>
                      </td>

                      {/* Producto y Marca */}
                      <td className="py-3.5 px-4 sm:px-6">
                        <button
                          onClick={() => handleOpenDetail(prod)}
                          className="text-left font-black text-slate-900 hover:text-emerald-700 text-sm sm:text-base leading-snug hover:underline block"
                        >
                          {prod.name}
                        </button>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-xs font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded">
                            {prod.brand}
                          </span>
                          {prod.location && (
                            <span className="text-[11px] text-slate-500">
                              &bull; {prod.location}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Categoría */}
                      <td className="py-3.5 px-4 sm:px-6 text-xs font-semibold text-slate-600">
                        {prod.category}
                      </td>

                      {/* Precio de Compra */}
                      <td className="py-3.5 px-4 sm:px-6 text-right font-medium text-slate-500 text-xs sm:text-sm">
                        ${prod.costPrice.toLocaleString('es-AR')}
                      </td>

                      {/* Precio de Venta */}
                      <td className="py-3.5 px-4 sm:px-6 text-right font-black text-slate-900 text-base">
                        ${prod.sellingPrice.toLocaleString('es-AR')}
                      </td>

                      {/* Cantidad Disponible */}
                      <td className="py-3.5 px-4 sm:px-6 text-center">
                        <span
                          className={`font-black text-base ${
                            isOutOfStock
                              ? 'text-rose-600'
                              : isLowStock
                              ? 'text-amber-800'
                              : 'text-slate-900'
                          }`}
                        >
                          {prod.stock}
                        </span>
                        <span className="text-xs text-slate-400 block font-normal">
                          {prod.unit} (mín: {prod.minStock})
                        </span>
                      </td>

                      {/* Estado */}
                      <td className="py-3.5 px-4 sm:px-6">
                        <StockBadge status={prod.status} size="sm" />
                      </td>

                      {/* Proveedor */}
                      <td className="py-3.5 px-4 sm:px-6 text-xs text-slate-600 max-w-[140px] truncate">
                        {prod.supplierName || (
                          <span className="text-slate-400 italic">Sin proveedor</span>
                        )}
                      </td>

                      {/* Botones de Gestión Requeridos */}
                      <td className="py-3.5 px-4 sm:px-6 text-center">
                        <div className="flex items-center justify-center gap-1">
                          {/* 1. Consultar Detalles */}
                          <button
                            onClick={() => handleOpenDetail(prod)}
                            className="p-2 text-slate-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-xl transition-colors"
                            title="Consultar detalles completos y código QR"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          {/* 2. Ajustar Stock */}
                          <button
                            onClick={() => openStockModal(prod)}
                            className="p-2 text-slate-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-xl transition-colors"
                            title="Ajustar stock (+ / -)"
                          >
                            <Layers className="w-4 h-4" />
                          </button>

                          {/* 3. Editar Producto */}
                          <button
                            onClick={() => openProductModal(prod)}
                            className="p-2 text-slate-600 hover:text-blue-700 hover:bg-blue-50 rounded-xl transition-colors"
                            title="Modificar precio, nombre o datos"
                          >
                            <Edit className="w-4 h-4" />
                          </button>

                          {/* 4. Eliminar Producto con Confirmación */}
                          <button
                            onClick={() => handleOpenDelete(prod)}
                            className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors"
                            title="Eliminar producto del catálogo"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
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

      {/* Modal: Detalle de Producto con QR y Movimientos */}
      <ProductDetailModal
        product={detailProduct}
        isOpen={isDetailModalOpen}
        onClose={() => {
          setIsDetailModalOpen(false);
          setDetailProduct(null);
        }}
        onEdit={prod => openProductModal(prod)}
        onAdjustStock={prod => openStockModal(prod)}
      />

      {/* Modal: Confirmación de Eliminación */}
      <DeleteProductConfirmModal
        product={productToDelete}
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setProductToDelete(null);
        }}
        onConfirm={handleConfirmDelete}
      />
        </>
      )}
    </div>
  );
};
