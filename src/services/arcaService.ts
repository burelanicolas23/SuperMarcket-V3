/** Tipos y validaciones para una futura integración autorizada con ARCA. */

export type TipoComprobanteAfip = 'FACTURA_A' | 'FACTURA_B' | 'FACTURA_C' | 'TICKET_NO_FISCAL';

export interface ReceptorFiscal {
  nombre: string;
  tipoDoc: 'CUIT' | 'DNI' | 'CUIL' | 'SIN_IDENTIFICAR';
  nroDoc: string;
  condicionIva: 'CONSUMIDOR_FINAL' | 'RESPONSABLE_INSCRIPTO' | 'MONOTRIBUTO' | 'EXENTO';
  domicilio?: string;
}

export interface AfipAuthData {
  cae: string;
  vtoCae: string;
  puntoVenta: number;
  nroComprobante: number;
  comprobanteFormateado: string;
  tipoComprobanteId: number;
  letra: 'A' | 'B' | 'C' | 'X';
  qrUrl: string;
  qrPayloadRaw: string;
  fechaEmision: string;
  horaEmision: string;
  netoGravado: number;
  iva21: number;
  iva105: number;
  exento: number;
  total: number;
  moneda: 'PES';
  cotizacion: 1;
}

export class ArcaService {
  public static getTipoComprobanteId(tipo: TipoComprobanteAfip): number {
    return tipo === 'FACTURA_A' ? 1 : tipo === 'FACTURA_B' ? 6 : tipo === 'FACTURA_C' ? 11 : 99;
  }

  public static getLetraComprobante(tipo: TipoComprobanteAfip): 'A' | 'B' | 'C' | 'X' {
    return tipo === 'FACTURA_A' ? 'A' : tipo === 'FACTURA_B' ? 'B' : tipo === 'FACTURA_C' ? 'C' : 'X';
  }

  public static getTipoDocAfipId(tipoDoc: string): number {
    return tipoDoc === 'CUIT' ? 80 : tipoDoc === 'CUIL' ? 86 : tipoDoc === 'DNI' ? 96 : 99;
  }
}
