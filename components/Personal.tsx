import React, { useState, useEffect } from 'react';
import {
  ChevronLeft, Plus, Edit2, Mail, Phone, Calendar,
  UserCheck, UserX, Users, CheckCircle, XCircle, Scissors,
} from 'lucide-react';
import Button from './Button';
import Modal from './Modal';
import Input from './Input';

interface PersonalProps {
  onBack: () => void;
}

interface Barbero {
  id: string;
  nombre: string;
  correo: string;
  telefono: string;
  fechaNacimiento: string;
  activo: boolean;
}

// =============================================================================
// TODO [SUPABASE] Capa de datos — reemplazar localStorage por Supabase
//
// Crear la tabla en Supabase (SQL):
//   create table public.staff (
//     id          uuid primary key default gen_random_uuid(),
//     user_id     uuid references auth.users(id) on delete cascade,
//     nombre      text not null,
//     correo      text,
//     telefono    text,
//     fecha_nacimiento date,
//     activo      boolean not null default true,
//     created_at  timestamptz default now()
//   );
//   alter table public.staff enable row level security;
//   create policy "owner" on public.staff
//     using (auth.uid() = user_id)
//     with check (auth.uid() = user_id);
//
// Importar en este archivo:
//   import { supabase, isDemoMode } from '../lib/supabase';
// =============================================================================

const PERSONAL_KEY = 'neron_personal';

// TODO [SUPABASE] Eliminar getPersonalFromStorage y savePersonalToStorage
// cuando se use Supabase; reemplazar por las funciones de abajo.
const getPersonalFromStorage = (): Barbero[] => {
  try {
    const data = localStorage.getItem(PERSONAL_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
};

const savePersonalToStorage = (personal: Barbero[]) => {
  try {
    localStorage.setItem(PERSONAL_KEY, JSON.stringify(personal));
  } catch (e) {
    console.error('Error guardando personal:', e);
  }
};

const generateId = () => `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

const getInitials = (nombre: string) =>
  nombre
    .trim()
    .split(' ')
    .slice(0, 2)
    .map((n) => n[0]?.toUpperCase() ?? '')
    .join('');

const EMPTY_FORM: Omit<Barbero, 'id' | 'activo'> = {
  nombre: '',
  correo: '',
  telefono: '',
  fechaNacimiento: '',
};

type FilterTab = 'todos' | 'activos' | 'inactivos';

const Personal: React.FC<PersonalProps> = ({ onBack }) => {
  const [personal, setPersonal] = useState<Barbero[]>([]);
  const [filter, setFilter] = useState<FilterTab>('todos');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  useEffect(() => {
    // -------------------------------------------------------------------------
    // TODO [SUPABASE] Cargar lista de barberos desde Supabase:
    //
    //   if (!isDemoMode && supabase) {
    //     supabase
    //       .from('staff')
    //       .select('*')
    //       .order('nombre', { ascending: true })
    //       .then(({ data, error }) => {
    //         if (!error && data) setPersonal(data as Barbero[]);
    //       });
    //   } else {
    //     setPersonal(getPersonalFromStorage());
    //   }
    // -------------------------------------------------------------------------
    setPersonal(getPersonalFromStorage());
  }, []);

  // ── Derived counts ──────────────────────────────────────────────
  const totalActivos = personal.filter((b) => b.activo).length;
  const totalInactivos = personal.filter((b) => !b.activo).length;

  const filtered = personal.filter((b) => {
    if (filter === 'activos') return b.activo;
    if (filter === 'inactivos') return !b.activo;
    return true;
  });

  // ── Handlers ────────────────────────────────────────────────────
  const openNewModal = () => {
    setEditingId(null);
    setForm({ ...EMPTY_FORM });
    setFormError('');
    setModalOpen(true);
  };

  const openEditModal = (barber: Barbero) => {
    setEditingId(barber.id);
    setForm({
      nombre: barber.nombre,
      correo: barber.correo,
      telefono: barber.telefono,
      fechaNacimiento: barber.fechaNacimiento,
    });
    setFormError('');
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.nombre.trim()) {
      setFormError('El nombre completo es obligatorio.');
      return;
    }
    setSaving(true);

    // -------------------------------------------------------------------------
    // TODO [SUPABASE] Insertar o actualizar en la tabla `staff`:
    //
    //   if (!isDemoMode && supabase) {
    //     const { data: { user } } = await supabase.auth.getUser();
    //     if (editingId) {
    //       // UPDATE
    //       await supabase.from('staff').update({
    //         nombre: form.nombre, correo: form.correo,
    //         telefono: form.telefono,
    //         fecha_nacimiento: form.fechaNacimiento || null,
    //       }).eq('id', editingId);
    //     } else {
    //       // INSERT
    //       await supabase.from('staff').insert({
    //         user_id: user!.id,
    //         nombre: form.nombre, correo: form.correo,
    //         telefono: form.telefono,
    //         fecha_nacimiento: form.fechaNacimiento || null,
    //         activo: true,
    //       });
    //     }
    //     // Recargar lista desde DB en lugar de actualizar estado local
    //     return;
    //   }
    // -------------------------------------------------------------------------
    let updated: Barbero[];
    if (editingId) {
      updated = personal.map((b) =>
        b.id === editingId ? { ...b, ...form } : b
      );
    } else {
      const newBarber: Barbero = {
        id: generateId(),
        activo: true,
        ...form,
      };
      updated = [...personal, newBarber];
    }

    savePersonalToStorage(updated);
    setPersonal(updated);
    setSaving(false);
    setModalOpen(false);
  };

  const toggleStatus = async (id: string) => {
    const target = personal.find((b) => b.id === id);
    if (!target) return;

    // -------------------------------------------------------------------------
    // TODO [SUPABASE] Actualizar campo `activo` en la tabla `staff`:
    //
    //   if (!isDemoMode && supabase) {
    //     await supabase
    //       .from('staff')
    //       .update({ activo: !target.activo })
    //       .eq('id', id);
    //     // Actualizar estado local optimistamente o recargar desde DB
    //   }
    // -------------------------------------------------------------------------
    const updated = personal.map((b) =>
      b.id === id ? { ...b, activo: !b.activo } : b
    );
    savePersonalToStorage(updated);
    setPersonal(updated);
  };

  // ── Render ───────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col p-6 max-w-7xl mx-auto w-full">
      {/* ── Header ── */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="p-2 hover:bg-zinc-800 rounded-full text-zinc-400 hover:text-white transition-colors"
          >
            <ChevronLeft size={22} />
          </button>
          <div>
            <h2 className="text-3xl font-heading font-bold text-white uppercase tracking-wide">
              Gestión de Personal
            </h2>
            <p className="text-zinc-500 text-sm mt-0.5">
              Administra a los barberos del equipo
            </p>
          </div>
        </div>
        <Button onClick={openNewModal} className="gap-2">
          <Plus size={18} />
          Nuevo Barbero
        </Button>
      </div>

      {/* ── Stats ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {/* Total */}
        <div className="bg-zinc-900 border border-zinc-800 p-5 rounded-xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-500">
              <Scissors size={20} />
            </div>
            <div>
              <p className="text-zinc-500 text-xs uppercase font-bold tracking-wider">
                Total barberos
              </p>
              <p className="text-3xl font-heading font-bold text-white leading-none mt-0.5">
                {personal.length}
              </p>
            </div>
          </div>
        </div>

        {/* Activos */}
        <div className="bg-zinc-900 border border-zinc-800 p-5 rounded-xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center text-green-500">
              <UserCheck size={20} />
            </div>
            <div>
              <p className="text-zinc-500 text-xs uppercase font-bold tracking-wider">
                Activos
              </p>
              <p className="text-3xl font-heading font-bold text-green-400 leading-none mt-0.5">
                {totalActivos}
              </p>
            </div>
          </div>
        </div>

        {/* Inactivos */}
        <div className="bg-zinc-900 border border-zinc-800 p-5 rounded-xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center text-red-500">
              <UserX size={20} />
            </div>
            <div>
              <p className="text-zinc-500 text-xs uppercase font-bold tracking-wider">
                Inactivos
              </p>
              <p className="text-3xl font-heading font-bold text-red-400 leading-none mt-0.5">
                {totalInactivos}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Filter tabs ── */}
      <div className="flex items-center gap-2 mb-6">
        {(['todos', 'activos', 'inactivos'] as FilterTab[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setFilter(tab)}
            className={`px-4 py-2 rounded-lg text-sm font-semibold capitalize transition-all ${
              filter === tab
                ? 'bg-amber-500 text-black'
                : 'bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-600'
            }`}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {/* ── Grid ── */}
      {filtered.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-3 text-zinc-600 py-24">
          <Users size={48} className="opacity-30" />
          <p className="text-sm uppercase tracking-widest font-bold">
            No hay barberos en esta categoría
          </p>
          {filter === 'todos' && (
            <button
              onClick={openNewModal}
              className="mt-2 text-amber-500 hover:text-amber-400 text-xs font-semibold flex items-center gap-1 transition-colors"
            >
              <Plus size={14} /> Agregar el primero
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((barber) => (
            <div
              key={barber.id}
              className={`bg-zinc-900 border rounded-2xl p-5 flex flex-col gap-4 transition-all duration-200 ${
                barber.activo
                  ? 'border-zinc-800 hover:border-zinc-700'
                  : 'border-zinc-800/50 opacity-60 hover:opacity-80'
              }`}
            >
              {/* Avatar + name + badge */}
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center shrink-0">
                  <span className="text-amber-500 font-heading font-bold text-lg leading-none">
                    {getInitials(barber.nombre)}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white font-semibold truncate">
                    {barber.nombre}
                  </p>
                  <span
                    className={`inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider rounded-full px-2 py-0.5 mt-0.5 ${
                      barber.activo
                        ? 'bg-green-500/10 text-green-400'
                        : 'bg-red-500/10 text-red-400'
                    }`}
                  >
                    {barber.activo ? (
                      <CheckCircle size={10} />
                    ) : (
                      <XCircle size={10} />
                    )}
                    {barber.activo ? 'Activo' : 'Inactivo'}
                  </span>
                </div>
              </div>

              {/* Contact info */}
              <div className="space-y-1.5">
                {barber.correo && (
                  <div className="flex items-center gap-2 text-zinc-400 text-xs">
                    <Mail size={13} className="shrink-0 text-zinc-500" />
                    <span className="truncate">{barber.correo}</span>
                  </div>
                )}
                {barber.telefono && (
                  <div className="flex items-center gap-2 text-zinc-400 text-xs">
                    <Phone size={13} className="shrink-0 text-zinc-500" />
                    <span>{barber.telefono}</span>
                  </div>
                )}
                {barber.fechaNacimiento && (
                  <div className="flex items-center gap-2 text-zinc-400 text-xs">
                    <Calendar size={13} className="shrink-0 text-zinc-500" />
                    <span>
                      {new Date(barber.fechaNacimiento + 'T00:00:00').toLocaleDateString(
                        'es-MX',
                        { day: '2-digit', month: 'long', year: 'numeric' }
                      )}
                    </span>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-1 border-t border-zinc-800">
                <button
                  onClick={() => openEditModal(barber)}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold text-zinc-400 hover:text-amber-500 hover:bg-amber-500/10 transition-colors border border-transparent hover:border-amber-500/20"
                >
                  <Edit2 size={13} />
                  Editar
                </button>
                <button
                  onClick={() => toggleStatus(barber.id)}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-colors border border-transparent ${
                    barber.activo
                      ? 'text-zinc-400 hover:text-red-400 hover:bg-red-500/10 hover:border-red-500/20'
                      : 'text-zinc-400 hover:text-green-400 hover:bg-green-500/10 hover:border-green-500/20'
                  }`}
                >
                  {barber.activo ? (
                    <>
                      <UserX size={13} />
                      Desactivar
                    </>
                  ) : (
                    <>
                      <UserCheck size={13} />
                      Activar
                    </>
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Modal crear / editar ── */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingId ? 'Editar Barbero' : 'Nuevo Barbero'}
      >
        <div className="space-y-4">
          {formError && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-2 text-red-400 text-sm">
              {formError}
            </div>
          )}

          <Input
            label="Nombre completo *"
            value={form.nombre}
            placeholder="Ej. Carlos Martínez"
            onChange={(e) => setForm({ ...form, nombre: e.target.value })}
          />

          <Input
            label="Correo electrónico"
            type="email"
            value={form.correo}
            placeholder="correo@ejemplo.com"
            onChange={(e) => setForm({ ...form, correo: e.target.value })}
          />

          <Input
            label="Teléfono"
            type="tel"
            value={form.telefono}
            placeholder="+52 555 123 4567"
            onChange={(e) => setForm({ ...form, telefono: e.target.value })}
          />

          <Input
            label="Fecha de nacimiento"
            type="date"
            value={form.fechaNacimiento}
            onChange={(e) =>
              setForm({ ...form, fechaNacimiento: e.target.value })
            }
          />

          <div className="pt-2">
            <Button onClick={handleSave} fullWidth disabled={saving}>
              {saving
                ? 'Guardando...'
                : editingId
                ? 'Actualizar Barbero'
                : 'Guardar Barbero'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default Personal;
