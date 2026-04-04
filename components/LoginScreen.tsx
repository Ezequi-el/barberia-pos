import React, { useState } from 'react';
import { AlertCircle, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface LoginScreenProps {
  onToggleRegister: () => void; // Se mantiene por si se invoca desde App.tsx pero el UI no lo mostrará
}

const LoginScreen: React.FC<LoginScreenProps> = () => {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const { error } = await signIn(email, password);
    
    if (error) {
      if (error.message.includes('Email not confirmed')) {
        setError('Debes confirmar tu correo electrónico. Revisa tu bandeja de entrada.');
      } else {
        setError(error.message);
      }
    }
    
    setLoading(false);
  };

  return (
    <div className="h-screen w-full flex flex-col items-center justify-center bg-[#0f172a] text-center relative overflow-hidden px-6">
      {/* Luz dorada difusa en la esquina superior izquierda al 5-8% de opacidad */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
        <div className="absolute -top-32 -left-32 w-[35rem] h-[35rem] bg-[#e2b808] rounded-full blur-[160px] opacity-[0.06]"></div>
      </div>

      <div className="z-10 w-full max-w-sm animate-in fade-in slide-in-from-bottom-4 duration-700">
        
        {/* Logo Text */}
        <div className="space-y-0 text-center mb-14 flex flex-col items-center">
          <h1 className="text-5xl font-heading font-extrabold text-[#f8fafc] tracking-widest uppercase">
            ATHERIS
          </h1>
          <div className="w-16 h-[2px] bg-[#e2b808] my-3"></div>
          <p className="text-xl text-[#e2b808] font-heading tracking-[0.5em] uppercase font-light">
            SAAS
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 text-left">
          {error && (
            <div className="bg-red-950/40 border border-red-500/30 rounded-lg p-3.5 flex items-center gap-3 text-red-400 text-sm font-medium">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="space-y-2">
            <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest pl-1">
              Usuario o Correo
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full bg-zinc-900/40 border border-zinc-800 rounded-lg px-5 py-4 text-white placeholder-zinc-700 focus:border-[#e2b808] focus:ring-1 focus:ring-[#e2b808]/50 focus:outline-none transition-all"
              placeholder="admin@atherissaas.com"
            />
          </div>

          <div className="space-y-2 relative">
            <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest pl-1">
              Contraseña
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full bg-zinc-900/40 border border-zinc-800 rounded-lg pl-5 pr-14 py-4 text-white placeholder-zinc-700 focus:border-[#e2b808] focus:ring-1 focus:ring-[#e2b808]/50 focus:outline-none transition-all"
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>

          <div className="pt-4">
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#e2b808] hover:bg-[#d4a017] text-[#0f172a] font-extrabold text-sm tracking-[0.2em] uppercase rounded-lg py-4 transition-all duration-300 hover:shadow-[0_0_20px_rgba(226,184,8,0.25)] hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-none"
            >
              {loading ? 'Ingresando...' : 'Ingresar'}
            </button>
          </div>
        </form>

        <p className="mt-14 text-zinc-600/80 text-xs font-medium tracking-widest uppercase">
          © 2026 Atheris-SaaS
        </p>
      </div>
    </div>
  );
};

export default LoginScreen;
