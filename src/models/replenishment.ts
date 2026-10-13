export type ReplenishmentOrderStatus =
  | 'pendiente'
  | 'solicitado'
  | 'parcial'
  | 'recibido'
  | 'cancelado';

export interface ReplenishmentOrderItem {
  productId: string;
  productCode: string;
  internalCode: string;
  productName: string;
  brand: string;
  category: string;
  supplierId?: string;
  supplierName?: string;
  currentStock: number;
  minStock: number;
  requestedQuantity: number;
  receivedQuantity: number;
  pendingQuantity: number;
  unit: string;
  costPrice: number;
  notes?: string;
}

export interface ReplenishmentOrder {
  id: string;
  orderNumber: string; // ej: ORD-0001
  date: string; // ISO string
  requestedAt?: string;
  receivedAt?: string;
  supplierId?: string;
  supplierName?: string;
  items: ReplenishmentOrderItem[];
  totalItemsRequested: number;
  totalItemsReceived: number;
  estimatedCost: number;
  status: ReplenishmentOrderStatus;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}
