export interface Supplier {
  id: string;
  name: string;
  contactPerson: string;
  phone: string;
  email: string;
  taxId: string; // CUIT / RUT / RFC / NIF
  address: string;
  category: string;
  deliveryDays?: string[];
  notes?: string;
  active: boolean;
  createdAt: string;
}
