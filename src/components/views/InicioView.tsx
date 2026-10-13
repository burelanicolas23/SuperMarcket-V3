import React from 'react';
import { useSupermarket } from '../../context/SupermarketContext';
import { StatCard } from '../common/StatCard';
import { StockBadge } from '../common/Badge';
import { calculateSuggestedQuantity } from '../../models';
import {
  DollarSign,
  Package,
  AlertTriangle,
  AlertOctagon,
  ShoppingCart,
  PlusCircle,
  Clock,
  ArrowRight,
  TrendingUp,
  Receipt,
  Eye,
} from 'lucide-react';

export const InicioView: React.FC = () => {
  const {
    todaySalesTotal,
    todaySalesCount,
    totalProductsCount,
    lowStockCount,
    outOfStockCount,
    recentSales,
    missingProducts,
    setActiveSection,
    openProductModal,
    openTicketModal,
  } = useSupermarket();

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-300">
      {/* Alerta Automática Requerida (PROMPT 5, Sección 2) */}
      {missingProducts.length > 0 && (
        <div className="bg-gradient-to-r from-amber-500/10 via-rose-500/10 to-amber-500/10 border border-amber-300/80 rounded-3xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs">
          <div className="flex items-center gap-3.5">
            <div className="p-3 bg-amber-500 text-white rounded-2xl shadow-sm flex-shrink-0">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-base font-black text-slate-900">
                Alerta de Reposición Automática: {missingProducts.length} productos en stock crítico
              </h4>
              <p className="text-xs text-slate-600 mt-0.5">
                Artículos que alcanzaron o están por debajo del stock mínimo. Cantidades sugeridas calculadas automáticamente.
              </p>
            </div>
          </div>

          <button
            onClick={() => setActiveSection('faltantes')}
            className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs sm:text-sm shadow-md shadow-amber-600/20 transition-all active:scale-98 whitespace-nowrap"
          >
            <span>Preparar Pedido de Reposición</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 1. Metric Cards (Panel principal) */}
      <section>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          <StatCard
            title="Ventas Totales Hoy"
            value={`$${todaySalesTotal.toLocaleString('es-AR')}`}
            subtitle={`${todaySalesCount} tickets cobrados hoy`}
            icon={DollarSign}
            variant="emerald"
            onClick={() => setActiveSection('caja')}
          />

          <StatCard
            title="Productos Registrados"
            value={totalProductsCount}
            subtitle="Artículos activos en catálogo"
            icon={Package}
            variant="blue"
            onClick={() => setActiveSection('productos')}
          />

          <StatCard
            title="Stock Bajo"
            value={lowStockCount}
            subtitle="Por debajo del mínimo establecido"
            icon={AlertTriangle}
            variant="amber"
            onClick={() => setActiveSection('faltantes')}
          />

          <StatCard
            title="Productos Agotados"
            value={outOfStockCount}
            subtitle={outOfStockCount > 0 ? '¡Requiere compra inmediata!' : 'Sin artículos en 0'}
            icon={AlertOctagon}
            variant="rose"
            onClick={() => setActiveSection('faltantes')}
          />
        </div>
      </section>

      {/* 2. Direct Quick Actions (Accesos directos principales requeridos) */}
      <section>
        <div className="bg-white rounded-3xl p-5 sm:p-7 shadow-xs border border-slate-200">
          <h3 className="text-lg sm:text-xl font-black text-slate-900 mb-1">
            Accesos Rápidos del Día
          </h3>
          <p className="text-xs sm:text-sm text-slate-500 mb-5">
            Botones directos para las operaciones más frecuentes en el supermercado
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Acceso 1: Registrar una venta */}
            <button
              onClick={() => setActiveSection('caja')}
              className="group flex flex-col items-start p-5 sm:p-6 rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-700 text-white shadow-lg shadow-emerald-700/20 hover:shadow-xl hover:from-emerald-500 hover:to-teal-600 transition-all active:scale-98 text-left"
            >
              <div className="p-3 bg-white/20 rounded-xl mb-4 group-hover:scale-110 transition-transform">
                <ShoppingCart className="w-8 h-8 text-white" />
              </div>
              <span className="text-xl sm:text-2xl font-black">Registrar Venta</span>
              <span className="text-xs sm:text-sm text-emerald-100 font-medium mt-1">
                Cobrar cliente, escanear productos y generar ticket
              </span>
              <div className="mt-4 flex items-center gap-1.5 text-xs font-bold text-white uppercase tracking-wider">
                <span>Ingresar a Caja</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </div>
            </button>

            {/* Acceso 2: Agregar productos */}
            <button
              onClick={() => openProductModal()}
              className="group flex flex-col items-start p-5 sm:p-6 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white shadow-lg shadow-blue-700/20 hover:shadow-xl hover:from-blue-500 hover:to-indigo-600 transition-all active:scale-98 text-left"
            >
              <div className="p-3 bg-white/20 rounded-xl mb-4 group-hover:scale-110 transition-transform">
                <PlusCircle className="w-8 h-8 text-white" />
              </div>
              <span className="text-xl sm:text-2xl font-black">Agregar Producto</span>
              <span className="text-xs sm:text-sm text-blue-100 font-medium mt-1">
                Dar de alta nuevo código de barras, precio y stock
              </span>
              <div className="mt-4 flex items-center gap-1.5 text-xs font-bold text-white uppercase tracking-wider">
                <span>Nuevo Artículo</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </div>
            </button>

            {/* Acceso 3: Revisar productos faltantes */}
            <button
              onClick={() => setActiveSection('faltantes')}
              className="group flex flex-col items-start p-5 sm:p-6 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow-lg shadow-amber-600/20 hover:shadow-xl hover:from-amber-400 hover:to-orange-500 transition-all active:scale-98 text-left"
            >
              <div className="p-3 bg-white/20 rounded-xl mb-4 group-hover:scale-110 transition-transform">
                <AlertTriangle className="w-8 h-8 text-white" />
              </div>
              <span className="text-xl sm:text-2xl font-black">Revisar Faltantes</span>
              <span className="text-xs sm:text-sm text-amber-100 font-medium mt-1">
                Ver lista de {missingProducts.length} productos agotados o críticos
              </span>
              <div className="mt-4 flex items-center gap-1.5 text-xs font-bold text-white uppercase tracking-wider">
                <span>Ver Lista de Reposición</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </div>
            </button>
          </div>
        </div>
      </section>

      {/* 3. Últimas Ventas & Alertas de Reposición */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Tabla de Últimas Ventas */}
        <div className="lg:col-span-2 bg-white rounded-3xl p-5 sm:p-6 shadow-xs border border-slate-200">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
            <div>
              <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
                <Receipt className="w-5 h-5 text-emerald-600" />
                <span>Últimas Ventas Registradas</span>
              </h3>
              <p className="text-xs text-slate-500">Historial reciente de cobros en caja</p>
            </div>
            <button
              onClick={() => setActiveSection('caja')}
              className="text-xs font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1"
            >
              Ver todas en Caja
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {recentSales.length === 0 ? (
            <div className="text-center py-10 text-slate-400">
              <ShoppingCart className="w-12 h-12 mx-auto mb-2 text-slate-300" />
              <p className="font-semibold text-sm">Aún no se han registrado ventas hoy.</p>
              <button
                onClick={() => setActiveSection('caja')}
                className="mt-3 px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold"
              >
                Cobrar primera venta
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500 text-xs font-bold uppercase tracking-wider">
                    <th className="pb-3">Ticket</th>
                    <th className="pb-3">Hora</th>
                    <th className="pb-3">Artículos</th>
                    <th className="pb-3">Pago</th>
                    <th className="pb-3 text-right">Total</th>
                    <th className="pb-3 text-center">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {recentSales.map(sale => (
                    <tr key={sale.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3 font-mono font-bold text-slate-900">
                        {sale.saleNumber}
                      </td>
                      <td className="py-3 text-slate-500 text-xs">
                        {new Date(sale.date).toLocaleTimeString('es-AR', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                      <td className="py-3 text-slate-700">
                        <span className="font-semibold">{sale.itemCount}</span> unidades
                        <span className="block text-xs text-slate-400 truncate max-w-xs">
                          {sale.items.map(i => i.name).join(', ')}
                        </span>
                      </td>
                      <td className="py-3">
                        <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 capitalize">
                          {sale.paymentMethod.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="py-3 text-right font-black text-slate-900 text-base">
                        ${sale.total.toLocaleString('es-AR')}
                      </td>
                      <td className="py-3 text-center">
                        <button
                          onClick={() => openTicketModal(sale)}
                          className="p-1.5 text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors"
                          title="Ver ticket de compra"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Right 1 Col: Alertas de Artículos Faltantes */}
        <div className="bg-white rounded-3xl p-5 sm:p-6 shadow-xs border border-slate-200 flex flex-col">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
            <div>
              <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-500" />
                <span>Atención Reposición</span>
              </h3>
              <p className="text-xs text-slate-500">Productos con stock crítico</p>
            </div>
            <button
              onClick={() => setActiveSection('faltantes')}
              className="text-xs font-bold text-amber-700 hover:text-amber-800"
            >
              Ver todos
            </button>
          </div>

          <div className="flex-1 space-y-3 overflow-y-auto max-h-96">
            {missingProducts.length === 0 ? (
              <div className="text-center py-8 text-slate-400">
                <p className="font-semibold text-sm text-emerald-700">¡Excelente!</p>
                <p className="text-xs text-slate-500 mt-1">
                  Todos los productos tienen existencias suficientes.
                </p>
              </div>
            ) : (
              missingProducts.slice(0, 6).map(prod => {
                const suggestedQty = calculateSuggestedQuantity(prod);
                return (
                  <div
                    key={prod.id}
                    className="p-3 rounded-2xl border border-slate-100 bg-slate-50/70 hover:bg-slate-100 transition-colors flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <p className="font-bold text-slate-900 text-sm truncate">{prod.name}</p>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Disp: <strong className={prod.stock <= 0 ? 'text-rose-600' : 'text-amber-700'}>{prod.stock}</strong> &bull; Mín: {prod.minStock} {prod.unit}
                      </p>
                      <p className="text-xs font-bold text-emerald-700 mt-0.5">
                        Sugerido reponer: +{suggestedQty} {prod.unit}
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <StockBadge status={prod.status} size="sm" />
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <button
            onClick={() => setActiveSection('faltantes')}
            className="w-full mt-4 py-2.5 rounded-xl border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-900 font-bold text-xs sm:text-sm transition-colors text-center"
          >
            Gestionar Faltantes y Proveedores
          </button>
        </div>
      </div>
    </div>
  );
};
