import React, { useEffect, useState } from 'react';
import { useSupermarket } from '../../context/SupermarketContext';
import { X, Printer, CheckCircle2, ShieldCheck, QrCode } from 'lucide-react';
import QRCode from 'qrcode';

export const TicketModal: React.FC = () => {
  const { isTicketModalOpen, closeTicketModal, selectedSaleForTicket, settings } = useSupermarket();
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string | null>(null);

  const sale = selectedSaleForTicket;

  useEffect(() => {
    if (sale?.afipAuth?.qrUrl) {
      QRCode.toDataURL(sale.afipAuth.qrUrl, { width: 140, margin: 1 })
        .then(url => setQrCodeDataUrl(url))
        .catch(_e => setQrCodeDataUrl(null));
    } else {
      setQrCodeDataUrl(null);
    }
  }, [sale]);

  if (!isTicketModalOpen || !sale) return null;

  const handlePrint = () => {
    window.print();
  };

  const afip = sale.afipAuth;
  const letra = afip?.letra || 'B';
  const tipoNombre = sale.invoiceType === 'FACTURA_A' ? 'FACTURA A' :
                     sale.invoiceType === 'FACTURA_B' ? 'FACTURA B' :
                     sale.invoiceType === 'FACTURA_C' ? 'FACTURA C' : 'TICKET FISCAL';

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="relative bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden my-6">
        {/* Header */}
        <div className="px-6 py-4 bg-emerald-600 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-5 h-5 text-emerald-200" />
            <div>
              <h3 className="font-bold text-lg leading-tight">Comprobante Fiscal Electrónico</h3>
              <p className="text-xs text-emerald-100 flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Comprobante de venta</span>
              </p>
            </div>
          </div>
          <button
            onClick={closeTicketModal}
            className="p-1.5 text-white/80 hover:text-white rounded-lg hover:bg-white/20 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Comprobante de venta */}
        <div className="p-6 font-mono text-xs text-slate-800 space-y-3 bg-slate-50 border-b border-slate-200">
          {/* ARCA Header Box */}
          <div className="border-2 border-slate-900 rounded-xl p-3 bg-white text-center relative">
            <div className="absolute left-1/2 -top-3.5 -translate-x-1/2 bg-slate-900 text-white font-black text-sm px-3 py-0.5 rounded-md flex items-center gap-1.5 shadow-xs">
              <span>{letra}</span>
              <span className="text-[10px] text-slate-300 font-normal">
                {afip ? `COD. ${String(afip.tipoComprobanteId).padStart(3, '0')}` : 'ORIGINAL'}
              </span>
            </div>

            <div className="pt-2">
              <p className="font-black text-base tracking-wider uppercase text-slate-900">
                {settings.storeName || 'Nombre del comercio'}
              </p>
              <p className="text-[11px] text-slate-600 font-bold">{tipoNombre}</p>
              <p className="text-[11px] text-slate-500">{settings.address} - {settings.city}</p>
              <div className="flex flex-wrap justify-center gap-x-4 gap-y-0.5 text-[11px] text-slate-600 mt-1">
                <span><strong>CUIT:</strong> {settings.taxId}</span>
                <span><strong>IIBB:</strong> {settings.taxId}</span>
                <span><strong>IVA:</strong> Responsable Inscripto</span>
              </div>
            </div>
          </div>

          {/* Invoice Identification */}
          <div className="flex justify-between text-xs py-1.5 border-b border-dashed border-slate-300">
            <div>
              <p><span className="font-bold">Comprobante:</span> {afip ? afip.comprobanteFormateado : sale.saleNumber}</p>
              <p><span className="font-bold">Terminal / PC:</span> {sale.terminalId || 'CAJA-01'}</p>
              <p><span className="font-bold">Cajero:</span> {sale.cashierName}</p>
            </div>
            <div className="text-right">
              <p><span className="font-bold">Fecha:</span> {new Date(sale.date).toLocaleDateString('es-AR')}</p>
              <p><span className="font-bold">Hora:</span> {new Date(sale.date).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}</p>
              <p className="text-[10px] text-emerald-700 font-bold">AUTORIZADO</p>
            </div>
          </div>

          {/* Customer info if present */}
          {sale.customer && sale.customer.nroDoc !== '0' && (
            <div className="text-xs py-1 border-b border-dashed border-slate-300 bg-white p-2 rounded-lg">
              <p><span className="font-bold">Cliente:</span> {sale.customer.nombre}</p>
              <p><span className="font-bold">{sale.customer.tipoDoc}:</span> {sale.customer.nroDoc} &bull; <span className="font-semibold">{sale.customer.condicionIva.replace('_', ' ')}</span></p>
            </div>
          )}

          {/* Items Table */}
          <div className="py-2 border-b border-dashed border-slate-300 space-y-1.5">
            <div className="flex justify-between font-bold text-slate-600 border-b border-slate-200 pb-1">
              <span>Cant. / Artículo</span>
              <span>Subtotal</span>
            </div>
            {sale.items.map((item, idx) => (
              <div key={idx} className="flex justify-between items-start gap-2">
                <div className="flex-1 truncate">
                  <p className="font-semibold text-slate-900 truncate">
                    {item.quantity}x {item.name}
                  </p>
                  <p className="text-[10px] text-slate-500">
                    Cod: {item.code} &bull; ${item.unitPrice.toLocaleString('es-AR')} c/u
                  </p>
                </div>
                <div className="text-right font-bold text-slate-900">
                  ${item.subtotal.toLocaleString('es-AR')}
                </div>
              </div>
            ))}
          </div>

          {/* Tax Breakdown */}
          <div className="space-y-1 py-1 border-b border-dashed border-slate-300 text-xs">
            {afip && letra === 'A' ? (
              <>
                <div className="flex justify-between">
                  <span>Neto Gravado:</span>
                  <span>${afip.netoGravado.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between">
                  <span>IVA 21%:</span>
                  <span>${afip.iva21.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</span>
                </div>
              </>
            ) : (
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span>${sale.subtotal.toLocaleString('es-AR')}</span>
              </div>
            )}

            {sale.discount > 0 && (
              <div className="flex justify-between text-emerald-700 font-bold">
                <span>Descuento aplicado:</span>
                <span>-${sale.discount.toLocaleString('es-AR')}</span>
              </div>
            )}

            <div className="flex justify-between font-black text-base text-slate-900 pt-1 border-t border-slate-200">
              <span>TOTAL ARS:</span>
              <span>${sale.total.toLocaleString('es-AR')}</span>
            </div>
          </div>

          {/* Payment Method */}
          <div className="text-xs space-y-0.5 py-1">
            <div className="flex justify-between">
              <span>Medio de Pago:</span>
              <span className="font-bold capitalize">{sale.paymentMethod.replace('_', ' ')}</span>
            </div>
            {sale.paymentMethod === 'efectivo' && sale.cashTendered !== undefined && (
              <>
                <div className="flex justify-between">
                  <span>Efectivo Recibido:</span>
                  <span>${sale.cashTendered.toLocaleString('es-AR')}</span>
                </div>
                <div className="flex justify-between font-bold text-emerald-800">
                  <span>Vuelto:</span>
                  <span>${(sale.changeDue ?? 0).toLocaleString('es-AR')}</span>
                </div>
              </>
            )}
          </div>

          {/* ARCA Electronic Authorization Data & Official QR Code */}
          {afip && (
            <div className="pt-2 border-t-2 border-slate-900 bg-white p-3 rounded-xl flex items-center justify-between gap-3">
              <div className="space-y-1 text-[11px] leading-tight flex-1">
                <p className="font-black text-slate-900 flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  <span>COMPROBANTE AUTORIZADO</span>
                </p>
                <p><span className="font-bold">CAE N°:</span> <span className="font-black font-mono">{afip.cae}</span></p>
                <p><span className="font-bold">Fecha Vto. CAE:</span> {afip.vtoCae}</p>
                <p className="text-[10px] text-slate-500">Agencia de Recaudación y Control Aduanero</p>
              </div>

              {qrCodeDataUrl ? (
                <div className="shrink-0 flex flex-col items-center">
                  <img src={qrCodeDataUrl} alt="QR Oficial ARCA" className="w-20 h-20 border border-slate-200 rounded p-1" />
                  <span className="text-[9px] text-slate-500 font-bold mt-0.5">QR ARCA RG 4291</span>
                </div>
              ) : (
                <div className="w-20 h-20 bg-slate-100 flex items-center justify-center text-slate-400 rounded">
                  <QrCode className="w-8 h-8" />
                </div>
              )}
            </div>
          )}

          <div className="text-center pt-1 text-[11px] text-slate-500 italic">
            {settings.ticketFooterMessage}
          </div>
        </div>

        {/* Modal Actions */}
        <div className="p-4 bg-white flex items-center justify-end gap-3">
          <button
            onClick={closeTicketModal}
            className="px-5 py-2.5 rounded-xl font-bold text-slate-700 hover:bg-slate-100 transition-colors text-xs sm:text-sm"
          >
            Cerrar
          </button>
          <button
            onClick={handlePrint}
            className="px-5 py-2.5 rounded-xl font-bold text-white bg-emerald-600 hover:bg-emerald-700 flex items-center gap-2 shadow-xs transition-colors text-xs sm:text-sm"
          >
            <Printer className="w-4 h-4" />
            <span>Imprimir Factura ARCA</span>
          </button>
        </div>
      </div>
    </div>
  );
};
