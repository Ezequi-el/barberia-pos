// ============================================================================
// TOAST NOTIFICATION SYSTEM - Reemplazo profesional para alert()
// ============================================================================

import React, { useState, useEffect, createContext, useContext, useCallback } from 'react';
import { 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  Info, 
  X 
} from 'lucide-react';
import { Notification } from '../types';

// ============================================================================
// 1. CONTEXTO Y PROVIDER
// ============================================================================

interface ToastContextType {
  notifications: Notification[];
  addNotification: (notification: Omit<Notification, 'id' | 'timestamp'>) => void;
  removeNotification: (id: string) => void;
  clearNotifications: () => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast debe usarse dentro de ToastProvider');
  }
  return context;
};

interface ToastProviderProps {
  children: React.ReactNode;
  maxNotifications?: number;
  defaultDuration?: number;
}

export const ToastProvider: React.FC<ToastProviderProps> = ({ 
  children, 
  maxNotifications = 5,
  defaultDuration = 5000 
}) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const addNotification = useCallback((
    notification: Omit<Notification, 'id' | 'timestamp'>
  ) => {
    const id = Math.random().toString(36).substring(2, 9);
    const timestamp = new Date().toISOString();
    
    const newNotification: Notification = {
      ...notification,
      id,
      timestamp,
      duration: notification.duration || defaultDuration
    };

    setNotifications(prev => {
      const updated = [newNotification, ...prev];
      if (updated.length > maxNotifications) {
        return updated.slice(0, maxNotifications);
      }
      return updated;
    });

    // Auto-remove si tiene duración
    if (newNotification.duration && newNotification.duration > 0) {
      setTimeout(() => {
        removeNotification(id);
      }, newNotification.duration);
    }
  }, [defaultDuration, maxNotifications]);

  const removeNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  const clearNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  return (
    <ToastContext.Provider value={{ 
      notifications, 
      addNotification, 
      removeNotification, 
      clearNotifications 
    }}>
      {children}
      <ToastContainer />
    </ToastContext.Provider>
  );
};

// ============================================================================
// 2. COMPONENTE DE NOTIFICACIÓN INDIVIDUAL
// ============================================================================

interface ToastProps {
  notification: Notification;
  onClose: () => void;
}

const Toast: React.FC<ToastProps> = ({ notification, onClose }) => {
  const { type, title, message, duration } = notification;

  // Iconos por tipo
  const icons = {
    success: <CheckCircle className="w-5 h-5" />,
    error: <XCircle className="w-5 h-5" />,
    warning: <AlertTriangle className="w-5 h-5" />,
    info: <Info className="w-5 h-5" />
  };

  // Colores por tipo - Paleta Midnight Gold
  const bgColors = {
    success: 'bg-emerald-500/10 border-emerald-500/20',
    error: 'bg-rose-500/10 border-rose-500/20',
    warning: 'bg-amber-500/10 border-amber-500/20',
    info: 'bg-sky-500/10 border-sky-500/20'
  };

  const textColors = {
    success: 'text-emerald-400',
    error: 'text-rose-400',
    warning: 'text-amber-400',
    info: 'text-sky-400'
  };

  const iconColors = {
    success: 'text-emerald-500',
    error: 'text-rose-500',
    warning: 'text-amber-500',
    info: 'text-sky-500'
  };

  // Barra de progreso para auto-close
  const [progress, setProgress] = useState(100);

  useEffect(() => {
    if (!duration || duration <= 0) return;

    const interval = 50; // Actualizar cada 50ms
    const totalSteps = duration / interval;
    const step = 100 / totalSteps;

    const timer = setInterval(() => {
      setProgress(prev => {
        const newProgress = prev - step;
        if (newProgress <= 0) {
          clearInterval(timer);
          return 0;
        }
        return newProgress;
      });
    }, interval);

    return () => clearInterval(timer);
  }, [duration]);

  return (
    <div className={`
      relative w-full max-w-sm p-4 mb-3 rounded-xl border
      backdrop-blur-sm bg-[#1e293b]/90
      animate-in slide-in-from-right-4 duration-300
      ${bgColors[type]}
    `}>
      {/* Barra de progreso */}
      {duration && duration > 0 && (
        <div className="absolute top-0 left-0 right-0 h-1 bg-[#1e293b] rounded-t-xl overflow-hidden">
          <div 
            className={`h-full ${bgColors[type].replace('/10', '/50')}`}
            style={{ width: `${progress}%`, transition: 'width 50ms linear' }}
          />
        </div>
      )}

      <div className="flex items-start gap-3">
        {/* Icono */}
        <div className={`flex-shrink-0 mt-0.5 ${iconColors[type]}`}>
          {icons[type]}
        </div>

        {/* Contenido */}
        <div className="flex-1 min-w-0">
          {title && (
            <h4 className={`font-bold text-sm mb-1 ${textColors[type]}`}>
              {title}
            </h4>
          )}
          <p className="text-sm text-[#cbd5e1] leading-relaxed">
            {message}
          </p>
        </div>

        {/* Botón cerrar */}
        <button
          onClick={onClose}
          className="flex-shrink-0 p-1 -m-1 text-[#94a3b8] hover:text-[#f8fafc] 
                   rounded-lg transition-colors focus:outline-none focus:ring-2 
                   focus:ring-[#475569] focus:ring-offset-2 focus:ring-offset-[#1e293b]"
          aria-label="Cerrar notificación"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Timestamp */}
      <div className="mt-2 text-xs text-[#64748b] text-right">
        {new Date(notification.timestamp).toLocaleTimeString([], { 
          hour: '2-digit', 
          minute: '2-digit' 
        })}
      </div>
    </div>
  );
};

// ============================================================================
// 3. CONTENEDOR DE NOTIFICACIONES
// ============================================================================

const ToastContainer: React.FC = () => {
  const { notifications, removeNotification } = useToast();

  if (notifications.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-50 w-full max-w-md space-y-2 pointer-events-none">
      {notifications.map(notification => (
        <div 
          key={notification.id} 
          className="pointer-events-auto animate-in slide-in-from-right-4 duration-300"
        >
          <Toast
            notification={notification}
            onClose={() => removeNotification(notification.id)}
          />
        </div>
      ))}
    </div>
  );
};

// ============================================================================
// 4. HOOKS DE CONVENIENCIA
// ============================================================================

/**
 * Hook para notificaciones rápidas
 */
export const useToastNotifications = () => {
  const { addNotification } = useToast();

  const showSuccess = useCallback((message: string, title?: string) => {
    addNotification({
      type: 'success',
      title: title || 'Éxito',
      message,
      duration: 3000
    });
  }, [addNotification]);

  const showError = useCallback((message: string, title?: string) => {
    addNotification({
      type: 'error',
      title: title || 'Error',
      message,
      duration: 5000
    });
  }, [addNotification]);

  const showWarning = useCallback((message: string, title?: string) => {
    addNotification({
      type: 'warning',
      title: title || 'Advertencia',
      message,
      duration: 4000
    });
  }, [addNotification]);

  const showInfo = useCallback((message: string, title?: string) => {
    addNotification({
      type: 'info',
      title: title || 'Información',
      message,
      duration: 3000
    });
  }, [addNotification]);

  return {
    showSuccess,
    showError,
    showWarning,
    showInfo
  };
};

// ============================================================================
// 5. COMPONENTE DE EJEMPLO/DEMO
// ============================================================================

export const ToastDemo: React.FC = () => {
  const { showSuccess, showError, showWarning, showInfo } = useToastNotifications();

  return (
    <div className="p-6 space-y-4">
      <h3 className="text-lg font-bold text-white">Demo de Notificaciones</h3>
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => showSuccess('Operación completada exitosamente')}
          className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600"
        >
          Éxito
        </button>
        <button
          onClick={() => showError('Ocurrió un error al procesar la solicitud')}
          className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
        >
          Error
        </button>
        <button
          onClick={() => showWarning('Stock bajo, considerar reabastecimiento')}
          className="px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600"
        >
          Advertencia
        </button>
        <button
          onClick={() => showInfo('La transacción ha sido registrada')}
          className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
        >
          Información
        </button>
      </div>
    </div>
  );
};

export default Toast;