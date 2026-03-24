// ============================================================================
// APP LAYOUT COMPONENT - Layout principal con animaciones de transición
// ============================================================================

import React, { useState, useEffect } from 'react';
import { ViewState } from '../types';
import Dashboard from './Dashboard';
import POS from './POS';
import Inventory from './Inventory';
import Reports from './Reports';
import Staff from './Staff';
import Appointments from './Appointments';

interface AppLayoutProps {
  currentView: ViewState;
  onNavigate: (view: ViewState) => void;
  onLogout: () => void;
}

const AppLayout: React.FC<AppLayoutProps> = ({
  currentView,
  onNavigate,
  onLogout
}) => {
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [previousView, setPreviousView] = useState<ViewState | null>(null);

  // Manejar transiciones entre vistas
  const handleNavigation = (view: ViewState) => {
    if (view === currentView) return;
    
    setIsTransitioning(true);
    setPreviousView(currentView);
    
    // Pequeño delay para la animación
    setTimeout(() => {
      onNavigate(view);
      setIsTransitioning(false);
    }, 150);
  };

  // Renderizar componente actual con animación
  const renderView = () => {
    const getAnimationClass = () => {
      if (!previousView || !isTransitioning) return '';
      
      // Determinar dirección de la animación basada en el orden de las vistas
      const viewsOrder: ViewState[] = ['DASHBOARD', 'POS', 'INVENTORY', 'REPORTS', 'STAFF', 'APPOINTMENTS'];
      const currentIndex = viewsOrder.indexOf(currentView);
      const previousIndex = viewsOrder.indexOf(previousView);
      
      if (currentIndex > previousIndex) {
        return 'animate-slide-in-right';
      } else {
        return 'animate-slide-in-left';
      }
    };

    const animationClass = getAnimationClass();

    switch (currentView) {
      case 'DASHBOARD':
        return (
          <div className={`w-full h-full ${animationClass}`}>
            <Dashboard onNavigate={handleNavigation} onLogout={onLogout} />
          </div>
        );
      case 'POS':
        return (
          <div className={`w-full h-full ${animationClass}`}>
            <POS onBack={() => handleNavigation('DASHBOARD')} />
          </div>
        );
      case 'INVENTORY':
        return (
          <div className={`w-full h-full ${animationClass}`}>
            <Inventory />
          </div>
        );
      case 'REPORTS':
        return (
          <div className={`w-full h-full ${animationClass}`}>
            <Reports onBack={() => handleNavigation('DASHBOARD')} />
          </div>
        );
      case 'STAFF':
        return (
          <div className={`w-full h-full ${animationClass}`}>
            <Staff onBack={() => handleNavigation('DASHBOARD')} />
          </div>
        );
      case 'APPOINTMENTS':
        return (
          <div className={`w-full h-full ${animationClass}`}>
            <Appointments />
          </div>
        );
      default:
        return (
          <div className={`w-full h-full ${animationClass}`}>
            <Dashboard onNavigate={handleNavigation} onLogout={onLogout} />
          </div>
        );
    }
  };

  return (
    <div className="relative w-full h-full overflow-hidden">
      {/* Overlay de transición */}
      {isTransitioning && (
        <div className="absolute inset-0 bg-[#0f172a]/80 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-[#e2b808] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-[#94a3b8] animate-pulse">Cargando...</p>
          </div>
        </div>
      )}
      
      {/* Contenido principal */}
      <div className="w-full h-full">
        {renderView()}
      </div>
    </div>
  );
};

export default AppLayout;