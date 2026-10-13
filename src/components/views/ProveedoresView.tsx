import React, { useState, useMemo } from 'react';
import { useSupermarket } from '../../context/SupermarketContext';
import { Supplier, Product } from '../../models';
import { ExportService } from '../../services';
import { StockBadge } from '../common/Badge';
import {
  Truck,
  Plus,
  Phone,
  Mail,
  MapPin,
  Calendar,
  FileSpreadsheet,
  Edit,
  Trash2,
  Package,
  Search,
  MessageCircle,
  FileText,
  X,
  ExternalLink,
  Layers,
  AlertTriangle,
} from 'lucide-react';

export const ProveedoresView: React.FC = () => {
  const {
    suppliers,
    openSupplierModal,
    deleteSupplier,
    products,
    showNotification,
  } = useSupermarket();

  const [search, setSearch] = useState('');

  // Selected supplier to view associated products
  const [viewProductsSupplier, setViewProductsSupplier] = useState<Supplier | null>(null);

  // Supplier to delete modal
  const [supplierToDelete, setSupplierToDelete] = useState<Supplier | null>(null);

  const filteredSuppliers = useMemo(() => {
    const q = search.trim().toLowerCase();
    return suppliers.filter(s => {
      return (
        !q ||
        s.name.toLowerCase().includes(q) ||
        s.contactPerson.toLowerCase().includes(q) ||
        s.phone.toLowerCase().includes(q) ||
        s.category.toLowerCase().includes(q) ||
        (s.taxId && s.taxId.toLowerCase().includes(q))
      );
    });
  }, [suppliers, search]);

  const handleDeleteClick = (sup: Supplier) => {
    const associatedProds = products.filter(p => p.supplierId === sup.id);
    if (associatedProds.length > 0) {
      showNotification(
        'warning',
        `No se puede eliminar a "${sup.name}" porque tiene ${associatedProds.length} productos asociados en el catálogo. Reasigne esos productos primero.`,
        'Proveedor con productos'
      );
      return;
    }

    setSupplierToDelete(sup);
  };

  const handleConfirmDelete = () => {
    if (supplierToDelete) {
      deleteSupplier(supplierToDelete.id);
      setSupplierToDelete(null);
    }
  };

  // Associated products of the supplier in modal
  const modalAssociatedProducts = useMemo(() => {
    if (!viewProductsSupplier) return [];
    return products.filter(p => p.supplierId === viewProductsSupplier.id);
  }, [viewProductsSupplier, products]);

  // WhatsApp link generator
  const getWhatsAppLink = (phone: string, supplierName: string) => {
    const cleanPhone = phone.replace(/\D/g, '');
    const message = encodeURIComponent(`Hola ${supplierName}, te contacto desde SuperMarcket.`);
    return cleanPhone ? `https://wa.me/${cleanPhone}?text=${message}` : `https://wa.me/?text=${message}`;
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* 1. Header bar */}
      <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h3 className="text-xl font-black text-slate-900 flex items-center gap-2.5">
            <Truck className="w-6 h-6 text-emerald-600" />
            <span>Directorio de Proveedores</span>
          </h3>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            {suppliers.length} empresas registradas &bull; Comunicación directa por WhatsApp, teléfono o email
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => ExportService.exportSuppliersToExcel()}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-emerald-300 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold text-xs sm:text-sm transition-colors shadow-xs"
            title="Exportar agenda de proveedores a Excel"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span>Exportar Excel</span>
          </button>

          <button
            onClick={() => openSupplierModal()}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm shadow-md shadow-emerald-700/20 active:scale-98 transition-all"
          >
            <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
            <span>Nuevo Proveedor</span>
          </button>
        </div>
      </div>

      {/* 2. Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
        <div className="relative">
          <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar proveedor por empresa, contacto, teléfono, CUIT o rubro..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500 text-sm font-medium"
          />
        </div>
      </div>

      {/* 3. Suppliers Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredSuppliers.map(sup => {
          const associatedProductsCount = products.filter(p => p.supplierId === sup.id).length;

          return (
            <div
              key={sup.id}
              className="bg-white rounded-3xl border border-slate-200 p-5 sm:p-6 shadow-xs hover:shadow-md transition-shadow flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <span className="text-xs font-bold text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-md border border-emerald-200">
                      {sup.category}
                    </span>
                    <h4 className="text-lg font-black text-slate-900 mt-2 leading-tight">
                      {sup.name}
                    </h4>
                    {sup.contactPerson && (
                      <p className="text-xs text-slate-500 font-semibold mt-0.5">
                        Contacto: {sup.contactPerson}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => openSupplierModal(sup)}
                      className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      title="Editar proveedor"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteClick(sup)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                      title="Eliminar proveedor"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Details */}
                <div className="mt-4 space-y-2 text-xs text-slate-600 border-t border-slate-100 pt-3">
                  <div className="flex items-center gap-2">
                    <Phone className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                    <a
                      href={`tel:${sup.phone}`}
                      className="font-bold text-emerald-700 hover:underline"
                    >
                      {sup.phone}
                    </a>
                  </div>

                  {sup.email && (
                    <div className="flex items-center gap-2 truncate">
                      <Mail className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                      <a href={`mailto:${sup.email}`} className="text-slate-600 hover:underline truncate">
                        {sup.email}
                      </a>
                    </div>
                  )}

                  {sup.address && (
                    <div className="flex items-center gap-2">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                      <span className="truncate">{sup.address}</span>
                    </div>
                  )}

                  {sup.deliveryDays && sup.deliveryDays.length > 0 && (
                    <div className="flex items-start gap-2 pt-1">
                      <Calendar className="w-3.5 h-3.5 text-slate-400 flex-shrink-0 mt-0.5" />
                      <div>
                        <span className="font-semibold text-slate-700">Días de Entrega: </span>
                        <span>{sup.deliveryDays.join(', ')}</span>
                      </div>
                    </div>
                  )}

                  {sup.notes && (
                    <div className="flex items-start gap-2 pt-1 text-[11px] text-slate-500 italic bg-slate-50 p-2 rounded-xl">
                      <FileText className="w-3 h-3 text-slate-400 flex-shrink-0 mt-0.5" />
                      <span>{sup.notes}</span>
                    </div>
                  )}
                </div>

                {/* Direct Action Communication Buttons Required by Prompt 5 */}
                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center gap-2">
                  <a
                    href={`tel:${sup.phone}`}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors"
                    title="Llamar por teléfono"
                  >
                    <Phone className="w-3.5 h-3.5 text-slate-600" />
                    <span>Llamar</span>
                  </a>

                  <a
                    href={getWhatsAppLink(sup.phone, sup.name)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition-colors"
                    title="Abrir chat en WhatsApp"
                  >
                    <MessageCircle className="w-3.5 h-3.5" />
                    <span>WhatsApp</span>
                  </a>

                  {sup.email && (
                    <a
                      href={`mailto:${sup.email}?subject=Consulta SuperMarcket`}
                      className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold transition-colors"
                      title="Enviar email"
                    >
                      <Mail className="w-4 h-4" />
                    </a>
                  )}
                </div>
              </div>

              {/* Footer with Associated Products Count & Button */}
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                <button
                  onClick={() => setViewProductsSupplier(sup)}
                  className="font-bold text-emerald-800 hover:text-emerald-950 flex items-center gap-1.5 py-1 px-2.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 transition-colors"
                  title="Ver los productos asociados a este proveedor"
                >
                  <Package className="w-4 h-4 text-emerald-600" />
                  <span>{associatedProductsCount} productos asociados</span>
                </button>

                <span className="text-[11px] font-mono text-slate-400">
                  {sup.taxId ? `CUIT: ${sup.taxId}` : 'Sin CUIT'}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* 4. MODAL: Consultar Productos Asociados */}
      {viewProductsSupplier && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="bg-slate-900 text-white p-5 flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">
                  Productos Suministrados
                </span>
                <h4 className="text-xl font-black">{viewProductsSupplier.name}</h4>
                <p className="text-xs text-slate-400 mt-0.5">
                  {modalAssociatedProducts.length} productos registrados bajo este proveedor
                </p>
              </div>
              <button
                onClick={() => setViewProductsSupplier(null)}
                className="text-slate-400 hover:text-white p-2 rounded-xl hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-3 flex-1">
              {modalAssociatedProducts.length === 0 ? (
                <div className="py-12 text-center text-slate-400">
                  <Package className="w-12 h-12 mx-auto mb-2 text-slate-300" />
                  <p className="font-bold text-slate-700">No hay productos asociados a este proveedor</p>
                  <p className="text-xs text-slate-500 mt-1">
                    Puede asignar este proveedor al crear o editar productos en el catálogo.
                  </p>
                </div>
              ) : (
                <div className="border border-slate-200 rounded-2xl overflow-hidden">
                  <table className="w-full text-left text-xs sm:text-sm">
                    <thead className="bg-slate-50 border-b border-slate-200 font-bold text-slate-600">
                      <tr>
                        <th className="py-3 px-4">Producto</th>
                        <th className="py-3 px-4 text-right">P. Compra</th>
                        <th className="py-3 px-4 text-right">P. Venta</th>
                        <th className="py-3 px-4 text-center">Stock</th>
                        <th className="py-3 px-4 text-center">Estado</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {modalAssociatedProducts.map(p => (
                        <tr key={p.id} className="hover:bg-slate-50">
                          <td className="py-3 px-4">
                            <p className="font-bold text-slate-900">{p.name}</p>
                            <p className="text-[11px] text-slate-400 font-mono">
                              Cód: {p.code} &bull; {p.category}
                            </p>
                          </td>
                          <td className="py-3 px-4 text-right font-medium text-slate-500">
                            ${p.costPrice.toLocaleString('es-AR')}
                          </td>
                          <td className="py-3 px-4 text-right font-black text-slate-900">
                            ${p.sellingPrice.toLocaleString('es-AR')}
                          </td>
                          <td className="py-3 px-4 text-center font-bold text-slate-800">
                            {p.stock} {p.unit}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <StockBadge status={p.status} size="sm" />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
              <span className="text-xs text-slate-500">
                Contacto: {viewProductsSupplier.contactPerson || 'Sin contacto'} &bull; Tel: {viewProductsSupplier.phone}
              </span>
              <button
                onClick={() => setViewProductsSupplier(null)}
                className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs transition-colors"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. MODAL: Confirmación de Eliminación (Sin window.confirm) */}
      {supplierToDelete && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3 text-rose-600 mb-3">
              <div className="p-2.5 bg-rose-100 rounded-2xl">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <h4 className="text-lg font-black text-slate-900">¿Eliminar Proveedor?</h4>
            </div>

            <p className="text-sm text-slate-600 leading-relaxed">
              ¿Está seguro de que desea eliminar al proveedor{' '}
              <strong className="text-slate-900">"{supplierToDelete.name}"</strong>?
              Esta acción no se puede deshacer.
            </p>

            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                onClick={() => setSupplierToDelete(null)}
                className="px-4 py-2.5 rounded-xl border border-slate-300 font-bold text-xs sm:text-sm text-slate-700 hover:bg-slate-100 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmDelete}
                className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs sm:text-sm shadow-md transition-colors"
              >
                Sí, Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
