import React, { useState, useEffect } from 'react';
import { useSupermarket } from '../../context/SupermarketContext';
import { X, Truck, Building, Phone, Mail, FileText, Calendar } from 'lucide-react';

const WEEKDAYS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

export const SupplierModal: React.FC = () => {
  const {
    isSupplierModalOpen,
    closeSupplierModal,
    selectedSupplierForEdit,
    addSupplier,
    updateSupplier,
  } = useSupermarket();

  const [name, setName] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [taxId, setTaxId] = useState('');
  const [address, setAddress] = useState('');
  const [category, setCategory] = useState('');
  const [deliveryDays, setDeliveryDays] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (selectedSupplierForEdit) {
      setName(selectedSupplierForEdit.name);
      setContactPerson(selectedSupplierForEdit.contactPerson);
      setPhone(selectedSupplierForEdit.phone);
      setEmail(selectedSupplierForEdit.email);
      setTaxId(selectedSupplierForEdit.taxId);
      setAddress(selectedSupplierForEdit.address);
      setCategory(selectedSupplierForEdit.category);
      setDeliveryDays(selectedSupplierForEdit.deliveryDays || []);
      setError(null);
    } else {
      setName('');
      setContactPerson('');
      setPhone('');
      setEmail('');
      setTaxId('');
      setAddress('');
      setCategory('Almacén y Abarrotes');
      setDeliveryDays(['Lunes', 'Jueves']);
      setError(null);
    }
  }, [selectedSupplierForEdit, isSupplierModalOpen]);

  if (!isSupplierModalOpen) return null;

  const toggleDay = (day: string) => {
    if (deliveryDays.includes(day)) {
      setDeliveryDays(deliveryDays.filter(d => d !== day));
    } else {
      setDeliveryDays([...deliveryDays, day]);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError('Por favor indique el nombre de la empresa proveedora.');
      return;
    }

    if (!phone.trim()) {
      setError('Por favor ingrese un teléfono de contacto.');
      return;
    }

    try {
      if (selectedSupplierForEdit) {
        updateSupplier({
          id: selectedSupplierForEdit.id,
          name: name.trim(),
          contactPerson: contactPerson.trim(),
          phone: phone.trim(),
          email: email.trim(),
          taxId: taxId.trim(),
          address: address.trim(),
          category: category.trim() || 'General',
          deliveryDays,
          active: true,
        });
      } else {
        addSupplier({
          name: name.trim(),
          contactPerson: contactPerson.trim(),
          phone: phone.trim(),
          email: email.trim(),
          taxId: taxId.trim(),
          address: address.trim(),
          category: category.trim() || 'General',
          deliveryDays,
          active: true,
        });
      }
      closeSupplierModal();
    } catch (err: any) {
      setError(err.message || 'Error al guardar el proveedor.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="relative bg-white rounded-3xl max-w-xl w-full shadow-2xl border border-slate-200 overflow-hidden my-6">
        {/* Header */}
        <div className="px-6 py-5 bg-gradient-to-r from-emerald-600 to-teal-700 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white/20 rounded-xl">
              <Truck className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-xl font-bold">
                {selectedSupplierForEdit ? 'Modificar Proveedor' : 'Registrar Proveedor'}
              </h3>
              <p className="text-xs text-emerald-100 font-medium">
                Empresa distribuidora o productor directo
              </p>
            </div>
          </div>
          <button
            onClick={closeSupplierModal}
            className="p-2 text-white/80 hover:text-white rounded-xl hover:bg-white/20 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3.5 bg-rose-50 border border-rose-300 rounded-xl text-rose-800 text-sm font-semibold">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">
              Nombre o Razón Social de la Empresa *
            </label>
            <input
              type="text"
              required
              placeholder="Ej: Molinos del Plata S.A., Distribuidora Central"
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-base font-semibold"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">
                Contacto / Vendedor
              </label>
              <input
                type="text"
                placeholder="Nombre de la persona"
                value={contactPerson}
                onChange={e => setContactPerson(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">
                Teléfono / WhatsApp *
              </label>
              <input
                type="tel"
                required
                placeholder="Ej: 11-4567-8901"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-sm font-medium"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">
                Correo Electrónico
              </label>
              <input
                type="email"
                placeholder="pedidos@empresa.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">
                CUIT / Identificación Fiscal
              </label>
              <input
                type="text"
                placeholder="30-12345678-9"
                value={taxId}
                onChange={e => setTaxId(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-sm font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">
              Rubro / Categoría de Mercadería
            </label>
            <input
              type="text"
              placeholder="Ej: Lácteos, Panificados, Bebidas, Limpieza"
              value={category}
              onChange={e => setCategory(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">
              Dirección del Depósito / Oficina
            </label>
            <input
              type="text"
              placeholder="Calle, número, localidad"
              value={address}
              onChange={e => setAddress(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-sm"
            />
          </div>

          {/* Delivery Days */}
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1.5">
              Días de Entrega Habituales
            </label>
            <div className="flex flex-wrap gap-2">
              {WEEKDAYS.map(day => {
                const isSelected = deliveryDays.includes(day);
                return (
                  <button
                    key={day}
                    type="button"
                    onClick={() => toggleDay(day)}
                    className={`px-3 py-1.5 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
                      isSelected
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {day}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Actions */}
          <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={closeSupplierModal}
              className="px-5 py-2.5 rounded-xl font-bold text-slate-700 hover:bg-slate-100 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 rounded-xl font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-md shadow-emerald-700/20 active:scale-98 transition-all"
            >
              {selectedSupplierForEdit ? 'Guardar Cambios' : 'Registrar Proveedor'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
