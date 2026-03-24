import React, { useState } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ToastProvider } from './components/Toast';
import LoginScreen from './components/LoginScreen';
import RegisterScreen from './components/RegisterScreen';
import WelcomeScreen from './components/WelcomeScreen';
import AppLayout from './components/AppLayout';
import { ViewState } from './types';

const AppContent: React.FC = () => {
  const { user, loading } = useAuth();
  const [view, setView] = useState<ViewState>('DASHBOARD');
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');

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

  // Si el usuario está autenticado, mostrar AppLayout con animaciones
  return (
    <div className="min-h-screen bg-[#0f172a] text-[#f8fafc] font-sans selection:bg-[#e2b808] selection:text-[#0f172a]">
      <AppLayout 
        currentView={view} 
        onNavigate={setView} 
        onLogout={() => setView('DASHBOARD')} 
      />
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