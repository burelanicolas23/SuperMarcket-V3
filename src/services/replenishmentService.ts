import {
  ReplenishmentOrder,
  ReplenishmentOrderItem,
  ReplenishmentOrderStatus,
} from '../models/replenishment';
import { ProductService } from './productService';
import { InventoryService } from './inventoryService';

const STORAGE_KEY_ORDERS = 'supermarcket_replenishment_orders_v1';

export class ReplenishmentService {
  public static getOrders(): ReplenishmentOrder[] {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_ORDERS);
      if (!stored) return [];
      const orders = JSON.parse(stored) as ReplenishmentOrder[];
      return orders.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    } catch (e) {
      console.error('Error reading replenishment orders:', e);
      return [];
    }
  }

  public static saveOrders(orders: ReplenishmentOrder[]): void {
    try {
      localStorage.setItem(STORAGE_KEY_ORDERS, JSON.stringify(orders));
    } catch (e) {
      console.error('Error saving replenishment orders:', e);
    }
  }

  public static getOrderById(id: string): ReplenishmentOrder | undefined {
    return this.getOrders().find(o => o.id === id);
  }

  /**
   * Prepares and creates a new replenishment order
   */
  public static createOrder(input: {
    items: Array<{
      productId: string;
      requestedQuantity: number;
      notes?: string;
    }>;
    supplierId?: string;
    supplierName?: string;
    notes?: string;
  }): ReplenishmentOrder {
    if (!input.items || input.items.length === 0) {
      throw new Error('Debe seleccionar al menos un producto para preparar el pedido.');
    }

    const orderItems: ReplenishmentOrderItem[] = [];
    let totalItemsRequested = 0;
    let estimatedCost = 0;

    for (const item of input.items) {
      if (item.requestedQuantity <= 0) {
        throw new Error('La cantidad a reponer debe ser mayor a cero.');
      }

      const product = ProductService.getById(item.productId);
      if (!product) {
        throw new Error(`Producto ${item.productId} no encontrado.`);
      }

      const cost = product.costPrice * item.requestedQuantity;
      estimatedCost += cost;
      totalItemsRequested += item.requestedQuantity;

      orderItems.push({
        productId: product.id,
        productCode: product.code,
        internalCode: product.internalCode,
        productName: product.name,
        brand: product.brand,
        category: product.category,
        supplierId: product.supplierId,
        supplierName: product.supplierName,
        currentStock: product.stock,
        minStock: product.minStock,
        requestedQuantity: item.requestedQuantity,
        receivedQuantity: 0,
        pendingQuantity: item.requestedQuantity,
        unit: product.unit,
        costPrice: product.costPrice,
        notes: item.notes,
      });
    }

    const allOrders = this.getOrders();
    const orderNumber = `PED-${String(allOrders.length + 101).padStart(5, '0')}`;
    const now = new Date().toISOString();

    const newOrder: ReplenishmentOrder = {
      id: `ord-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      orderNumber,
      date: now,
      supplierId: input.supplierId,
      supplierName: input.supplierName,
      items: orderItems,
      totalItemsRequested,
      totalItemsReceived: 0,
      estimatedCost,
      status: 'pendiente',
      notes: input.notes,
      createdAt: now,
      updatedAt: now,
    };

    allOrders.unshift(newOrder);
    this.saveOrders(allOrders);

    return newOrder;
  }

  /**
   * Marks order as requested (pedido formalizado/enviado al proveedor)
   */
  public static markAsRequested(orderId: string): ReplenishmentOrder {
    const orders = this.getOrders();
    const index = orders.findIndex(o => o.id === orderId);

    if (index === -1) {
      throw new Error(`Pedido con ID ${orderId} no encontrado.`);
    }

    const now = new Date().toISOString();
    const updated: ReplenishmentOrder = {
      ...orders[index],
      status: 'solicitado',
      requestedAt: now,
      updatedAt: now,
    };

    orders[index] = updated;
    this.saveOrders(orders);
    return updated;
  }

  /**
   * Receives goods from supplier:
   * - Aumenta el stock real en el producto
   * - Registra movimiento de inventario ('ingreso_compra')
   * - Actualiza cantidades recibidas y pendientes en la orden
   * - Actualiza el estado a 'recibido' o 'parcial'
   * - Evita sumas duplicadas
   */
  public static receiveGoods(
    orderId: string,
    receptions: Array<{ productId: string; quantityReceivedNow: number }>,
    user: string
  ): { order: ReplenishmentOrder; totalStockAdded: number } {
    const orders = this.getOrders();
    const index = orders.findIndex(o => o.id === orderId);

    if (index === -1) {
      throw new Error(`Pedido ${orderId} no encontrado.`);
    }

    const order = orders[index];
    if (order.status === 'recibido') {
      throw new Error('Este pedido ya fue recibido en su totalidad anteriormente.');
    }

    let totalStockAdded = 0;
    const now = new Date().toISOString();

    const updatedItems = order.items.map(item => {
      const rec = receptions.find(r => r.productId === item.productId);
      const incomingQty = rec && rec.quantityReceivedNow > 0 ? rec.quantityReceivedNow : 0;

      if (incomingQty > 0) {
        // 1. Update physical inventory
        ProductService.updateStock(item.productId, incomingQty);

        // 2. Record inventory movement
        InventoryService.adjustStock({
          productId: item.productId,
          type: 'ingreso_compra',
          quantity: incomingQty,
          reason: `Recepción de pedido ${order.orderNumber}`,
          referenceDoc: order.orderNumber,
          user: user || 'Encargado de Depósito',
        });

        totalStockAdded += incomingQty;
      }

      const newReceivedTotal = item.receivedQuantity + incomingQty;
      const newPending = Math.max(0, item.requestedQuantity - newReceivedTotal);

      return {
        ...item,
        receivedQuantity: newReceivedTotal,
        pendingQuantity: newPending,
      };
    });

    if (totalStockAdded === 0) {
      throw new Error('Debe ingresar al menos una unidad recibida mayor a cero.');
    }

    // Determine new status
    const totalPending = updatedItems.reduce((sum, i) => sum + i.pendingQuantity, 0);
    const totalReceived = updatedItems.reduce((sum, i) => sum + i.receivedQuantity, 0);

    const newStatus: ReplenishmentOrderStatus = totalPending === 0 ? 'recibido' : 'parcial';

    const updatedOrder: ReplenishmentOrder = {
      ...order,
      items: updatedItems,
      totalItemsReceived: totalReceived,
      status: newStatus,
      receivedAt: totalPending === 0 ? now : order.receivedAt,
      updatedAt: now,
    };

    orders[index] = updatedOrder;
    this.saveOrders(orders);

    return { order: updatedOrder, totalStockAdded };
  }
}
