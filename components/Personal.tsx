import React, { useState, useEffect } from 'react';
import { ChevronLeft, Plus, Edit2, Trash2, Users, Search, Mail, Calendar, Key, User, Power, AlertTriangle, X, Copy, Check } from 'lucide-react';
import Button from './Button';
import Modal from './Modal';
import Input from './Input';
import { getBarberos, createBarbero, updateBarberoCompleto, deleteBarbero, toggleBarberoStatus, Barbero } from '../lib/database';

interface PersonalProps {
  onBack: () => void;
}

const getAvatarColor = (name: string) => {
  const colors = [
    'bg-red-500/80 text-white', 
    'bg-blue-500/80 text-white', 
    'bg-green-500/80 text-white', 
    'bg-purple-500/80 text-white', 
    'bg-pink-500/80 text-white', 
    'bg-indigo-500/80 text-white',
    'bg-amber-500/80 text-white',
    'bg-teal-500/80 text-white'
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
};

const getInitials = (name: string) => {
  if (!name) return '??';
  const parts = name.trim().split(' ');
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return name.substring(0, 2).toUpperCase();
};

const Personal: React.FC<PersonalProps> = ({ onBack }) => {
  const [barberos, setBarberos] = useState<Barbero[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [saving, setSaving] = useState(false);

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  // Modal de éxito con credenciales
  const [successInfo, setSuccessInfo] = useState<{
    nombre: string;
    email: string;
    password: string;
    emailConfirmed: boolean;
  } | null>(null);

  // localStorage key para barberos pendientes de confirmación
  const PENDING_CONFIRM_KEY = 'velo_pending_email_confirm';
  const [pendingConfirmIds, setPendingConfirmIds] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem(PENDING_CONFIRM_KEY) || '[]'); } catch { return []; }
  });

  const [copied, setCopied] = useState(false);
  
  const [editingBarbero, setEditingBarbero] = useState<Barbero | null>(null);
  const [editPassword, setEditPassword] = useState('');

  const [newBarbero, setNewBarbero] = useState({
    nombre: '',
    email: '',
    password: '',
    numero_silla: '',
    fecha_nacimiento: '',
    fecha_ingreso: '',
  });

  useEffect(() => { loadBarberos(); }, []);

  const loadBarberos = async () => {
    try {
      setLoading(true);
      const data = await getBarberos();
      setBarberos(data);
    } catch (error) {
      console.error('Error loading barberos:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredBarberos = barberos.filter(b =>
    b.nombre.toLowerCase().includes(search.toLowerCase()) || 
    (b.email && b.email.toLowerCase().includes(search.toLowerCase()))
  );

  const handleCreate = async () => {
    if (!newBarbero.nombre || !newBarbero.email || !newBarbero.password) {
      alert('Nombre, email y contraseña son obligatorios');
      return;
    }
    if (newBarbero.password.length < 6) {
      alert('La contraseña debe tener al menos 6 caracteres');
      return;
    }

    try {
      setSaving(true);
      const { barbero, emailConfirmed } = await createBarbero({
        nombre: newBarbero.nombre,
        email: newBarbero.email,
        password: newBarbero.password,
        numero_silla: newBarbero.numero_silla ? parseInt(newBarbero.numero_silla) : undefined,
        fecha_nacimiento: newBarbero.fecha_nacimiento || undefined,
        fecha_ingreso: newBarbero.fecha_ingreso || undefined,
      });

      // Si email no confirmado, guardar user_id en localStorage
      if (!emailConfirmed && barbero.user_id) {
        const updated = [...pendingConfirmIds, barbero.user_id];
        localStorage.setItem(PENDING_CONFIRM_KEY, JSON.stringify(updated));
        setPendingConfirmIds(updated);
      }

      await loadBarberos();
      setIsAddModalOpen(false);
      setNewBarbero({ nombre: '', email: '', password: '', numero_silla: '', fecha_nacimiento: '', fecha_ingreso: '' });

      // Mostrar modal de éxito con credenciales
      setSuccessInfo({
        nombre: newBarbero.nombre,
        email: newBarbero.email,
        password: newBarbero.password,
        emailConfirmed,
      });

    } catch (error: any) {
      console.error('Error creating barbero:', error);
      alert(`Error al crear barbero: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (barbero: Barbero) => {
    setEditingBarbero({ ...barbero });
    setEditPassword('');
    setIsEditModalOpen(true);
  };

  const handleUpdate = async () => {
    if (!editingBarbero?.nombre) {
      alert('El nombre es obligatorio');
      return;
    }
    if (editPassword && editPassword.length < 6) {
      alert('La nueva contraseña debe tener al menos 6 caracteres');
      return;
    }

    try {
      setSaving(true);
      await updateBarberoCompleto(editingBarbero.id, {
        nombre: editingBarbero.nombre,
        numero_silla: editingBarbero.numero_silla,
        fecha_nacimiento: editingBarbero.fecha_nacimiento,
        fecha_ingreso: editingBarbero.fecha_ingreso,
        activo: editingBarbero.activo !== false, // force boolean
      }, editPassword || undefined);
      
      await loadBarberos();
      setIsEditModalOpen(false);
      setEditingBarbero(null);
      setEditPassword('');
    } catch (error: any) {
      console.error('Error updating barbero:', error);
      alert(`Error al actualizar: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (barberoId: string, barberoNombre: string) => {
    if (!confirm(`¿Eliminar definitivamente a ${barberoNombre}? Esta acción es irreversible.`)) return;
    try {
      setSaving(true);
      await deleteBarbero(barberoId);
      await loadBarberos();
      setIsEditModalOpen(false);
    } catch (error: any) {
      console.error('Error deleting barbero:', error);
      alert(`Error al eliminar: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="h-screen bg-zinc-950 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-zinc-400 animate-pulse">Cargando personal...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-zinc-950 flex flex-col p-6 max-w-7xl mx-auto w-full">

      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 hover:bg-zinc-800 rounded-full text-zinc-400 hover:text-white transition-colors">
            <ChevronLeft size={24} />
          </button>
          <div>
            <h2 className="text-3xl font-heading font-bold text-white uppercase tracking-wide">Personal</h2>
            <p className="text-zinc-500">Gestión de barberos y accesos</p>
          </div>
        </div>
        <Button onClick={() => setIsAddModalOpen(true)} className="gap-2">
          <Plus size={18} /> Nuevo Barbero
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-500">
            <Users size={24} />
          </div>
          <div>
            <p className="text-zinc-500 text-xs uppercase font-bold tracking-wider">Total Barberos</p>
            <p className="text-3xl font-heading font-bold text-white">{barberos.length}</p>
          </div>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500">
            <Power size={24} />
          </div>
          <div>
            <p className="text-zinc-500 text-xs uppercase font-bold tracking-wider">Barberos Activos</p>
            <p className="text-3xl font-heading font-bold text-white">
              {barberos.filter(b => b.activo !== false).length}
            </p>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="mb-6 relative max-w-md">
        <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-zinc-500" size={18} />
        <input
          type="text"
          placeholder="Buscar barbero por nombre o email..."
          className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-12 pr-4 py-3 text-sm text-white focus:border-amber-500 focus:outline-none transition-colors"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Grid de barberos */}
      <div className="flex-1 overflow-auto rounded-xl">
        {filteredBarberos.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-zinc-600 bg-zinc-900/50 rounded-xl border border-zinc-800 border-dashed">
            <Users size={48} className="mb-4 opacity-20" />
            <p className="uppercase tracking-widest text-sm font-bold">No hay barberos</p>
            <p className="text-xs mt-2 text-zinc-500">Intenta con otra búsqueda o crea uno nuevo</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredBarberos.map(barbero => (
              <div
                key={barbero.id}
                className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 hover:border-zinc-700 transition-all flex flex-col"
              >
                {/* Cabecera Card */}
                <div className="flex items-start justify-between mb-4">
                  <div className={`w-14 h-14 rounded-full flex items-center justify-center text-lg font-bold font-heading shadow-lg ${getAvatarColor(barbero.nombre)}`}>
                    {getInitials(barbero.nombre)}
                  </div>
                  {/* Badge activo/inactivo + pendiente confirmación */}
                <div className="flex flex-col items-end gap-1">
                  {barbero.activo !== false ? (
                    <span className="bg-emerald-500/10 text-emerald-400 text-[10px] uppercase font-bold px-2 py-1 rounded border border-emerald-500/20 tracking-wider">
                      Activo
                    </span>
                  ) : (
                    <span className="bg-red-500/10 text-red-400 text-[10px] uppercase font-bold px-2 py-1 rounded border border-red-500/20 tracking-wider">
                      Inactivo
                    </span>
                  )}
                  {barbero.user_id && pendingConfirmIds.includes(barbero.user_id) && (
                    <span className="bg-amber-500/10 text-amber-400 text-[10px] uppercase font-bold px-2 py-1 rounded border border-amber-500/20 tracking-wider flex items-center gap-1">
                      <AlertTriangle size={10} /> Pendiente confirmación
                    </span>
                  )}
                </div>
                </div>

                {/* Info Card */}
                <div className="mb-4 flex-1">
                  <h3 className="font-bold text-white text-lg leading-tight mb-1">{barbero.nombre}</h3>
                  <p className="text-amber-500 text-xs font-bold uppercase tracking-wider mb-3">Barbero</p>
                  
                  <div className="space-y-2 text-sm">
                    {barbero.email && (
                      <div className="flex items-center gap-2 text-zinc-400">
                        <Mail size={14} className="text-zinc-600 shrink-0" />
                        <span className="truncate" title={barbero.email}>{barbero.email}</span>
                      </div>
                    )}
                    {barbero.numero_silla && (
                      <div className="flex items-center gap-2 text-zinc-400">
                        <User size={14} className="text-zinc-600 shrink-0" />
                        <span>Silla #{barbero.numero_silla}</span>
                      </div>
                    )}
                    {barbero.fecha_ingreso && (
                      <div className="flex items-center gap-2 text-zinc-400">
                        <Calendar size={14} className="text-zinc-600 shrink-0" />
                        <span>Ingresó: {new Date(barbero.fecha_ingreso).toLocaleDateString('es-MX')}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Botón Card */}
                <button
                  onClick={() => handleEdit(barbero)}
                  className="w-full flex items-center justify-center gap-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg py-2.5 text-sm font-bold transition-colors mt-auto"
                >
                  <Edit2 size={16} /> Ver / Editar
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal Crear Barbero */}
      <Modal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} title="Nuevo Barbero">
        <div className="space-y-4">
          <Input
            label="Nombre Completo *"
            value={newBarbero.nombre}
            onChange={e => setNewBarbero({ ...newBarbero, nombre: e.target.value })}
            placeholder="Ej: Carlos Ramírez"
          />
          <Input
            label="Email (para iniciar sesión) *"
            type="email"
            value={newBarbero.email}
            onChange={e => setNewBarbero({ ...newBarbero, email: e.target.value })}
            placeholder="barbero@velopos.com"
          />
          <Input
            label="Contraseña inicial *"
            type="password"
            value={newBarbero.password}
            onChange={e => setNewBarbero({ ...newBarbero, password: e.target.value })}
            placeholder="Mínimo 6 caracteres"
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Número de Silla"
              type="number"
              value={newBarbero.numero_silla}
              onChange={e => setNewBarbero({ ...newBarbero, numero_silla: e.target.value })}
              placeholder="Ej: 1"
            />
            <Input
              label="Fecha de Nacimiento"
              type="date"
              value={newBarbero.fecha_nacimiento}
              onChange={e => setNewBarbero({ ...newBarbero, fecha_nacimiento: e.target.value })}
            />
          </div>
          <Input
            label="Fecha de Ingreso"
            type="date"
            value={newBarbero.fecha_ingreso}
            onChange={e => setNewBarbero({ ...newBarbero, fecha_ingreso: e.target.value })}
          />

          <div className="pt-4">
            <Button onClick={handleCreate} fullWidth disabled={saving}>
              {saving ? 'Creando...' : 'Crear Barbero'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal Editar Barbero */}
      <Modal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} title="Editar Barbero">
        {editingBarbero && (
          <div className="space-y-5">
            
            {/* Toggle Estado */}
            <div className="flex items-center justify-between p-4 bg-zinc-900 border border-zinc-800 rounded-xl">
              <div>
                <p className="text-white font-bold text-sm">Estado de la cuenta</p>
                <p className="text-zinc-500 text-xs">Si está inactivo, no podrá iniciar sesión.</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input 
                  type="checkbox" 
                  className="sr-only peer" 
                  checked={editingBarbero.activo !== false}
                  onChange={(e) => setEditingBarbero({...editingBarbero, activo: e.target.checked})}
                />
                <div className="w-11 h-6 bg-zinc-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
              </label>
            </div>

            <Input
              label="Nombre Completo *"
              value={editingBarbero.nombre}
              onChange={e => setEditingBarbero({ ...editingBarbero, nombre: e.target.value })}
            />

            <Input
              label="Email (Solo lectura)"
              type="email"
              value={editingBarbero.email || 'Sin email registrado'}
              readOnly
              className="opacity-60 cursor-not-allowed bg-zinc-900 border-zinc-800 text-zinc-400"
              onChange={() => {}}
            />

            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Número de Silla"
                type="number"
                value={editingBarbero.numero_silla || ''}
                onChange={e => setEditingBarbero({ ...editingBarbero, numero_silla: parseInt(e.target.value) || undefined })}
              />
              <Input
                label="Fecha de Nacimiento"
                type="date"
                value={editingBarbero.fecha_nacimiento || ''}
                onChange={e => setEditingBarbero({ ...editingBarbero, fecha_nacimiento: e.target.value || undefined })}
              />
            </div>

            <Input
               label="Fecha de Ingreso"
               type="date"
               value={editingBarbero.fecha_ingreso || ''}
               onChange={e => setEditingBarbero({ ...editingBarbero, fecha_ingreso: e.target.value || undefined })}
            />

            <div className="border-t border-zinc-800 pt-4 mt-2">
              <Input
                label="Nueva contraseña (opcional)"
                type="password"
                placeholder="Escribe para cambiar la contraseña"
                value={editPassword}
                onChange={e => setEditPassword(e.target.value)}
              />
            </div>

            <div className="pt-2 flex flex-col gap-3">
              <Button onClick={handleUpdate} fullWidth disabled={saving}>
                {saving ? 'Guardando...' : 'Guardar Cambios'}
              </Button>
              
              <button 
                onClick={() => handleDelete(editingBarbero.id, editingBarbero.nombre)}
                disabled={saving}
                className="w-full flex items-center justify-center gap-2 py-3 text-red-500 hover:bg-red-500/10 rounded-lg text-sm font-bold transition-colors"
              >
                <Trash2 size={18} /> Eliminar barbero definitivamente
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Modal de Éxito con Credenciales */}
      {successInfo && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-900 border border-zinc-700 rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <div className="flex justify-between items-center mb-5">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <span className="text-emerald-400">✓</span> Barbero creado exitosamente
              </h3>
              <button onClick={() => { setSuccessInfo(null); setCopied(false); }} className="text-zinc-500 hover:text-white transition-colors">
                <X size={20} />
              </button>
            </div>

            {/* Datos del barbero */}
            <div className="space-y-3 mb-4">
              <div className="bg-zinc-800 rounded-lg p-3">
                <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Nombre</p>
                <p className="text-white font-bold">{successInfo.nombre}</p>
              </div>
              <div className="bg-zinc-800 rounded-lg p-3">
                <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Email</p>
                <p className="text-white font-mono">{successInfo.email}</p>
              </div>
              <div className="bg-zinc-800 rounded-lg p-3">
                <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Contraseña temporal</p>
                <div className="flex items-center justify-between">
                  <p className="text-amber-400 font-mono font-bold">{successInfo.password}</p>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(
                        `Email: ${successInfo.email}\nContraseña: ${successInfo.password}`
                      );
                      setCopied(true);
                      setTimeout(() => setCopied(false), 2000);
                    }}
                    className="flex items-center gap-1 text-xs text-zinc-400 hover:text-white transition-colors px-2 py-1 rounded hover:bg-zinc-700"
                  >
                    {copied ? <><Check size={12} className="text-emerald-400" /> Copiado</> : <><Copy size={12} /> Copiar</>}
                  </button>
                </div>
              </div>
            </div>

            {/* Aviso confirmación */}
            {!successInfo.emailConfirmed && (
              <div className="flex items-start gap-2 p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg mb-4">
                <AlertTriangle size={16} className="text-amber-400 mt-0.5 shrink-0" />
                <div>
                  <p className="text-amber-400 text-sm font-bold">⚠ Pendiente de confirmación de correo</p>
                  <p className="text-amber-400/70 text-xs mt-0.5">El barbero debe confirmar su correo antes de iniciar sesión.</p>
                </div>
              </div>
            )}

            <p className="text-zinc-500 text-xs text-center mb-4">Comparte estos datos con el barbero de forma segura.</p>

            <button
              onClick={() => { setSuccessInfo(null); setCopied(false); }}
              className="w-full py-2.5 bg-amber-500 hover:bg-amber-600 text-zinc-900 font-bold rounded-lg transition-colors text-sm"
            >
              Entendido
            </button>
          </div>
        </div>
      )}

    </div>
  );
};

export default Personal;
