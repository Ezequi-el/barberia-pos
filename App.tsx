import React, { useState } from 'react';
import { ViewState } from './types';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import LoginScreen from './components/LoginScreen';
import RegisterScreen from './components/RegisterScreen';
import WelcomeScreen from './components/WelcomeScreen';
import Dashboard from './components/Dashboard';
import POS from './components/POS';
import Inventory from './components/Inventory';
import Reports from './components/Reports';
import Staff from './components/Staff';
import Appointments from './components/Appointments';

const AppContent: React.FC = () => {
  const { user, loading } = useAuth();
  const [view, setView] = useState<ViewState>('WELCOME');
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');

  // Show loading state while checking authentication
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

  // Show authentication screens if user is not logged in
  if (!user) {
    if (authMode === 'register') {
      return <RegisterScreen onToggleLogin={() => setAuthMode('login')} />;
    }
    return <LoginScreen onToggleRegister={() => setAuthMode('register')} />;
  }

  // Render main application views when authenticated
  const renderView = () => {
    switch (view) {
      case 'WELCOME':
        return <WelcomeScreen onEnter={() => setView('DASHBOARD')} />;
      case 'DASHBOARD':
        return <Dashboard onNavigate={setView} onLogout={() => setView('WELCOME')} />;
      case 'POS':
        return <POS onBack={() => setView('DASHBOARD')} />;
      case 'INVENTORY':
        return <Inventory onBack={() => setView('DASHBOARD')} />;
      case 'REPORTS':
        return <Reports onBack={() => setView('DASHBOARD')} />;
      case 'STAFF':
        return <Staff onBack={() => setView('DASHBOARD')} />;
      case 'APPOINTMENTS':
        return <Appointments onBack={() => setView('DASHBOARD')} />;
      default:
        return <WelcomeScreen onEnter={() => setView('DASHBOARD')} />;
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans selection:bg-amber-500 selection:text-black">
      {renderView()}
    </div>
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