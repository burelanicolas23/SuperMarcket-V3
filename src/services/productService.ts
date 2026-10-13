import { Product, ProductCategory, calculateStockStatus } from '../models';
import { StorageService } from './storageService';

export interface ProductFilterOptions {
  query?: string;
  category?: string; // ProductCategory or 'todos'
  status?: string; // 'disponible' | 'bajo_stock' | 'agotado' | 'todos'
  supplierId?: string; // supplier id or 'todos'
  sortBy?: 'name' | 'price' | 'stock' | 'date';
  sortOrder?: 'asc' | 'desc';
}

export class ProductService {
  public static getAll(): Product[] {
    return StorageService.getProducts();
  }

  public static getById(id: string): Product | undefined {
    const products = this.getAll();
    return products.find(p => p.id === id);
  }

  public static getByCode(code: string): Product | undefined {
    const trimmed = code.trim().toLowerCase();
    const products = this.getAll();
    return products.find(
      p =>
        p.code.toLowerCase() === trimmed ||
        (p.internalCode && p.internalCode.toLowerCase() === trimmed)
    );
  }

  /**
   * Generates a recommended next internal code (e.g. INT-0021)
   */
  public static generateNextInternalCode(): string {
    const products = this.getAll();
    let maxNum = 0;
    const regex = /INT-(\d+)/i;

    for (const p of products) {
      if (p.internalCode) {
        const match = p.internalCode.match(regex);
        if (match && match[1]) {
          const num = parseInt(match[1], 10);
          if (!isNaN(num) && num > maxNum) {
            maxNum = num;
          }
        }
      }
    }

    return `INT-${String(maxNum + 1).padStart(4, '0')}`;
  }

  /**
   * Searches and filters products according to:
   * - Buscador: Nombre, Código de barras, Código interno, Marca, Categoría
   * - Filtros: Disponibles, Stock bajo, Agotados, Categoría, Proveedor
   * - Ordenamiento: Nombre, Precio, Cantidad disponible (asc / desc)
   */
  public static filterAndSort(options: ProductFilterOptions): Product[] {
    const products = this.getAll();
    const {
      query = '',
      category = 'todos',
      status = 'todos',
      supplierId = 'todos',
      sortBy = 'name',
      sortOrder = 'asc',
    } = options;

    const q = query.trim().toLowerCase();

    const filtered = products.filter(p => {
      // 1. Category Filter
      if (category !== 'todos' && p.category !== category) {
        return false;
      }

      // 2. Status Filter
      if (status !== 'todos' && p.status !== status) {
        return false;
      }

      // 3. Supplier Filter
      if (supplierId !== 'todos' && p.supplierId !== supplierId) {
        return false;
      }

      // 4. Search by Name, Barcode, Internal Code, Brand, Category
      if (q) {
        const matchesName = p.name.toLowerCase().includes(q);
        const matchesBarcode = p.code.toLowerCase().includes(q);
        const matchesInternalCode = p.internalCode ? p.internalCode.toLowerCase().includes(q) : false;
        const matchesBrand = p.brand ? p.brand.toLowerCase().includes(q) : false;
        const matchesCat = p.category ? p.category.toLowerCase().includes(q) : false;
        const matchesSupplier = p.supplierName ? p.supplierName.toLowerCase().includes(q) : false;

        if (!matchesName && !matchesBarcode && !matchesInternalCode && !matchesBrand && !matchesCat && !matchesSupplier) {
          return false;
        }
      }

      return true;
    });

    // 5. Sorting
    return filtered.sort((a, b) => {
      let comparison = 0;

      if (sortBy === 'name') {
        comparison = a.name.localeCompare(b.name, 'es', { sensitivity: 'base' });
      } else if (sortBy === 'price') {
        comparison = a.sellingPrice - b.sellingPrice;
      } else if (sortBy === 'stock') {
        comparison = a.stock - b.stock;
      } else if (sortBy === 'date') {
        comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      }

      return sortOrder === 'asc' ? comparison : -comparison;
    });
  }

  public static getLowStockProducts(): Product[] {
    const products = this.getAll();
    return products.filter(p => p.stock > 0 && p.stock <= p.minStock);
  }

  public static getOutOfStockProducts(): Product[] {
    const products = this.getAll();
    return products.filter(p => p.stock <= 0);
  }

  public static getMissingProducts(): Product[] {
    const products = this.getAll();
    const map = new Map<string, Product>();

    for (const p of products) {
      // Condición A: Stock actual igual o inferior al stock mínimo
      // Condición B: Stock actual igual a cero
      // Condición C: Productos marcados manualmente como faltantes
      if (p.stock <= p.minStock || p.stock <= 0 || p.isManuallyMarkedMissing) {
        map.set(p.id, p);
      }
    }

    // Sin duplicados
    return Array.from(map.values());
  }

  public static toggleManualMissing(id: string, isMissing: boolean): Product {
    const products = this.getAll();
    const index = products.findIndex(p => p.id === id);
    if (index === -1) {
      throw new Error(`Producto con ID ${id} no encontrado.`);
    }

    const updated: Product = {
      ...products[index],
      isManuallyMarkedMissing: isMissing,
      updatedAt: new Date().toISOString(),
    };
    products[index] = updated;
    StorageService.saveProducts(products);
    return updated;
  }

  public static updateOrderStatus(id: string, orderStatus: 'pendiente' | 'solicitado' | 'recibido'): Product {
    const products = this.getAll();
    const index = products.findIndex(p => p.id === id);
    if (index === -1) {
      throw new Error(`Producto con ID ${id} no encontrado.`);
    }

    const updated: Product = {
      ...products[index],
      orderStatus,
      updatedAt: new Date().toISOString(),
    };
    products[index] = updated;
    StorageService.saveProducts(products);
    return updated;
  }

  public static updateCustomReplenishQty(id: string, qty: number): Product {
    const products = this.getAll();
    const index = products.findIndex(p => p.id === id);
    if (index === -1) {
      throw new Error(`Producto con ID ${id} no encontrado.`);
    }

    const updated: Product = {
      ...products[index],
      customReplenishQty: Math.max(1, qty),
      updatedAt: new Date().toISOString(),
    };
    products[index] = updated;
    StorageService.saveProducts(products);
    return updated;
  }

  public static bulkUpdateOrderStatus(ids: string[], orderStatus: 'pendiente' | 'solicitado' | 'recibido'): void {
    const products = this.getAll();
    const idSet = new Set(ids);
    const updated = products.map(p => {
      if (idSet.has(p.id)) {
        return {
          ...p,
          orderStatus,
          updatedAt: new Date().toISOString(),
        };
      }
      return p;
    });
    StorageService.saveProducts(updated);
  }

  public static save(
    productData: Omit<Product, 'id' | 'status' | 'createdAt' | 'updatedAt'> & {
      id?: string;
      createdAt?: string;
    }
  ): Product {
    const products = this.getAll();
    const now = new Date().toISOString();
    const status = calculateStockStatus(productData.stock, productData.minStock);

    const codeTrimmed = productData.code.trim();
    const internalCodeTrimmed = (
      productData.internalCode?.trim() || this.generateNextInternalCode()
    ).toUpperCase();
    const brandTrimmed = productData.brand?.trim() || 'Genérica';

    // QR payload standard
    const qrData = productData.qrCodeData?.trim() || `SMK:${codeTrimmed}:${internalCodeTrimmed}`;

    if (productData.id) {
      // Update existing
      const index = products.findIndex(p => p.id === productData.id);
      if (index === -1) {
        throw new Error(`Producto con ID ${productData.id} no encontrado.`);
      }

      // Check unique barcode except self
      const duplicateCode = products.find(
        p => p.code.toLowerCase() === codeTrimmed.toLowerCase() && p.id !== productData.id
      );
      if (duplicateCode) {
        throw new Error(
          `Ya existe otro producto con el código de barras "${codeTrimmed}" (${duplicateCode.name}).`
        );
      }

      // Check unique internal code except self
      const duplicateInternal = products.find(
        p =>
          p.internalCode &&
          p.internalCode.toLowerCase() === internalCodeTrimmed.toLowerCase() &&
          p.id !== productData.id
      );
      if (duplicateInternal) {
        throw new Error(
          `Ya existe otro producto con el código interno "${internalCodeTrimmed}" (${duplicateInternal.name}).`
        );
      }

      const updated: Product = {
        ...products[index],
        ...productData,
        id: productData.id,
        code: codeTrimmed,
        internalCode: internalCodeTrimmed,
        brand: brandTrimmed,
        qrCodeData: qrData,
        status,
        updatedAt: now,
      };

      products[index] = updated;
      StorageService.saveProducts(products);
      return updated;
    } else {
      // Create new
      const duplicateCode = products.find(
        p => p.code.toLowerCase() === codeTrimmed.toLowerCase()
      );
      if (duplicateCode) {
        throw new Error(
          `Ya existe un producto registrado con el código de barras "${codeTrimmed}" (${duplicateCode.name}).`
        );
      }

      const duplicateInternal = products.find(
        p =>
          p.internalCode &&
          p.internalCode.toLowerCase() === internalCodeTrimmed.toLowerCase()
      );
      if (duplicateInternal) {
        throw new Error(
          `Ya existe un producto con el código interno "${internalCodeTrimmed}" (${duplicateInternal.name}).`
        );
      }

      const newProduct: Product = {
        ...productData,
        id: `prod-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        code: codeTrimmed,
        internalCode: internalCodeTrimmed,
        brand: brandTrimmed,
        qrCodeData: qrData,
        status,
        createdAt: productData.createdAt || now,
        updatedAt: now,
      };

      products.push(newProduct);
      StorageService.saveProducts(products);
      return newProduct;
    }
  }

  public static delete(id: string): void {
    const products = this.getAll();
    const filtered = products.filter(p => p.id !== id);
    if (filtered.length === products.length) {
      throw new Error(`Producto con ID ${id} no encontrado.`);
    }
    StorageService.saveProducts(filtered);
  }

  public static updateStock(
    id: string,
    deltaQuantity: number
  ): { product: Product; previousStock: number } {
    const products = this.getAll();
    const index = products.findIndex(p => p.id === id);
    if (index === -1) {
      throw new Error(`Producto ${id} no encontrado`);
    }

    const current = products[index];
    const previousStock = current.stock;
    const newStock = Math.max(0, previousStock + deltaQuantity);
    const status = calculateStockStatus(newStock, current.minStock);

    const updated: Product = {
      ...current,
      stock: newStock,
      status,
      updatedAt: new Date().toISOString(),
    };

    products[index] = updated;
    StorageService.saveProducts(products);
    return { product: updated, previousStock };
  }
}
