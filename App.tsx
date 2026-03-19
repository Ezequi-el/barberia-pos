import React, { useState } from 'react';
import { ViewState } from './types';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import LoginScreen from './components/LoginScreen';
import RegisterScreen from './components/RegisterScreen';
import WelcomeScreen from './components/WelcomeScreen';
import AppLayout from './components/AppLayout';
import POS from './components/POS';
import Inventory from './components/Inventory';
import Reports from './components/Reports';
import Customers from './components/Customers';
import Appointments from './components/Appointments';
import { usePreventUnload } from './hooks/usePreventUnload';

const AppContent: React.FC = () => {
  usePreventUnload(true); // Bring back user F5 warning specifically

  const { user, profile, loading } = useAuth();
  const [view, setView] = useState<ViewState>('WELCOME');
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-100 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-zinc-400 animate-pulse">Cargando...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    if (authMode === 'register') {
      return <RegisterScreen onToggleLogin={() => setAuthMode('login')} />;
    }
    return <LoginScreen onToggleRegister={() => setAuthMode('register')} />;
  }

  if (view === 'WELCOME') {
    return <WelcomeScreen onEnter={() => setView('POS')} />;
  }

  // Handle protected views for Barber
  if (profile?.role === 'barber' && view === 'INVENTORY') {
    setView('POS');
    return null;
  }

  const renderView = () => {
    switch (view) {
      case 'POS':
        return <POS />;
      case 'INVENTORY':
        return <Inventory />;
      case 'REPORTS':
        return <Reports />;
      case 'CUSTOMERS':
        return <Customers />;
      case 'APPOINTMENTS':
        return <Appointments />;
      default:
        return <POS />;
    }
  };

  return (
    <AppLayout currentView={view} onNavigate={setView}>
      {renderView()}
    </AppLayout>
  );
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
};

export default App;