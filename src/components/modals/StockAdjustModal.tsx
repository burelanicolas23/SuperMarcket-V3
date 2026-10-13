import React, { useState, useEffect } from 'react';
import { useSupermarket } from '../../context/SupermarketContext';
import { MovementType } from '../../models';
import { X, Layers, PlusCircle, MinusCircle, AlertTriangle } from 'lucide-react';

export const StockAdjustModal: React.FC = () => {
  const {
    isStockModalOpen,
    closeStockModal,
    selectedProductForStock,
    adjustStock,
    products,
  } = useSupermarket();

  const [productId, setProductId] = useState<string>('');
  const [operation, setOperation] = useState<'sumar' | 'restar'>('sumar');
  const [quantity, setQuantity] = useState<number | ''>(1);
  const [movementType, setMovementType] = useState<MovementType>('ingreso_compra');
  const [reason, setReason] = useState<string>('Recepción de mercadería de proveedor');
  const [referenceDoc, setReferenceDoc] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (selectedProductForStock) {
      setProductId(selectedProductForStock.id);
    } else if (products.length > 0 && !productId) {
      setProductId(products[0].id);
    }
  }, [selectedProductForStock, products, productId]);

  useEffect(() => {
    if (operation === 'sumar') {
      setMovementType('ingreso_compra');
      setReason('Recepción de mercadería / Compra');
    } else {
      setMovementType('egreso_merma');
      setReason('Merma / Rotura accidental');
    }
  }, [operation]);

  if (!isStockModalOpen) return null;

  const currentProduct = products.find(p => p.id === productId);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!productId) {
      setError('Seleccione un producto.');
      return;
    }

    const numQty = Number(quantity);
    if (!numQty || numQty <= 0) {
      setError('Ingrese una cantidad válida mayor a 0.');
      return;
    }

    if (operation === 'restar' && currentProduct && currentProduct.stock < numQty) {
      setError(
        `No puede restar ${numQty} unidades porque el stock actual es de solo ${currentProduct.stock}.`
      );
      return;
    }

    try {
      const delta = operation === 'sumar' ? numQty : -numQty;
      adjustStock({
        productId,
        type: movementType,
        quantity: delta,
        reason: reason.trim() || (operation === 'sumar' ? 'Ingreso de stock' : 'Egreso de stock'),
        referenceDoc: referenceDoc.trim() || undefined,
        user: 'Administrador / Depósito',
      });
      closeStockModal();
    } catch (err: any) {
      setError(err.message || 'Error al ajustar el inventario.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="relative bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden my-6">
        {/* Header */}
        <div className="px-6 py-5 bg-gradient-to-r from-emerald-600 to-teal-700 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white/20 rounded-xl">
              <Layers className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-xl font-bold">Ajustar Stock de Mercadería</h3>
              <p className="text-xs text-emerald-100 font-medium">
                Sume entradas de compra o descuente mermas
              </p>
            </div>
          </div>
          <button
            onClick={closeStockModal}
            className="p-2 text-white/80 hover:text-white rounded-xl hover:bg-white/20 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {error && (
            <div className="p-3.5 bg-rose-50 border border-rose-300 rounded-xl text-rose-800 text-sm font-semibold">
              {error}
            </div>
          )}

          {/* Select Product */}
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1.5">
              Producto a modificar *
            </label>
            <select
              value={productId}
              onChange={e => setProductId(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-base font-semibold"
            >
              {products.map(p => (
                <option key={p.id} value={p.id}>
                  {p.name} (Stock actual: {p.stock} {p.unit})
                </option>
              ))}
            </select>
            {currentProduct && (
              <div className="mt-2 p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between text-xs sm:text-sm">
                <span className="text-slate-500 font-medium">Stock actual en sistema:</span>
                <span className="font-extrabold text-slate-900 text-base">
                  {currentProduct.stock} {currentProduct.unit}
                </span>
              </div>
            )}
          </div>

          {/* Action: Sumar (Ingreso) vs Restar (Egreso) */}
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">
              Tipo de Operación *
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setOperation('sumar')}
                className={`flex items-center justify-center gap-2 p-3.5 rounded-xl border-2 font-bold transition-all ${
                  operation === 'sumar'
                    ? 'border-emerald-600 bg-emerald-50 text-emerald-800'
                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                <PlusCircle className="w-5 h-5 text-emerald-600" />
                <span>Ingreso / Sumar (+)</span>
              </button>

              <button
                type="button"
                onClick={() => setOperation('restar')}
                className={`flex items-center justify-center gap-2 p-3.5 rounded-xl border-2 font-bold transition-all ${
                  operation === 'restar'
                    ? 'border-rose-500 bg-rose-50 text-rose-800'
                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                <MinusCircle className="w-5 h-5 text-rose-600" />
                <span>Salida / Restar (-)</span>
              </button>
            </div>
          </div>

          {/* Quantity & Specific Type */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1.5">
                Cantidad de unidades *
              </label>
              <input
                type="number"
                min="1"
                required
                value={quantity}
                onChange={e => setQuantity(e.target.value === '' ? '' : Number(e.target.value))}
                className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-lg font-extrabold text-slate-900"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1.5">
                Motivo Clasificado
              </label>
              <select
                value={movementType}
                onChange={e => setMovementType(e.target.value as MovementType)}
                className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-sm font-medium"
              >
                {operation === 'sumar' ? (
                  <>
                    <option value="ingreso_compra">Compra a Proveedor</option>
                    <option value="devolucion">Devolución de Cliente</option>
                    <option value="ajuste_conteo">Ajuste / Sobrante de Conteo</option>
                  </>
                ) : (
                  <>
                    <option value="egreso_merma">Merma o Rotura</option>
                    <option value="egreso_vencimiento">Producto Vencido</option>
                    <option value="ajuste_conteo">Ajuste / Faltante de Conteo</option>
                  </>
                )}
              </select>
            </div>
          </div>

          {/* Detail reason & Document ref */}
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1.5">
              Detalle u Observación
            </label>
            <input
              type="text"
              placeholder="Ej: Factura 00412 / Paquete roto en transporte"
              value={reason}
              onChange={e => setReason(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1.5">
              N° Comprobante / Remito (Opcional)
            </label>
            <input
              type="text"
              placeholder="Ej: REM-8910"
              value={referenceDoc}
              onChange={e => setReferenceDoc(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-sm"
            />
          </div>

          {/* Footer Actions */}
          <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={closeStockModal}
              className="px-5 py-3 rounded-xl font-bold text-slate-700 hover:bg-slate-100 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className={`px-6 py-3 rounded-xl font-bold text-white shadow-md active:scale-98 transition-all ${
                operation === 'sumar'
                  ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-700/20'
                  : 'bg-rose-600 hover:bg-rose-700 shadow-rose-700/20'
              }`}
            >
              {operation === 'sumar' ? 'Registrar Ingreso' : 'Registrar Salida'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
