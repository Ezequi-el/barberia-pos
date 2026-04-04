import React, { useState, useEffect, useCallback } from 'react';
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
  User,
  Wifi,
  WifiOff,
  Printer,
  AlertTriangle
} from 'lucide-react';
import { ViewState } from '../types';
import Button from './Button';
import CorteDeCajaModal from './CorteDeCajaModal';
import ThemeToggle from './ThemeToggle';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { createTransaction } from '../lib/database';
import { useToastNotifications } from './Toast';

interface DashboardProps {
  onNavigate: (view: ViewState) => void;
  onLogout: () => void;
}

const PENDING_KEY = 'atheris_pending_sales';

const Dashboard: React.FC<DashboardProps> = ({ onNavigate, onLogout }) => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { user, isOwner, profile } = useAuth();
  const { showSuccess, showError, showInfo } = useToastNotifications();

  // Online/Offline state
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [corteModalOpen, setCorteModalOpen] = useState(false);
  const [lowStockItems, setLowStockItems] = useState<{name: string, stock: number}[]>([]);
  const [pendingSalesCount, setPendingSalesCount] = useState<number>(() => {
    try { return JSON.parse(localStorage.getItem(PENDING_KEY) || '[]').length; } catch { return 0; }
  });

  // DB ping state
  const [dbStatus, setDbStatus] = useState<'checking' | 'ok' | 'error'>('checking');

  const navigationItems = [
    { id: 'DASHBOARD' as ViewState, label: 'Dashboard', icon: LayoutDashboard },
    { id: 'POS' as ViewState, label: 'Punto de Venta', icon: ShoppingCart },
    ...(isOwner ? [{ id: 'INVENTORY' as ViewState, label: 'Inventario', icon: Package }] : []),
    { id: 'REPORTS' as ViewState, label: 'Reportes', icon: BarChart3 },
    { id: 'APPOINTMENTS' as ViewState, label: 'Citas', icon: Calendar },
    { id: 'CUSTOMERS' as ViewState, label: 'Clientes', icon: Users },
    ...(isOwner ? [{ id: 'PERSONAL' as ViewState, label: 'Gestión de Personal', icon: User }] : []),
  ];

  const [statsData, setStatsData] = useState({
    ventasHoy: 0,
    transacciones: 0,
    ticketPromedio: 0,
    clientesActivos: 0
  });
  const [loadingStats, setLoadingStats] = useState(true);

  // Sync pending offline sales
  const syncPendingSales = useCallback(async () => {
    try {
      const raw = localStorage.getItem(PENDING_KEY);
      if (!raw) return;
      const pending: any[] = JSON.parse(raw);
      if (pending.length === 0) return;

      let synced = 0;
      const remaining: any[] = [];
      for (const sale of pending) {
        try {
          await createTransaction(sale);
          synced++;
        } catch {
          remaining.push(sale);
        }
      }
      localStorage.setItem(PENDING_KEY, JSON.stringify(remaining));
      setPendingSalesCount(remaining.length);
      if (synced > 0) showSuccess(`${synced} venta(s) sincronizada(s) exitosamente`, 'Sincronización');
    } catch (err) {
      console.error('Error syncing pending sales:', err);
    }
  }, [showSuccess]);
  // Verificación unificada de conexión (Red + BD)
  const checkConnection = useCallback(async () => {
    if (!navigator.onLine) {
      setIsOnline(false);
      setDbStatus('error');
      return;
    }
    
    try {
      const { error } = await supabase.from('profiles').select('id').limit(1).single();
      // Si no hay error, o si el error es solo que no hay filas (PGRST116), la conexión es exitosa.
      if (!error || error.code === 'PGRST116') {
        setIsOnline(true);
        setDbStatus('ok');
        syncPendingSales();
      } else {
        setIsOnline(false);
        setDbStatus('error');
      }
    } catch {
      setIsOnline(false);
      setDbStatus('error');
    }
  }, [syncPendingSales]);

  // Listeners y polling
  useEffect(() => {
    checkConnection();

    const handleOffline = () => {
      setIsOnline(false);
      setDbStatus('error');
    };

    window.addEventListener('online', checkConnection);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('focus', checkConnection);

    // Polling cada 30 segundos
    const interval = setInterval(checkConnection, 30000);

    return () => {
      window.removeEventListener('online', checkConnection);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('focus', checkConnection);
      clearInterval(interval);
    };
  }, [checkConnection]);

  useEffect(() => {
    const fetchStats = async () => {
      if (!profile?.business_id) return;
      
      try {
        setLoadingStats(true);
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date();
        endOfDay.setHours(23, 59, 59, 999);

        const { data: pedidos, error: pedidosError } = await supabase
          .from('pedidos')
          .select('total')
          .eq('business_id', profile.business_id)
          .gte('created_at', startOfDay.toISOString())
          .lte('created_at', endOfDay.toISOString());

        if (pedidosError) throw pedidosError;

        const ventasHoy = pedidos ? pedidos.reduce((acc, p) => acc + Number(p.total || 0), 0) : 0;
        const transacciones = pedidos ? pedidos.length : 0;
        const ticketPromedio = transacciones > 0 ? ventasHoy / transacciones : 0;

        const { count: clientesCount, error: clientesError } = await supabase
          .from('customers')
          .select('*', { count: 'exact', head: true })
          .eq('business_id', profile.business_id);

        if (clientesError) throw clientesError;

        const { data: lowStockData, error: lowStockError } = await supabase
          .from('productos')
          .select('name, stock')
          .eq('business_id', profile.business_id)
          .eq('type', 'PRODUCT')
          .lte('stock', 5)
          .not('stock', 'is', null)
          .order('stock', { ascending: true });
        
        if (!lowStockError && lowStockData) {
          setLowStockItems(lowStockData);
        }

        setStatsData({
          ventasHoy,
          transacciones,
          ticketPromedio,
          clientesActivos: clientesCount || 0
        });
      } catch (err) {
        console.error('Error fetching dashboard stats:', err);
      } finally {
        setLoadingStats(false);
      }
    };

    fetchStats();
  }, [profile?.business_id]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN'
    }).format(amount);
  };

  const stats = [
    { label: 'Ventas Hoy', value: loadingStats ? '...' : formatCurrency(statsData.ventasHoy), icon: DollarSign, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
    { label: 'Transacciones', value: loadingStats ? '...' : statsData.transacciones.toString(), icon: TrendingUp, color: 'text-[#38bdf8]', bg: 'bg-[#38bdf8]/10' },
    { label: 'Ticket Prom.', value: loadingStats ? '...' : formatCurrency(statsData.ticketPromedio), icon: DollarSign, color: 'text-[#e2b808]', bg: 'bg-[#e2b808]/10' },
    { label: 'Clientes Activos', value: loadingStats ? '...' : statsData.clientesActivos.toString(), icon: User, color: 'text-purple-400', bg: 'bg-purple-500/10' },
  ];

  const handleNavigation = (view: ViewState) => {
    onNavigate(view);
  };

  return (
    <div className="min-h-screen bg-[#0f172a] text-[#f8fafc] flex">
      {/* Sidebar para desktop */}
      {sidebarOpen && (
        <div className="atheris-sidebar hidden md:flex flex-col w-64 bg-[#1e293b] border-r border-[#334155]">
          <div className="p-6 border-b border-[#334155]">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-[#e2b808] to-[#d4a017] rounded-lg flex items-center justify-center">
                <span className="text-lg font-bold text-[#0f172a] font-montserrat">A</span>
              </div>
              <div className="flex-1 min-w-0">
                <h1 className="text-xl font-bold text-[#e2b808] font-montserrat">Atheris-SaaS</h1>
                <p className="text-xs text-[#94a3b8] truncate">
                  {user?.email ? user.email.split('@')[0] : 'Usuario'}
                </p>
              </div>
              <ThemeToggle />
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
              <span className="font-bold text-[#e2b808] font-montserrat">Atheris-SaaS</span>
            </div>
            <ThemeToggle />
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
          {/* Indicador Online/Offline */}
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
            isOnline
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
              : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
          }`}>
            {isOnline
              ? <><Wifi size={14} /> En línea</>
              : <><WifiOff size={14} /> Sin conexión{pendingSalesCount > 0 ? ` (${pendingSalesCount} pendiente${pendingSalesCount > 1 ? 's' : ''})` : ''}</>
            }
          </div>
        </div>

        {/* Contenido del Dashboard */}
        <div className="flex-1 p-4 md:p-6 lg:p-8 overflow-auto">
          <div className="max-w-6xl mx-auto">
            {/* Header del Dashboard */}
            <div className="flex justify-between items-start mb-8">
              <div>
                <h1 className="text-3xl md:text-4xl font-bold text-[#e2b808] mb-3">
                  Bienvenido a Atheris-SaaS
                </h1>
                <p className="text-[#94a3b8] text-lg">
                  Sistema de gestión para barberías de lujo
                </p>
              </div>
              {profile?.role === 'owner' && (
                <Button 
                  onClick={() => setCorteModalOpen(true)}
                  className="gap-2 text-sm md:text-base bg-[#e2b808] hover:bg-[#d4a017] text-[#0f172a] hidden md:flex"
                >
                  <Printer size={18} /> Corte de Caja
                </Button>
              )}
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

            {/* Alerta de Stock Bajo */}
            {lowStockItems.length > 0 && (
              <div className="mb-8 bg-amber-500/10 border border-amber-500/50 rounded-xl p-4 md:p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-amber-500/20 rounded-full text-amber-500">
                    <AlertTriangle size={24} />
                  </div>
                  <div>
                    <h3 className="text-amber-500 font-bold text-lg leading-tight uppercase tracking-wider mb-1">
                      ⚠ Stock Bajo
                    </h3>
                    <p className="text-amber-500/80 text-sm">
                      {lowStockItems.length} producto(s) necesitan reabastecimiento
                    </p>
                  </div>
                </div>
                <Button 
                  onClick={() => handleNavigation('INVENTORY')}
                  className="bg-amber-500 hover:bg-amber-600 text-[#0f172a] border-amber-500 font-bold whitespace-nowrap"
                >
                  Ver Inventario →
                </Button>
              </div>
            )}

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
              <div className="bg-[#1e293b]/30 rounded-xl p-4">
                <h3 className="text-sm font-semibold text-[#94a3b8] uppercase tracking-wider mb-3">Estado del Sistema</h3>
                <div className="flex flex-wrap gap-4">
                  {/* Base de Datos */}
                  <div className="flex items-center gap-2">
                    <span className="text-[#94a3b8] text-sm">Base de Datos</span>
                    {dbStatus === 'checking' && (
                      <span className="px-2.5 py-1 bg-[#334155] text-[#94a3b8] rounded-full text-xs font-medium">Verificando...</span>
                    )}
                    {dbStatus === 'ok' && (
                      <span className="px-2.5 py-1 bg-emerald-500/20 text-emerald-400 rounded-full text-xs font-medium">● Conectada</span>
                    )}
                    {dbStatus === 'error' && (
                      <span className="px-2.5 py-1 bg-rose-500/20 text-rose-400 rounded-full text-xs font-medium">● Error</span>
                    )}
                  </div>
                  <div className="w-px bg-[#334155]" />
                  {/* Versión */}
                  <div className="flex items-center gap-2">
                    <span className="text-[#94a3b8] text-sm">Versión</span>
                    <span className="px-2.5 py-1 bg-[#e2b808]/10 text-[#e2b808] rounded-full text-xs font-medium">v1.2.0</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modal Corte de Caja */}
      <CorteDeCajaModal 
        isOpen={corteModalOpen} 
        onClose={() => setCorteModalOpen(false)} 
      />
    </div>
  );
};

export default Dashboard;