import React from 'react';
import { Product } from '../../models';
import { AlertTriangle, Trash2, X } from 'lucide-react';

interface DeleteProductConfirmModalProps {
  product: Product | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (productId: string) => void;
}

export const DeleteProductConfirmModal: React.FC<DeleteProductConfirmModalProps> = ({
  product,
  isOpen,
  onClose,
  onConfirm,
}) => {
  if (!isOpen || !product) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="relative bg-white rounded-3xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden my-6 animate-in fade-in zoom-in-95 duration-200">
        <div className="p-6 text-center space-y-4">
          <div className="w-14 h-14 bg-rose-100 text-rose-600 rounded-2xl flex items-center justify-center mx-auto shadow-xs">
            <Trash2 className="w-7 h-7" />
          </div>

          <div>
            <h3 className="text-xl font-black text-slate-900">
              ¿Eliminar este producto?
            </h3>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Esta acción dará de baja el artículo del catálogo del supermercado.
            </p>
          </div>

          {/* Product Summary Box */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl text-left space-y-1.5 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-500 font-semibold">Producto:</span>
              <span className="font-extrabold text-slate-900 text-sm truncate max-w-[200px]">
                {product.name}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500 font-semibold">Código de Barras:</span>
              <span className="font-mono font-bold text-slate-700">{product.code}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500 font-semibold">Código Interno:</span>
              <span className="font-mono font-bold text-slate-700">{product.internalCode}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500 font-semibold">Stock Actual:</span>
              <span className="font-bold text-slate-900">
                {product.stock} {product.unit}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 rounded-xl border border-slate-300 font-bold text-slate-700 hover:bg-slate-100 transition-colors text-sm"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={() => {
                onConfirm(product.id);
                onClose();
              }}
              className="flex-1 py-3 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-sm shadow-md shadow-rose-600/20 active:scale-98 transition-all flex items-center justify-center gap-2"
            >
              <Trash2 className="w-4 h-4" />
              <span>Sí, Eliminar</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
