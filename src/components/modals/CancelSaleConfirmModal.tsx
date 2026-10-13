import React, { useState } from 'react';
import { Sale } from '../../models';
import { RotateCcw, AlertTriangle, X, Check } from 'lucide-react';

interface CancelSaleConfirmModalProps {
  sale: Sale | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (saleId: string, reason: string) => void;
}

export const CancelSaleConfirmModal: React.FC<CancelSaleConfirmModalProps> = ({
  sale,
  isOpen,
  onClose,
  onConfirm,
}) => {
  const [reason, setReason] = useState('Error en cobro o devolución de mercadería');

  if (!isOpen || !sale) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) return;
    onConfirm(sale.id, reason.trim());
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="relative bg-white rounded-3xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden my-6 animate-in fade-in zoom-in-95 duration-200">
        <form onSubmit={handleSubmit} className="p-6 text-center space-y-4">
          <div className="w-14 h-14 bg-amber-100 text-amber-700 rounded-2xl flex items-center justify-center mx-auto shadow-xs">
            <RotateCcw className="w-7 h-7" />
          </div>

          <div>
            <h3 className="text-xl font-black text-slate-900">
              ¿Anular Venta {sale.saleNumber}?
            </h3>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Esta operación devolverá automáticamente al inventario todas las unidades de los productos vendidos.
            </p>
          </div>

          {/* Sale items summary */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl text-left space-y-1.5 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-500 font-semibold">Total a Anular:</span>
              <span className="font-extrabold text-slate-900 text-sm">
                ${sale.total.toLocaleString('es-AR')}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500 font-semibold">Medio de Pago:</span>
              <span className="capitalize font-bold text-slate-700">
                {sale.paymentMethod.replace('_', ' ')}
              </span>
            </div>
            <div className="pt-1 border-t border-slate-200">
              <span className="text-slate-500 font-semibold block mb-1">
                Artículos que volverán a góndola:
              </span>
              <ul className="space-y-0.5 max-h-24 overflow-y-auto text-slate-700">
                {sale.items.map((i, idx) => (
                  <li key={idx} className="flex justify-between">
                    <span className="truncate max-w-[200px]">{i.name}</span>
                    <span className="font-bold text-emerald-800">+{i.quantity}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Reason input */}
          <div className="text-left">
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
              Motivo de la anulación *
            </label>
            <input
              type="text"
              required
              value={reason}
              onChange={e => setReason(e.target.value)}
              placeholder="Ej: Cliente canceló la compra / Error de importe"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-amber-500 text-xs sm:text-sm font-medium"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 rounded-xl border border-slate-300 font-bold text-slate-700 hover:bg-slate-100 transition-colors text-sm"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex-1 py-3 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-sm shadow-md shadow-amber-600/20 active:scale-98 transition-all flex items-center justify-center gap-2"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Confirmar Anulación</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
