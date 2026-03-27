import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import Input from './Input';
import Button from './Button';
import { Key } from 'lucide-react';

const ChangePasswordModal: React.FC = () => {
  const { user } = useAuth();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres');
      return;
    }
    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden');
      return;
    }

    try {
      setLoading(true);
      setError('');

      // 1. Update password in auth (requires the user to be signed in)
      const { error: updateError } = await supabase.auth.updateUser({
        password: password
      });

      if (updateError) throw updateError;

      // 2. Mark as completed in profiles
      if (user) {
        const { error: profileError } = await supabase
          .from('profiles')
          .update({ password_changed: true })
          .eq('id', user.id);

        if (profileError) throw profileError;
        
        // Page reload to force useAuth context refresh
        window.location.reload();
      }

    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Error al actualizar la contraseña');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 p-4">
      <div className="bg-zinc-900 border border-amber-500/30 rounded-xl w-full max-w-md shadow-2xl animate-in fade-in zoom-in duration-300">
        <div className="flex items-center justify-center p-6 border-b border-zinc-800 bg-amber-500/5 rounded-t-xl">
          <div className="w-12 h-12 bg-amber-500/20 text-amber-500 rounded-full flex items-center justify-center shrink-0 shadow-lg border border-amber-500/20 mr-4">
            <Key size={24} />
          </div>
          <div>
            <h3 className="text-xl font-heading font-bold text-white uppercase tracking-wide">
              Cambiar Contraseña
            </h3>
            <p className="text-zinc-500 text-sm">Por tu seguridad, actualiza tu contraseña temporal</p>
          </div>
        </div>

        <div className="p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Nueva Contraseña *"
              type="password"
              placeholder="Mínimo 8 caracteres"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            
            <Input
              label="Confirmar Contraseña *"
              type="password"
              placeholder="Repite tu nueva contraseña"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />

            {error && (
              <div className="p-3 bg-red-500/10 border border-red-500/40 rounded-lg text-red-500 text-sm font-bold text-center">
                {error}
              </div>
            )}

            <div className="pt-2">
              <Button type="submit" fullWidth disabled={loading}>
                {loading ? 'Actualizando...' : 'Actualizar Contraseña y Continuar'}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ChangePasswordModal;
