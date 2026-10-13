import { Supplier } from '../models';
import { StorageService } from './storageService';
import { ProductService } from './productService';

export class SupplierService {
  public static getAll(): Supplier[] {
    return StorageService.getSuppliers();
  }

  public static getById(id: string): Supplier | undefined {
    const suppliers = this.getAll();
    return suppliers.find(s => s.id === id);
  }

  public static save(supplierData: Omit<Supplier, 'id' | 'createdAt'> & { id?: string }): Supplier {
    const suppliers = this.getAll();
    const now = new Date().toISOString();

    if (supplierData.id) {
      const index = suppliers.findIndex(s => s.id === supplierData.id);
      if (index === -1) {
        throw new Error(`Proveedor ${supplierData.id} no encontrado.`);
      }

      const updated: Supplier = {
        ...suppliers[index],
        ...supplierData,
        id: supplierData.id,
      };

      suppliers[index] = updated;
      StorageService.saveSuppliers(suppliers);
      return updated;
    } else {
      const newSupplier: Supplier = {
        ...supplierData,
        id: `sup-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        createdAt: now,
      };

      suppliers.push(newSupplier);
      StorageService.saveSuppliers(suppliers);
      return newSupplier;
    }
  }

  public static delete(id: string): void {
    // Check if products are associated
    const products = ProductService.getAll().filter(p => p.supplierId === id);
    if (products.length > 0) {
      throw new Error(`No se puede eliminar el proveedor porque tiene ${products.length} productos asociados en el catálogo.`);
    }

    const suppliers = this.getAll();
    const filtered = suppliers.filter(s => s.id !== id);
    StorageService.saveSuppliers(filtered);
  }

  public static getProductsBySupplier(supplierId: string) {
    const products = ProductService.getAll();
    return products.filter(p => p.supplierId === supplierId);
  }
}
