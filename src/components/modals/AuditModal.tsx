import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../../lib/firebase';
import { collection, onSnapshot, query, orderBy, limit } from 'firebase/firestore';
import { AuditLogEntry } from '../../services/cloudSyncService';
import { ExportService } from '../../services/exportService';
import { 
  ShieldCheck, 
  X, 
  Search, 
  Filter, 
  FileSpreadsheet, 
  Clock, 
  User, 
  Laptop, 
  Activity,
  Layers,
  ChevronRight
} from 'lucide-react';

interface AuditModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AuditModal: React.FC<AuditModalProps> = ({ isOpen, onClose }) => {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterAction, setFilterAction] = useState('todos');
  const [selectedLog, setSelectedLog] = useState<AuditLogEntry | null>(null);

  // Subscribe to audit logs from Firestore
  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);

    try {
      const q = query(collection(db, 'audit_logs'), orderBy('timestamp', 'desc'), limit(150));
      const unsub = onSnapshot(q, (snapshot) => {
        const list: AuditLogEntry[] = [];
        snapshot.forEach(docSnap => {
          list.push(docSnap.data() as AuditLogEntry);
        });
        setLogs(list);
        setLoading(false);
      }, (_err) => {
        setLoading(false);
      });

      return () => unsub();
    } catch (_e) {
      setLoading(false);
    }
  }, [isOpen]);

  const filteredLogs = useMemo(() => {
    return logs.filter(l => {
      if (filterAction !== 'todos' && !l.action.includes(filterAction)) {
        return false;
      }
      if (searchTerm) {
        const q = searchTerm.toLowerCase();
        const matchAction = l.action.toLowerCase().includes(q);
        const matchUser = l.userName.toLowerCase().includes(q);
        const matchDetails = l.details.toLowerCase().includes(q);
        const matchTerminal = l.terminalId.toLowerCase().includes(q);
        if (!matchAction && !matchUser && !matchDetails && !matchTerminal) {
          return false;
        }
      }
      return true;
    });
  }, [logs, filterAction, searchTerm]);

  if (!isOpen) return null;

  const handleExportAuditExcel = () => {
    const dataToExport = filteredLogs.map(l => ({
      'Fecha y Hora': new Date(l.timestamp).toLocaleString('es-AR'),
      'Terminal / PC': l.terminalId,
      'Usuario': l.userName,
      'Rol': l.userRole,
      'Acción Realizada': l.action,
      'Entidad Afectada': l.entityType,
      'Detalle del Evento': l.details,
    }));

    ExportService.downloadCsv(dataToExport, `SuperMarcket_Auditoria_Seguridad_${new Date().toISOString().slice(0, 10)}.csv`);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="bg-white w-full max-w-5xl max-h-[92vh] rounded-3xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden animate-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="bg-slate-900 text-white p-5 sm:p-6 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3.5">
            <div className="p-3 bg-emerald-500/20 text-emerald-400 rounded-2xl border border-emerald-500/30">
              <ShieldCheck className="w-7 h-7" />
            </div>
            <div>
              <h3 className="text-xl font-black tracking-tight flex items-center gap-2">
                <span>Bitácora Inmutable de Auditoría y Trazabilidad</span>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Cumplimiento ARCA
                </span>
              </h3>
              <p className="text-xs sm:text-sm text-slate-400">
                Registro inalterable de ventas, ajustes de stock, cobros, aperturas de turno y precios
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Filters Bar */}
        <div className="p-4 sm:p-5 border-b border-slate-200 bg-slate-50 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 shrink-0">
          <div className="flex flex-1 items-center gap-2.5">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar por usuario, acción, terminal o detalle..."
                className="w-full pl-9 pr-3.5 py-2 bg-white border border-slate-300 rounded-xl text-xs sm:text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
              />
            </div>

            <select
              value={filterAction}
              onChange={(e) => setFilterAction(e.target.value)}
              className="px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs sm:text-sm font-medium focus:ring-2 focus:ring-emerald-500 outline-none"
            >
              <option value="todos">Todas las acciones</option>
              <option value="VENTA">Ventas ARCA</option>
              <option value="STOCK">Ajustes de stock</option>
              <option value="TURNO">Cambios de turno / PIN</option>
              <option value="USUARIO">Altas de usuario</option>
              <option value="PROVEEDOR">Proveedores</option>
            </select>
          </div>

          <button
            onClick={handleExportAuditExcel}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-bold rounded-xl shadow-xs transition-colors flex items-center justify-center gap-2 shrink-0"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Exportar Auditoría (.CSV)</span>
          </button>
        </div>

        {/* Content Table */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          {loading ? (
            <div className="py-16 text-center text-slate-400 text-sm">
              Cargando bitácora de eventos central...
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="py-16 text-center text-slate-400 text-sm">
              No se encontraron registros de auditoría que coincidan con la búsqueda.
            </div>
          ) : (
            <div className="space-y-3">
              {filteredLogs.map((log) => (
                <div
                  key={log.id}
                  className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs hover:border-slate-300 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <span className="font-mono text-slate-500 flex items-center gap-1 font-semibold">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        {new Date(log.timestamp).toLocaleString('es-AR')}
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700 flex items-center gap-1">
                        <Laptop className="w-3 h-3 text-slate-500" />
                        {log.terminalId}
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800">
                        {log.action}
                      </span>
                    </div>

                    <div className="text-sm font-bold text-slate-900">
                      {log.details}
                    </div>

                    <div className="text-xs text-slate-500 flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-slate-400" />
                      <span>{log.userName}</span>
                      <span className="text-slate-300">&bull;</span>
                      <span className="font-medium text-slate-600">{log.userRole}</span>
                    </div>
                  </div>

                  {log.diff && (
                    <button
                      onClick={() => setSelectedLog(selectedLog?.id === log.id ? null : log)}
                      className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors shrink-0"
                    >
                      {selectedLog?.id === log.id ? 'Ocultar Valores' : 'Ver Valores'}
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Details Modal / Diff Preview */}
          {selectedLog && selectedLog.diff && (
            <div className="mt-4 p-4 bg-slate-900 text-slate-200 rounded-2xl font-mono text-xs">
              <div className="font-bold text-emerald-400 mb-2">
                Payload registrado ({selectedLog.action}):
              </div>
              <pre className="overflow-x-auto whitespace-pre-wrap text-slate-300">
                {selectedLog.diff}
              </pre>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-slate-50 border-t border-slate-200 p-4 px-6 flex items-center justify-between shrink-0">
          <div className="text-xs text-slate-500 font-medium">
            Mostrando {filteredLogs.length} eventos auditados &bull; Regla de seguridad: Modificación o eliminación denegada (Inmutable)
          </div>
          <button
            onClick={onClose}
            className="px-5 py-2.5 bg-slate-800 hover:bg-slate-900 text-white text-xs sm:text-sm font-bold rounded-xl transition-colors shadow-sm"
          >
            Cerrar Bitácora
          </button>
        </div>
      </div>
    </div>
  );
};
