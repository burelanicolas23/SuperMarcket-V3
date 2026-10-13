import React, { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import { useSupermarket } from '../../context/SupermarketContext';
import { Product, InventoryMovement } from '../../models';
import { StockBadge } from '../common/Badge';
import {
  X,
  Package,
  QrCode,
  Tag,
  DollarSign,
  TrendingUp,
  Layers,
  Calendar,
  Truck,
  Phone,
  Edit,
  Sliders,
  History,
  ArrowUpRight,
  ArrowDownRight,
  MapPin,
  Clock,
} from 'lucide-react';

interface ProductDetailModalProps {
  product: Product | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit: (product: Product) => void;
  onAdjustStock: (product: Product) => void;
}

export const ProductDetailModal: React.FC<ProductDetailModalProps> = ({
  product,
  isOpen,
  onClose,
  onEdit,
  onAdjustStock,
}) => {
  const { movements, suppliers } = useSupermarket();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [activeTab, setActiveTab] = useState<'info' | 'movimientos'>('info');

  useEffect(() => {
    if (isOpen && product && canvasRef.current) {
      const payload = product.qrCodeData || `SMK:${product.code}:${product.internalCode}`;
      QRCode.toCanvas(canvasRef.current, payload, {
        width: 140,
        margin: 2,
        color: {
          dark: '#0f172a',
          light: '#ffffff',
        },
      }).catch(err => console.error('Error generating QR:', err));
    }
  }, [isOpen, product, activeTab]);

  if (!isOpen || !product) return null;

  const supplier = product.supplierId
    ? suppliers.find(s => s.id === product.supplierId)
    : null;

  const productMovements = movements.filter(m => m.productId === product.id);

  const margin = product.sellingPrice - product.costPrice;
  const marginPct =
    product.costPrice > 0 ? Math.round((margin / product.costPrice) * 100) : 100;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="relative bg-white rounded-3xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden my-6">
        {/* Header Banner */}
        <div className="px-6 py-5 bg-gradient-to-r from-emerald-600 to-teal-700 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white/20 rounded-2xl">
              <Package className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold bg-white/20 px-2 py-0.5 rounded text-white">
                  {product.internalCode}
                </span>
                <span className="text-xs font-bold text-emerald-100">
                  {product.brand}
                </span>
              </div>
              <h3 className="text-xl font-black mt-0.5 text-white leading-tight">
                {product.name}
              </h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-white/80 hover:text-white rounded-xl hover:bg-white/20 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Tab switchers: Ficha técnica vs Historial de movimientos */}
        <div className="flex border-b border-slate-200 px-6 pt-3 bg-slate-50 gap-4">
          <button
            onClick={() => setActiveTab('info')}
            className={`pb-3 text-sm font-bold border-b-2 transition-all flex items-center gap-2 ${
              activeTab === 'info'
                ? 'border-emerald-600 text-emerald-800'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <Tag className="w-4 h-4" />
            <span>Ficha del Producto</span>
          </button>

          <button
            onClick={() => setActiveTab('movimientos')}
            className={`pb-3 text-sm font-bold border-b-2 transition-all flex items-center gap-2 ${
              activeTab === 'movimientos'
                ? 'border-emerald-600 text-emerald-800'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <History className="w-4 h-4" />
            <span>Movimientos de Stock ({productMovements.length})</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto max-h-[70vh]">
          {activeTab === 'info' ? (
            <div className="space-y-6">
              {/* Top Row: Quick Identifiers + QR Code */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-5">
                <div className="space-y-2 text-center sm:text-left">
                  <div>
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                      Estado de Inventario
                    </span>
                    <div className="mt-1">
                      <StockBadge status={product.status} size="md" />
                    </div>
                  </div>

                  <div>
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                      Código de Barras (EAN-13 / SKU)
                    </span>
                    <p className="font-mono text-base font-extrabold text-slate-900 mt-0.5">
                      {product.code}
                    </p>
                  </div>

                  <div>
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                      Código Interno del Local
                    </span>
                    <p className="font-mono text-sm font-bold text-slate-700 mt-0.5">
                      {product.internalCode}
                    </p>
                  </div>
                </div>

                {/* QR Code Container */}
                <div className="flex flex-col items-center bg-white p-3 rounded-2xl border border-slate-200 shadow-xs">
                  <canvas ref={canvasRef} className="rounded-lg" />
                  <span className="text-[11px] font-bold text-slate-500 mt-1 flex items-center gap-1">
                    <QrCode className="w-3 h-3 text-emerald-600" />
                    Código QR de Producto
                  </span>
                </div>
              </div>

              {/* Pricing & Margins Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-4 rounded-2xl border border-slate-200 bg-white">
                  <span className="text-xs font-bold text-slate-500 uppercase">
                    Precio de Compra (Costo)
                  </span>
                  <p className="text-2xl font-black text-slate-800 mt-1">
                    ${product.costPrice.toLocaleString('es-AR')}
                  </p>
                  <p className="text-xs text-slate-400 mt-0.5">Pagado al proveedor</p>
                </div>

                <div className="p-4 rounded-2xl border border-emerald-200 bg-emerald-50/70">
                  <span className="text-xs font-bold text-emerald-800 uppercase">
                    Precio de Venta al Público
                  </span>
                  <p className="text-2xl font-black text-emerald-900 mt-1">
                    ${product.sellingPrice.toLocaleString('es-AR')}
                  </p>
                  <p className="text-xs text-emerald-700 mt-0.5">Precio final en góndola</p>
                </div>

                <div className="p-4 rounded-2xl border border-slate-200 bg-white">
                  <span className="text-xs font-bold text-slate-500 uppercase">
                    Margen Comercial
                  </span>
                  <p className="text-2xl font-black text-emerald-800 mt-1">
                    +${margin.toLocaleString('es-AR')}
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5 font-bold">
                    {marginPct}% de ganancia bruta
                  </p>
                </div>
              </div>

              {/* Stock Details */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-4 rounded-2xl border border-slate-200 bg-white">
                  <span className="text-xs font-bold text-slate-500 uppercase">
                    Cantidad Disponible
                  </span>
                  <p className="text-2xl font-black text-slate-900 mt-1">
                    {product.stock} {product.unit}
                  </p>
                  <p className="text-xs text-slate-400 mt-0.5">En salón y depósito</p>
                </div>

                <div className="p-4 rounded-2xl border border-slate-200 bg-white">
                  <span className="text-xs font-bold text-slate-500 uppercase">
                    Stock Mínimo de Seguridad
                  </span>
                  <p className="text-2xl font-black text-amber-700 mt-1">
                    {product.minStock} {product.unit}
                  </p>
                  <p className="text-xs text-slate-400 mt-0.5">Dispara alerta amarilla</p>
                </div>

                <div className="p-4 rounded-2xl border border-slate-200 bg-white">
                  <span className="text-xs font-bold text-slate-500 uppercase">
                    Ubicación en Local
                  </span>
                  <p className="text-base font-bold text-slate-800 mt-1 flex items-center gap-1.5">
                    <MapPin className="w-4 h-4 text-slate-400" />
                    {product.location || 'Sin asignar'}
                  </p>
                  <p className="text-xs text-slate-400 mt-0.5">Pasillo / Góndola</p>
                </div>
              </div>

              {/* Supplier & Registration Date */}
              <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50/60 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1.5">
                    <Truck className="w-4 h-4 text-emerald-700" />
                    Proveedor Asociado
                  </span>
                  {supplier && (
                    <span className="text-xs font-semibold text-slate-500">
                      Entregas: {supplier.deliveryDays?.join(', ') || 'A convenir'}
                    </span>
                  )}
                </div>

                {supplier ? (
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-sm">
                    <div>
                      <p className="font-extrabold text-slate-900">{supplier.name}</p>
                      <p className="text-xs text-slate-500">
                        Contacto: {supplier.contactPerson} &bull; CUIT: {supplier.taxId}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <a
                        href={`tel:${supplier.phone}`}
                        className="px-3 py-1.5 rounded-xl bg-white border border-slate-300 font-bold text-xs text-slate-700 hover:bg-emerald-50 hover:text-emerald-700 flex items-center gap-1.5 transition-colors"
                      >
                        <Phone className="w-3.5 h-3.5 text-emerald-600" />
                        {supplier.phone}
                      </a>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 italic">
                    {product.supplierName || 'Sin proveedor asociado actualmente.'}
                  </p>
                )}

                <div className="pt-2 border-t border-slate-200/80 flex items-center justify-between text-xs text-slate-500">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    Fecha de Alta: {new Date(product.createdAt).toLocaleDateString('es-AR', {
                      day: '2-digit',
                      month: 'long',
                      year: 'numeric',
                    })}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    Última Modificación: {new Date(product.updatedAt).toLocaleDateString('es-AR')}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            /* Movimientos Tab */
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-extrabold text-slate-900 text-sm">
                    Historial de Variaciones de Stock
                  </h4>
                  <p className="text-xs text-slate-500">
                    Registro de compras, ventas y ajustes de este producto
                  </p>
                </div>
                <button
                  onClick={() => {
                    onClose();
                    onAdjustStock(product);
                  }}
                  className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1 shadow-xs"
                >
                  <Sliders className="w-3.5 h-3.5" />
                  <span>Nuevo Ajuste</span>
                </button>
              </div>

              {productMovements.length === 0 ? (
                <div className="py-12 text-center text-slate-400">
                  <History className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                  <p className="font-bold text-sm">Sin movimientos registrados</p>
                  <p className="text-xs text-slate-500 mt-1">
                    Las compras, ventas y mermas aparecerán aquí detalladas.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto border border-slate-200 rounded-2xl">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-bold">
                      <tr>
                        <th className="py-2.5 px-3">Fecha y Hora</th>
                        <th className="py-2.5 px-3">Tipo</th>
                        <th className="py-2.5 px-3 text-center">Cantidad</th>
                        <th className="py-2.5 px-3 text-center">Stock</th>
                        <th className="py-2.5 px-3">Motivo</th>
                        <th className="py-2.5 px-3">Usuario</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {productMovements.map(mov => {
                        const isPositive = mov.quantity > 0;
                        return (
                          <tr key={mov.id} className="hover:bg-slate-50">
                            <td className="py-2 px-3 text-slate-500 font-mono">
                              {new Date(mov.date).toLocaleDateString('es-AR')}{' '}
                              {new Date(mov.date).toLocaleTimeString('es-AR', {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </td>
                            <td className="py-2 px-3">
                              <span
                                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-bold text-[10px] ${
                                  isPositive
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : mov.type === 'venta'
                                    ? 'bg-blue-100 text-blue-800'
                                    : 'bg-rose-100 text-rose-800'
                                }`}
                              >
                                {isPositive ? (
                                  <ArrowUpRight className="w-3 h-3" />
                                ) : (
                                  <ArrowDownRight className="w-3 h-3" />
                                )}
                                {mov.type.replace('_', ' ').toUpperCase()}
                              </span>
                            </td>
                            <td
                              className={`py-2 px-3 text-center font-bold ${
                                isPositive ? 'text-emerald-700' : 'text-rose-700'
                              }`}
                            >
                              {isPositive ? `+${mov.quantity}` : mov.quantity}
                            </td>
                            <td className="py-2 px-3 text-center font-bold text-slate-800">
                              {mov.previousStock} &rarr; {mov.newStock}
                            </td>
                            <td className="py-2 px-3 text-slate-600 truncate max-w-xs">
                              {mov.reason}
                              {mov.referenceDoc && ` (${mov.referenceDoc})`}
                            </td>
                            <td className="py-2 px-3 text-slate-500">{mov.user}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Actions */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl font-bold text-slate-700 hover:bg-slate-200 transition-colors text-sm"
          >
            Cerrar Ficha
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                onClose();
                onAdjustStock(product);
              }}
              className="px-4 py-2.5 rounded-xl font-bold text-emerald-800 bg-emerald-100 hover:bg-emerald-200 transition-colors text-sm flex items-center gap-1.5"
            >
              <Sliders className="w-4 h-4" />
              <span>Ajustar Stock</span>
            </button>

            <button
              type="button"
              onClick={() => {
                onClose();
                onEdit(product);
              }}
              className="px-5 py-2.5 rounded-xl font-bold text-white bg-emerald-600 hover:bg-emerald-700 transition-colors text-sm flex items-center gap-1.5 shadow-xs"
            >
              <Edit className="w-4 h-4" />
              <span>Editar Producto</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
