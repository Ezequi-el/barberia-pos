import React, { useState, useEffect } from 'react';
import { 
  ShoppingCart, 
  Package, 
  BarChart3, 
  Users, 
  Calendar, 
  Scissors, 
  LogOut,
  Menu,
  X
} from 'lucide-react';
import { ViewState } from '../types';
import { useAuth } from '../contexts/AuthContext';

interface AppLayoutProps {
  currentView: ViewState;
  onNavigate: (view: ViewState) => void;
  children: React.ReactNode;
}

const AppLayout: React.FC<AppLayoutProps> = ({ currentView, onNavigate, children }) => {
  const { user, profile, signOut } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleLogout = async () => {
    await signOut();
  };

  const navItems = [
    { id: 'POS', label: 'Punto de Venta', icon: ShoppingCart },
    { id: 'APPOINTMENTS', label: 'Agenda', icon: Calendar },
    { id: 'REPORTS', label: 'Reportes', icon: BarChart3 },
    { id: 'CUSTOMERS', label: 'Clientes', icon: Users },
    // Only owners can see Inventory/Gestión
    ...(profile?.role === 'owner' ? [{ id: 'INVENTORY', label: 'Gestión (Catálogo)', icon: Package }] : [])
  ];

  const handleNavClick = (view: ViewState) => {
    onNavigate(view);
    setIsMobileMenuOpen(false);
  };

  return (
    <div className="flex h-screen bg-zinc-950 text-zinc-100 overflow-hidden font-sans">
      {/* Mobile Header */}
      <div className="md:hidden fixed top-0 w-full bg-zinc-900 border-b border-zinc-800 z-50 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-amber-500 rounded flex items-center justify-center text-black">
            <Scissors size={16} />
          </div>
          <span className="font-heading font-bold tracking-wider">NERON POS</span>
        </div>
        <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="p-2 text-zinc-400 hover:text-white">
          {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Sidebar Overlay (Mobile) */}
      {isMobileMenuOpen && (
        <div 
          className="md:hidden fixed inset-0 bg-black/50 z-40 backdrop-blur-sm"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar Content */}
      <div className={`
        fixed md:static inset-y-0 left-0 z-40 w-64 bg-zinc-900 border-r border-zinc-800 transform transition-transform duration-300 flex flex-col
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        {/* Desktop Branding */}
        <div className="hidden md:flex items-center gap-3 p-6 border-b border-zinc-800">
          <div className="w-8 h-8 bg-amber-500 rounded flex items-center justify-center text-black">
            <Scissors size={16} />
          </div>
          <span className="font-heading font-bold tracking-wider text-xl">NERON POS</span>
        </div>

        {/* User Info */}
        <div className="p-6 border-b border-zinc-800 flex items-center gap-3 mt-14 md:mt-0">
          <div className="w-10 h-10 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-zinc-400">
            <span className="font-bold text-lg">{user?.email?.[0].toUpperCase() || 'U'}</span>
          </div>
          <div className="flex flex-col overflow-hidden">
            <span className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider truncate">
              {profile?.role === 'owner' ? 'Propietario' : 'Barbero'}
            </span>
            <span className="text-sm font-bold text-white truncate">{user?.email}</span>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto p-4 space-y-2">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => handleNavClick(item.id as ViewState)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-bold text-sm tracking-wide ${
                currentView === item.id 
                  ? 'bg-amber-500 text-black shadow-lg shadow-amber-900/20' 
                  : 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200'
              }`}
            >
              <item.icon size={18} />
              {item.label}
            </button>
          ))}
        </nav>

        {/* Footer actions */}
        <div className="p-4 border-t border-zinc-800 space-y-4">
          <div className={`flex items-center justify-center gap-2 py-2 rounded-lg border text-xs font-bold uppercase tracking-wide ${
            isOnline ? 'border-zinc-800 bg-zinc-950 text-zinc-400' : 'border-red-900/50 bg-red-900/10 text-red-500'
          }`}>
            <span className="relative flex h-2 w-2">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${isOnline ? 'bg-green-400' : 'bg-red-400'}`}></span>
              <span className={`relative inline-flex rounded-full h-2 w-2 ${isOnline ? 'bg-green-500' : 'bg-red-500'}`}></span>
            </span>
            {isOnline ? 'En línea' : 'Sin Conexión'}
          </div>

          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 text-red-500 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-all font-bold text-sm tracking-wide border border-transparent hover:border-red-500/20"
          >
            <LogOut size={18} /> Salir
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <main className="flex-1 relative bg-zinc-950 flex flex-col md:pt-0 pt-14 overflow-hidden">
        {children}
      </main>
    </div>
  );
};

export default AppLayout;
