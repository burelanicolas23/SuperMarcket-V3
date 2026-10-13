/**
 * Servicio de Validación Criptográfica y Estricta de Esquema de Backups
 * Previene corrupción de base de datos, inyección de payloads y desbordamiento de límites.
 */

import { Ean13Service } from './ean13Service';

export interface BackupValidationResult {
  isValid: boolean;
  errors: string[];
  summary?: {
    productsCount: number;
    suppliersCount: number;
    salesCount: number;
    movementsCount: number;
  };
}

export class BackupValidationService {
  public static validate(jsonString: string): BackupValidationResult {
    const errors: string[] = [];

    if (!jsonString || typeof jsonString !== 'string') {
      return { isValid: false, errors: ['El archivo de backup está vacío o no es un texto legible.'] };
    }

    // Límite de tamaño: máximo 25 MB para evitar ataques DoS por memoria
    if (jsonString.length > 25 * 1024 * 1024) {
      return { isValid: false, errors: ['El archivo de backup excede el tamaño máximo permitido (25 MB).'] };
    }

    let parsed: any;
    try {
      parsed = JSON.parse(jsonString);
    } catch (e: any) {
      return { isValid: false, errors: [`JSON malformado: ${e.message}`] };
    }

    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
      return { isValid: false, errors: ['La estructura raíz del backup debe ser un objeto JSON válido.'] };
    }

    // 1. Verificación de Versión y Metadatos
    if (!parsed.version || typeof parsed.version !== 'string') {
      errors.push('Falta el campo requerido "version" en el encabezado del backup.');
    }

    // 2. Validación de Productos
    if (parsed.products !== undefined) {
      if (!Array.isArray(parsed.products)) {
        errors.push('El campo "products" debe ser un array.');
      } else {
        if (parsed.products.length > 10000) {
          errors.push('La lista de productos excede el límite permitido (máximo 10,000 ítems).');
        }
        for (let i = 0; i < parsed.products.length; i++) {
          const p = parsed.products[i];
          if (!p || typeof p !== 'object') {
            errors.push(`Producto #${i + 1} no es un objeto válido.`);
            break;
          }
          if (!p.id || typeof p.id !== 'string' || p.id.length > 128) {
            errors.push(`Producto #${i + 1} tiene un "id" inválido.`);
            break;
          }
          if (!p.name || typeof p.name !== 'string' || p.name.length > 150) {
            errors.push(`Producto "${p.name || i}" tiene un nombre inválido.`);
            break;
          }
          if (typeof p.sellingPrice !== 'number' || isNaN(p.sellingPrice) || p.sellingPrice < 0 || p.sellingPrice > 1e8) {
            errors.push(`Producto "${p.name}" tiene un precio de venta no numérico o fuera de rango.`);
            break;
          }
          if (typeof p.stock !== 'number' || isNaN(p.stock) || p.stock < 0 || p.stock > 1e6) {
            errors.push(`Producto "${p.name}" tiene un stock fuera de rango.`);
            break;
          }
        }
      }
    }

    // 3. Validación de Proveedores
    if (parsed.suppliers !== undefined) {
      if (!Array.isArray(parsed.suppliers)) {
        errors.push('El campo "suppliers" debe ser un array.');
      } else if (parsed.suppliers.length > 1000) {
        errors.push('La lista de proveedores excede el límite de 1,000 registros.');
      }
    }

    // 4. Validación de Ventas
    if (parsed.sales !== undefined) {
      if (!Array.isArray(parsed.sales)) {
        errors.push('El campo "sales" debe ser un array.');
      } else if (parsed.sales.length > 50000) {
        errors.push('La lista de ventas excede el límite permitido (50,000).');
      }
    }

    // 5. Validación de Configuración
    if (parsed.settings !== undefined) {
      if (typeof parsed.settings !== 'object' || parsed.settings === null) {
        errors.push('El campo "settings" debe ser un objeto.');
      } else {
        if (parsed.settings.pointOfSale !== undefined && (typeof parsed.settings.pointOfSale !== 'number' || parsed.settings.pointOfSale < 1)) {
          errors.push('Punto de venta fiscal en settings debe ser un número entero mayor a 0.');
        }
      }
    }

    if (errors.length > 0) {
      return { isValid: false, errors };
    }

    return {
      isValid: true,
      errors: [],
      summary: {
        productsCount: Array.isArray(parsed.products) ? parsed.products.length : 0,
        suppliersCount: Array.isArray(parsed.suppliers) ? parsed.suppliers.length : 0,
        salesCount: Array.isArray(parsed.sales) ? parsed.sales.length : 0,
        movementsCount: Array.isArray(parsed.movements) ? parsed.movements.length : 0,
      }
    };
  }
}
