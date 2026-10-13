import React, { useState, useMemo } from 'react';
import { useSupermarket } from '../../context/SupermarketContext';
import { InventoryService } from '../../services';
import {
  Layers,
  PlusCircle,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  RotateCcw,
  Search,
  Filter,
  FileSpreadsheet,
} from 'lucide-react';

export const StockInventarioView: React.FC = () => {
  const { movements, openStockModal, products } = useSupermarket();

  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<string>('todos');

  // Valuation summary
  const valuation = useMemo(() => {
    return InventoryService.calculateInventoryValuation();
  }, [products]);

  // Filtered movements
  const filteredMovements = useMemo(() => {
    return movements.filter(m => {
      const matchesType = filterType === 'todos' || m.type === filterType;
      const q = search.trim().toLowerCase();
      const matchesQuery =
        !q ||
        m.productName.toLowerCase().includes(q) ||
        m.productCode.toLowerCase().includes(q) ||
        m.reason.toLowerCase().includes(q) ||
        m.user.toLowerCase().includes(q);

      return matchesType && matchesQuery;
    });
  }, [movements, filterType, search]);

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Top Header & Quick Action */}
      <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-xl font-black text-slate-900 flex items-center gap-2.5">
            <Layers className="w-6 h-6 text-emerald-600" />
            <span>Control de Stock e Inventario</span>
          </h3>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Seguimiento de existencias, ingresos por compras y mermas
          </p>
        </div>

        <button
          onClick={() => openStockModal()}
          className="flex items-center gap-2 px-5 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-md shadow-emerald-700/20 active:scale-98 transition-all"
        >
          <PlusCircle className="w-5 h-5" />
          <span>Ajustar Stock Manualmente</span>
        </button>
      </div>

      {/* Valuation Metrics Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <p className="text-xs font-bold text-slate-500 uppercase">Unidades Totales</p>
          <p className="text-2xl sm:text-3xl font-black text-slate-900 mt-1">
            {valuation.totalUnits.toLocaleString('es-AR')}
          </p>
          <p className="text-xs text-slate-500 mt-1">Artículos físicos en depósito/góndola</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <p className="text-xs font-bold text-slate-500 uppercase">Valor al Costo</p>
          <p className="text-2xl sm:text-3xl font-black text-slate-900 mt-1">
            ${valuation.totalCost.toLocaleString('es-AR')}
          </p>
          <p className="text-xs text-slate-500 mt-1">Capital invertido en mercadería</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <p className="text-xs font-bold text-slate-500 uppercase">Valor a la Venta</p>
          <p className="text-2xl sm:text-3xl font-black text-emerald-800 mt-1">
            ${valuation.totalSaleValue.toLocaleString('es-AR')}
          </p>
          <p className="text-xs text-slate-500 mt-1">Ingreso bruto potencial</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-emerald-200 bg-emerald-50/50 shadow-xs">
          <p className="text-xs font-bold text-emerald-800 uppercase">Margen Comercial Bruto</p>
          <p className="text-2xl sm:text-3xl font-black text-emerald-900 mt-1">
            +${(valuation.totalSaleValue - valuation.totalCost).toLocaleString('es-AR')}
          </p>
          <p className="text-xs text-emerald-700 mt-1">Ganancia estimada de existencias</p>
        </div>
      </div>

      {/* Movements Log */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs p-5 sm:p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div>
            <h4 className="text-lg font-black text-slate-900">Libro de Movimientos de Stock</h4>
            <p className="text-xs text-slate-500">Auditoría cronológica de cada variación</p>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar movimiento..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-9 pr-3 py-1.5 text-xs sm:text-sm rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <select
              value={filterType}
              onChange={e => setFilterType(e.target.value)}
              className="px-3 py-1.5 text-xs sm:text-sm rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500 font-medium"
            >
              <option value="todos">Todos los Tipos</option>
              <option value="ingreso_compra">Compras a Proveedor (+)</option>
              <option value="venta">Ventas en Caja (-)</option>
              <option value="egreso_merma">Mermas / Roturas (-)</option>
              <option value="devolucion">Devoluciones (+)</option>
              <option value="ajuste_conteo">Ajustes de Conteo</option>
            </select>
          </div>
        </div>

        {/* Movements Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 text-xs font-bold uppercase">
              <tr>
                <th className="py-3 px-4">Fecha y Hora</th>
                <th className="py-3 px-4">Producto</th>
                <th className="py-3 px-4">Tipo Movimiento</th>
                <th className="py-3 px-4 text-center">Variación</th>
                <th className="py-3 px-4 text-center">Stock Resultante</th>
                <th className="py-3 px-4">Motivo / Documento</th>
                <th className="py-3 px-4">Usuario</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredMovements.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-slate-400">
                    No se registraron movimientos con ese criterio.
                  </td>
                </tr>
              ) : (
                filteredMovements.map(mov => {
                  const isPositive = mov.quantity > 0;
                  return (
                    <tr key={mov.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3 px-4 text-xs text-slate-500 font-mono">
                        {new Date(mov.date).toLocaleDateString('es-AR')}{' '}
                        {new Date(mov.date).toLocaleTimeString('es-AR', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>

                      <td className="py-3 px-4 font-bold text-slate-900">
                        {mov.productName}
                        <span className="block text-xs font-mono font-normal text-slate-500">
                          {mov.productCode}
                        </span>
                      </td>

                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center gap-1 text-xs px-2.5 py-0.5 rounded-full font-bold ${
                            isPositive
                              ? 'bg-emerald-100 text-emerald-800'
                              : mov.type === 'venta'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {isPositive ? (
                            <ArrowUpRight className="w-3.5 h-3.5" />
                          ) : (
                            <ArrowDownRight className="w-3.5 h-3.5" />
                          )}
                          {mov.type.replace('_', ' ').toUpperCase()}
                        </span>
                      </td>

                      <td
                        className={`py-3 px-4 text-center font-black text-sm ${
                          isPositive ? 'text-emerald-700' : 'text-rose-700'
                        }`}
                      >
                        {isPositive ? `+${mov.quantity}` : mov.quantity}
                      </td>

                      <td className="py-3 px-4 text-center font-bold text-slate-800">
                        <span className="text-slate-400 text-xs font-normal">
                          {mov.previousStock} &rarr;{' '}
                        </span>
                        {mov.newStock}
                      </td>

                      <td className="py-3 px-4 text-xs text-slate-600">
                        <span className="font-semibold text-slate-800">{mov.reason}</span>
                        {mov.referenceDoc && (
                          <span className="block text-[11px] font-mono text-slate-400">
                            Ref: {mov.referenceDoc}
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-4 text-xs font-medium text-slate-500">{mov.user}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
