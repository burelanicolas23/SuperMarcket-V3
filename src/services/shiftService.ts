/**
 * Servicio de Gestión de Turnos de Caja y Arqueos Ciegos
 * Vinculación estricta: cashierId + terminalId + shiftId + authenticatedUser
 * Transiciones controladas: abierta -> cerrando -> cerrada
 */

import { db } from '../lib/firebase';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { CloudSyncService, DEFAULT_TENANT } from './cloudSyncService';
import { SalesService } from './salesService';

export type ShiftStatus = 'abierta' | 'cerrando' | 'cerrada';

export interface CashShift {
  shiftId: string;
  tenantId: string;
  terminalId: string;
  cashierId: string;
  cashierName: string;
  openedAt: string;
  closedAt?: string;
  status: ShiftStatus;
  initialCash: number;
  cashSalesTotal?: number;
  cardSalesTotal?: number;
  qrSalesTotal?: number;
  totalSales?: number;
  expectedCash?: number;
  actualCash?: number;
  difference?: number;
  notes?: string;
}

const STORAGE_ACTIVE_SHIFT = 'supermarcket_active_shift';

export class ShiftService {
  /**
   * Obtiene el turno activo localmente para la terminal
   */
  public static getActiveShift(): CashShift | null {
    try {
      const s = localStorage.getItem(STORAGE_ACTIVE_SHIFT);
      return s ? JSON.parse(s) : null;
    } catch (_e) {
      return null;
    }
  }

  /**
   * Apertura de turno vinculado al cajero autenticado y terminal activa
   */
  public static async openShift(params: {
    terminalId: string;
    cashierId: string;
    cashierName: string;
    initialCash: number;
    tenantId?: string;
  }): Promise<CashShift> {
    const tenantId = params.tenantId || DEFAULT_TENANT;
    const shiftId = `shift_${params.terminalId}_${Date.now()}`;
    const nowIso = new Date().toISOString();

    const newShift: CashShift = {
      shiftId,
      tenantId,
      terminalId: params.terminalId,
      cashierId: params.cashierId,
      cashierName: params.cashierName,
      openedAt: nowIso,
      status: 'abierta',
      initialCash: Math.max(0, params.initialCash),
    };

    localStorage.setItem(STORAGE_ACTIVE_SHIFT, JSON.stringify(newShift));

    try {
      await setDoc(doc(db, 'tenants', tenantId, 'cash_closures', shiftId), newShift, { merge: true });
    } catch (_e) {}

    await CloudSyncService.logAudit({
      userId: params.cashierId,
      userName: params.cashierName,
      userRole: 'CAJERO',
      terminalId: params.terminalId,
      action: 'APERTURA_TURNO_CAJA',
      entityType: 'turno',
      entityId: shiftId,
      details: `Apertura de turno en ${params.terminalId} con fondo inicial de $${newShift.initialCash.toFixed(2)}`,
    });

    return newShift;
  }

  /**
   * Transición 1: Iniciar proceso de cierre (abierta -> cerrando)
   * Solo el cajero asignado o un Administrador puede iniciar el cierre de este turno.
   */
  public static async startClosingShift(
    shiftId: string,
    currentUserId: string,
    isAdmin: boolean = false
  ): Promise<CashShift> {
    const active = this.getActiveShift();
    if (!active || active.shiftId !== shiftId) {
      throw new Error('El turno especificado no está activo en esta terminal.');
    }

    if (!isAdmin && active.cashierId !== currentUserId) {
      throw new Error('Violación de Seguridad: No puede intervenir en el cierre de turno de otro cajero.');
    }

    if (active.status !== 'abierta') {
      throw new Error(`Transición inválida: El turno no está en estado "abierta" (actual: ${active.status}).`);
    }

    // Calcular ventas realizadas en este turno
    const todaySales = SalesService.getTodaySales().filter(s => s.terminalId === active.terminalId);
    const cashSales = todaySales.filter(s => s.paymentMethod === 'efectivo').reduce((sum, s) => sum + s.total, 0);
    const cardSales = todaySales.filter(s => s.paymentMethod === 'tarjeta_debito' || s.paymentMethod === 'tarjeta_credito').reduce((sum, s) => sum + s.total, 0);
    const qrSales = todaySales.filter(s => s.paymentMethod === 'transferencia_qr').reduce((sum, s) => sum + s.total, 0);
    const totalSales = cashSales + cardSales + qrSales;
    const expectedCash = active.initialCash + cashSales;

    const updated: CashShift = {
      ...active,
      status: 'cerrando',
      cashSalesTotal: cashSales,
      cardSalesTotal: cardSales,
      qrSalesTotal: qrSales,
      totalSales,
      expectedCash,
    };

    localStorage.setItem(STORAGE_ACTIVE_SHIFT, JSON.stringify(updated));

    try {
      await updateDoc(doc(db, 'tenants', active.tenantId, 'cash_closures', shiftId), {
        status: 'cerrando',
        expectedCash,
        totalSales,
      });
    } catch (_e) {}

    return updated;
  }

  /**
   * Transición 2: Finalizar arqueo ciego y cerrar definitivamente (cerrando -> cerrada)
   * El turno queda inmutable.
   */
  public static async finalizeShiftClosure(params: {
    shiftId: string;
    currentUserId: string;
    actualCash: number;
    notes?: string;
    isAdmin?: boolean;
  }): Promise<CashShift> {
    const active = this.getActiveShift();
    if (!active || active.shiftId !== params.shiftId) {
      throw new Error('Turno no encontrado.');
    }

    if (!params.isAdmin && active.cashierId !== params.currentUserId) {
      throw new Error('Violación de Seguridad: Solo el cajero asignado o un Administrador puede finalizar este cierre.');
    }

    if (active.status !== 'cerrando') {
      throw new Error('Transición inválida: El arqueo debe pasar primero por estado "cerrando".');
    }

    const expectedCash = active.expectedCash ?? active.initialCash;
    const difference = params.actualCash - expectedCash;
    const closedAt = new Date().toISOString();

    const finalized: CashShift = {
      ...active,
      status: 'cerrada',
      closedAt,
      actualCash: params.actualCash,
      difference,
      notes: params.notes || '',
    };

    localStorage.removeItem(STORAGE_ACTIVE_SHIFT);

    try {
      await setDoc(doc(db, 'tenants', active.tenantId, 'cash_closures', params.shiftId), finalized, { merge: true });
    } catch (_e) {}

    await CloudSyncService.logAudit({
      userId: params.currentUserId,
      userName: active.cashierName,
      userRole: 'CAJERO',
      terminalId: active.terminalId,
      action: 'CIERRE_TURNO_ARQUEO',
      entityType: 'cierre_caja',
      entityId: params.shiftId,
      details: `Cierre de turno en ${active.terminalId}. Esperado: $${expectedCash.toFixed(2)}, Recontado: $${params.actualCash.toFixed(2)}, Diferencia: $${difference.toFixed(2)}`,
    });

    return finalized;
  }
}
