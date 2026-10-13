/**
 * Servicio de Validación, Cálculo y Generación de Códigos de Barra EAN-13 Oficiales
 * Estándar GS1 Internacional con Algoritmo de Módulo 10
 */

export interface Ean13ValidationResult {
  isValid: boolean;
  code: string;
  calculatedCheckDigit: number;
  providedCheckDigit?: number;
  reason?: string;
  suggestedValidCode?: string;
}

export class Ean13Service {
  /**
   * Calcula el dígito verificador para los primeros 12 dígitos de un EAN-13
   * @param raw12 12 dígitos numéricos
   * @returns Dígito verificador (0-9)
   */
  public static calculateCheckDigit(raw12: string): number {
    const clean = raw12.replace(/\D/g, '');
    if (clean.length < 12) {
      throw new Error('Se requieren exactamente 12 dígitos para calcular el dígito verificador EAN-13.');
    }

    const first12 = clean.slice(0, 12);
    let sum = 0;

    for (let i = 0; i < 12; i++) {
      const digit = parseInt(first12[i], 10);
      // Las posiciones pares (1-indexed: 2, 4, 6, 8, 10, 12) se multiplican por 3
      // En índice 0-indexed: i % 2 === 1
      const weight = i % 2 === 1 ? 3 : 1;
      sum += digit * weight;
    }

    const remainder = sum % 10;
    return remainder === 0 ? 0 : 10 - remainder;
  }

  /**
   * Valida estrictamente un código EAN-13 completo de 13 dígitos
   */
  public static validateEan13(code: string): Ean13ValidationResult {
    const clean = code.trim().replace(/\D/g, '');

    if (clean.length !== 13) {
      return {
        isValid: false,
        code,
        calculatedCheckDigit: -1,
        reason: `Longitud incorrecta: tiene ${clean.length} dígitos (se requieren exactamente 13).`,
      };
    }

    const first12 = clean.slice(0, 12);
    const providedCheckDigit = parseInt(clean[12], 10);
    const calculatedCheckDigit = this.calculateCheckDigit(first12);

    const isValid = providedCheckDigit === calculatedCheckDigit;
    const suggestedValidCode = `${first12}${calculatedCheckDigit}`;

    return {
      isValid,
      code: clean,
      providedCheckDigit,
      calculatedCheckDigit,
      suggestedValidCode,
      reason: isValid
        ? 'Código EAN-13 matemáticamente válido.'
        : `Dígito verificador inválido: termina en '${providedCheckDigit}' pero según módulo-10 debe terminar en '${calculatedCheckDigit}'.`,
    };
  }

  /**
   * Genera un código EAN-13 válido con prefijo argentino (779) y número correlativo
   */
  public static generateArgentineEan13(sequentialNumber: number): string {
    const prefix = '779'; // GS1 Argentina
    const company = '0123'; // Empresa 4 dígitos
    const productNum = String(sequentialNumber % 100000).padStart(5, '0');
    const first12 = `${prefix}${company}${productNum}`;
    const checkDigit = this.calculateCheckDigit(first12);
    return `${first12}${checkDigit}`;
  }

  /**
   * Asegura que un código dado sea un EAN-13 válido; si tiene 12 dígitos calcula el 13°,
   * si tiene 13 con dígito erróneo lo repara, o si es corto lo rellena con prefijo 779.
   */
  public static repairOrCompleteEan13(input: string): string {
    const clean = input.trim().replace(/\D/g, '');
    if (clean.length === 12) {
      return `${clean}${this.calculateCheckDigit(clean)}`;
    }
    if (clean.length === 13) {
      const first12 = clean.slice(0, 12);
      return `${first12}${this.calculateCheckDigit(first12)}`;
    }
    // Si tiene otro largo, generar uno derivado con prefijo 779
    const padded = ('779' + clean).slice(0, 12).padEnd(12, '0');
    return `${padded}${this.calculateCheckDigit(padded)}`;
  }
}
