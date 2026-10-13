import { downloadXLSX, SheetData } from '../lib/excelExport';
import { ProductService } from './productService';
import { SalesService } from './salesService';
import { SupplierService } from './supplierService';
import { InventoryService } from './inventoryService';
import { StorageService } from './storageService';
import { Product, Sale } from '../models';

export interface SelectedReplenishmentItem {
  product: Product;
  requestedQuantity: number;
  notes?: string;
}

export class ExportService {
  /**
   * Exports full product inventory to Excel
   */
  public static exportProductsToExcel(): void {
    const products = ProductService.getAll();

    const headers = [
      'Código Interno',
      'Código de Barras',
      'Nombre del Producto',
      'Marca',
      'Categoría',
      'Precio de Compra ($)',
      'Precio de Venta ($)',
      'Margen Unitario ($)',
      'Cantidad Disponible',
      'Stock Mínimo',
      'Unidad de Medida',
      'Estado',
      'Proveedor',
      'Ubicación / Góndola',
      'Fecha de Alta',
    ];

    const rows = products.map(p => [
      p.internalCode || '-',
      p.code,
      p.name,
      p.brand || '-',
      p.category,
      p.costPrice,
      p.sellingPrice,
      p.sellingPrice - p.costPrice,
      p.stock,
      p.minStock,
      p.unit,
      p.status === 'disponible' ? 'Disponible' : p.status === 'bajo_stock' ? 'Stock Bajo' : 'Agotado',
      p.supplierName || 'Sin asignar',
      p.location || '-',
      new Date(p.createdAt).toLocaleDateString('es-AR'),
    ]);

    const sheet: SheetData = {
      name: 'Productos SuperMarcket',
      data: [headers, ...rows],
    };

    const dateStr = new Date().toISOString().split('T')[0];
    downloadXLSX(`SuperMarcket_Catalogo_Productos_${dateStr}`, [sheet]);
  }

  /**
   * Exports missing products list directly to Excel
   */
  public static exportMissingProductsToExcel(prods?: Product[]): void {
    const missing = prods && prods.length > 0 ? prods : ProductService.getMissingProducts();
    if (missing.length === 0) {
      throw new Error('No hay productos faltantes para exportar.');
    }
    const items: SelectedReplenishmentItem[] = missing.map(p => ({
      product: p,
      requestedQuantity:
        p.customReplenishQty && p.customReplenishQty > 0
          ? p.customReplenishQty
          : Math.max(1, (p.targetStock || Math.max(p.minStock * 2, p.minStock + 10)) - p.stock),
    }));
    this.exportSelectedReplenishmentToExcel(items);
  }

  /**
   * Exports ONLY the SELECTED products for replenishment.
   * If separateBySupplier is true, creates separate sheets or files per supplier.
   */
  public static exportSelectedReplenishmentToExcel(
    items: SelectedReplenishmentItem[],
    options: { separateBySupplier?: boolean } = {}
  ): void {
    if (!items || items.length === 0) {
      throw new Error('No hay productos seleccionados para exportar la orden de reposición.');
    }

    const settings = StorageService.getSettings();
    const dateStr = new Date().toISOString().split('T')[0];
    const dateFormatted = new Date().toLocaleDateString('es-AR');

    // Group items by supplier
    const groups = new Map<string, SelectedReplenishmentItem[]>();

    for (const item of items) {
      const supKey = item.product.supplierName?.trim() || 'Sin Proveedor Asignado';
      if (!groups.has(supKey)) {
        groups.set(supKey, []);
      }
      groups.get(supKey)!.push(item);
    }

    if (options.separateBySupplier && groups.size > 1) {
      // Export individual file per supplier
      groups.forEach((supplierItems, supplierName) => {
        const supObj = supplierItems[0].product.supplierId
          ? SupplierService.getById(supplierItems[0].product.supplierId)
          : null;

        const headers = [
          'Código de Barras',
          'Código Interno',
          'Nombre del Producto',
          'Marca',
          'Stock Actual',
          'Cantidad Solicitada',
          'Unidad',
          'Precio Costo Ref ($)',
          'Subtotal Estimado ($)',
          'Observaciones',
        ];

        const rows = supplierItems.map(i => [
          i.product.code,
          i.product.internalCode,
          i.product.name,
          i.product.brand,
          i.product.stock,
          i.requestedQuantity,
          i.product.unit,
          i.product.costPrice,
          i.requestedQuantity * i.product.costPrice,
          i.notes || '-',
        ]);

        const totalRequested = supplierItems.reduce((acc, i) => acc + i.requestedQuantity, 0);
        const totalEstimated = supplierItems.reduce(
          (acc, i) => acc + i.requestedQuantity * i.product.costPrice,
          0
        );

        const sheetData: (string | number)[][] = [
          [`PEDIDO DE REPOSICIÓN - ${settings.storeName.toUpperCase()}`],
          [`Fecha del Pedido: ${dateFormatted}`],
          [`Proveedor: ${supplierName}`],
          [`Contacto / Teléfono: ${supObj?.phone || '-'} (${supObj?.contactPerson || '-'})`],
          [`Email: ${supObj?.email || '-'}`],
          [],
          headers,
          ...rows,
          [],
          ['TOTALES', '', '', '', '', totalRequested, '', '', totalEstimated, ''],
        ];

        const sheetName = supplierName.slice(0, 31).replace(/[:\\\/\?\*\[\]]/g, '');
        const cleanFileName = `Pedido_${supplierName.replace(/\s+/g, '_')}_${dateStr}`;

        downloadXLSX(cleanFileName, [{ name: sheetName, data: sheetData }]);
      });
    } else {
      // Single consolidated workbook (one sheet per supplier or one unified sheet)
      const sheets: SheetData[] = [];

      groups.forEach((supplierItems, supplierName) => {
        const supObj = supplierItems[0].product.supplierId
          ? SupplierService.getById(supplierItems[0].product.supplierId)
          : null;

        const headers = [
          'Código de Barras',
          'Código Interno',
          'Nombre del Producto',
          'Marca',
          'Stock Actual',
          'Cantidad Solicitada',
          'Unidad',
          'Precio Costo Ref ($)',
          'Subtotal Estimado ($)',
          'Observaciones',
        ];

        const rows = supplierItems.map(i => [
          i.product.code,
          i.product.internalCode,
          i.product.name,
          i.product.brand,
          i.product.stock,
          i.requestedQuantity,
          i.product.unit,
          i.product.costPrice,
          i.requestedQuantity * i.product.costPrice,
          i.notes || '-',
        ]);

        const totalRequested = supplierItems.reduce((acc, i) => acc + i.requestedQuantity, 0);
        const totalEstimated = supplierItems.reduce(
          (acc, i) => acc + i.requestedQuantity * i.product.costPrice,
          0
        );

        const sheetData: (string | number)[][] = [
          [`SUPERMERCADO: ${settings.storeName.toUpperCase()}`],
          [`Fecha del Pedido: ${dateFormatted}`],
          [`Proveedor: ${supplierName}`],
          [`Teléfono: ${supObj?.phone || '-'} | Contacto: ${supObj?.contactPerson || '-'}`],
          [],
          headers,
          ...rows,
          [],
          ['TOTALES', '', '', '', '', totalRequested, '', '', totalEstimated, ''],
        ];

        const cleanSheetName = supplierName.slice(0, 30).replace(/[:\\\/\?\*\[\]]/g, '');
        sheets.push({ name: cleanSheetName || 'Pedido', data: sheetData });
      });

      downloadXLSX(`SuperMarcket_Pedido_Reposicion_${dateStr}`, sheets);
    }
  }

  /**
   * Exports sales history to Excel
   */
  public static exportSalesToExcel(): void {
    const sales = SalesService.getAll();

    const headers = [
      'N° Comprobante',
      'Fecha y Hora',
      'Cantidad Productos',
      'Subtotal ($)',
      'Descuento ($)',
      'Total ($)',
      'Forma de Pago',
      'Cajero / Caja',
      'Estado',
      'Detalle Artículos',
    ];

    const rows = sales.map(s => [
      s.saleNumber,
      new Date(s.date).toLocaleString('es-AR'),
      s.itemCount,
      s.subtotal,
      s.discount,
      s.total,
      s.paymentMethod.toUpperCase().replace('_', ' '),
      s.cashierName,
      s.status.toUpperCase(),
      s.items.map(i => `${i.quantity}x ${i.name} ($${i.unitPrice})`).join(' | '),
    ]);

    const sheet: SheetData = {
      name: 'Ventas Realizadas',
      data: [headers, ...rows],
    };

    const dateStr = new Date().toISOString().split('T')[0];
    downloadXLSX(`SuperMarcket_Ventas_${dateStr}`, [sheet]);
  }

  /**
   * Exports suppliers list
   */
  public static exportSuppliersToExcel(): void {
    const suppliers = SupplierService.getAll();

    const headers = [
      'Empresa Proveedora',
      'Rubro / Categoría',
      'Persona de Contacto',
      'Teléfono',
      'Email',
      'CUIT / Identificación Fiscal',
      'Dirección',
      'Días de Entrega',
      'Estado',
    ];

    const rows = suppliers.map(s => [
      s.name,
      s.category,
      s.contactPerson,
      s.phone,
      s.email,
      s.taxId,
      s.address,
      s.deliveryDays ? s.deliveryDays.join(', ') : 'A coordinar',
      s.active ? 'Activo' : 'Inactivo',
    ]);

    const sheet: SheetData = {
      name: 'Proveedores',
      data: [headers, ...rows],
    };

    const dateStr = new Date().toISOString().split('T')[0];
    downloadXLSX(`SuperMarcket_Proveedores_${dateStr}`, [sheet]);
  }

  /**
   * Exports full executive management report
   */
  public static exportExecutiveReport(): void {
    const valuation = InventoryService.calculateInventoryValuation();
    const metrics = SalesService.getTodayMetrics();
    const missing = ProductService.getMissingProducts();
    const products = ProductService.getAll();

    const summaryHeaders = ['Indicador de Supermercado', 'Valor'];
    const summaryRows = [
      ['Fecha del Reporte', new Date().toLocaleString('es-AR')],
      ['Ventas Totales Hoy ($)', metrics.totalAmount],
      ['Cantidad de Tickets Emitidos Hoy', metrics.salesCount],
      ['Artículos Vendidos Hoy', metrics.itemsSoldCount],
      ['Ticket Promedio Hoy ($)', metrics.averageTicket],
      ['Total de Productos Registrados', products.length],
      ['Total de Unidades Físicas en Góndola/Depósito', valuation.totalUnits],
      ['Valor Total del Inventario (al Costo) ($)', valuation.totalCost],
      ['Valor Total del Inventario (a la Venta) ($)', valuation.totalSaleValue],
      ['Margen Potencial del Inventario ($)', valuation.totalSaleValue - valuation.totalCost],
      ['Productos con Stock Crítico o Faltantes', missing.length],
    ];

    const sheet1: SheetData = {
      name: 'Resumen Ejecutivo',
      data: [summaryHeaders, ...summaryRows],
    };

    const dateStr = new Date().toISOString().split('T')[0];
    downloadXLSX(`SuperMarcket_Reporte_General_${dateStr}`, [sheet1]);
  }

  /**
   * Exports filtered sales report with payment methods breakdown
   */
  public static exportFilteredSalesReport(options: {
    sales: Sale[];
    periodLabel: string;
    totalAmount: number;
    salesCount: number;
    averageTicket: number;
    paymentBreakdown: Record<string, { total: number; count: number }>;
  }): void {
    const { sales, periodLabel, totalAmount, salesCount, averageTicket, paymentBreakdown } = options;
    const dateStr = new Date().toISOString().split('T')[0];
    const dateFormatted = new Date().toLocaleDateString('es-AR');

    const summaryHeaders = ['Indicador', 'Valor'];
    const summaryRows: (string | number)[][] = [
      ['Período Analizado', periodLabel],
      ['Fecha de Generación', dateFormatted],
      ['Facturación Total ($)', totalAmount],
      ['Cantidad de Operaciones (Tickets)', salesCount],
      ['Ticket Promedio ($)', averageTicket],
      [],
      ['DESGLOSE POR MÉTODO DE PAGO', ''],
      ['Método', 'Monto ($)'],
      ['Efectivo', paymentBreakdown['efectivo']?.total || 0],
      ['Tarjeta de Débito', paymentBreakdown['tarjeta_debito']?.total || 0],
      ['Tarjeta de Crédito', paymentBreakdown['tarjeta_credito']?.total || 0],
      ['Transferencia / QR', paymentBreakdown['transferencia_qr']?.total || 0],
      ['Cuenta Corriente', paymentBreakdown['cuenta_corriente']?.total || 0],
    ];

    const salesHeaders = [
      'N° Comprobante',
      'Fecha y Hora',
      'Cantidad Productos',
      'Total ($)',
      'Método de Pago',
      'Cajero',
      'Detalle Artículos',
    ];

    const salesRows = sales.map(s => [
      s.saleNumber,
      new Date(s.date).toLocaleString('es-AR'),
      s.itemCount,
      s.total,
      s.paymentMethod.toUpperCase().replace('_', ' '),
      s.cashierName,
      s.items.map(i => `${i.quantity}x ${i.name}`).join(' | '),
    ]);

    const sheets: SheetData[] = [
      { name: 'Resumen Ventas', data: summaryRows },
      { name: 'Detalle de Operaciones', data: [salesHeaders, ...salesRows] },
    ];

    downloadXLSX(`SuperMarcket_Reporte_Ventas_${dateStr}`, sheets);
  }

  /**
   * Exports inventory and rotation report
   */
  public static exportInventoryRotationReport(options: {
    products: Product[];
    topRotation: Array<{ name: string; code: string; category: string; qty: number; revenue: number }>;
    stagnantProducts: Array<{ name: string; code: string; category: string; stock: number; costPrice: number; tiedCapital: number; daysInactive: number; lastActivity: string }>;
    stagnantDays: number;
    movementsSummary: Record<string, { count: number; units: number }>;
  }): void {
    const { products, topRotation, stagnantProducts, stagnantDays, movementsSummary } = options;
    const dateStr = new Date().toISOString().split('T')[0];

    const rotationHeaders = ['Posición', 'Código', 'Producto', 'Categoría', 'Unidades Vendidas', 'Facturación Generada ($)'];
    const rotationRows = topRotation.map((p, idx) => [
      idx + 1,
      p.code,
      p.name,
      p.category,
      p.qty,
      p.revenue,
    ]);

    const stagnantHeaders = ['Código', 'Producto', 'Categoría', 'Stock Inmovilizado', 'Costo Unitario ($)', 'Capital Inmovilizado ($)', 'Días sin Movimiento', 'Última Actividad'];
    const stagnantRows = stagnantProducts.map(p => [
      p.code,
      p.name,
      p.category,
      p.stock,
      p.costPrice,
      p.tiedCapital,
      p.daysInactive,
      p.lastActivity,
    ]);

    const movementsHeaders = ['Tipo de Movimiento', 'Cantidad de Operaciones', 'Unidades Movidas'];
    const movementsRows = Object.entries(movementsSummary).map(([type, data]) => [
      type.toUpperCase().replace('_', ' '),
      data.count,
      data.units,
    ]);

    const sheets: SheetData[] = [
      { name: 'Mayor Rotación', data: [rotationHeaders, ...rotationRows] },
      { name: `Sin Movimientos (${stagnantDays}d)`, data: [stagnantHeaders, ...stagnantRows] },
      { name: 'Movimientos Inventario', data: [movementsHeaders, ...movementsRows] },
    ];

    downloadXLSX(`SuperMarcket_Reporte_Inventario_Rotacion_${dateStr}`, sheets);
  }

  /**
   * Exports replenishment and supplier report
   */
  public static exportReplenishmentReport(options: {
    pendingProducts: Product[];
    requestedProducts: Product[];
    receivedHistory: Array<{ supplierName: string; count: number; units: number; lastDate: string; items: string }>;
  }): void {
    const { pendingProducts, requestedProducts, receivedHistory } = options;
    const dateStr = new Date().toISOString().split('T')[0];

    const pendingHeaders = ['Código', 'Producto', 'Stock Actual', 'Mínimo', 'Sugerido a Reponer', 'Proveedor', 'Costo Ref ($)'];
    const pendingRows = pendingProducts.map(p => [
      p.code,
      p.name,
      p.stock,
      p.minStock,
      p.customReplenishQty || Math.max(1, (p.targetStock || p.minStock * 2) - p.stock),
      p.supplierName || 'Sin asignar',
      p.costPrice,
    ]);

    const requestedHeaders = ['Código', 'Producto', 'Stock Actual', 'Cantidad Solicitada', 'Proveedor', 'Inversión Estimada ($)'];
    const requestedRows = requestedProducts.map(p => {
      const qty = p.customReplenishQty || Math.max(1, (p.targetStock || p.minStock * 2) - p.stock);
      return [
        p.code,
        p.name,
        p.stock,
        qty,
        p.supplierName || 'Sin asignar',
        qty * p.costPrice,
      ];
    });

    const historyHeaders = ['Proveedor', 'Envíos / Entregas Recibidas', 'Total Unidades Ingresadas', 'Fecha Última Entrega', 'Artículos Recibidos'];
    const historyRows = receivedHistory.map(h => [
      h.supplierName,
      h.count,
      h.units,
      h.lastDate,
      h.items,
    ]);

    const sheets: SheetData[] = [
      { name: 'Pedidos en Tránsito', data: [requestedHeaders, ...requestedRows] },
      { name: 'Reposición Pendiente', data: [pendingHeaders, ...pendingRows] },
      { name: 'Historial por Proveedor', data: [historyHeaders, ...historyRows] },
    ];

    downloadXLSX(`SuperMarcket_Reporte_Reposicion_${dateStr}`, sheets);
  }

  /**
   * Exporta la bitácora inmutable de auditoría a Excel / CSV
   */
  public static exportAuditLogsToExcel(logs: Array<{
    timestamp: string;
    terminalId: string;
    userName: string;
    userRole: string;
    action: string;
    entityType: string;
    details: string;
  }>): void {
    const headers = ['Fecha y Hora', 'Terminal / PC', 'Usuario', 'Rol', 'Acción Realizada', 'Entidad Afectada', 'Detalle del Evento'];
    const rows = logs.map(l => [
      new Date(l.timestamp).toLocaleString('es-AR'),
      l.terminalId,
      l.userName,
      l.userRole,
      l.action,
      l.entityType,
      l.details,
    ]);

    const sheet: SheetData = {
      name: 'Auditoría SuperMarcket',
      data: [headers, ...rows],
    };

    downloadXLSX(`SuperMarcket_Auditoria_${new Date().toISOString().slice(0, 10)}`, [sheet]);
  }

  public static downloadCsv(records: Record<string, any>[], filename: string): void {
    if (records.length === 0) return;
    const headers = Object.keys(records[0]);
    const rows = records.map(r => headers.map(h => r[h]));
    const sheet: SheetData = {
      name: 'Auditoría',
      data: [headers, ...rows],
    };
    downloadXLSX(filename, [sheet]);
  }
}
