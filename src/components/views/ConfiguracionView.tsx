import React, { useState } from 'react';
import { useSupermarket } from '../../context/SupermarketContext';
import { useAuth } from '../../context/AuthContext';
import { StorageService } from '../../services';
import { CloudSyncService } from '../../services/cloudSyncService';
import {
  Settings,
  Save,
  Download,
  Upload,
  Store,
  Receipt,
  ShieldCheck,
  AlertTriangle,
  Users,
  Laptop,
  CheckCircle2,
  Clock,
  Zap,
  Server
} from 'lucide-react';

export const ConfiguracionView: React.FC = () => {
  const { 
    settings, 
    updateSettings, 
    importBackupData,
    setIsAuditModalOpen,
    setIsAuthModalOpen,
    triggerCloudSync,
    showNotification
  } = useSupermarket();

  const { activeProfile, isAdmin } = useAuth();

  const [storeName, setStoreName] = useState(settings.storeName);
  const [slogan, setSlogan] = useState(settings.slogan);
  const [taxId, setTaxId] = useState(settings.taxId);
  const [address, setAddress] = useState(settings.address);
  const [city, setCity] = useState(settings.city);
  const [phone, setPhone] = useState(settings.phone);
  const [email, setEmail] = useState(settings.email);
  const [ticketFooterMessage, setTicketFooterMessage] = useState(settings.ticketFooterMessage);
  const [lowStockDefaultThreshold, setLowStockDefaultThreshold] = useState(
    settings.lowStockDefaultThreshold
  );

  // Terminal & Multi-PC state
  const [terminalId, setTerminalId] = useState(CloudSyncService.getTerminalId());
  const [terminalName, setTerminalName] = useState(CloudSyncService.getTerminalName());

  // Fiscal ARCA settings
  const [vatCondition, setVatCondition] = useState('Responsable Inscripto');
  const [pointOfSale, setPointOfSale] = useState(1);
  const [grossIncome, setGrossIncome] = useState(settings.taxId);
  const [arcaEnv, setArcaEnv] = useState<'homologacion' | 'produccion'>('homologacion');

  const autoBackups = StorageService.getAutomatedBackupsList();

  const handleSaveStoreData = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) {
      showNotification('error', 'Acceso denegado: Solo un Administrador puede modificar los datos fiscales y comerciales.', 'Seguridad');
      return;
    }
    updateSettings({
      storeName: storeName.trim(),
      slogan: slogan.trim(),
      taxId: taxId.trim(),
      address: address.trim(),
      city: city.trim(),
      phone: phone.trim(),
      email: email.trim(),
      ticketFooterMessage: ticketFooterMessage.trim(),
      lowStockDefaultThreshold: Number(lowStockDefaultThreshold) || 5,
    });
    CloudSyncService.setTerminalId(terminalId, terminalName);
    showNotification('success', 'Parámetros comerciales y de terminal guardados.', 'Configuración Actualizada');
  };

  const handleExportBackup = () => {
    if (!isAdmin) {
      showNotification('error', 'Acceso denegado: La descarga de copias de seguridad requiere permisos de Administrador.', 'Seguridad');
      return;
    }
    const json = StorageService.exportFullBackup();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `SuperMarcket_Backup_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    StorageService.saveAutomaticBackupSnapshot('Descarga Manual');
    showNotification('success', 'Copia de seguridad generada.', 'Backup Exportado');
  };

  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!isAdmin) {
      showNotification('error', 'Acceso denegado: La restauración de respaldos requiere permisos de Administrador.', 'Seguridad');
      e.target.value = '';
      return;
    }
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = event => {
      const content = event.target?.result as string;
      if (content) {
        importBackupData(content);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-xl font-black text-slate-900 flex items-center gap-2.5">
            <Settings className="w-6 h-6 text-emerald-600" />
            <span>Configuración Integral de SuperMarcket</span>
          </h3>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Datos fiscales ARCA, multi-PC, usuarios, roles y copias de seguridad
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setIsAuthModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs sm:text-sm font-bold transition-all shadow-xs"
          >
            <Users className="w-4 h-4 text-emerald-600" />
            <span>Usuarios & Roles</span>
          </button>
        </div>
      </div>

      {!isAdmin && (
        <div className="bg-amber-50 border border-amber-300 rounded-3xl p-4 sm:p-5 text-xs text-amber-950 flex items-start sm:items-center gap-3.5 shadow-xs">
          <div className="p-2 bg-amber-100 text-amber-700 rounded-2xl border border-amber-300 shrink-0">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <span className="font-black text-sm text-amber-900 block sm:inline">Modo Solo Lectura (Acceso Administrativo Requerido)</span>
            <span className="block text-amber-800 mt-0.5">
              El operador actual <strong>{activeProfile?.displayName || 'Operador'}</strong> ({activeProfile?.role || 'CAJERO'}) no cuenta con privilegios de Administrador. La edición de parámetros fiscales, la restauración de respaldos y el restablecimiento de datos se encuentran bloqueados.
            </span>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Store Information & Fiscal ARCA Form */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-xs p-6">
            <form onSubmit={handleSaveStoreData} className="space-y-4">
              <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
                <Store className="w-5 h-5 text-emerald-600" />
                <div>
                  <h4 className="font-extrabold text-slate-900 text-base">
                    Datos de la Empresa y Módulo de Integración ARCA
                  </h4>
                  <p className="text-xs text-slate-500 font-medium">
                    Configure aquí los datos comerciales y fiscales de su empresa.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Razón Social / Nombre Comercial *
                  </label>
                  <input
                    type="text"
                    required
                    value={storeName}
                    onChange={e => setStoreName(e.target.value)}
                    className="w-full px-4 py-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500 text-sm font-semibold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Slogan o Descripción
                  </label>
                  <input
                    type="text"
                    value={slogan}
                    onChange={e => setSlogan(e.target.value)}
                    className="w-full px-4 py-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    CUIT del Supermercado (11 dígitos) *
                  </label>
                  <input
                    type="text"
                    required
                    value={taxId}
                    onChange={e => setTaxId(e.target.value)}
                    placeholder="CUIT de la empresa"
                    className="w-full px-4 py-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500 font-mono text-sm font-bold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Condición Tributaria Frente al IVA
                  </label>
                  <select
                    value={vatCondition}
                    onChange={e => setVatCondition(e.target.value)}
                    className="w-full px-4 py-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500 text-sm font-semibold"
                  >
                    <option value="Responsable Inscripto">Responsable Inscripto (Facturas A y B)</option>
                    <option value="Monotributo">Monotributo (Facturas C)</option>
                    <option value="Exento">Exento</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Punto de Venta Fiscal ARCA
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={9999}
                    value={pointOfSale}
                    onChange={e => setPointOfSale(Number(e.target.value))}
                    className="w-full px-4 py-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500 font-mono text-sm font-bold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Entorno de Facturación Electrónica ARCA
                  </label>
                  <select
                    value={arcaEnv}
                    onChange={e => setArcaEnv(e.target.value as any)}
                    className="w-full px-4 py-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500 text-sm font-semibold"
                  >
                    <option value="homologacion">Homologación / Testing Oficial (RG 4291)</option>
                    <option value="produccion">Producción con Certificados Digitales</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Dirección Comercial
                  </label>
                  <input
                    type="text"
                    value={address}
                    onChange={e => setAddress(e.target.value)}
                    className="w-full px-4 py-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Teléfono
                  </label>
                  <input
                    type="text"
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    className="w-full px-4 py-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500 text-sm"
                  />
                </div>
              </div>

              {/* Terminal Multi-PC identity */}
              <div className="pt-3 border-t border-slate-100">
                <div className="flex items-center gap-2 mb-2">
                  <Laptop className="w-4 h-4 text-emerald-600" />
                  <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">Identidad Multi-PC de esta Computadora</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">ID de Terminal (ej: CAJA-01, CAJA-02, ADMIN-01)</label>
                    <input
                      type="text"
                      value={terminalId}
                      onChange={e => setTerminalId(e.target.value.toUpperCase())}
                      className="w-full px-4 py-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500 font-mono text-sm font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">Nombre Descriptivo</label>
                    <input
                      type="text"
                      value={terminalName}
                      onChange={e => setTerminalName(e.target.value)}
                      placeholder="Caja Principal Salón"
                      className="w-full px-4 py-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500 text-sm"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Mensaje al Pie del Comprobante Fiscal
                </label>
                <textarea
                  rows={2}
                  value={ticketFooterMessage}
                  onChange={e => setTicketFooterMessage(e.target.value)}
                  className="w-full px-4 py-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500 text-sm"
                />
              </div>

              <div className="pt-2 flex items-center justify-between">
                <button
                  type="submit"
                  className="px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm flex items-center gap-2 shadow-md shadow-emerald-700/20 active:scale-98 transition-all"
                >
                  <Save className="w-4 h-4" />
                  <span>Guardar Parámetros</span>
                </button>

                <button
                  type="button"
                  onClick={triggerCloudSync}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs flex items-center gap-2 transition-colors"
                >
                  <Server className="w-4 h-4 text-emerald-600" />
                  <span>Sincronizar a la Nube</span>
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Right 1 Col: Backup & Database Management */}
        <div className="space-y-6">
          {/* Automatic Cloud & Local Backups */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-xs p-6 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h4 className="font-extrabold text-base text-slate-900 flex items-center gap-2">
                <Clock className="w-5 h-5 text-emerald-600" />
                <span>Copias Automáticas</span>
              </h4>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                Cada 1 hora
              </span>
            </div>

            <p className="text-xs text-slate-500">
              El sistema genera automáticamente respaldos periódicos y los mantiene disponibles para recuperación inmediata.
            </p>

            <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
              {autoBackups.length > 0 ? (
                autoBackups.slice(0, 5).map(b => (
                  <div key={b.id} className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs flex items-center justify-between">
                    <div>
                      <div className="font-bold text-slate-800">{b.label}</div>
                      <div className="text-[10px] text-slate-500">{new Date(b.timestamp).toLocaleString('es-AR')}</div>
                    </div>
                    <span className="font-mono text-[11px] font-bold text-emerald-700 bg-white px-2 py-0.5 rounded border border-slate-200">
                      {b.productsCount} prods
                    </span>
                  </div>
                ))
              ) : (
                <div className="text-center py-4 text-xs text-slate-400">
                  Respaldo automático inicial generado.
                </div>
              )}
            </div>

            <button
              onClick={handleExportBackup}
              className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-xs"
            >
              <Download className="w-4 h-4" />
              <span>Descargar Copia Completa (JSON)</span>
            </button>

            <div>
              <label className="w-full py-2 rounded-xl border-2 border-dashed border-slate-300 hover:border-emerald-500 text-slate-600 hover:text-emerald-700 font-bold text-xs flex items-center justify-center gap-2 cursor-pointer transition-colors">
                <Upload className="w-4 h-4" />
                <span>Restaurar Archivo .json</span>
                <input
                  type="file"
                  accept=".json"
                  onChange={handleImportBackup}
                  className="hidden"
                />
              </label>
            </div>
          </div>

        </div>
      </div>

    </div>
  );
};
