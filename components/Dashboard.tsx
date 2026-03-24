import React, { useState } from 'react';
import { 
  LayoutDashboard, 
  ShoppingCart, 
  Package, 
  BarChart3, 
  Users, 
  Calendar,
  LogOut,
  Menu,
  X,
  DollarSign,
  TrendingUp,
  Clock,
  User
} from 'lucide-react';
import { ViewState } from '../types';
import Button from './Button';
import { useAuth } from '../contexts/AuthContext';

interface DashboardProps {
  onNavigate: (view: ViewState) => void;
  onLogout: () => void;
}

const Dashboard: React.FC<DashboardProps> = ({ onNavigate, onLogout }) => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { user } = useAuth();

  const navigationItems = [
    { id: 'DASHBOARD' as ViewState, label: 'Dashboard', icon: LayoutDashboard },
    { id: 'POS' as ViewState, label: 'Punto de Venta', icon: ShoppingCart },
    { id: 'INVENTORY' as ViewState, label: 'Inventario', icon: Package },
    { id: 'REPORTS' as ViewState, label: 'Reportes', icon: BarChart3 },
    { id: 'STAFF' as ViewState, label: 'Personal', icon: Users },
    { id: 'APPOINTMENTS' as ViewState, label: 'Citas', icon: Calendar },
  ];

  // Estadísticas de ejemplo
  const stats = [
    { label: 'Ventas Hoy', value: '$1,250', icon: DollarSign, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
    { label: 'Transacciones', value: '24', icon: TrendingUp, color: 'text-[#38bdf8]', bg: 'bg-[#38bdf8]/10' },
    { label: 'Tiempo Promedio', value: '45 min', icon: Clock, color: 'text-[#e2b808]', bg: 'bg-[#e2b808]/10' },
    { label: 'Clientes Activos', value: '12', icon: User, color: 'text-purple-400', bg: 'bg-purple-500/10' },
  ];

  const handleNavigation = (view: ViewState) => {
    onNavigate(view);
  };

  return (
    <div className="min-h-screen bg-[#0f172a] text-[#f8fafc] flex">
      {/* Sidebar para desktop */}
      {sidebarOpen && (
        <div className="hidden md:flex flex-col w-64 bg-[#1e293b] border-r border-[#334155]">
          <div className="p-6 border-b border-[#334155]">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-[#e2b808] to-[#d4a017] rounded-lg flex items-center justify-center">
                <span className="text-lg font-bold text-[#0f172a] font-montserrat">A</span>
              </div>
              <div>
                <h1 className="text-xl font-bold text-[#e2b808] font-montserrat">Aura Grooming</h1>
                <p className="text-xs text-[#94a3b8]">
                  {user?.email ? user.email.split('@')[0] : 'Usuario'}
                </p>
              </div>
            </div>
          </div>

          <nav className="flex-1 p-4">
            <ul className="space-y-2">
              {navigationItems.map((item) => (
                <li key={item.id}>
                  <button
                    onClick={() => handleNavigation(item.id)}
                    className="w-full flex items-center gap-3 p-3 rounded-lg text-[#94a3b8] hover:text-[#f8fafc] hover:bg-[#334155]/50 transition-colors group"
                  >
                    <item.icon className="w-5 h-5 group-hover:text-[#e2b808]" />
                    <span className="group-hover:text-[#f8fafc]">{item.label}</span>
                    {item.id === 'REPORTS' && (
                      <span className="ml-auto text-xs px-2 py-1 bg-[#38bdf8]/20 text-[#38bdf8] rounded">
                        PIN
                      </span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          </nav>

          <div className="p-4 border-t border-[#334155]">
            <Button
              onClick={onLogout}
              variant="danger"
              className="w-full flex items-center justify-center gap-2 bg-rose-600 hover:bg-rose-700 border-rose-600 text-white"
            >
              <LogOut className="w-4 h-4" />
              Cerrar Sesión
            </Button>
          </div>
        </div>
      )}

      {/* Contenido principal */}
      <div className="flex-1 flex flex-col">
        {/* Header móvil */}
        <header className="md:hidden bg-[#1e293b] border-b border-[#334155] p-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg hover:bg-[#334155] text-[#f8fafc]"
            >
              {mobileMenuOpen ? (
                <X className="w-6 h-6" />
              ) : (
                <Menu className="w-6 h-6" />
              )}
            </button>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-br from-[#e2b808] to-[#d4a017] rounded-lg flex items-center justify-center">
                <span className="text-sm font-bold text-[#0f172a] font-montserrat">A</span>
              </div>
              <span className="font-bold text-[#e2b808] font-montserrat">Aura Grooming</span>
            </div>
            <div className="w-10"></div> {/* Spacer para alineación */}
          </div>

          {/* Menú móvil */}
          {mobileMenuOpen && (
            <div className="mt-4 bg-[#1e293b] border border-[#334155] rounded-xl p-4 animate-slide-in-down">
              <nav className="space-y-2">
                {navigationItems.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => {
                      handleNavigation(item.id);
                      setMobileMenuOpen(false);
                    }}
                    className="w-full flex items-center gap-3 p-3 rounded-lg text-[#94a3b8] hover:text-[#f8fafc] hover:bg-[#334155]/50 transition-colors group"
                  >
                    <item.icon className="w-5 h-5 group-hover:text-[#e2b808]" />
                    <span className="group-hover:text-[#f8fafc]">{item.label}</span>
                    {item.id === 'REPORTS' && (
                      <span className="ml-auto text-xs px-2 py-1 bg-[#38bdf8]/20 text-[#38bdf8] rounded">
                        PIN
                      </span>
                    )}
                  </button>
                ))}
                <div className="pt-4 border-t border-[#334155]">
                  <Button
                    onClick={onLogout}
                    variant="danger"
                    className="w-full flex items-center justify-center gap-2 bg-rose-600 hover:bg-rose-700 border-rose-600 text-white"
                  >
                    <LogOut className="w-4 h-4" />
                    Cerrar Sesión
                  </Button>
                </div>
              </nav>
            </div>
          )}
        </header>

        {/* Toggle sidebar para desktop */}
        <div className="hidden md:flex items-center justify-between p-4 border-b border-[#334155] bg-[#1e293b]">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 rounded-lg hover:bg-[#334155] text-[#94a3b8] hover:text-[#f8fafc] transition-colors"
          >
            {sidebarOpen ? '← Ocultar Sidebar' : '→ Mostrar Sidebar'}
          </button>
          <div className="text-sm text-[#94a3b8]">
            {sidebarOpen ? 'Sidebar visible' : 'Sidebar oculto'}
          </div>
        </div>

        {/* Contenido del Dashboard */}
        <div className="flex-1 p-4 md:p-6 lg:p-8 overflow-auto">
          <div className="max-w-6xl mx-auto">
            {/* Header del Dashboard */}
            <div className="mb-8">
              <h1 className="text-3xl md:text-4xl font-bold text-[#e2b808] mb-3">
                Bienvenido a Aura Grooming
              </h1>
              <p className="text-[#94a3b8] text-lg">
                Sistema de gestión para barberías de lujo
              </p>
              <div className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-[#e2b808]/10 border border-[#e2b808]/20 rounded-full">
                <span className="text-[#e2b808]">✨</span>
                <span className="text-sm text-[#e2b808]">Paleta Midnight Gold activada</span>
              </div>
            </div>

            {/* Estadísticas */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-8">
              {stats.map((stat, index) => (
                <div 
                  key={index} 
                  className="bg-[#1e293b] border border-[#334155] rounded-xl p-5 hover:border-[#e2b808]/30 transition-all duration-300 hover:scale-[1.02]"
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className={`p-3 rounded-lg ${stat.bg}`}>
                      <stat.icon className={`w-6 h-6 ${stat.color}`} />
                    </div>
                    <span className="text-xs text-[#94a3b8] uppercase tracking-wider">
                      {stat.label}
                    </span>
                  </div>
                  <div className="text-right">
                    <h3 className={`text-2xl md:text-3xl font-bold ${stat.color}`}>
                      {stat.value}
                    </h3>
                  </div>
                </div>
              ))}
            </div>

            {/* Grid de navegación */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
              {navigationItems.map((item) => (
                <div
                  key={item.id}
                  className="bg-[#1e293b] border border-[#334155] rounded-xl p-5 hover:border-[#e2b808]/30 transition-all duration-300 hover:scale-[1.02] cursor-pointer group"
                  onClick={() => handleNavigation(item.id)}
                >
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-3 bg-[#e2b808]/10 rounded-lg group-hover:bg-[#e2b808]/20 transition-colors">
                      <item.icon className="w-6 h-6 text-[#e2b808]" />
                    </div>
                    <h3 className="text-lg font-semibold text-[#f8fafc] group-hover:text-[#e2b808] transition-colors">
                      {item.label}
                    </h3>
                  </div>
                  <p className="text-[#94a3b8] text-sm mb-4">
                    Accede al módulo de {item.label.toLowerCase()} del sistema
                  </p>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-[#64748b]">
                      Haz clic para acceder
                    </span>
                    {item.id === 'REPORTS' && (
                      <span className="text-xs px-2 py-1 bg-[#38bdf8]/20 text-[#38bdf8] rounded">
                        Sistema PIN activo
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Estado del Sistema */}
            <div className="mt-8 pt-8 border-t border-[#334155]">
              <div className="bg-[#1e293b]/30 rounded-xl p-5 md:p-6">
                <h3 className="text-xl font-semibold text-[#f8fafc] mb-4">Estado del Sistema</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[#94a3b8]">Base de Datos</span>
                      <span className="px-3 py-1 bg-emerald-500/20 text-emerald-400 rounded-full text-sm font-medium">
                        ✅ Esquema Español
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[#94a3b8]">UI/UX</span>
                      <span className="px-3 py-1 bg-emerald-500/20 text-emerald-400 rounded-full text-sm font-medium">
                        ✅ Midnight Gold
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[#94a3b8]">Responsive</span>
                      <span className="px-3 py-1 bg-emerald-500/20 text-emerald-400 rounded-full text-sm font-medium">
                        ✅ Mobile-First
                      </span>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[#94a3b8]">Sistema PIN</span>
                      <span className="px-3 py-1 bg-[#e2b808]/20 text-[#e2b808] rounded-full text-sm font-medium">
                        ✅ Implementado
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[#94a3b8]">Animaciones</span>
                      <span className="px-3 py-1 bg-[#e2b808]/20 text-[#e2b808] rounded-full text-sm font-medium">
                        ✅ Transiciones suaves
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[#94a3b8]">Branding</span>
                      <span className="px-3 py-1 bg-[#38bdf8]/20 text-[#38bdf8] rounded-full text-sm font-medium">
                        ✅ Aura Grooming
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;