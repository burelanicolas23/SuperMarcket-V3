import { Product } from '../models';
import { ProductService } from './productService';

export interface ScanResult {
  rawCode: string;
  normalizedCode: string;
  format?: string;
  product?: Product;
  timestamp: number;
}

export class BarcodeScannerService {
  private static lastScannedCode: string = '';
  private static lastScannedTime: number = 0;
  private static readonly DEBOUNCE_MS = 1800; // Anti-repetition window

  /**
   * Normalizes scanned string.
   * If code is formatted as QR payload "SMK:7790123:INT-001", extracts primary code.
   */
  public static normalizeCode(rawCode: string): string {
    const trimmed = rawCode.trim();

    // Check if it's a SuperMarcket QR formatted payload (SMK:barcode:internalCode)
    if (trimmed.startsWith('SMK:')) {
      const parts = trimmed.split(':');
      if (parts.length >= 2 && parts[1]) {
        return parts[1].trim();
      }
    }

    return trimmed;
  }

  /**
   * Looks up product by scanned code (either barcode or internalCode or raw payload).
   */
  public static findProduct(rawCode: string): { product?: Product; normalizedCode: string } {
    const normalized = this.normalizeCode(rawCode);

    // 1. Direct search by barcode or internal code
    let product = ProductService.getByCode(normalized);

    // 2. If QR payload was "SMK:code:internalCode", also check the 3rd part
    if (!product && rawCode.startsWith('SMK:')) {
      const parts = rawCode.split(':');
      if (parts.length >= 3 && parts[2]) {
        product = ProductService.getByCode(parts[2].trim());
      }
    }

    return { product, normalizedCode: normalized };
  }

  /**
   * Checks if an identical code was scanned recently to prevent accidental multi-reads
   */
  public static isDuplicateScan(code: string): boolean {
    const now = Date.now();
    const isSame = this.lastScannedCode === code;
    const isRecent = now - this.lastScannedTime < this.DEBOUNCE_MS;

    if (isSame && isRecent) {
      return true;
    }

    this.lastScannedCode = code;
    this.lastScannedTime = now;
    return false;
  }

  /**
   * Resets the scan debounce history
   */
  public static resetDebounce(): void {
    this.lastScannedCode = '';
    this.lastScannedTime = 0;
  }
}
