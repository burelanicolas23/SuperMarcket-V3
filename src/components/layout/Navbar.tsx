import React, { useState, useEffect } from 'react';
import { useSupermarket, SectionId } from '../../context/SupermarketContext';
import { useAuth } from '../../context/AuthContext';
import { CloudSyncService } from '../../services/cloudSyncService';
import { 
  Menu, 
  Plus, 
  ShoppingCart, 
  Clock, 
  User, 
  ShieldCheck, 
  Laptop,
  LogOut
} from 'lucide-react';

interface NavbarProps {
  onToggleMobileMenu: () => void;
}

const sectionTitles: Record<SectionId, { title: string; subtitle: string }> = {
  inicio: {
    title: 'Panel Principal',
    subtitle: 'Resumen en tiempo real del supermercado',
  },
  caja: {
    title: 'Caja y Ventas',
    subtitle: 'Cobro rápido, Facturación ARCA y tickets',
  },
  productos: {
    title: 'Catálogo de Productos',
    subtitle: 'Listado completo, precios y códigos EAN-13',
  },
  stock: {
    title: 'Stock e Inventario',
    subtitle: 'Kardex auditable, entradas y mermas',
  },
  faltantes: {
    title: 'Productos Faltantes y Reposición',
    subtitle: 'Artículos agotados o próximos a agotarse',
  },
  proveedores: {
    title: 'Proveedores',
    subtitle: 'Directorio de empresas proveedoras y pedidos',
  },
  reportes: {
    title: 'Reportes y Métricas',
    subtitle: 'Rendimiento comercial y ventas del supermercado',
  },
  configuracion: {
    title: 'Configuración del Sistema',
    subtitle: 'Datos fiscales ARCA, usuarios y copias',
  },
};

export const Navbar: React.FC<NavbarProps> = ({ onToggleMobileMenu }) => {
  const { 
    activeSection, 
    setActiveSection, 
 
    setIsAuthModalOpen,
    activeTerminalsCount,
    isCloudConnected
  } = useSupermarket();

  const { activeProfile, logout } = useAuth();
  const [currentTime, setCurrentTime] = useState<string>('');
  const terminalId = CloudSyncService.getTerminalId();

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleDateString('es-AR', {
          weekday: 'short',
          day: 'numeric',
          month: 'short',
          hour: '2-digit',
          minute: '2-digit',
        })
      );
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const currentInfo = sectionTitles[activeSection] || {
    title: 'SuperMarcket',
    subtitle: 'Gestión de supermercado',
  };

  return (
    <header className="sticky top-0 z-30 bg-white border-b border-slate-200/80 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between gap-3">
        {/* Left: Mobile hamburger & Section Title */}
        <div className="flex items-center gap-3">
          <button
            onClick={onToggleMobileMenu}
            className="lg:hidden p-2 rounded-xl text-slate-700 hover:bg-slate-100 border border-slate-200 focus:outline-hidden"
            aria-label="Abrir menú"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div>
            <h2 className="text-lg sm:text-xl font-black text-slate-900 leading-tight flex items-center gap-2">
              <span>{currentInfo.title}</span>
              <span className="hidden xl:inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                <ShieldCheck className="w-3 h-3 text-emerald-600" />
                Operación segura
              </span>
            </h2>
            <p className="hidden sm:block text-xs text-slate-500 font-medium">
              {currentInfo.subtitle}
            </p>
          </div>
        </div>

        {/* Right: Cloud Sync Status + Terminal + User + Actions */}
        <div className="flex items-center gap-2 sm:gap-2.5">
          {/* Cloud Sync & Multi-PC Badge */}
          <div
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-700 text-xs font-bold shadow-2xs"
            title="Estado de sincronización en la nube"
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="hidden md:inline font-mono">{terminalId}</span>
            <span className="text-[11px] text-slate-500 hidden xl:inline">({activeTerminalsCount} PC{activeTerminalsCount > 1 ? 's' : ''})</span>
          </div>

          {/* User Profile / Turno Chip */}
          <button
            onClick={() => setIsAuthModalOpen(true)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-emerald-200 bg-emerald-50/60 hover:bg-emerald-100/80 text-emerald-950 text-xs font-bold transition-all"
            title="Cambiar operador de turno mediante PIN validado por backend"
          >
            <User className="w-3.5 h-3.5 text-emerald-700" />
            <span className="max-w-[110px] sm:max-w-[140px] truncate">{activeProfile?.displayName || 'Operador'}</span>
            <span className="hidden sm:inline text-[10px] px-1.5 py-0.2 rounded font-black bg-emerald-200/80 text-emerald-900 uppercase">
              {activeProfile?.role || 'CAJERO'}
            </span>
          </button>

          {/* Botón Logout */}
          <button
            onClick={() => logout()}
            className="p-1.5 sm:px-2 sm:py-1.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-rose-50 hover:border-rose-200 text-slate-600 hover:text-rose-700 text-xs font-bold transition-all flex items-center gap-1"
            title="Cerrar Sesión Segura"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Salir</span>
          </button>

          {/* Nueva Venta prominent button */}
          {activeSection !== 'caja' && (
            <button
              onClick={() => setActiveSection('caja')}
              className="flex items-center gap-1.5 px-3.5 sm:px-4 py-1.5 sm:py-2 rounded-xl text-xs sm:text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-sm shadow-emerald-700/20 active:scale-98 transition-all"
            >
              <ShoppingCart className="w-4 h-4" />
              <span>Nueva Venta</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
