import React from 'react';
import { useSupermarket, SectionId } from '../../context/SupermarketContext';
import { useAuth } from '../../context/AuthContext';
import {
  Home,
  ShoppingCart,
  Package,
  Layers,
  AlertCircle,
  Truck,
  BarChart3,
  Settings,
  X,
  Store,
  ShieldCheck,
  KeyRound,
  Laptop
} from 'lucide-react';
import { CloudSyncService } from '../../services/cloudSyncService';

interface SidebarProps {
  mobileOpen: boolean;
  setMobileOpen: (open: boolean) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ mobileOpen, setMobileOpen }) => {
  const { 
    activeSection, 
    setActiveSection, 
    missingProducts, 
    settings,
    setIsAuditModalOpen,
    setIsAuthModalOpen,
    activeTerminalsCount
  } = useSupermarket();

  const { activeProfile, isAdmin, isEncargado } = useAuth();
  const terminalId = CloudSyncService.getTerminalId();

  const menuItems: Array<{
    id: SectionId;
    label: string;
    sublabel: string;
    icon: React.ElementType;
    badgeCount?: number;
    badgeColor?: string;
  }> = [
    {
      id: 'inicio',
      label: 'Inicio',
      sublabel: 'Panel principal y resumen',
      icon: Home,
    },
    {
      id: 'caja',
      label: 'Caja y ventas',
      sublabel: 'Cobro rápido y ARCA',
      icon: ShoppingCart,
    },
    {
      id: 'productos',
      label: 'Productos',
      sublabel: 'Catálogo con EAN-13',
      icon: Package,
    },
    {
      id: 'stock',
      label: 'Stock e inventario',
      sublabel: 'Kardex auditable y entradas',
      icon: Layers,
    },
    {
      id: 'faltantes',
      label: 'Productos faltantes',
      sublabel: 'Agotados y reposición',
      icon: AlertCircle,
      badgeCount: missingProducts.length,
      badgeColor: missingProducts.length > 0 ? 'bg-rose-500 text-white' : undefined,
    },
    {
      id: 'proveedores',
      label: 'Proveedores',
      sublabel: 'Empresas y contactos',
      icon: Truck,
    },
    {
      id: 'reportes',
      label: 'Reportes',
      sublabel: 'Estadísticas del negocio',
      icon: BarChart3,
    },
    {
      id: 'configuracion',
      label: 'Configuración',
      sublabel: 'Datos fiscales y copias',
      icon: Settings,
    },
  ];

  const handleSelectSection = (id: SectionId) => {
    setActiveSection(id);
    setMobileOpen(false);
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {mobileOpen && (
        <div
          onClick={() => setMobileOpen(false)}
          className="fixed inset-0 z-40 bg-slate-900/60 backdrop-blur-xs lg:hidden transition-opacity"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-72 sm:w-80 bg-slate-900 text-slate-100 flex flex-col border-r border-slate-800 transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand / Logo header */}
        <div className="p-5 sm:p-6 border-b border-slate-800/80 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-emerald-600 flex items-center justify-center text-white shadow-lg shadow-emerald-900/40">
              <Store className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-black tracking-tight text-white flex items-center gap-1.5">
                <span>SuperMarcket</span>
              </h1>
              <p className="text-[11px] text-emerald-400 font-bold uppercase tracking-wider flex items-center gap-1">
                <span>Multi-PC & ARCA</span>
              </p>
            </div>
          </div>

          <button
            onClick={() => setMobileOpen(false)}
            className="lg:hidden p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Sections list */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          <div className="px-3 pb-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Módulos Principales
          </div>

          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeSection === item.id;

            return (
              <button
                key={item.id}
                onClick={() => handleSelectSection(item.id)}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl font-medium text-sm transition-all group ${
                  isActive
                    ? 'bg-emerald-600 text-white font-bold shadow-md shadow-emerald-950/30'
                    : 'text-slate-300 hover:bg-slate-800/70 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon
                    className={`w-5 h-5 transition-transform group-hover:scale-110 ${
                      isActive ? 'text-white' : 'text-slate-400 group-hover:text-emerald-400'
                    }`}
                  />
                  <div className="text-left">
                    <div className="leading-tight">{item.label}</div>
                    <div
                      className={`text-[11px] ${
                        isActive ? 'text-emerald-100' : 'text-slate-500'
                      }`}
                    >
                      {item.sublabel}
                    </div>
                  </div>
                </div>

                {item.badgeCount !== undefined && item.badgeCount > 0 && (
                  <span
                    className={`px-2 py-0.5 rounded-full text-xs font-black shadow-xs ${
                      item.badgeColor || 'bg-slate-700 text-slate-200'
                    }`}
                  >
                    {item.badgeCount}
                  </span>
                )}
              </button>
            );
          })}

          {/* Herramientas profesionales */}
          <div className="pt-4 px-3 pb-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Herramientas Profesionales
          </div>

          {/* Auditoría Button */}
          {(isAdmin || isEncargado) && (
            <button
              onClick={() => {
                setIsAuditModalOpen(true);
                setMobileOpen(false);
              }}
              className="w-full flex items-center gap-3 px-3.5 py-2 rounded-xl text-xs font-bold text-slate-300 hover:bg-slate-800 hover:text-emerald-300 transition-colors"
            >
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Bitácora de Auditoría</span>
            </button>
          )}

        </div>

        {/* Footer: User profile & Terminal switcher */}
        <div className="p-3 border-t border-slate-800/80 bg-slate-950/60">
          <div className="bg-slate-900 rounded-2xl p-3 border border-slate-800 flex items-center justify-between gap-3">
            <div className="truncate">
              <div className="flex items-center gap-1.5 text-[11px] text-emerald-400 font-bold">
                <Laptop className="w-3 h-3" />
                <span>{terminalId}</span>
                <span className="text-slate-500">&bull;</span>
                <span className="text-slate-400">{activeTerminalsCount} PC(s)</span>
              </div>
              <div className="text-xs font-bold text-white truncate">
                {activeProfile?.displayName || 'Operador'}
              </div>
              <div className="text-[10px] text-slate-400 font-medium">
                Rol: <span className="text-emerald-400 font-bold">{activeProfile?.role || 'CAJERO'}</span>
              </div>
            </div>

            <button
              onClick={() => setIsAuthModalOpen(true)}
              className="p-2 rounded-xl bg-slate-800 hover:bg-emerald-600 text-slate-300 hover:text-white transition-all shrink-0"
              title="Cambiar turno / operador por PIN"
            >
              <KeyRound className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};
