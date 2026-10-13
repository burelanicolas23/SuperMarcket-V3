import React, { useState, useMemo } from 'react';
import { useSupermarket } from '../../context/SupermarketContext';
import { ExportService, InventoryService } from '../../services';
import { StockBadge } from '../common/Badge';
import { Sale, Product } from '../../models';
import {
  BarChart3,
  DollarSign,
  TrendingUp,
  FileSpreadsheet,
  ShoppingBag,
  CreditCard,
  Layers,
  Award,
  AlertTriangle,
  AlertOctagon,
  Calendar,
  Clock,
  ArrowRight,
  Truck,
  PackageCheck,
  Send,
  HelpCircle,
  Inbox,
  Filter,
  CheckCircle2,
  Phone,
  RotateCcw,
  Sparkles,
} from 'lucide-react';

export const ReportesView: React.FC = () => {
  const { sales, products, movements, suppliers, openStockModal } = useSupermarket();

  // Active top tab: 1. Ventas, 2. Inventario, 3. Reposición
  const [activeTab, setActiveTab] = useState<'ventas' | 'inventario' | 'reposicion'>('ventas');

  // Ventas filters
  const [salesPeriod, setSalesPeriod] = useState<'hoy' | 'semana' | 'mes' | 'personalizado'>('semana');
  const [customStartDate, setCustomStartDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() - 14);
    return d.toISOString().split('T')[0];
  });
  const [customEndDate, setCustomEndDate] = useState<string>(() => {
    return new Date().toISOString().split('T')[0];
  });

  // Inventario: Período configurable para productos sin movimientos (días)
  const [stagnantDays, setStagnantDays] = useState<number>(30);

  // -------------------------------------------------------------
  // 1. CÁLCULO DE VENTAS (Hoy, Semana, Mes, Filtradas)
  // -------------------------------------------------------------
  const now = new Date();

  // Ventas de Hoy
  const todaySales = useMemo(() => {
    const todayStr = now.toISOString().split('T')[0];
    return sales.filter(s => s.status === 'completada' && s.date.startsWith(todayStr));
  }, [sales, now]);

  const todayAmount = useMemo(() => todaySales.reduce((sum, s) => sum + s.total, 0), [todaySales]);
  const todayCount = todaySales.length;

  // Ventas de la Semana (últimos 7 días)
  const weekSales = useMemo(() => {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    return sales.filter(s => s.status === 'completada' && new Date(s.date) >= sevenDaysAgo);
  }, [sales]);

  const weekAmount = useMemo(() => weekSales.reduce((sum, s) => sum + s.total, 0), [weekSales]);
  const weekCount = weekSales.length;

  // Ventas del Mes (últimos 30 días)
  const monthSales = useMemo(() => {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    return sales.filter(s => s.status === 'completada' && new Date(s.date) >= thirtyDaysAgo);
  }, [sales]);

  const monthAmount = useMemo(() => monthSales.reduce((sum, s) => sum + s.total, 0), [monthSales]);
  const monthCount = monthSales.length;

  // Ventas del período seleccionado por el usuario
  const filteredSales = useMemo(() => {
    return sales.filter(s => {
      if (s.status !== 'completada') return false;
      const saleTime = new Date(s.date).getTime();

      if (salesPeriod === 'hoy') {
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        return saleTime >= todayStart.getTime();
      }

      if (salesPeriod === 'semana') {
        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        return saleTime >= sevenDaysAgo.getTime();
      }

      if (salesPeriod === 'mes') {
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        return saleTime >= thirtyDaysAgo.getTime();
      }

      if (salesPeriod === 'personalizado') {
        if (!customStartDate) return true;
        const start = new Date(customStartDate);
        start.setHours(0, 0, 0, 0);

        const end = customEndDate ? new Date(customEndDate) : new Date();
        end.setHours(23, 59, 59, 999);

        return saleTime >= start.getTime() && saleTime <= end.getTime();
      }

      return true;
    });
  }, [sales, salesPeriod, customStartDate, customEndDate]);

  const periodAmount = useMemo(() => filteredSales.reduce((sum, s) => sum + s.total, 0), [filteredSales]);
  const periodCount = filteredSales.length;
  const periodAvgTicket = useMemo(() => (periodCount > 0 ? Math.round(periodAmount / periodCount) : 0), [periodAmount, periodCount]);
  const periodItemsCount = useMemo(() => filteredSales.reduce((sum, s) => sum + s.itemCount, 0), [filteredSales]);

  // Desglose por método de pago del período
  const paymentBreakdown = useMemo(() => {
    const map: Record<string, { total: number; count: number }> = {
      efectivo: { total: 0, count: 0 },
      tarjeta_debito: { total: 0, count: 0 },
      tarjeta_credito: { total: 0, count: 0 },
      transferencia_qr: { total: 0, count: 0 },
      cuenta_corriente: { total: 0, count: 0 },
    };

    for (const s of filteredSales) {
      const method = s.paymentMethod || 'efectivo';
      if (!map[method]) map[method] = { total: 0, count: 0 };
      map[method].total += s.total;
      map[method].count += 1;
    }

    return map;
  }, [filteredSales]);

  // Evolución diaria para gráfico simple
  const dailyEvolution = useMemo(() => {
    const daysMap = new Map<string, number>();

    // Sort ascending for chronology
    const sorted = [...filteredSales].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    for (const s of sorted) {
      const dayKey = new Date(s.date).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' });
      daysMap.set(dayKey, (daysMap.get(dayKey) || 0) + s.total);
    }

    const entries = Array.from(daysMap.entries());
    const maxVal = entries.reduce((max, [, val]) => Math.max(max, val), 0);

    return { entries, maxVal: maxVal || 1 };
  }, [filteredSales]);

  // -------------------------------------------------------------
  // 2. CÁLCULO DE INVENTARIO Y ROTACIÓN
  // -------------------------------------------------------------
  const inventoryValuation = useMemo(() => {
    return InventoryService.calculateInventoryValuation();
  }, [products]);

  const lowStockCount = useMemo(() => products.filter(p => p.stock > 0 && p.stock <= p.minStock).length, [products]);
  const outOfStockCount = useMemo(() => products.filter(p => p.stock <= 0).length, [products]);

  // Movimientos de inventario por tipo
  const movementsSummary = useMemo(() => {
    const summary: Record<string, { count: number; units: number }> = {
      ingreso_compra: { count: 0, units: 0 },
      venta: { count: 0, units: 0 },
      egreso_merma: { count: 0, units: 0 },
      egreso_vencimiento: { count: 0, units: 0 },
      ajuste_conteo: { count: 0, units: 0 },
      devolucion: { count: 0, units: 0 },
    };

    for (const m of movements) {
      if (!summary[m.type]) summary[m.type] = { count: 0, units: 0 };
      summary[m.type].count += 1;
      summary[m.type].units += Math.abs(m.quantity);
    }

    return summary;
  }, [movements]);

  // Productos con Mayor Rotación (más vendidos en unidades y recaudación)
  const topRotationProducts = useMemo(() => {
    const map = new Map<string, { product: Product; qty: number; revenue: number }>();

    for (const s of sales) {
      if (s.status === 'completada') {
        for (const item of s.items) {
          const prod = products.find(p => p.id === item.productId) || {
            id: item.productId,
            name: item.name,
            code: item.code,
            category: 'Almacén y Abarrotes',
            sellingPrice: item.unitPrice,
            costPrice: item.costPrice,
            stock: 0,
            minStock: 5,
            unit: 'unidad',
            status: 'disponible',
            internalCode: 'INT-0000',
            brand: 'Genérica',
            createdAt: s.date,
            updatedAt: s.date,
          };

          const existing = map.get(item.productId);
          if (existing) {
            existing.qty += item.quantity;
            existing.revenue += item.subtotal;
          } else {
            map.set(item.productId, {
              product: prod as Product,
              qty: item.quantity,
              revenue: item.subtotal,
            });
          }
        }
      }
    }

    return Array.from(map.values())
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 10);
  }, [sales, products]);

  // Productos sin movimientos durante el período configurable
  const stagnantProducts = useMemo(() => {
    const cutoffDate = new Date(Date.now() - stagnantDays * 24 * 60 * 60 * 1000);

    return products
      .filter(p => {
        // Encontrar el último movimiento o venta de este producto
        const prodMovements = movements.filter(m => m.productId === p.id);
        const lastMovement = prodMovements.length > 0 ? new Date(prodMovements[0].date) : null;

        const prodSales = sales.filter(s => s.items.some(i => i.productId === p.id));
        const lastSale = prodSales.length > 0 ? new Date(prodSales[0].date) : null;

        const latestActivity = [lastMovement, lastSale]
          .filter((d): d is Date => d !== null)
          .sort((a, b) => b.getTime() - a.getTime())[0];

        // Si nunca se movió y fue creado antes de la fecha límite, o si su última actividad es anterior a la fecha límite
        if (!latestActivity) {
          const creation = new Date(p.createdAt);
          return creation < cutoffDate;
        }

        return latestActivity < cutoffDate;
      })
      .map(p => {
        const prodMovements = movements.filter(m => m.productId === p.id);
        const lastMovement = prodMovements.length > 0 ? new Date(prodMovements[0].date) : null;
        const prodSales = sales.filter(s => s.items.some(i => i.productId === p.id));
        const lastSale = prodSales.length > 0 ? new Date(prodSales[0].date) : null;
        const latestActivity = [lastMovement, lastSale]
          .filter((d): d is Date => d !== null)
          .sort((a, b) => b.getTime() - a.getTime())[0];

        const daysInactive = latestActivity
          ? Math.floor((Date.now() - latestActivity.getTime()) / (1000 * 60 * 60 * 24))
          : Math.floor((Date.now() - new Date(p.createdAt).getTime()) / (1000 * 60 * 60 * 24));

        return {
          product: p,
          daysInactive,
          lastActivity: latestActivity ? latestActivity.toLocaleDateString('es-AR') : 'Sin movimientos registrados',
          tiedCapital: p.stock * p.costPrice,
        };
      })
      .sort((a, b) => b.tiedCapital - a.tiedCapital);
  }, [products, movements, sales, stagnantDays]);

  const totalTiedCapital = useMemo(() => {
    return stagnantProducts.reduce((sum, item) => sum + item.tiedCapital, 0);
  }, [stagnantProducts]);

  // -------------------------------------------------------------
  // 3. CÁLCULO DE REPOSICIÓN Y PROVEEDORES
  // -------------------------------------------------------------
  const pendingReplenishmentProducts = useMemo(() => {
    return products.filter(
      p =>
        (p.stock <= p.minStock || p.stock <= 0 || p.isManuallyMarkedMissing) &&
        (!p.orderStatus || p.orderStatus === 'pendiente')
    );
  }, [products]);

  const requestedReplenishmentProducts = useMemo(() => {
    return products.filter(p => p.orderStatus === 'solicitado');
  }, [products]);

  const receivedReplenishmentProducts = useMemo(() => {
    return products.filter(p => p.orderStatus === 'recibido');
  }, [products]);

  const totalUnitsInTransit = useMemo(() => {
    return requestedReplenishmentProducts.reduce((sum, p) => {
      const qty = p.customReplenishQty || Math.max(1, (p.targetStock || p.minStock * 2) - p.stock);
      return sum + qty;
    }, 0);
  }, [requestedReplenishmentProducts]);

  const estimatedInTransitCost = useMemo(() => {
    return requestedReplenishmentProducts.reduce((sum, p) => {
      const qty = p.customReplenishQty || Math.max(1, (p.targetStock || p.minStock * 2) - p.stock);
      return sum + qty * p.costPrice;
    }, 0);
  }, [requestedReplenishmentProducts]);

  // Historial de reposiciones por proveedor (movimientos 'ingreso_compra')
  const replenishmentHistoryBySupplier = useMemo(() => {
    const map = new Map<string, { supplierName: string; count: number; units: number; lastDate: string; itemsList: Set<string> }>();

    const purchaseMovements = movements.filter(m => m.type === 'ingreso_compra');

    for (const m of purchaseMovements) {
      const prod = products.find(p => p.id === m.productId);
      const supplierName = prod?.supplierName || 'Distribuidora Central';

      const existing = map.get(supplierName);
      if (existing) {
        existing.count += 1;
        existing.units += Math.abs(m.quantity);
        existing.itemsList.add(m.productName);
        if (new Date(m.date) > new Date(existing.lastDate)) {
          existing.lastDate = m.date;
        }
      } else {
        map.set(supplierName, {
          supplierName,
          count: 1,
          units: Math.abs(m.quantity),
          lastDate: m.date,
          itemsList: new Set([m.productName]),
        });
      }
    }

    return Array.from(map.values()).map(h => ({
      supplierName: h.supplierName,
      count: h.count,
      units: h.units,
      lastDate: new Date(h.lastDate).toLocaleDateString('es-AR'),
      items: Array.from(h.itemsList).join(', '),
    }));
  }, [movements, products]);

  // -------------------------------------------------------------
  // EXPORTADORES A EXCEL SEGÚN LA PESTAÑA ACTIVA
  // -------------------------------------------------------------
  const handleExportSales = () => {
    const periodName =
      salesPeriod === 'hoy'
        ? 'Hoy'
        : salesPeriod === 'semana'
        ? 'Últimos 7 días'
        : salesPeriod === 'mes'
        ? 'Últimos 30 días'
        : `Desde ${customStartDate} hasta ${customEndDate}`;

    ExportService.exportFilteredSalesReport({
      sales: filteredSales,
      periodLabel: periodName,
      totalAmount: periodAmount,
      salesCount: periodCount,
      averageTicket: periodAvgTicket,
      paymentBreakdown,
    });
  };

  const handleExportInventory = () => {
    ExportService.exportInventoryRotationReport({
      products,
      topRotation: topRotationProducts.map(t => ({
        name: t.product.name,
        code: t.product.code,
        category: t.product.category,
        qty: t.qty,
        revenue: t.revenue,
      })),
      stagnantProducts: stagnantProducts.map(s => ({
        name: s.product.name,
        code: s.product.code,
        category: s.product.category,
        stock: s.product.stock,
        costPrice: s.product.costPrice,
        tiedCapital: s.tiedCapital,
        daysInactive: s.daysInactive,
        lastActivity: s.lastActivity,
      })),
      stagnantDays,
      movementsSummary,
    });
  };

  const handleExportReplenishment = () => {
    ExportService.exportReplenishmentReport({
      pendingProducts: pendingReplenishmentProducts,
      requestedProducts: requestedReplenishmentProducts,
      receivedHistory: replenishmentHistoryBySupplier,
    });
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* 1. Header con botones de exportación */}
      <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h3 className="text-xl sm:text-2xl font-black text-slate-900 flex items-center gap-2.5">
            <BarChart3 className="w-6 h-6 sm:w-7 sm:h-7 text-emerald-600" />
            <span>Reportes y Estadísticas del Supermercado</span>
          </h3>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Consulta rápida y fidedigna de ventas, rotación de existencias y control de reposición
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {activeTab === 'ventas' && (
            <button
              onClick={handleExportSales}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-emerald-300 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold text-xs sm:text-sm transition-colors shadow-xs"
              title="Descargar reporte de ventas en Excel"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
              <span>Exportar Ventas a Excel</span>
            </button>
          )}

          {activeTab === 'inventario' && (
            <button
              onClick={handleExportInventory}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-emerald-300 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold text-xs sm:text-sm transition-colors shadow-xs"
              title="Descargar reporte de inventario y rotación en Excel"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
              <span>Exportar Inventario a Excel</span>
            </button>
          )}

          {activeTab === 'reposicion' && (
            <button
              onClick={handleExportReplenishment}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-emerald-300 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold text-xs sm:text-sm transition-colors shadow-xs"
              title="Descargar reporte de reposición en Excel"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
              <span>Exportar Reposición a Excel</span>
            </button>
          )}

          <button
            onClick={() => ExportService.exportExecutiveReport()}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm shadow-md shadow-emerald-700/20 active:scale-98 transition-all"
            title="Descargar informe general consolidado para el dueño"
          >
            <FileSpreadsheet className="w-4 h-4 text-white" />
            <span>Informe General Consolidado</span>
          </button>
        </div>
      </div>

      {/* 2. Sub-navegación por Secciones Requeridas */}
      <div className="bg-white p-2 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap gap-2">
        <button
          onClick={() => setActiveTab('ventas')}
          className={`flex-1 min-w-[200px] flex items-center justify-center gap-2.5 py-3 px-4 rounded-xl font-black text-xs sm:text-sm transition-all ${
            activeTab === 'ventas'
              ? 'bg-emerald-600 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
          }`}
        >
          <DollarSign className="w-4 h-4 sm:w-5 sm:h-5" />
          <span>1. Reportes de Ventas</span>
        </button>

        <button
          onClick={() => setActiveTab('inventario')}
          className={`flex-1 min-w-[200px] flex items-center justify-center gap-2.5 py-3 px-4 rounded-xl font-black text-xs sm:text-sm transition-all ${
            activeTab === 'inventario'
              ? 'bg-emerald-600 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
          }`}
        >
          <Layers className="w-4 h-4 sm:w-5 sm:h-5" />
          <span>2. Reportes de Inventario y Rotación</span>
        </button>

        <button
          onClick={() => setActiveTab('reposicion')}
          className={`flex-1 min-w-[200px] flex items-center justify-center gap-2.5 py-3 px-4 rounded-xl font-black text-xs sm:text-sm transition-all ${
            activeTab === 'reposicion'
              ? 'bg-emerald-600 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
          }`}
        >
          <Truck className="w-4 h-4 sm:w-5 sm:h-5" />
          <span>3. Reportes de Reposición y Proveedores</span>
        </button>
      </div>

      {/* ========================================================= */}
      {/* PESTAÑA 1: REPORTES DE VENTAS                              */}
      {/* ========================================================= */}
      {activeTab === 'ventas' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Tarjetas comparativas principales: Hoy, Semana, Mes */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Ventas del Día */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Ventas del Día
                </span>
                <Clock className="w-5 h-5 text-emerald-600" />
              </div>
              <p className="text-2xl sm:text-3xl font-black text-emerald-800 mt-2">
                ${todayAmount.toLocaleString('es-AR')}
              </p>
              <p className="text-xs text-slate-500 mt-1">
                {todayCount} operaciones cobradas hoy
              </p>
            </div>

            {/* Ventas de la Semana */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Ventas de la Semana
                </span>
                <Calendar className="w-5 h-5 text-blue-600" />
              </div>
              <p className="text-2xl sm:text-3xl font-black text-slate-900 mt-2">
                ${weekAmount.toLocaleString('es-AR')}
              </p>
              <p className="text-xs text-slate-500 mt-1">
                {weekCount} operaciones en los últimos 7 días
              </p>
            </div>

            {/* Ventas del Mes */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Ventas del Mes
                </span>
                <TrendingUp className="w-5 h-5 text-indigo-600" />
              </div>
              <p className="text-2xl sm:text-3xl font-black text-slate-900 mt-2">
                ${monthAmount.toLocaleString('es-AR')}
              </p>
              <p className="text-xs text-slate-500 mt-1">
                {monthCount} operaciones en los últimos 30 días
              </p>
            </div>
          </div>

          {/* Filtro por períodos */}
          <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h4 className="text-base font-black text-slate-900 flex items-center gap-2">
                  <Filter className="w-4 h-4 text-emerald-600" />
                  <span>Filtrar Ventas por Período</span>
                </h4>
                <p className="text-xs text-slate-500">
                  Seleccione el rango de fechas para consultar operaciones y ticket promedio
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => setSalesPeriod('hoy')}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    salesPeriod === 'hoy'
                      ? 'bg-slate-900 text-white'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                  }`}
                >
                  Hoy
                </button>

                <button
                  onClick={() => setSalesPeriod('semana')}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    salesPeriod === 'semana'
                      ? 'bg-slate-900 text-white'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                  }`}
                >
                  Esta Semana (7d)
                </button>

                <button
                  onClick={() => setSalesPeriod('mes')}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    salesPeriod === 'mes'
                      ? 'bg-slate-900 text-white'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                  }`}
                >
                  Este Mes (30d)
                </button>

                <button
                  onClick={() => setSalesPeriod('personalizado')}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    salesPeriod === 'personalizado'
                      ? 'bg-slate-900 text-white'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                  }`}
                >
                  Personalizado
                </button>
              </div>
            </div>

            {salesPeriod === 'personalizado' && (
              <div className="flex flex-wrap items-center gap-3 pt-3 border-t border-slate-100">
                <div className="flex items-center gap-2">
                  <label className="text-xs font-bold text-slate-600">Desde:</label>
                  <input
                    type="date"
                    value={customStartDate}
                    onChange={e => setCustomStartDate(e.target.value)}
                    className="px-3 py-1.5 rounded-xl border border-slate-300 text-xs font-semibold focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <label className="text-xs font-bold text-slate-600">Hasta:</label>
                  <input
                    type="date"
                    value={customEndDate}
                    onChange={e => setCustomEndDate(e.target.value)}
                    className="px-3 py-1.5 rounded-xl border border-slate-300 text-xs font-semibold focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Indicadores del Período Seleccionado */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-emerald-50/70 border border-emerald-200 p-5 rounded-2xl">
              <p className="text-xs font-bold text-emerald-800 uppercase tracking-wider">
                Facturación del Período
              </p>
              <p className="text-2xl sm:text-3xl font-black text-emerald-950 mt-1">
                ${periodAmount.toLocaleString('es-AR')}
              </p>
              <p className="text-xs text-emerald-700 mt-1">Ingresos brutos cobrados</p>
            </div>

            <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-xs">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Cantidad de Operaciones
              </p>
              <p className="text-2xl sm:text-3xl font-black text-slate-900 mt-1">
                {periodCount}
              </p>
              <p className="text-xs text-slate-500 mt-1">Tickets emitidos</p>
            </div>

            <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-xs">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Ticket Promedio
              </p>
              <p className="text-2xl sm:text-3xl font-black text-slate-900 mt-1">
                ${periodAvgTicket.toLocaleString('es-AR')}
              </p>
              <p className="text-xs text-slate-500 mt-1">Gasto medio por cliente</p>
            </div>

            <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-xs">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Artículos Despachados
              </p>
              <p className="text-2xl sm:text-3xl font-black text-slate-900 mt-1">
                {periodItemsCount}
              </p>
              <p className="text-xs text-slate-500 mt-1">Unidades vendidas en total</p>
            </div>
          </div>

          {/* Gráfico y Ventas por Método de Pago */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Ventas por Método de Pago */}
            <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div>
                  <h4 className="text-lg font-black text-slate-900 flex items-center gap-2">
                    <CreditCard className="w-5 h-5 text-emerald-600" />
                    <span>Ventas por Método de Pago</span>
                  </h4>
                  <p className="text-xs text-slate-500">
                    Distribución de ingresos en el período seleccionado
                  </p>
                </div>
                <span className="font-extrabold text-sm text-slate-900">
                  Total: ${periodAmount.toLocaleString('es-AR')}
                </span>
              </div>

              <div className="space-y-4">
                {[
                  { key: 'efectivo', label: 'Efectivo en Caja', color: 'bg-emerald-500' },
                  { key: 'tarjeta_debito', label: 'Tarjeta de Débito', color: 'bg-blue-500' },
                  { key: 'tarjeta_credito', label: 'Tarjeta de Crédito', color: 'bg-indigo-500' },
                  { key: 'transferencia_qr', label: 'Transferencia / QR', color: 'bg-amber-500' },
                  { key: 'cuenta_corriente', label: 'Cuenta Corriente', color: 'bg-slate-500' },
                ].map(method => {
                  const data = paymentBreakdown[method.key] || { total: 0, count: 0 };
                  const pct = periodAmount > 0 ? Math.round((data.total / periodAmount) * 100) : 0;

                  return (
                    <div key={method.key} className="space-y-1.5">
                      <div className="flex justify-between text-xs sm:text-sm font-bold">
                        <span className="text-slate-800">{method.label}</span>
                        <span className="text-slate-900">
                          ${data.total.toLocaleString('es-AR')}{' '}
                          <span className="text-slate-400 font-normal">
                            ({pct}% &bull; {data.count} ops)
                          </span>
                        </span>
                      </div>
                      <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                        <div
                          className={`h-full ${method.color} rounded-full transition-all duration-500`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Gráfico de Evolución Diaria */}
            <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200 shadow-xs space-y-4 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div>
                    <h4 className="text-lg font-black text-slate-900 flex items-center gap-2">
                      <TrendingUp className="w-5 h-5 text-emerald-600" />
                      <span>Evolución de Facturación Diaria</span>
                    </h4>
                    <p className="text-xs text-slate-500">Tendencia de recaudación por fecha</p>
                  </div>
                </div>

                <div className="pt-4">
                  {dailyEvolution.entries.length === 0 ? (
                    <div className="py-12 text-center text-slate-400">
                      <ShoppingBag className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                      <p className="font-semibold text-sm">No hay ventas en este período</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {dailyEvolution.entries.map(([day, amount]) => {
                        const barWidth = Math.max(8, Math.round((amount / dailyEvolution.maxVal) * 100));
                        return (
                          <div key={day} className="flex items-center gap-3 text-xs">
                            <span className="w-14 font-mono font-bold text-slate-500 text-right">
                              {day}
                            </span>
                            <div className="flex-1 bg-slate-100 h-5 rounded-lg overflow-hidden flex items-center">
                              <div
                                className="bg-emerald-600 h-full rounded-lg transition-all duration-500 flex items-center justify-end pr-2 text-[10px] text-white font-bold"
                                style={{ width: `${barWidth}%` }}
                              >
                                {barWidth > 30 ? `$${amount.toLocaleString('es-AR')}` : ''}
                              </div>
                            </div>
                            <span className="w-20 font-black text-slate-900 text-right">
                              ${amount.toLocaleString('es-AR')}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                <span>Registros obtenidos de ventas finalizadas</span>
                <span className="font-bold text-emerald-700">100% Datos reales</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* PESTAÑA 2: REPORTES DE INVENTARIO Y ROTACIÓN               */}
      {/* ========================================================= */}
      {activeTab === 'inventario' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Indicadores Generales de Inventario */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Total de Productos
                </span>
                <Layers className="w-5 h-5 text-blue-600" />
              </div>
              <p className="text-2xl sm:text-3xl font-black text-slate-900 mt-2">
                {products.length}
              </p>
              <p className="text-xs text-slate-500 mt-1">
                {inventoryValuation.totalUnits} unidades físicas en góndola
              </p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-amber-200 bg-amber-50/30 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-amber-800 uppercase tracking-wider">
                  Stock Bajo
                </span>
                <AlertTriangle className="w-5 h-5 text-amber-600" />
              </div>
              <p className="text-2xl sm:text-3xl font-black text-amber-900 mt-2">
                {lowStockCount}
              </p>
              <p className="text-xs text-amber-700 mt-1">Por debajo del stock mínimo</p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-rose-200 bg-rose-50/30 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-rose-800 uppercase tracking-wider">
                  Productos Agotados
                </span>
                <AlertOctagon className="w-5 h-5 text-rose-600" />
              </div>
              <p className="text-2xl sm:text-3xl font-black text-rose-900 mt-2">
                {outOfStockCount}
              </p>
              <p className="text-xs text-rose-700 mt-1">0 unidades disponibles</p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-emerald-200 bg-emerald-50/40 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider">
                  Margen Bruto Total
                </span>
                <TrendingUp className="w-5 h-5 text-emerald-600" />
              </div>
              <p className="text-2xl sm:text-3xl font-black text-emerald-950 mt-2">
                +${(inventoryValuation.totalSaleValue - inventoryValuation.totalCost).toLocaleString('es-AR')}
              </p>
              <p className="text-xs text-emerald-700 mt-1">Margen comercial de góndola</p>
            </div>
          </div>

          {/* Resumen de Movimientos de Inventario */}
          <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h4 className="text-lg font-black text-slate-900 flex items-center gap-2">
                  <Clock className="w-5 h-5 text-emerald-600" />
                  <span>Movimientos de Inventario Registrados</span>
                </h4>
                <p className="text-xs text-slate-500">
                  Desglose de ingresos, salidas, ventas y correcciones de stock
                </p>
              </div>
              <span className="text-xs font-bold text-slate-500">
                {movements.length} movimientos históricos
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {[
                { type: 'ingreso_compra', label: 'Ingresos por Compra', color: 'text-emerald-700 bg-emerald-50 border-emerald-200' },
                { type: 'venta', label: 'Salidas por Venta', color: 'text-blue-700 bg-blue-50 border-blue-200' },
                { type: 'egreso_merma', label: 'Mermas y Roturas', color: 'text-rose-700 bg-rose-50 border-rose-200' },
                { type: 'egreso_vencimiento', label: 'Vencimientos', color: 'text-purple-700 bg-purple-50 border-purple-200' },
                { type: 'ajuste_conteo', label: 'Ajustes de Conteo', color: 'text-amber-700 bg-amber-50 border-amber-200' },
                { type: 'devolucion', label: 'Devoluciones', color: 'text-slate-700 bg-slate-50 border-slate-200' },
              ].map(item => {
                const data = movementsSummary[item.type] || { count: 0, units: 0 };
                return (
                  <div key={item.type} className={`p-4 rounded-2xl border ${item.color}`}>
                    <p className="text-[11px] font-bold uppercase tracking-wider truncate">
                      {item.label}
                    </p>
                    <p className="text-xl sm:text-2xl font-black mt-1">
                      {data.units}
                    </p>
                    <p className="text-[11px] opacity-80 mt-0.5">
                      {data.count} operaciones
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Grilla 2 Cols: Productos con Mayor Rotación y Productos Estancados */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* 1. Productos con Mayor Rotación (Más Vendidos) */}
            <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div>
                  <h4 className="text-lg font-black text-slate-900 flex items-center gap-2">
                    <Award className="w-5 h-5 text-amber-500" />
                    <span>Productos con Mayor Rotación</span>
                  </h4>
                  <p className="text-xs text-slate-500">Ranking por unidades vendidas y recaudación</p>
                </div>
              </div>

              <div className="space-y-3">
                {topRotationProducts.length === 0 ? (
                  <p className="text-xs text-slate-400 py-8 text-center">
                    Aún no se registran ventas para calcular la rotación.
                  </p>
                ) : (
                  topRotationProducts.map((item, idx) => (
                    <div
                      key={item.product.id}
                      className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-between gap-3 hover:bg-slate-100/70 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <span
                          className={`w-7 h-7 rounded-xl flex items-center justify-center font-black text-xs ${
                            idx === 0
                              ? 'bg-amber-400 text-amber-950 shadow-xs'
                              : idx === 1
                              ? 'bg-slate-300 text-slate-800'
                              : idx === 2
                              ? 'bg-amber-200 text-amber-900'
                              : 'bg-slate-200 text-slate-700'
                          }`}
                        >
                          #{idx + 1}
                        </span>
                        <div>
                          <p className="font-bold text-slate-900 text-xs sm:text-sm">
                            {item.product.name}
                          </p>
                          <p className="text-[11px] text-slate-500 font-mono mt-0.5">
                            {item.product.code} &bull; {item.product.category}
                          </p>
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="font-black text-emerald-800 text-sm">
                          {item.qty} {item.product.unit}
                        </span>
                        <span className="block text-[11px] font-bold text-slate-600">
                          ${item.revenue.toLocaleString('es-AR')}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* 2. Productos Sin Movimientos Durante un Período Configurable */}
            <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200 shadow-xs space-y-4 flex flex-col justify-between">
              <div>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                  <div>
                    <h4 className="text-lg font-black text-slate-900 flex items-center gap-2">
                      <Inbox className="w-5 h-5 text-rose-500" />
                      <span>Productos Sin Movimientos</span>
                    </h4>
                    <p className="text-xs text-slate-500">
                      Artículos estancados en góndola o depósito
                    </p>
                  </div>

                  {/* Selector configurable de período */}
                  <div className="flex items-center gap-1.5">
                    <label className="text-xs font-bold text-slate-600">Inactividad:</label>
                    <select
                      value={stagnantDays}
                      onChange={e => setStagnantDays(Number(e.target.value))}
                      className="px-3 py-1.5 rounded-xl border border-slate-300 text-xs font-bold focus:ring-2 focus:ring-emerald-500 bg-white"
                    >
                      <option value={7}>7 días</option>
                      <option value={15}>15 días</option>
                      <option value={30}>30 días</option>
                      <option value={60}>60 días</option>
                      <option value={90}>90 días</option>
                    </select>
                  </div>
                </div>

                {/* Banner de Capital Inmovilizado */}
                <div className="mt-4 bg-rose-50 border border-rose-200 p-3.5 rounded-2xl flex items-center justify-between">
                  <div>
                    <span className="text-[11px] font-bold text-rose-800 uppercase tracking-wider">
                      Capital Inmovilizado ({stagnantProducts.length} productos)
                    </span>
                    <p className="text-xl sm:text-2xl font-black text-rose-950 mt-0.5">
                      ${totalTiedCapital.toLocaleString('es-AR')}
                    </p>
                  </div>
                  <AlertTriangle className="w-6 h-6 text-rose-600 flex-shrink-0" />
                </div>

                {/* Lista de productos sin movimientos */}
                <div className="mt-4 space-y-2.5 max-h-80 overflow-y-auto pr-1">
                  {stagnantProducts.length === 0 ? (
                    <div className="py-8 text-center text-slate-400">
                      <CheckCircle2 className="w-8 h-8 mx-auto mb-1.5 text-emerald-500" />
                      <p className="text-xs font-bold text-slate-700">
                        No hay productos sin movimientos en los últimos {stagnantDays} días.
                      </p>
                      <p className="text-[11px] text-slate-400">
                        Todo el inventario ha tenido rotación reciente.
                      </p>
                    </div>
                  ) : (
                    stagnantProducts.map(item => (
                      <div
                        key={item.product.id}
                        className="p-3 rounded-2xl border border-slate-100 bg-slate-50 flex items-center justify-between gap-3 text-xs"
                      >
                        <div className="min-w-0">
                          <p className="font-bold text-slate-900 truncate">
                            {item.product.name}
                          </p>
                          <p className="text-[11px] text-slate-500 mt-0.5">
                            Stock: <strong>{item.product.stock} {item.product.unit}</strong> &bull; {item.product.category}
                          </p>
                          <p className="text-[10px] text-rose-700 font-semibold mt-0.5">
                            {item.daysInactive} días sin movimiento ({item.lastActivity})
                          </p>
                        </div>

                        <div className="text-right flex-shrink-0">
                          <span className="font-black text-slate-900 block">
                            ${item.tiedCapital.toLocaleString('es-AR')}
                          </span>
                          <span className="text-[10px] text-slate-400">al costo</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 text-xs text-slate-500">
                <span>Período configurable: {stagnantDays} días sin ventas ni ingresos</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* PESTAÑA 3: REPORTES DE REPOSICIÓN Y PROVEEDORES           */}
      {/* ========================================================= */}
      {activeTab === 'reposicion' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Indicadores de Pedidos */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Pedidos Pendientes */}
            <div className="bg-white p-5 rounded-2xl border border-amber-200 bg-amber-50/30 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-amber-800 uppercase tracking-wider">
                  Pedidos Pendientes
                </span>
                <HelpCircle className="w-5 h-5 text-amber-600" />
              </div>
              <p className="text-2xl sm:text-3xl font-black text-amber-900 mt-2">
                {pendingReplenishmentProducts.length}
              </p>
              <p className="text-xs text-amber-700 mt-1">Artículos por solicitar</p>
            </div>

            {/* Pedidos Enviados / Solicitados */}
            <div className="bg-white p-5 rounded-2xl border border-blue-200 bg-blue-50/30 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-blue-800 uppercase tracking-wider">
                  Pedidos Enviados
                </span>
                <Send className="w-5 h-5 text-blue-600" />
              </div>
              <p className="text-2xl sm:text-3xl font-black text-blue-900 mt-2">
                {requestedReplenishmentProducts.length}
              </p>
              <p className="text-xs text-blue-700 mt-1">En tránsito con proveedor</p>
            </div>

            {/* Pedidos Recibidos */}
            <div className="bg-white p-5 rounded-2xl border border-emerald-200 bg-emerald-50/30 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider">
                  Pedidos Recibidos
                </span>
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              </div>
              <p className="text-2xl sm:text-3xl font-black text-emerald-900 mt-2">
                {receivedReplenishmentProducts.length}
              </p>
              <p className="text-xs text-emerald-700 mt-1">Mercadería ya incorporada</p>
            </div>

            {/* Inversión en Tránsito */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Inversión en Camino
                </span>
                <DollarSign className="w-5 h-5 text-emerald-600" />
              </div>
              <p className="text-2xl sm:text-3xl font-black text-slate-900 mt-2">
                ${estimatedInTransitCost.toLocaleString('es-AR')}
              </p>
              <p className="text-xs text-slate-500 mt-1">
                {totalUnitsInTransit} unidades pendientes de recepción
              </p>
            </div>
          </div>

          {/* Tabla 1: Productos Pendientes de Recepción (Pedidos Solicitados) */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h4 className="text-lg font-black text-slate-900 flex items-center gap-2">
                  <Truck className="w-5 h-5 text-emerald-600" />
                  <span>Productos Pendientes de Recepción</span>
                </h4>
                <p className="text-xs text-slate-500">
                  Artículos que ya fueron solicitados al proveedor y se aguarda la llegada del camión
                </p>
              </div>
              <span className="text-xs font-bold bg-blue-100 text-blue-800 px-3 py-1 rounded-xl">
                {requestedReplenishmentProducts.length} artículos en camino
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase text-xs">
                  <tr>
                    <th className="py-3 px-4 sm:px-6">Producto y Código</th>
                    <th className="py-3 px-4 sm:px-6 text-center">Stock Actual</th>
                    <th className="py-3 px-4 sm:px-6 text-center">Unidades Solicitadas</th>
                    <th className="py-3 px-4 sm:px-6">Proveedor y Contacto</th>
                    <th className="py-3 px-4 sm:px-6 text-right">Inversión Estimada</th>
                    <th className="py-3 px-4 sm:px-6 text-center">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {requestedReplenishmentProducts.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-10 text-center text-slate-400">
                        <CheckCircle2 className="w-10 h-10 mx-auto mb-2 text-emerald-500" />
                        <p className="font-bold text-sm text-slate-700">
                          No hay pedidos pendientes de recepción actualmente
                        </p>
                        <p className="text-xs text-slate-400 mt-0.5">
                          Todos los pedidos solicitados ya fueron recibidos o no hay pedidos en curso.
                        </p>
                      </td>
                    </tr>
                  ) : (
                    requestedReplenishmentProducts.map(p => {
                      const qty = p.customReplenishQty || Math.max(1, (p.targetStock || p.minStock * 2) - p.stock);
                      const supplier = suppliers.find(s => s.id === p.supplierId);
                      return (
                        <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                          <td className="py-3 px-4 sm:px-6">
                            <p className="font-bold text-slate-900">{p.name}</p>
                            <p className="text-[11px] text-slate-400 font-mono">
                              Cód: {p.code} &bull; {p.category}
                            </p>
                          </td>
                          <td className="py-3 px-4 sm:px-6 text-center font-bold text-slate-700">
                            {p.stock} {p.unit}
                          </td>
                          <td className="py-3 px-4 sm:px-6 text-center">
                            <span className="px-3 py-1 rounded-xl bg-blue-100 text-blue-800 font-black text-xs sm:text-sm">
                              +{qty} {p.unit}
                            </span>
                          </td>
                          <td className="py-3 px-4 sm:px-6">
                            {supplier ? (
                              <div>
                                <p className="font-bold text-slate-800 flex items-center gap-1.5">
                                  <Truck className="w-3.5 h-3.5 text-slate-400" />
                                  <span>{supplier.name}</span>
                                </p>
                                <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1">
                                  <Phone className="w-3 h-3 text-slate-400" />
                                  <span>{supplier.phone}</span>
                                </p>
                              </div>
                            ) : (
                              <span className="text-xs text-slate-400 italic">{p.supplierName || 'Sin asignar'}</span>
                            )}
                          </td>
                          <td className="py-3 px-4 sm:px-6 text-right font-black text-slate-900">
                            ${(qty * p.costPrice).toLocaleString('es-AR')}
                          </td>
                          <td className="py-3 px-4 sm:px-6 text-center">
                            <button
                              onClick={() => openStockModal(p)}
                              className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1 mx-auto shadow-xs transition-colors"
                              title="Ingresar stock directo"
                            >
                              <PackageCheck className="w-3.5 h-3.5" />
                              <span>Recibir</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Tabla 2: Historial de Reposiciones por Proveedor */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h4 className="text-lg font-black text-slate-900 flex items-center gap-2">
                  <PackageCheck className="w-5 h-5 text-emerald-600" />
                  <span>Historial de Reposiciones por Proveedor</span>
                </h4>
                <p className="text-xs text-slate-500">
                  Resumen de mercadería ingresada por compra a cada distribuidora
                </p>
              </div>
              <span className="text-xs font-bold text-slate-500">
                {replenishmentHistoryBySupplier.length} proveedores con entregas
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase text-xs">
                  <tr>
                    <th className="py-3 px-4 sm:px-6">Empresa Proveedora</th>
                    <th className="py-3 px-4 sm:px-6 text-center">Entregas Recibidas</th>
                    <th className="py-3 px-4 sm:px-6 text-center">Total Unidades Ingresadas</th>
                    <th className="py-3 px-4 sm:px-6 text-center">Fecha Última Entrega</th>
                    <th className="py-3 px-4 sm:px-6">Artículos Recepcionados</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {replenishmentHistoryBySupplier.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-10 text-center text-slate-400">
                        <Truck className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                        <p className="font-bold text-sm text-slate-700">
                          Aún no se registran recepciones históricas
                        </p>
                      </td>
                    </tr>
                  ) : (
                    replenishmentHistoryBySupplier.map(h => (
                      <tr key={h.supplierName} className="hover:bg-slate-50 transition-colors">
                        <td className="py-3 px-4 sm:px-6 font-bold text-slate-900 flex items-center gap-2">
                          <Truck className="w-4 h-4 text-emerald-600" />
                          <span>{h.supplierName}</span>
                        </td>
                        <td className="py-3 px-4 sm:px-6 text-center font-bold text-slate-700">
                          {h.count} entregas
                        </td>
                        <td className="py-3 px-4 sm:px-6 text-center">
                          <span className="px-2.5 py-1 rounded-xl bg-emerald-100 text-emerald-800 font-black text-xs">
                            +{h.units} unidades
                          </span>
                        </td>
                        <td className="py-3 px-4 sm:px-6 text-center font-mono text-slate-500 text-xs">
                          {h.lastDate}
                        </td>
                        <td className="py-3 px-4 sm:px-6 text-xs text-slate-600 max-w-xs truncate">
                          {h.items}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
