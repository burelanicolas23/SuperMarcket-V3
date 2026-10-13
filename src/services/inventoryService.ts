import { InventoryMovement, MovementType } from '../models';
import { StorageService } from './storageService';
import { ProductService } from './productService';

export interface StockAdjustmentInput {
  productId: string;
  type: MovementType;
  quantity: number; // positive for ingress/purchase, negative for merma/loss, or relative
  reason: string;
  referenceDoc?: string;
  user: string;
}

export class InventoryService {
  public static getAllMovements(): InventoryMovement[] {
    const movements = StorageService.getInventoryMovements();
    // Sort descending by date
    return movements.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }

  public static getMovementsByProduct(productId: string): InventoryMovement[] {
    const movements = this.getAllMovements();
    return movements.filter(m => m.productId === productId);
  }

  /**
   * Ajusta el stock de un producto generando el correspondiente movimiento inmutable en el Kardex.
   * Soporta llamada con objeto StockAdjustmentInput o parámetros posicionales.
   */
  public static adjustStock(
    inputOrProductId: StockAdjustmentInput | string,
    quantity?: number,
    type?: MovementType,
    reason?: string,
    referenceDoc?: string,
    user?: string
  ): InventoryMovement {
    let input: StockAdjustmentInput;

    if (typeof inputOrProductId === 'string') {
      input = {
        productId: inputOrProductId,
        quantity: quantity ?? 0,
        type: type ?? 'AJUSTE_POSITIVO',
        reason: reason ?? 'Ajuste de inventario',
        referenceDoc,
        user: user ?? 'Operador SuperMarcket',
      };
    } else {
      input = inputOrProductId;
    }

    const product = ProductService.getById(input.productId);
    if (!product) {
      throw new Error(`Producto con ID ${input.productId} no encontrado.`);
    }

    if (input.quantity === 0) {
      throw new Error('La cantidad a ajustar no puede ser cero.');
    }

    // Apply stock delta
    const { product: updatedProduct, previousStock } = ProductService.updateStock(
      input.productId,
      input.quantity
    );

    const movement: InventoryMovement = {
      id: `mov-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      productId: product.id,
      productCode: product.code,
      productName: product.name,
      type: input.type,
      quantity: input.quantity,
      previousStock,
      newStock: updatedProduct.stock,
      reason: input.reason.trim() || 'Ajuste de inventario manual',
      referenceDoc: input.referenceDoc?.trim(),
      user: input.user || 'Administrador',
      date: new Date().toISOString(),
    };

    const movements = StorageService.getInventoryMovements();
    movements.unshift(movement);
    StorageService.saveInventoryMovements(movements);

    return movement;
  }

  public static calculateInventoryValuation(): { totalCost: number; totalSaleValue: number; totalUnits: number } {
    const products = ProductService.getAll();
    let totalCost = 0;
    let totalSaleValue = 0;
    let totalUnits = 0;

    for (const p of products) {
      totalCost += p.costPrice * p.stock;
      totalSaleValue += p.sellingPrice * p.stock;
      totalUnits += p.stock;
    }

    return { totalCost, totalSaleValue, totalUnits };
  }
}
