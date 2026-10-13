import { AfipAuthData, ReceptorFiscal, TipoComprobanteAfip } from '../services/arcaService';

export type PaymentMethod =
  | 'efectivo'
  | 'tarjeta_debito'
  | 'tarjeta_credito'
  | 'transferencia_qr'
  | 'mercado_pago'
  | 'cuenta_corriente'
  | 'otro';

export interface SaleItem {
  productId: string;
  code: string;
  name: string;
  unitPrice: number;
  costPrice: number;
  quantity: number;
  subtotal: number;
}

export interface Sale {
  id: string;
  saleNumber: string;
  receiptNumber?: string;
  invoiceType?: TipoComprobanteAfip;
  terminalId?: string;
  date: string; // ISO string
  items: SaleItem[];
  itemCount: number;
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  paymentMethod: PaymentMethod;
  paymentDetails?: any;
  cashTendered?: number;
  changeDue?: number;
  cashierName: string;
  cashierId?: string;
  status: 'completada' | 'anulada';
  afipAuth?: AfipAuthData;
  customer?: ReceptorFiscal;
  notes?: string;
  createdAt: string;
}
