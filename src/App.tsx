/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { SupermarketProvider, useSupermarket } from './context/SupermarketContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Sidebar } from './components/layout/Sidebar';
import { Navbar } from './components/layout/Navbar';
import { ToastNotification } from './components/common/ToastNotification';
import { LoginView } from './components/views/LoginView';

// Main Views
import { InicioView } from './components/views/InicioView';
import { CajaVentasView } from './components/views/CajaVentasView';
import { ProductosView } from './components/views/ProductosView';
import { StockInventarioView } from './components/views/StockInventarioView';
import { ProductosFaltantesView } from './components/views/ProductosFaltantesView';
import { ProveedoresView } from './components/views/ProveedoresView';
import { ReportesView } from './components/views/ReportesView';
import { ConfiguracionView } from './components/views/ConfiguracionView';

// Interactive Modals
import { ProductModal } from './components/modals/ProductModal';
import { StockAdjustModal } from './components/modals/StockAdjustModal';
import { SupplierModal } from './components/modals/SupplierModal';

import { TicketModal } from './components/modals/TicketModal';
import { AuditModal } from './components/modals/AuditModal';
import { AuthModal } from './components/modals/AuthModal';

const SupermarketContent: React.FC = () => {
  const { currentUser, activeProfile } = useAuth();
  const { 
    activeSection,
    isAuditModalOpen,
    setIsAuditModalOpen,
    isAuthModalOpen,
    setIsAuthModalOpen
  } = useSupermarket();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Authentication & Authorized Role Guard:
  // currentUser === null -> Login -> perfil/rol autorizado -> Aplicación
  if (!currentUser || !activeProfile) {
    return <LoginView />;
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans flex flex-col">
      {/* Lateral Menu / Sidebar */}
      <Sidebar mobileOpen={mobileMenuOpen} setMobileOpen={setMobileMenuOpen} />

      {/* Main Content Layout (Offset for lg:ml-72/80) */}
      <div className="lg:pl-72 sm:lg:pl-80 flex flex-col flex-1 min-h-screen transition-all">
        {/* Top Navbar */}
        <Navbar onToggleMobileMenu={() => setMobileMenuOpen(prev => !prev)} />

        {/* Dynamic Section Content */}
        <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
          {activeSection === 'inicio' && <InicioView />}
          {activeSection === 'caja' && <CajaVentasView />}
          {activeSection === 'productos' && <ProductosView />}
          {activeSection === 'stock' && <StockInventarioView />}
          {activeSection === 'faltantes' && <ProductosFaltantesView />}
          {activeSection === 'proveedores' && <ProveedoresView />}
          {activeSection === 'reportes' && <ReportesView />}
          {activeSection === 'configuracion' && <ConfiguracionView />}
        </main>

        {/* Accessible Footer with Honest Product Copy */}
        <footer className="w-full border-t border-slate-200 bg-white py-4 px-4 sm:px-6 lg:px-8 text-center text-xs text-slate-500 font-medium">
          <p>
            SuperMarcket &bull; Sistema de Gestión para Supermercados &bull; Multi-PC Cloud Sync &bull; 
            <span className="text-slate-600 font-semibold ml-1">
              Gestión operativa y comprobantes de venta
            </span>
          </p>
        </footer>
      </div>

      {/* Global Interactive Modals */}
      <ProductModal />
      <StockAdjustModal />
      <SupplierModal />

      <TicketModal />
      <AuditModal 
        isOpen={isAuditModalOpen}
        onClose={() => setIsAuditModalOpen(false)}
      />
      <AuthModal 
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
      />
      <ToastNotification />
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <SupermarketProvider>
        <SupermarketContent />
      </SupermarketProvider>
    </AuthProvider>
  );
}
