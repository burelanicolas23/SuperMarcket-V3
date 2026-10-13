import { Product, Supplier, Sale, InventoryMovement, StoreSettings, defaultSettings } from '../models';
import { BackupValidationService } from './backupValidationService';

const STORAGE_KEYS = {
  PRODUCTS: 'supermarcket_products_v2',
  SUPPLIERS: 'supermarcket_suppliers_v2',
  SALES: 'supermarcket_sales_v2',
  INVENTORY_MOVEMENTS: 'supermarcket_movements_v2',
  SETTINGS: 'supermarcket_settings_v2',
  AUTOMATED_BACKUPS: 'supermarcket_auto_backups_v2',
};

export class StorageService {
  public static getProducts(): Product[] {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.PRODUCTS);
      // Los códigos de barras se deben conservar literalmente. Repararlos o
      // convertirlos automáticamente rompe códigos UPC/EAN-8 y puede hacer
      // que un producto recién registrado deje de encontrarse al escanearlo.
      return stored ? JSON.parse(stored) : [];
    } catch (e) {
      console.error('Error reading products from storage:', e);
      return [];
    }
  }

  public static saveProducts(products: Product[]): void {
    try {
      localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(products));
    } catch (e) {
      console.error('Error saving products to storage:', e);
    }
  }

  public static getSuppliers(): Supplier[] {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.SUPPLIERS);
      return stored ? JSON.parse(stored) : [];
    } catch (e) {
      console.error('Error reading suppliers from storage:', e);
      return [];
    }
  }

  public static saveSuppliers(suppliers: Supplier[]): void {
    try {
      localStorage.setItem(STORAGE_KEYS.SUPPLIERS, JSON.stringify(suppliers));
    } catch (e) {
      console.error('Error saving suppliers to storage:', e);
    }
  }

  public static getSales(): Sale[] {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.SALES);
      return stored ? JSON.parse(stored) : [];
    } catch (e) {
      console.error('Error reading sales from storage:', e);
      return [];
    }
  }

  public static saveSales(sales: Sale[]): void {
    try {
      localStorage.setItem(STORAGE_KEYS.SALES, JSON.stringify(sales));
    } catch (e) {
      console.error('Error saving sales to storage:', e);
    }
  }

  public static saveSale(sale: Sale): void {
    const sales = this.getSales();
    const updated = [sale, ...sales];
    this.saveSales(updated);
  }

  public static updateSale(sale: Sale): void {
    const sales = this.getSales();
    const index = sales.findIndex(s => s.id === sale.id);
    if (index !== -1) {
      sales[index] = sale;
      this.saveSales(sales);
    }
  }

  public static getInventoryMovements(): InventoryMovement[] {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.INVENTORY_MOVEMENTS);
      return stored ? JSON.parse(stored) : [];
    } catch (e) {
      console.error('Error reading movements from storage:', e);
      return [];
    }
  }

  public static saveInventoryMovements(movements: InventoryMovement[]): void {
    try {
      localStorage.setItem(STORAGE_KEYS.INVENTORY_MOVEMENTS, JSON.stringify(movements));
    } catch (e) {
      console.error('Error saving movements to storage:', e);
    }
  }

  public static getSettings(): StoreSettings {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.SETTINGS);
      if (!stored) {
        this.saveSettings(defaultSettings);
        return defaultSettings;
      }
      return JSON.parse(stored);
    } catch (e) {
      console.error('Error reading settings from storage:', e);
      return defaultSettings;
    }
  }

  public static saveSettings(settings: StoreSettings): void {
    try {
      localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
    } catch (e) {
      console.error('Error saving settings to storage:', e);
    }
  }

  public static exportFullBackup(): string {
    const backup = {
      version: '2.0-ARCA-PRO',
      exportedAt: new Date().toISOString(),
      products: this.getProducts(),
      suppliers: this.getSuppliers(),
      sales: this.getSales(),
      movements: this.getInventoryMovements(),
      settings: this.getSettings(),
    };
    return JSON.stringify(backup, null, 2);
  }

  public static importBackup(jsonString: string): { success: boolean; error?: string } {
    const valResult = BackupValidationService.validate(jsonString);
    if (!valResult.isValid) {
      const err = valResult.errors.join(' | ');
      console.error('[Backup Import Rejected]:', err);
      return { success: false, error: err };
    }

    try {
      const data = JSON.parse(jsonString);
      if (data.products && Array.isArray(data.products)) {
        this.saveProducts(data.products);
      }
      if (data.suppliers && Array.isArray(data.suppliers)) {
        this.saveSuppliers(data.suppliers);
      }
      if (data.sales && Array.isArray(data.sales)) {
        this.saveSales(data.sales);
      }
      if (data.movements && Array.isArray(data.movements)) {
        this.saveInventoryMovements(data.movements);
      }
      if (data.settings) {
        this.saveSettings(data.settings);
      }
      return { success: true };
    } catch (e: any) {
      console.error('Failed to import backup:', e);
      return { success: false, error: e.message || 'Error desconocido al importar' };
    }
  }

  /**
   * Guarda una copia de seguridad automática fechada
   */
  public static saveAutomaticBackupSnapshot(label: string = 'Automático'): void {
    try {
      const existing = this.getAutomatedBackupsList();
      const newSnapshot = {
        id: `backup-${Date.now()}`,
        timestamp: new Date().toISOString(),
        label,
        productsCount: this.getProducts().length,
        salesCount: this.getSales().length,
        sizeKb: Math.round(this.exportFullBackup().length / 1024),
      };
      const updated = [newSnapshot, ...existing].slice(0, 15); // Guarda últimas 15 copias
      localStorage.setItem(STORAGE_KEYS.AUTOMATED_BACKUPS, JSON.stringify(updated));
    } catch (_e) {}
  }

  public static getAutomatedBackupsList(): Array<{
    id: string;
    timestamp: string;
    label: string;
    productsCount: number;
    salesCount: number;
    sizeKb: number;
  }> {
    try {
      const s = localStorage.getItem(STORAGE_KEYS.AUTOMATED_BACKUPS);
      return s ? JSON.parse(s) : [];
    } catch (_e) {
      return [];
    }
  }
}
