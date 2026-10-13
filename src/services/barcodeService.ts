/**
 * Barcode Service for SuperMarcket
 * Handles EAN-13 generation, verification, and hardware scanner input parsing.
 */

export class BarcodeService {
  /**
   * Calculates the EAN-13 check digit for a 12-digit string
   */
  public static calculateEan13CheckDigit(twelveDigits: string): number {
    if (twelveDigits.length !== 12 || !/^\d+$/.test(twelveDigits)) {
      return 0;
    }

    let sum = 0;
    for (let i = 0; i < 12; i++) {
      const digit = parseInt(twelveDigits[i], 10);
      sum += i % 2 === 0 ? digit : digit * 3;
    }

    const remainder = sum % 10;
    return remainder === 0 ? 0 : 10 - remainder;
  }

  /**
   * Generates a realistic supermarket barcode (EAN-13) starting with prefix (default 779 for Argentina / standard GS1)
   */
  public static generateBarcode(prefix = '779'): string {
    const remainingLength = 12 - prefix.length;
    let middleDigits = '';
    for (let i = 0; i < remainingLength; i++) {
      middleDigits += Math.floor(Math.random() * 10).toString();
    }
    const base12 = `${prefix}${middleDigits}`;
    const checkDigit = this.calculateEan13CheckDigit(base12);
    return `${base12}${checkDigit}`;
  }

  /**
   * Validates if a string is a well-formed barcode
   */
  public static isValidBarcode(code: string): boolean {
    const trimmed = code.trim();
    if (!trimmed || trimmed.length < 4 || trimmed.length > 20) {
      return false;
    }
    // Allow digits and standard alphanumeric SKUs
    return /^[a-zA-Z0-9\-_]+$/.test(trimmed);
  }
}
