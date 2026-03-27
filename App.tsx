import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ToastProvider } from './components/Toast';
import LoginScreen from './components/LoginScreen';
import RegisterScreen from './components/RegisterScreen';
import WelcomeScreen from './components/WelcomeScreen';
import AppLayout from './components/AppLayout';
import Dashboard from './components/Dashboard';
import POS from './components/POS';
import Inventory from './components/Inventory';
import Reports from './components/Reports';
import Customers from './components/Customers';
import Appointments from './components/Appointments';
import Personal from './components/Personal';
import ChangelogModal from './components/ChangelogModal';
import ChangePasswordModal from './components/ChangePasswordModal';
import { initTheme } from './components/ThemeToggle';
import { ViewState } from './types';

const AppContent: React.FC = () => {
  const { user, loading, isOwner, signOut, mustChangePassword } = useAuth();
  const [view, setView] = useState<ViewState>('DASHBOARD');
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');

  // Apply saved theme preference on mount
  useEffect(() => { initTheme(); }, []);

  // Show loading state while checking authentication
  if (loading) {
    return (
      <div className="min-h-screen bg-[#0f172a] text-[#f8fafc] flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-[#e2b808] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-[#94a3b8] animate-pulse">Cargando autenticación...</p>
        </div>
      </div>
    );
  }

  // Show authentication screens if user is not logged in
  if (!user) {
    if (authMode === 'register') {
      return <RegisterScreen onToggleLogin={() => setAuthMode('login')} />;
    }
    return <LoginScreen onToggleRegister={() => setAuthMode('register')} />;
  }

  // Si debe cambiar password forzosamente, bloquear todo
  if (mustChangePassword) {
    return <ChangePasswordModal />;
  }

  // Si es owner, renderizar el AppLayout con la barra de navegación y animaciones
  if (isOwner) {
    return (
      <div className="min-h-screen bg-[#0f172a] text-[#f8fafc] font-sans selection:bg-[#e2b808] selection:text-[#0f172a]">
        <AppLayout 
          currentView={view} 
          onNavigate={setView} 
          onLogout={signOut} 
        />
        <ChangelogModal />
      </div>
    );
  }

  // Si es barbero, renderizar las vistas directamente con su propia navegación
  const renderView = () => {
    switch (view) {
      case 'WELCOME':
        return <WelcomeScreen onEnter={() => setView('DASHBOARD')} />;
      case 'DASHBOARD':
        return <Dashboard onNavigate={setView} onLogout={signOut} />;
      case 'POS':
        return <POS onBack={() => setView('DASHBOARD')} />;
      case 'INVENTORY':
        return <Dashboard onNavigate={setView} onLogout={signOut} />; // Barbers no ven inventario
      case 'REPORTS':
        return <Reports onBack={() => setView('DASHBOARD')} />;
      case 'CUSTOMERS':
        return <Customers onBack={() => setView('DASHBOARD')} />;
      case 'APPOINTMENTS':
        return <Appointments onBack={() => setView('DASHBOARD')} />;
      case 'PERSONAL':
        return <Dashboard onNavigate={setView} onLogout={signOut} />; // Barbers no ven personal
      default:
        return <Dashboard onNavigate={setView} onLogout={signOut} />;
    }
  };

  return (
    <div className="min-h-screen bg-[#0f172a] text-[#f8fafc] font-sans selection:bg-[#e2b808] selection:text-[#0f172a]">
      {renderView()}
      <ChangelogModal />
    </div>
  );
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <ToastProvider>
        <AppContent />
      </ToastProvider>
    </AuthProvider>
  );
};

export default App;