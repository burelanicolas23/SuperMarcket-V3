export type ProductCategory =
  | 'Almacén y Abarrotes'
  | 'Lácteos y Quesos'
  | 'Bebidas y Licores'
  | 'Panadería y Confitería'
  | 'Frutas y Verduras'
  | 'Carnicería y Fiambrería'
  | 'Limpieza y Perfumería'
  | 'Congelados'
  | 'Snacks y Golosinas'
  | 'Otros';

export type ProductUnit = 'unidad' | 'kg' | 'g' | 'litro' | 'pack';

export type StockStatus = 'disponible' | 'bajo_stock' | 'agotado';
export type OrderStatus = 'pendiente' | 'solicitado' | 'recibido';

export interface Product {
  id: string;
  code: string; // Código de barras (EAN-13 / SKU)
  internalCode: string; // Código interno propio del supermercado
  name: string;
  brand: string; // Marca comercial
  description?: string;
  category: ProductCategory;
  costPrice: number; // Precio de compra al proveedor
  sellingPrice: number; // Precio de venta al público
  stock: number; // Cantidad disponible en góndola/depósito
  minStock: number; // Stock mínimo para alerta de reposición
  targetStock?: number; // Stock objetivo para reposición (sugerido = targetStock - stock)
  isManuallyMarkedMissing?: boolean; // Marcado manual como faltante
  orderStatus?: OrderStatus; // Estado del pedido para faltantes: 'pendiente' | 'solicitado' | 'recibido'
  customReplenishQty?: number; // Cantidad personalizada a reponer editada por el usuario
  unit: ProductUnit;
  supplierId?: string;
  supplierName?: string;
  qrCodeData?: string;
  status: StockStatus;
  location?: string; // Pasillo / Góndola
  createdAt: string; // Fecha de alta
  updatedAt: string;
}

export function calculateStockStatus(stock: number, minStock: number): StockStatus {
  if (stock <= 0) return 'agotado';
  if (stock <= minStock) return 'bajo_stock';
  return 'disponible';
}

/**
 * Calculates suggested replenishment quantity:
 * Cantidad sugerida = Stock objetivo - Stock actual
 */
export function calculateSuggestedQuantity(product: Product): number {
  const target =
    product.targetStock && product.targetStock > product.minStock
      ? product.targetStock
      : Math.max(product.minStock * 2, product.minStock + 10);

  return Math.max(1, target - product.stock);
}
