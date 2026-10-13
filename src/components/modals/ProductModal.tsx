import React, { useState, useEffect } from 'react';
import { useSupermarket } from '../../context/SupermarketContext';
import { ProductCategory, ProductUnit } from '../../models';
import { BarcodeService, ProductService } from '../../services';
import { X, Sparkles, Package, DollarSign, Layers, Tag, MapPin, Truck, QrCode } from 'lucide-react';

const CATEGORIES: ProductCategory[] = [
  'Almacén y Abarrotes',
  'Lácteos y Quesos',
  'Bebidas y Licores',
  'Panadería y Confitería',
  'Frutas y Verduras',
  'Carnicería y Fiambrería',
  'Limpieza y Perfumería',
  'Congelados',
  'Snacks y Golosinas',
  'Otros',
];

const UNITS: ProductUnit[] = ['unidad', 'kg', 'g', 'litro', 'pack'];

export const ProductModal: React.FC = () => {
  const {
    isProductModalOpen,
    closeProductModal,
    selectedProductForEdit,
    scannedCodeForRegistration,
    addProduct,
    updateProduct,
    suppliers,
  } = useSupermarket();

  const [name, setName] = useState('');
  const [internalCode, setInternalCode] = useState('');
  const [code, setCode] = useState('');
  const [brand, setBrand] = useState('');
  const [category, setCategory] = useState<ProductCategory>('Almacén y Abarrotes');
  const [costPrice, setCostPrice] = useState<number | ''>('');
  const [sellingPrice, setSellingPrice] = useState<number | ''>('');
  const [stock, setStock] = useState<number | ''>('');
  const [minStock, setMinStock] = useState<number | ''>(5);
  const [targetStock, setTargetStock] = useState<number | ''>('');
  const [unit, setUnit] = useState<ProductUnit>('unidad');
  const [supplierId, setSupplierId] = useState<string>('');
  const [location, setLocation] = useState('');
  const [qrCodeData, setQrCodeData] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (selectedProductForEdit) {
      setName(selectedProductForEdit.name);
      setInternalCode(selectedProductForEdit.internalCode || '');
      setCode(selectedProductForEdit.code);
      setBrand(selectedProductForEdit.brand || '');
      setCategory(selectedProductForEdit.category);
      setCostPrice(selectedProductForEdit.costPrice);
      setSellingPrice(selectedProductForEdit.sellingPrice);
      setStock(selectedProductForEdit.stock);
      setMinStock(selectedProductForEdit.minStock);
      setTargetStock(selectedProductForEdit.targetStock || '');
      setUnit(selectedProductForEdit.unit);
      setSupplierId(selectedProductForEdit.supplierId || '');
      setLocation(selectedProductForEdit.location || '');
      setQrCodeData(selectedProductForEdit.qrCodeData || '');
      setError(null);
    } else {
      // New product defaults (or prefilled from scanner)
      setName('');
      setInternalCode(ProductService.generateNextInternalCode());
      const newBarcode = scannedCodeForRegistration || BarcodeService.generateBarcode();
      setCode(newBarcode);
      setBrand('');
      setCategory('Almacén y Abarrotes');
      setCostPrice('');
      setSellingPrice('');
      setStock('');
      setMinStock(5);
      setTargetStock(15);
      setUnit('unidad');
      setSupplierId(suppliers[0]?.id || '');
      setLocation('');
      setQrCodeData(`SMK:${newBarcode}`);
      setError(null);
    }
  }, [selectedProductForEdit, scannedCodeForRegistration, isProductModalOpen, suppliers]);

  if (!isProductModalOpen) return null;

  const handleGenerateBarcode = () => {
    const newBarcode = BarcodeService.generateBarcode();
    setCode(newBarcode);
    setQrCodeData(`SMK:${newBarcode}:${internalCode || 'INT'}`);
  };

  const handleGenerateInternalCode = () => {
    setInternalCode(ProductService.generateNextInternalCode());
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError('Por favor ingrese el nombre del producto.');
      return;
    }

    if (!code.trim()) {
      setError('El código de barras es obligatorio.');
      return;
    }

    if (!internalCode.trim()) {
      setError('El código interno es obligatorio para el inventario.');
      return;
    }

    const numCost = Number(costPrice) || 0;
    const numSelling = Number(sellingPrice) || 0;
    const numStock = Number(stock) || 0;
    const numMinStock = Number(minStock) || 0;
    const numTargetStock = targetStock === '' ? Math.max(numMinStock * 2, numMinStock + 10) : Number(targetStock);

    if (numSelling <= 0) {
      setError('El precio de venta debe ser mayor a $0.');
      return;
    }

    const selectedSupplier = suppliers.find(s => s.id === supplierId);

    try {
      if (selectedProductForEdit) {
        updateProduct({
          id: selectedProductForEdit.id,
          name: name.trim(),
          internalCode: internalCode.trim().toUpperCase(),
          code: code.trim(),
          brand: brand.trim() || 'Genérica',
          category,
          costPrice: numCost,
          sellingPrice: numSelling,
          stock: numStock,
          minStock: numMinStock,
          targetStock: numTargetStock,
          unit,
          supplierId: supplierId || undefined,
          supplierName: selectedSupplier?.name || undefined,
          location: location.trim() || undefined,
          qrCodeData: qrCodeData.trim() || `SMK:${code.trim()}:${internalCode.trim()}`,
        });
      } else {
        addProduct({
          name: name.trim(),
          internalCode: internalCode.trim().toUpperCase(),
          code: code.trim(),
          brand: brand.trim() || 'Genérica',
          category,
          costPrice: numCost,
          sellingPrice: numSelling,
          stock: numStock,
          minStock: numMinStock,
          targetStock: numTargetStock,
          unit,
          supplierId: supplierId || undefined,
          supplierName: selectedSupplier?.name || undefined,
          location: location.trim() || undefined,
          qrCodeData: qrCodeData.trim() || `SMK:${code.trim()}:${internalCode.trim()}`,
        });
      }
      closeProductModal();
    } catch (err: any) {
      setError(err.message || 'Error al guardar el producto.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="relative bg-white rounded-3xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden my-6">
        {/* Modal Header */}
        <div className="px-6 py-5 bg-gradient-to-r from-emerald-600 to-teal-700 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white/20 rounded-xl">
              <Package className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-xl font-bold">
                {selectedProductForEdit ? 'Modificar Producto' : 'Registrar Nuevo Producto'}
              </h3>
              <p className="text-xs text-emerald-100 font-medium">
                {selectedProductForEdit
                  ? 'Actualice la información, precios y stock'
                  : 'Complete los datos esenciales del artículo'}
              </p>
            </div>
          </div>
          <button
            onClick={closeProductModal}
            className="p-2 text-white/80 hover:text-white rounded-xl hover:bg-white/20 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[78vh] overflow-y-auto">
          {error && (
            <div className="p-3.5 bg-rose-50 border border-rose-300 rounded-xl text-rose-800 text-sm font-semibold">
              {error}
            </div>
          )}

          {scannedCodeForRegistration && (
            <div className="p-3.5 bg-emerald-50 border border-emerald-300 rounded-xl text-emerald-800 text-xs font-bold flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              <span>
                Código escaneado asignado: <strong className="font-mono text-sm">{scannedCodeForRegistration}</strong>. Complete los datos para darlo de alta en el sistema.
              </span>
            </div>
          )}

          {/* Product Name & Brand */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-sm font-bold text-slate-700 mb-1">
                Nombre del Producto *
              </label>
              <input
                type="text"
                required
                placeholder="Ej: Leche Entera 1L, Arroz Blanco 1kg, etc."
                value={name}
                onChange={e => setName(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500 text-base font-semibold"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">
                Marca *
              </label>
              <input
                type="text"
                required
                placeholder="Ej: La Serenísima, Lucchetti"
                value={brand}
                onChange={e => setBrand(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500 text-sm font-semibold"
              />
            </div>
          </div>

          {/* Internal Code & Barcode */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1 flex items-center justify-between">
                <span>Código Interno (SKU) *</span>
                <button
                  type="button"
                  onClick={handleGenerateInternalCode}
                  className="text-xs font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  Sugerir
                </button>
              </label>
              <input
                type="text"
                required
                placeholder="INT-0021"
                value={internalCode}
                onChange={e => setInternalCode(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500 font-mono text-sm font-bold uppercase"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1 flex items-center justify-between">
                <span>Código de Barras (EAN-13) *</span>
                <button
                  type="button"
                  onClick={handleGenerateBarcode}
                  className="text-xs font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  Generar
                </button>
              </label>
              <input
                type="text"
                required
                placeholder="7790123456789"
                value={code}
                onChange={e => setCode(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500 font-mono text-sm font-bold"
              />
            </div>
          </div>

          {/* Category & Unit */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">
                Categoría *
              </label>
              <select
                value={category}
                onChange={e => setCategory(e.target.value as ProductCategory)}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500 text-sm font-medium"
              >
                {CATEGORIES.map(c => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">
                Unidad de Medida *
              </label>
              <select
                value={unit}
                onChange={e => setUnit(e.target.value as ProductUnit)}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500 text-sm font-medium capitalize"
              >
                {UNITS.map(u => (
                  <option key={u} value={u}>
                    {u}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Cost Price & Selling Price */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">
                Precio de Compra al Proveedor ($)
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-2.5 text-slate-400 font-bold">$</span>
                <input
                  type="number"
                  min="0"
                  step="any"
                  placeholder="0"
                  value={costPrice}
                  onChange={e =>
                    setCostPrice(e.target.value === '' ? '' : Number(e.target.value))
                  }
                  className="w-full pl-8 pr-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500 text-sm font-semibold"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">
                Precio de Venta al Público ($) *
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-2.5 text-emerald-600 font-bold">$</span>
                <input
                  type="number"
                  required
                  min="0"
                  step="any"
                  placeholder="0"
                  value={sellingPrice}
                  onChange={e =>
                    setSellingPrice(e.target.value === '' ? '' : Number(e.target.value))
                  }
                  className="w-full pl-8 pr-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500 text-base font-bold text-emerald-800"
                />
              </div>
            </div>
          </div>

          {/* Stock, Min Stock, Target Stock & Location */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">
                Cantidad Disponible
              </label>
              <input
                type="number"
                min="0"
                placeholder="0"
                value={stock}
                onChange={e => setStock(e.target.value === '' ? '' : Number(e.target.value))}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500 text-base font-extrabold text-slate-900"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">
                Stock Mínimo (Alerta)
              </label>
              <input
                type="number"
                min="0"
                placeholder="5"
                value={minStock}
                onChange={e =>
                  setMinStock(e.target.value === '' ? '' : Number(e.target.value))
                }
                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500 text-sm font-bold text-amber-700"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1" title="Nivel ideal de inventario al realizar reposición">
                Stock Objetivo (Sugerido)
              </label>
              <input
                type="number"
                min="0"
                placeholder="15"
                value={targetStock}
                onChange={e =>
                  setTargetStock(e.target.value === '' ? '' : Number(e.target.value))
                }
                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500 text-sm font-bold text-emerald-800"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">
                Ubicación / Góndola
              </label>
              <input
                type="text"
                placeholder="Pasillo 2 - Góndola 1"
                value={location}
                onChange={e => setLocation(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500 text-sm"
              />
            </div>
          </div>

          {/* Supplier */}
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">
              Proveedor Asociado
            </label>
            <select
              value={supplierId}
              onChange={e => setSupplierId(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500 text-sm font-medium"
            >
              <option value="">-- Sin proveedor asignado --</option>
              {suppliers.map(s => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.category})
                </option>
              ))}
            </select>
          </div>

          {/* QR Code Payload (optional) */}
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1 flex items-center gap-1.5">
              <QrCode className="w-3.5 h-3.5 text-slate-400" />
              <span>Contenido del Código QR (Opcional)</span>
            </label>
            <input
              type="text"
              placeholder={`SMK:${code || 'CODIGO'}:${internalCode || 'INT'}`}
              value={qrCodeData}
              onChange={e => setQrCodeData(e.target.value)}
              className="w-full px-4 py-2 rounded-xl border border-slate-200 font-mono text-xs text-slate-600 bg-slate-50"
            />
          </div>

          {/* Footer Actions */}
          <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={closeProductModal}
              className="px-5 py-2.5 rounded-xl font-bold text-slate-700 hover:bg-slate-100 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 rounded-xl font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-md shadow-emerald-700/20 active:scale-98 transition-all"
            >
              {selectedProductForEdit ? 'Guardar Cambios' : 'Registrar Producto'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
