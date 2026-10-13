export interface StoreSettings {
  storeName: string;
  slogan: string;
  taxId: string;
  address: string;
  city: string;
  phone: string;
  email: string;
  currencySymbol: string;
  currencyCode: string;
  taxRate: number; // percentage, e.g. 21
  ticketFooterMessage: string;
  lowStockDefaultThreshold: number;
  barcodePrefix: string;
}

export const defaultSettings: StoreSettings = {
  storeName: '',
  slogan: '',
  taxId: '',
  address: '',
  city: '',
  phone: '',
  email: '',
  currencySymbol: '$',
  currencyCode: 'ARS',
  taxRate: 21,
  ticketFooterMessage: '¡Gracias por su compra! Conserve este ticket como comprobante.',
  lowStockDefaultThreshold: 5,
  barcodePrefix: '',
};
