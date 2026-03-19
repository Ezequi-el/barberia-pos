import React, { useState, useRef, useEffect } from 'react';
import {
  ArrowLeft, Mail, CheckCircle, KeyRound, Scissors,
  Eye, EyeOff, RefreshCw, ShieldCheck,
} from 'lucide-react';

interface ForgotPasswordProps {
  onBack: () => void;
}

// ── Demo config ─────────────────────────────────────────────────────────────
// TODO [SUPABASE] Eliminar VALID_EMAILS y DEMO_OTP cuando se conecte Supabase.
// En producción, la validación del correo la hace Auth de Supabase internamente;
// el envío del OTP lo maneja supabase.auth.resetPasswordForEmail().
const VALID_EMAILS = ['admin@neron.mx', 'barbero@neron.mx', 'demo@test.com'];
const DEMO_OTP = '482619';

// ── Helpers ──────────────────────────────────────────────────────────────────
const isValidEmailFormat = (email: string) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

interface PasswordRules {
  length: boolean;
  uppercase: boolean;
  number: boolean;
  special: boolean;
}

const checkRules = (pwd: string): PasswordRules => ({
  length: pwd.length >= 8,
  uppercase: /[A-Z]/.test(pwd),
  number: /[0-9]/.test(pwd),
  special: /[^A-Za-z0-9]/.test(pwd),
});

const strengthLevel = (rules: PasswordRules): number =>
  Object.values(rules).filter(Boolean).length;

const strengthLabel = (level: number) => {
  if (level <= 1) return { label: 'Muy débil', color: 'bg-red-500' };
  if (level === 2) return { label: 'Débil', color: 'bg-orange-500' };
  if (level === 3) return { label: 'Moderada', color: 'bg-yellow-400' };
  return { label: 'Fuerte', color: 'bg-green-500' };
};

// ── Step indicator ───────────────────────────────────────────────────────────
const StepIndicator: React.FC<{ current: number }> = ({ current }) => (
  <div className="flex items-center justify-center gap-0 mb-8 w-full max-w-xs mx-auto">
    {[1, 2, 3].map((step, i) => (
      <React.Fragment key={step}>
        <div
          className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-all duration-300 ${
            step < current
              ? 'bg-amber-500 border-amber-500 text-black'
              : step === current
              ? 'bg-transparent border-amber-500 text-amber-500'
              : 'bg-transparent border-zinc-700 text-zinc-600'
          }`}
        >
          {step < current ? <CheckCircle size={15} /> : step}
        </div>
        {i < 2 && (
          <div
            className={`flex-1 h-px mx-1 transition-all duration-500 ${
              step < current ? 'bg-amber-500' : 'bg-zinc-700'
            }`}
          />
        )}
      </React.Fragment>
    ))}
  </div>
);

// ── Main component ────────────────────────────────────────────────────────────
const ForgotPassword: React.FC<ForgotPasswordProps> = ({ onBack }) => {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);

  // Step 1
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState('');

  // Step 2
  const [otp, setOtp] = useState<string[]>(Array(6).fill(''));
  const [otpError, setOtpError] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Step 3
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const rules = checkRules(password);
  const level = strengthLevel(rules);
  const { label: strengthText, color: strengthColor } = strengthLabel(level);
  const allRulesMet = Object.values(rules).every(Boolean);
  const passwordsMatch = password === confirm && confirm.length > 0;
  const step3Ready = allRulesMet && passwordsMatch;

  // Resend cooldown timer
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = setTimeout(() => setResendCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [resendCooldown]);

  // ── Step 1 handler ─────────────────────────────────────────────────────────
  const handleEmailSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValidEmailFormat(email)) {
      setEmailError('Ingresa un correo con formato válido.');
      return;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // TODO [SUPABASE] Paso 1: Enviar correo de recuperación
    // Reemplazar la validación demo por la llamada real a Supabase Auth.
    // Eliminar el bloque VALID_EMAILS y sustituir con:
    //
    //   import { supabase } from '../lib/supabase';
    //
    //   const { error } = await supabase.auth.resetPasswordForEmail(email, {
    //     redirectTo: `${window.location.origin}/reset-password`,
    //     // redirectTo apunta a la ruta donde el usuario aterrizara con
    //     // los tokens de sesión en el hash de la URL (#access_token=...)
    //   });
    //   if (error) { setEmailError(error.message); return; }
    //
    // NOTA: Supabase envía el enlace por correo; el Paso 2 (OTP manual) puede
    // omitirse si se usa el flujo de enlace mágico, o sustituirse por
    // supabase.auth.verifyOtp (ver Paso 2) si se configura un proveedor SMTP
    // propio con plantilla OTP de 6 dígitos.
    // ─────────────────────────────────────────────────────────────────────────
    if (!VALID_EMAILS.includes(email.toLowerCase())) {
      setEmailError('Este correo no está registrado en el sistema.');
      return;
    }
    setEmailError('');
    setResendCooldown(30);
    setStep(2);
  };

  // ── Step 2 handlers ────────────────────────────────────────────────────────
  const handleOtpChange = (index: number, value: string) => {
    if (!/^\d?$/.test(value)) return;
    const next = [...otp];
    next[index] = value;
    setOtp(next);
    if (value && index < 5) otpRefs.current[index + 1]?.focus();
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent) => {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pasted.length === 6) {
      setOtp(pasted.split(''));
      otpRefs.current[5]?.focus();
    }
    e.preventDefault();
  };

  const handleOtpSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const code = otp.join('');

    // ─────────────────────────────────────────────────────────────────────────
    // TODO [SUPABASE] Paso 2: Verificar OTP / token de recuperación
    //
    // OPCIÓN A — OTP propio (proveedor SMTP con plantilla de 6 dígitos):
    //   const { error } = await supabase.auth.verifyOtp({
    //     email,
    //     token: code,          // el código que escribió el usuario
    //     type: 'recovery',     // tipo de flujo
    //   });
    //   if (error) { setOtpError(error.message); return; }
    //
    // OPCIóN B — Enlace mágico (flujo por defecto de Supabase):
    //   Omitir este paso. El usuario hace clic en el enlace del correo y
    //   Supabase redirige a la app con #access_token en la URL.
    //   Leer el token con supabase.auth.onAuthStateChange y avanzar al Paso 3.
    // ─────────────────────────────────────────────────────────────────────────
    if (code !== DEMO_OTP) {
      setOtpError('Código incorrecto. El código de prueba es 482619.');
      return;
    }
    setOtpError('');
    setStep(3);
  };

  const handleResend = () => {
    setOtp(Array(6).fill(''));
    setOtpError('');
    setResendCooldown(30);
    otpRefs.current[0]?.focus();
  };

  // ── Step 3 handler ─────────────────────────────────────────────────────────
  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!step3Ready) return;

    // ─────────────────────────────────────────────────────────────────────────
    // TODO [SUPABASE] Paso 3: Actualizar la contraseña del usuario
    // En este punto el usuario ya está autenticado con el token de recuperación
    // (verificado en el Paso 2 o inyectado por el enlace mágico).
    //
    //   const { error } = await supabase.auth.updateUser({
    //     password,             // la nueva contraseña validada en el formulario
    //   });
    //   if (error) { /* mostrar error al usuario */ return; }
    //
    // Despues de éxito, Supabase invalida automáticamente el token de
    // recuperación y la sesión queda activa con las nuevas credenciales.
    // ─────────────────────────────────────────────────────────────────────────
    setStep(4);
  };

  // ── Layout wrapper ─────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-black relative overflow-hidden px-4">
      {/* Glow bg */}
      <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-amber-600 rounded-full blur-[128px]" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-zinc-800 rounded-full blur-[128px]" />
      </div>

      <div className="z-10 w-full max-w-sm">
        {/* Logo */}
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className="w-10 h-10 bg-amber-500 rounded-lg flex items-center justify-center text-black">
            <Scissors size={20} />
          </div>
          <span className="text-2xl font-heading font-bold tracking-widest text-white">
            NER<span className="text-amber-500">ON</span> POS
          </span>
        </div>

        {/* Step indicator (only steps 1-3) */}
        {step !== 4 && <StepIndicator current={step} />}

        {/* ── STEP 1: Email ───────────────────────────────────────────── */}
        {step === 1 && (
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 animate-in fade-in slide-in-from-bottom-4 duration-400">
            <h2 className="text-xl font-bold text-white mb-1">Recuperar contraseña</h2>
            <p className="text-zinc-400 text-sm mb-5">
              Ingresa el correo registrado y te enviaremos un código de verificación.
            </p>

            <form onSubmit={handleEmailSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-1.5">
                  Correo electrónico
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                  <input
                    type="email"
                    placeholder="tu@correo.com"
                    value={email}
                    onChange={(e) => { setEmail(e.target.value); setEmailError(''); }}
                    className={`w-full bg-zinc-800 border rounded-lg pl-10 pr-4 py-3 text-sm text-white placeholder-zinc-600 outline-none transition-colors ${
                      emailError
                        ? 'border-red-500 focus:border-red-400'
                        : 'border-zinc-700 focus:border-amber-500'
                    }`}
                  />
                </div>
                {emailError && (
                  <p className="text-red-400 text-xs mt-1.5">{emailError}</p>
                )}
              </div>

              <button
                type="submit"
                disabled={!isValidEmailFormat(email)}
                className="w-full py-3 rounded-lg font-bold tracking-widest text-sm transition-all duration-200 disabled:opacity-30 disabled:cursor-not-allowed bg-amber-500 hover:bg-amber-400 text-black"
              >
                Enviar código
              </button>
            </form>
          </div>
        )}

        {/* ── STEP 2: OTP ─────────────────────────────────────────────── */}
        {step === 2 && (
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 animate-in fade-in slide-in-from-bottom-4 duration-400">
            <h2 className="text-xl font-bold text-white mb-1">Verificación</h2>
            <p className="text-zinc-400 text-sm mb-1">
              Ingresa el código de 6 dígitos enviado a
            </p>
            <p className="text-amber-400 text-sm font-semibold mb-5 truncate">{email}</p>

            <form onSubmit={handleOtpSubmit} className="space-y-5">
              <div className="flex gap-2 justify-between" onPaste={handleOtpPaste}>
                {otp.map((digit, i) => (
                  <input
                    key={i}
                    ref={(el) => { otpRefs.current[i] = el; }}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleOtpChange(i, e.target.value)}
                    onKeyDown={(e) => handleOtpKeyDown(i, e)}
                    className={`w-11 h-12 text-center text-xl font-bold rounded-lg border bg-zinc-800 text-white outline-none transition-colors ${
                      otpError
                        ? 'border-red-500'
                        : digit
                        ? 'border-amber-500'
                        : 'border-zinc-700 focus:border-amber-500'
                    }`}
                  />
                ))}
              </div>

              {otpError && (
                <p className="text-red-400 text-xs -mt-2">{otpError}</p>
              )}

              <p className="text-zinc-500 text-xs">
                Revisa tu carpeta de spam si no lo ves en unos minutos.
              </p>

              <button
                type="submit"
                disabled={otp.join('').length < 6}
                className="w-full py-3 rounded-lg font-bold tracking-widest text-sm transition-all duration-200 disabled:opacity-30 disabled:cursor-not-allowed bg-amber-500 hover:bg-amber-400 text-black"
              >
                Verificar código
              </button>
            </form>

            <div className="mt-4 text-center">
              {resendCooldown > 0 ? (
                <p className="text-zinc-600 text-xs">
                  Reenviar en <span className="text-zinc-400 font-bold">{resendCooldown}s</span>
                </p>
              ) : (
                <button
                  onClick={handleResend}
                  className="flex items-center gap-1.5 text-xs text-amber-500 hover:text-amber-400 transition-colors mx-auto"
                >
                  <RefreshCw size={12} />
                  Reenviar código
                </button>
              )}
            </div>
          </div>
        )}

        {/* ── STEP 3: New password ─────────────────────────────────────── */}
        {step === 3 && (
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 animate-in fade-in slide-in-from-bottom-4 duration-400">
            <h2 className="text-xl font-bold text-white mb-1">Nueva contraseña</h2>
            <p className="text-zinc-400 text-sm mb-5">
              Crea una contraseña segura para tu cuenta.
            </p>

            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              {/* Password field */}
              <div>
                <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-1.5">
                  Contraseña
                </label>
                <div className="relative">
                  <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                  <input
                    type={showPwd ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-zinc-800 border border-zinc-700 focus:border-amber-500 rounded-lg pl-10 pr-10 py-3 text-sm text-white placeholder-zinc-600 outline-none transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPwd((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors"
                  >
                    {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* Strength bar */}
              {password.length > 0 && (
                <div>
                  <div className="flex gap-1 mb-1">
                    {[1, 2, 3, 4].map((i) => (
                      <div
                        key={i}
                        className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
                          i <= level ? strengthColor : 'bg-zinc-700'
                        }`}
                      />
                    ))}
                  </div>
                  <p className={`text-xs font-semibold ${
                    level <= 1 ? 'text-red-400' :
                    level === 2 ? 'text-orange-400' :
                    level === 3 ? 'text-yellow-400' : 'text-green-400'
                  }`}>
                    {strengthText}
                  </p>
                </div>
              )}

              {/* Rules */}
              <div className="grid grid-cols-2 gap-1.5">
                {[
                  { key: 'length', label: 'Mínimo 8 caracteres' },
                  { key: 'uppercase', label: 'Una mayúscula' },
                  { key: 'number', label: 'Un número' },
                  { key: 'special', label: 'Un carácter especial' },
                ].map(({ key, label }) => (
                  <div key={key} className="flex items-center gap-1.5">
                    <div className={`w-3.5 h-3.5 rounded-full flex items-center justify-center transition-colors ${
                      rules[key as keyof PasswordRules] ? 'bg-green-500' : 'bg-zinc-700'
                    }`}>
                      {rules[key as keyof PasswordRules] && (
                        <CheckCircle size={10} className="text-black" />
                      )}
                    </div>
                    <span className={`text-xs transition-colors ${
                      rules[key as keyof PasswordRules] ? 'text-green-400' : 'text-zinc-500'
                    }`}>
                      {label}
                    </span>
                  </div>
                ))}
              </div>

              {/* Confirm field */}
              <div>
                <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-1.5">
                  Confirmar contraseña
                </label>
                <div className="relative">
                  <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                  <input
                    type={showConfirm ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    className={`w-full bg-zinc-800 border rounded-lg pl-10 pr-10 py-3 text-sm text-white placeholder-zinc-600 outline-none transition-colors ${
                      confirm.length > 0
                        ? passwordsMatch
                          ? 'border-green-500'
                          : 'border-red-500'
                        : 'border-zinc-700 focus:border-amber-500'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors"
                  >
                    {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {confirm.length > 0 && !passwordsMatch && (
                  <p className="text-red-400 text-xs mt-1">Las contraseñas no coinciden.</p>
                )}
              </div>

              <button
                type="submit"
                disabled={!step3Ready}
                className="w-full py-3 rounded-lg font-bold tracking-widest text-sm transition-all duration-200 disabled:opacity-30 disabled:cursor-not-allowed bg-amber-500 hover:bg-amber-400 text-black"
              >
                Guardar contraseña
              </button>
            </form>
          </div>
        )}

        {/* ── STEP 4: Success ──────────────────────────────────────────── */}
        {step === 4 && (
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 text-center animate-in fade-in zoom-in-95 duration-400">
            <div className="w-16 h-16 rounded-full bg-green-500/10 border border-green-500/30 flex items-center justify-center mx-auto mb-4">
              <ShieldCheck className="text-green-400 w-8 h-8" />
            </div>
            <h2 className="text-xl font-bold text-white mb-2">¡Contraseña actualizada!</h2>
            <p className="text-zinc-400 text-sm mb-6">
              Tu contraseña ha sido restablecida correctamente. Ya puedes iniciar sesión con tus nuevas credenciales.
            </p>
            <button
              onClick={onBack}
              className="w-full py-3 rounded-lg font-bold tracking-widest text-sm bg-amber-500 hover:bg-amber-400 text-black transition-colors"
            >
              Ir al inicio de sesión
            </button>
          </div>
        )}

        {/* Back link (not on success) */}
        {step !== 4 && (
          <button
            onClick={step === 1 ? onBack : () => setStep((s) => (s - 1) as 1 | 2 | 3)}
            className="flex items-center gap-2 mx-auto mt-6 text-zinc-500 hover:text-amber-500 text-sm font-semibold transition-colors"
          >
            <ArrowLeft size={15} />
            {step === 1 ? 'Volver al inicio de sesión' : 'Paso anterior'}
          </button>
        )}
      </div>
    </div>
  );
};

export default ForgotPassword;
