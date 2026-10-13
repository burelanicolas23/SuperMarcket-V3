export type MovementType =
  | 'ingreso_compra'
  | 'egreso_merma'
  | 'egreso_vencimiento'
  | 'ajuste_conteo'
  | 'venta'
  | 'devolucion'
  | 'VENTA'
  | 'COMPRA'
  | 'DEVOLUCION'
  | 'MERMA'
  | 'AJUSTE_POSITIVO'
  | 'AJUSTE_NEGATIVO'
  | 'STOCK_INICIAL';

export interface InventoryMovement {
  id: string;
  productId: string;
  productCode: string;
  productName: string;
  type: MovementType;
  quantity: number; // positive or negative
  previousStock: number;
  newStock: number;
  reason: string;
  referenceDoc?: string; // Nro Factura / Remito
  user: string;
  date: string; // ISO
}
