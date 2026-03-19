import React, { useState } from 'react';
import { KeyRound, Mail, AlertCircle, CheckCircle, ArrowLeft } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import Button from './Button';
import Input from './Input';

interface ForgotPasswordScreenProps {
  onBack: () => void;
}

const ForgotPasswordScreen: React.FC<ForgotPasswordScreenProps> = ({ onBack }) => {
  const { resetPassword } = useAuth();
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const { error } = await resetPassword(email);

    if (error) {
      setError(error.message);
    } else {
      setSuccess(true);
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
          <KeyRound className="text-amber-500 w-10 h-10" />
        </div>

        <div className="space-y-2 mb-8">
          <h1 className="text-5xl font-heading font-bold text-white tracking-tighter">
            NERON
          </h1>
          <p className="text-lg text-amber-500 font-heading tracking-[0.3em] uppercase">
            Recuperar Contraseña
          </p>
        </div>

        {!success ? (
          <>
            <p className="text-zinc-400 text-sm mb-6">
              Ingresa tu correo electrónico y te enviaremos un enlace para restablecer tu contraseña.
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-3 flex items-center gap-2 text-red-500 text-sm">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}

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

              <Button
                type="submit"
                fullWidth
                disabled={loading}
                className="bg-amber-500 hover:bg-amber-400 text-black font-bold tracking-widest border-0 py-3"
              >
                {loading ? 'Enviando...' : 'Enviar enlace'}
              </Button>
            </form>
          </>
        ) : (
          <div className="space-y-6">
            <div className="bg-green-500/10 border border-green-500/50 rounded-xl p-5 flex flex-col items-center gap-3 text-green-400">
              <CheckCircle className="w-10 h-10" />
              <p className="text-sm leading-relaxed">
                ¡Correo enviado! Revisa tu bandeja de entrada y haz clic en el enlace para restablecer tu contraseña.
              </p>
            </div>
            <p className="text-zinc-500 text-xs">
              ¿No recibiste el correo? Revisa tu carpeta de spam o{' '}
              <button
                onClick={() => { setSuccess(false); setEmail(''); }}
                className="text-amber-500 hover:text-amber-400 font-semibold transition-colors"
              >
                intenta de nuevo
              </button>
              .
            </p>
          </div>
        )}

        <div className="mt-6 text-zinc-400 text-sm">
          <button
            onClick={onBack}
            className="flex items-center gap-2 mx-auto text-amber-500 hover:text-amber-400 font-semibold transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Volver al inicio de sesión
          </button>
        </div>

        <p className="mt-8 text-zinc-600 text-xs uppercase tracking-widest">
          Sistema de Gestión Premium v1.0
        </p>
      </div>
    </div>
  );
};

export default ForgotPasswordScreen;
