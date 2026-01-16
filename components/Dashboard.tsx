import React from 'react';
import { ShoppingCart, Package, BarChart3, Settings, Scissors, LogOut, User, Activity, Users, CalendarDays } from 'lucide-react';
import { ViewState } from '../types';
import { useAuth } from '../contexts/AuthContext';

interface DashboardProps {
  onNavigate: (view: ViewState) => void;
  onLogout?: () => void;
}

const Dashboard: React.FC<DashboardProps> = ({ onNavigate, onLogout }) => {
  const { user, signOut } = useAuth();

  const handleLogout = async () => {
    await signOut();
    if (onLogout) onLogout();
  };
  const cards = [
    {
      id: 'POS',
      title: 'Punto de Venta',
      icon: ShoppingCart,
      description: 'Facturación, cobros y servicios',
      color: 'text-amber-500',
      borderColor: 'group-hover:border-amber-500/50'
    },
    {
      id: 'APPOINTMENTS',
      title: 'Agenda de Citas',
      icon: CalendarDays,
      description: 'Programación y seguimiento',
      color: 'text-zinc-100',
      borderColor: 'group-hover:border-zinc-500/50'
    },
    {
      id: 'INVENTORY',
      title: 'Inventario',
      icon: Package,
      description: 'Gestión de stock y productos',
      color: 'text-zinc-100',
      borderColor: 'group-hover:border-zinc-500/50'
    },
    {
      id: 'STAFF',
      title: 'Gestión de Personal',
      icon: Users,
      description: 'Control de barberos y equipo',
      color: 'text-zinc-100',
      borderColor: 'group-hover:border-zinc-500/50'
    },
    {
      id: 'REPORTS',
      title: 'Reportes',
      icon: BarChart3,
      description: 'Historial de ventas y análisis',
      color: 'text-zinc-100',
      borderColor: 'group-hover:border-zinc-500/50'
    },
    {
      id: 'CONFIG',
      title: 'Configuración',
      icon: Settings,
      description: 'Ajustes del sistema',
      color: 'text-zinc-500',
      borderColor: 'group-hover:border-zinc-800'
    }
  ];

  return (
    <div className="h-screen flex flex-col">
      {/* Top Header */}
      <div className="bg-zinc-900 border-b border-zinc-800 px-6 py-4 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-amber-500 rounded flex items-center justify-center text-black">
            <Scissors size={16} />
          </div>
          <span className="font-heading font-bold text-xl tracking-wider">LA BARBERÍA POS</span>
        </div>

        <div className="flex items-center gap-4 md:gap-6 w-full md:w-auto justify-between md:justify-end">
          {/* System Status */}
          <div className="flex items-center gap-2 px-3 py-1.5 bg-zinc-950 rounded-full border border-zinc-800 shadow-sm">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
            </span>
            <span className="text-xs font-bold uppercase text-zinc-300 tracking-wide">Sistema En línea</span>
          </div>

          <div className="h-8 w-px bg-zinc-800 hidden md:block"></div>

          {/* User Info */}
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-zinc-400">
              <User size={16} />
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider">Sesión Activa</span>
              <span className="text-sm font-bold text-white leading-none">{user?.email || 'Usuario'}</span>
            </div>
          </div>

          <div className="h-8 w-px bg-zinc-800 mx-2"></div>

          <button
            onClick={handleLogout}
            title="Cerrar Sesión"
            className="flex items-center gap-2 text-red-500 hover:text-red-400 hover:bg-red-500/10 px-3 py-2 rounded-lg transition-all font-bold text-xs uppercase tracking-wide border border-transparent hover:border-red-500/20"
          >
            <LogOut size={16} />
            <span className="hidden md:inline">Salir</span>
          </button>
        </div>
      </div>

      <div className="flex-1 p-6 md:p-12 max-w-7xl mx-auto w-full flex flex-col justify-center">
        <div className="mb-8">
          <h2 className="text-4xl font-heading font-bold text-white uppercase tracking-wide">
            Panel Principal
          </h2>
          <p className="text-zinc-400 text-lg mt-2">Bienvenido de nuevo. Seleccione un módulo para continuar.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
          {cards.map((card) => (
            <button
              key={card.id}
              onClick={() => card.id !== 'CONFIG' && onNavigate(card.id as ViewState)}
              disabled={card.id === 'CONFIG'}
              className={`group text-left p-8 bg-zinc-900 border border-zinc-800 rounded-2xl hover:bg-zinc-800/50 transition-all duration-300 relative overflow-hidden flex flex-col justify-between h-56 ${card.borderColor}`}
            >
              <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity transform group-hover:scale-110 duration-500">
                <card.icon size={120} />
              </div>

              <div className={`p-3 w-fit rounded-lg bg-zinc-950 mb-4 ${card.color}`}>
                <card.icon size={32} />
              </div>

              <div className="z-10">
                <h3 className="text-2xl font-heading font-bold text-white mb-2 uppercase tracking-wide">
                  {card.title}
                </h3>
                <p className="text-zinc-400">
                  {card.description}
                </p>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;