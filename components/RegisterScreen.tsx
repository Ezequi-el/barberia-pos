import React, { useState } from 'react';
import { UserPlus, Mail, Lock, User, AlertCircle, CheckCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import Button from './Button';
import Input from './Input';

interface RegisterScreenProps {
  onToggleLogin: () => void;
}

const RegisterScreen: React.FC<RegisterScreenProps> = ({ onToggleLogin }) => {
  const { signUp } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess(false);

    // Validations
    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden');
      return;
    }

    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres');
      return;
    }

    if (!fullName.trim()) {
      setError('Por favor ingresa tu nombre completo');
      return;
    }

    setLoading(true);

    const { error } = await signUp(email, password, fullName);

    if (error) {
      setError(error.message);
    } else {
      setSuccess(true);
      // Clear form
      setEmail('');
      setPassword('');
      setConfirmPassword('');
      setFullName('');

      // Redirect to login after 2 seconds
      setTimeout(() => {
        onToggleLogin();
      }, 2000);
    }

    setLoading(false);
  };

  return (
    <div className="h-screen w-full flex flex-col items-center justify-center bg-black text-center relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-amber-600 rounded-full blur-[128px]"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-zinc-800 rounded-full blur-[128px]"></div>
      </div>

      <div className="z-10 w-full max-w-md px-8 animate-in fade-in slide-in-from-bottom-8 duration-700">
        <div className="w-20 h-20 mx-auto rounded-full border-2 border-amber-500 flex items-center justify-center mb-6 bg-zinc-950 shadow-[0_0_30px_rgba(245,158,11,0.3)]">
          <UserPlus className="text-amber-500 w-10 h-10" />
        </div>

        <div className="space-y-2 mb-8">
          <h1 className="text-5xl font-heading font-bold text-white tracking-tighter">
            LA BARBERÍA
          </h1>
          <p className="text-lg text-amber-500 font-heading tracking-[0.3em] uppercase">
            Crear Cuenta
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-3 flex items-center gap-2 text-red-500 text-sm">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="bg-green-500/10 border border-green-500/50 rounded-lg p-3 flex items-center gap-2 text-green-500 text-sm">
              <CheckCircle className="w-4 h-4 flex-shrink-0" />
              <span>¡Cuenta creada exitosamente! Redirigiendo...</span>
            </div>
          )}

          <div className="relative">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
            <Input
              type="text"
              placeholder="Nombre completo"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
              className="pl-12"
            />
          </div>

          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
            <Input
              type="email"
              placeholder="Correo electrónico"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="pl-12"
            />
          </div>

          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
            <Input
              type="password"
              placeholder="Contraseña (mín. 6 caracteres)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="pl-12"
            />
          </div>

          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
            <Input
              type="password"
              placeholder="Confirmar contraseña"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              className="pl-12"
            />
          </div>

          <Button
            type="submit"
            fullWidth
            disabled={loading || success}
            className="bg-amber-500 hover:bg-amber-400 text-black font-bold tracking-widest border-0 py-3"
          >
            {loading ? 'Creando cuenta...' : 'Crear Cuenta'}
          </Button>
        </form>

        <div className="mt-6 text-zinc-400 text-sm">
          ¿Ya tienes cuenta?{' '}
          <button
            onClick={onToggleLogin}
            className="text-amber-500 hover:text-amber-400 font-semibold transition-colors"
          >
            Inicia sesión aquí
          </button>
        </div>

        <p className="mt-8 text-zinc-600 text-xs uppercase tracking-widest">
          Sistema de Gestión Premium v1.0
        </p>
      </div>
    </div>
  );
};

export default RegisterScreen;
