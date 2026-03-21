import React, { useState, useEffect } from 'react';
import { ChevronLeft, Calendar as CalendarIcon, Clock, User, Scissors, Plus, X, Trash2, Edit2, XCircle } from 'lucide-react';
import Button from './Button';
import { Appointment, CatalogItem, ItemType } from '../types';
import { getAppointments, createAppointment, deleteAppointment, updateAppointment, getCatalogItems } from '../lib/database';

// ─── Validation ───────────────────────────────────────────────────────────────
const validatePhone = (phone?: string): string | null => {
    if (!phone || phone.trim() === '') return null;
    if (!/^\d{10}$/.test(phone.trim())) return 'El teléfono debe tener exactamente 10 dígitos numéricos.';
    return null;
};

const validateEmail = (email?: string): string | null => {
    if (!email || email.trim() === '') return null;
    if (!email.includes('@')) return 'El email debe contener @.';
    return null;
};

// ─── Appointment Form Defaults ────────────────────────────────────────────────
const defaultForm = {
    clientName: '',
    phone: '',
    time: '12:00',
    barber: '',
    service: '',
};

const Appointments: React.FC = () => {
    const [appointments, setAppointments] = useState<Appointment[]>([]);
    const [selectedDate, setSelectedDate] = useState<Date>(new Date());
    const [showNewModal, setShowNewModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [editingApt, setEditingApt] = useState<Appointment | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [services, setServices] = useState<CatalogItem[]>([]);

    // New appointment form
    const [form, setForm] = useState(defaultForm);

    useEffect(() => {
        loadAll();
    }, []);

    const loadAll = async () => {
        try {
            const [apts, catalog] = await Promise.all([
                getAppointments(),
                getCatalogItems(),
            ]);
            setAppointments(apts);
            const svcList = catalog.filter(i => i.type === ItemType.SERVICE);
            setServices(svcList);
            // Set default service to first available
            if (svcList.length > 0) {
                setForm(prev => ({ ...prev, service: prev.service || svcList[0].name }));
            }
        } catch (error) {
            console.error('Error loading appointments/services:', error);
        } finally {
            setLoading(false);
        }
    };

    const loadAppointments = async () => {
        try {
            const data = await getAppointments();
            setAppointments(data);
        } catch (error) {
            console.error('Error loading appointments:', error);
        }
    };

    // ─── Create ───────────────────────────────────────────────────────────────
    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.clientName.trim()) { alert('El nombre del cliente es obligatorio'); return; }
        const phoneErr = validatePhone(form.phone);
        if (phoneErr) { alert(phoneErr); return; }

        setSaving(true);
        try {
            const dateStr = selectedDate.toISOString().split('T')[0];
            await createAppointment({
                clientName: form.clientName,
                date: dateStr,
                time: form.time,
                barber: form.barber,
                service: form.service,
                status: 'scheduled',
            });
            setShowNewModal(false);
            setForm({ ...defaultForm, service: services[0]?.name || '' });
            await loadAppointments();
        } catch (error) {
            console.error('Error creating appointment:', error);
            alert('Error al crear la cita');
        } finally {
            setSaving(false);
        }
    };

    // ─── Cancel (status → cancelled) ─────────────────────────────────────────
    const handleCancel = async (apt: Appointment) => {
        if (!confirm(`¿Cancelar la cita de ${apt.clientName}?`)) return;
        try {
            await updateAppointment(apt.id, { status: 'cancelled' });
            await loadAppointments();
        } catch (error) {
            console.error('Error cancelling appointment:', error);
            alert('Error al cancelar la cita');
        }
    };

    // ─── Delete ───────────────────────────────────────────────────────────────
    const handleDelete = async (id: string) => {
        if (!confirm('¿Eliminar esta cita permanentemente?')) return;
        try {
            await deleteAppointment(id);
            loadAppointments();
        } catch (error) {
            console.error('Error deleting appointment:', error);
        }
    };

    // ─── Edit ────────────────────────────────────────────────────────────────
    const handleOpenEdit = (apt: Appointment) => {
        setEditingApt({ ...apt });
        setShowEditModal(true);
    };

    const handleSaveEdit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingApt) return;
        setSaving(true);
        try {
            await updateAppointment(editingApt.id, {
                clientName: editingApt.clientName,
                time: editingApt.time,
                barber: editingApt.barber,
                service: editingApt.service,
                status: editingApt.status,
                notes: editingApt.notes,
                date: editingApt.date,
            });
            setShowEditModal(false);
            setEditingApt(null);
            await loadAppointments();
        } catch (error) {
            console.error('Error updating appointment:', error);
            alert('Error al actualizar la cita');
        } finally {
            setSaving(false);
        }
    };

    // ─── Calendar Logic ───────────────────────────────────────────────────────
    const getDaysInMonth = (date: Date) => {
        const year = date.getFullYear();
        const month = date.getMonth();
        const days = new Date(year, month + 1, 0).getDate();
        return Array.from({ length: days }, (_, i) => i + 1);
    };

    const getFirstDayOfMonth = (date: Date) => {
        return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
    };

    const daysInMonth = getDaysInMonth(selectedDate);
    const firstDay = getFirstDayOfMonth(selectedDate);
    const monthName = selectedDate.toLocaleString('es-MX', { month: 'long', year: 'numeric' });

    const getAppointmentsForDay = (day: number) => {
        const dateStr = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), day).toISOString().split('T')[0];
        return appointments.filter(a => a.date === dateStr);
    };

    const selectedDateAppointments = getAppointmentsForDay(selectedDate.getDate());

    // ─── Status badge ─────────────────────────────────────────────────────────
    const statusBadge = (status: string) => {
        if (status === 'cancelled') return (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 font-bold uppercase">Cancelada</span>
        );
        if (status === 'completed') return (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-green-500/20 text-green-400 font-bold uppercase">Completada</span>
        );
        return (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 font-bold uppercase">Programada</span>
        );
    };

    // ─── Shared select class ──────────────────────────────────────────────────
    const selectClass = "w-full bg-zinc-950 border border-zinc-800 rounded-lg p-3 text-white focus:border-amber-500 focus:outline-none";
    const inputClass = "w-full bg-zinc-950 border border-zinc-800 rounded-lg p-3 text-white focus:border-amber-500 focus:outline-none";

    return (
        <div className="min-h-full bg-zinc-950 flex flex-col p-4 md:p-6 max-w-7xl mx-auto w-full">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h2 className="text-3xl font-heading font-bold text-white uppercase tracking-wider">Agenda</h2>
                    <p className="text-zinc-500">Gestión de citas y horarios</p>
                </div>
                <Button onClick={() => setShowNewModal(true)} className="gap-2 bg-amber-500 hover:bg-amber-600 text-black border-amber-600">
                    <Plus size={18} /> Nueva Cita
                </Button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
                {/* Calendar View */}
                <div className="lg:col-span-2 bg-zinc-900 border border-zinc-800 rounded-xl p-6 flex flex-col">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-xl font-bold text-white capitalize">{monthName}</h3>
                        <div className="flex gap-2">
                            <button
                                onClick={() => setSelectedDate(new Date(selectedDate.getFullYear(), selectedDate.getMonth() - 1, 1))}
                                className="p-2 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-white"
                            >
                                <ChevronLeft size={20} />
                            </button>
                            <button
                                onClick={() => setSelectedDate(new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 1))}
                                className="p-2 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-white"
                            >
                                <ChevronLeft size={20} className="rotate-180" />
                            </button>
                        </div>
                    </div>

                    <div className="grid grid-cols-7 gap-2 text-center mb-2">
                        {['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'].map(day => (
                            <div key={day} className="text-zinc-500 text-sm font-bold py-2">{day}</div>
                        ))}
                    </div>

                    <div className="grid grid-cols-7 gap-2 flex-1">
                        {Array.from({ length: firstDay }).map((_, i) => (
                            <div key={`empty-${i}`} className="bg-transparent" />
                        ))}
                        {daysInMonth.map(day => {
                            const dayAppointments = getAppointmentsForDay(day);
                            const isSelected = selectedDate.getDate() === day;
                            const isToday = new Date().getDate() === day && new Date().getMonth() === selectedDate.getMonth();

                            return (
                                <button
                                    key={day}
                                    onClick={() => setSelectedDate(new Date(selectedDate.getFullYear(), selectedDate.getMonth(), day))}
                                    className={`
                    relative p-2 rounded-lg border transition-all flex flex-col items-start justify-start h-24
                    ${isSelected
                                            ? 'bg-amber-500/10 border-amber-500 text-white'
                                            : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:border-zinc-700 hover:bg-zinc-900'}
                  `}
                                >
                                    <span className={`text-sm font-bold ${isToday ? 'text-amber-500' : ''}`}>{day}</span>
                                    <div className="mt-2 flex flex-col gap-1 w-full">
                                        {dayAppointments.slice(0, 3).map((apt, i) => (
                                            <div key={i} className={`text-[10px] px-1 rounded truncate w-full text-left ${apt.status === 'cancelled' ? 'bg-red-900/40 text-red-400 line-through' : 'bg-zinc-800'}`}>
                                                {apt.time} - {apt.clientName}
                                            </div>
                                        ))}
                                        {dayAppointments.length > 3 && (
                                            <div className="text-[10px] text-zinc-500">+{dayAppointments.length - 3} más</div>
                                        )}
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Day Details */}
                <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 flex flex-col min-h-[400px] lg:h-full lg:overflow-hidden">
                    <h3 className="text-xl font-bold text-white mb-1">
                        {selectedDate.toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' })}
                    </h3>
                    <p className="text-zinc-500 mb-6">{selectedDateAppointments.length} citas programadas</p>

                    <div className="flex-1 overflow-y-auto space-y-4 pr-2">
                        {selectedDateAppointments.length === 0 ? (
                            <div className="text-center py-12 text-zinc-600">
                                <CalendarIcon size={48} className="mx-auto mb-4 opacity-20" />
                                <p>No hay citas para este día</p>
                            </div>
                        ) : (
                            selectedDateAppointments
                                .sort((a, b) => a.time.localeCompare(b.time))
                                .map(apt => (
                                    <div
                                        key={apt.id}
                                        className={`bg-zinc-950 border p-4 rounded-lg transition-colors ${apt.status === 'cancelled' ? 'border-red-900/40 opacity-60' : 'border-zinc-800 group hover:border-zinc-700'}`}
                                    >
                                        <div className="flex justify-between items-start mb-2">
                                            <div className="flex items-center gap-2 text-amber-500 font-mono font-bold">
                                                <Clock size={16} />
                                                {apt.time}
                                            </div>
                                            <div className="flex items-center gap-1">
                                                {apt.status !== 'cancelled' && (
                                                    <>
                                                        <button
                                                            onClick={() => handleOpenEdit(apt)}
                                                            className="p-1.5 rounded-lg text-zinc-500 hover:text-amber-400 hover:bg-amber-500/10 transition-colors"
                                                            title="Editar cita"
                                                        >
                                                            <Edit2 size={14} />
                                                        </button>
                                                        <button
                                                            onClick={() => handleCancel(apt)}
                                                            className="p-1.5 rounded-lg text-zinc-500 hover:text-orange-400 hover:bg-orange-500/10 transition-colors"
                                                            title="Cancelar cita"
                                                        >
                                                            <XCircle size={14} />
                                                        </button>
                                                    </>
                                                )}
                                                <button
                                                    onClick={() => handleDelete(apt.id)}
                                                    className="p-1.5 rounded-lg text-zinc-600 hover:text-red-500 hover:bg-red-500/10 transition-colors"
                                                    title="Eliminar cita"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                        </div>
                                        <div className="flex items-center justify-between mb-1">
                                            <h4 className="text-white font-bold">{apt.clientName}</h4>
                                            {statusBadge(apt.status)}
                                        </div>
                                        <div className="flex items-center gap-2 text-sm text-zinc-400 mb-1">
                                            <Scissors size={14} />
                                            {apt.service}
                                        </div>
                                        {apt.barber && (
                                            <div className="flex items-center gap-2 text-xs text-zinc-500">
                                                <User size={12} />
                                                {apt.barber}
                                            </div>
                                        )}
                                    </div>
                                ))
                        )}
                    </div>
                </div>
            </div>

            {/* ── New Appointment Modal ── */}
            {showNewModal && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 w-full max-w-md shadow-2xl">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-bold text-white">Nueva Cita</h3>
                            <button onClick={() => setShowNewModal(false)} className="text-zinc-500 hover:text-white">
                                <X size={24} />
                            </button>
                        </div>

                        <form onSubmit={handleCreate} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-zinc-400 mb-1">Cliente *</label>
                                <input
                                    type="text"
                                    required
                                    value={form.clientName}
                                    onChange={(e) => setForm({ ...form, clientName: e.target.value })}
                                    className={inputClass}
                                    placeholder="Nombre del cliente"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-zinc-400 mb-1">Teléfono (10 dígitos)</label>
                                <input
                                    type="tel"
                                    value={form.phone}
                                    onChange={(e) => setForm({ ...form, phone: e.target.value.replace(/\D/g, '').slice(0, 10) })}
                                    className={inputClass}
                                    placeholder="5512345678"
                                    maxLength={10}
                                />
                                {form.phone.length > 0 && form.phone.length < 10 && (
                                    <p className="text-red-400 text-xs mt-1">{10 - form.phone.length} dígitos faltantes</p>
                                )}
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-zinc-400 mb-1">Fecha</label>
                                    <input
                                        type="date"
                                        required
                                        value={selectedDate.toISOString().split('T')[0]}
                                        onChange={(e) => setSelectedDate(new Date(e.target.value + 'T12:00:00'))}
                                        className={inputClass}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-zinc-400 mb-1">Hora</label>
                                    <input
                                        type="time"
                                        required
                                        value={form.time}
                                        onChange={(e) => setForm({ ...form, time: e.target.value })}
                                        className={inputClass}
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-zinc-400 mb-1">Servicio</label>
                                {services.length > 0 ? (
                                    <select
                                        value={form.service}
                                        onChange={(e) => setForm({ ...form, service: e.target.value })}
                                        className={selectClass}
                                    >
                                        {services.map(s => (
                                            <option key={s.id} value={s.name}>{s.name}</option>
                                        ))}
                                    </select>
                                ) : (
                                    <input
                                        type="text"
                                        value={form.service}
                                        onChange={(e) => setForm({ ...form, service: e.target.value })}
                                        className={inputClass}
                                        placeholder="Nombre del servicio"
                                    />
                                )}
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-zinc-400 mb-1">Barbero</label>
                                <input
                                    type="text"
                                    value={form.barber}
                                    onChange={(e) => setForm({ ...form, barber: e.target.value })}
                                    className={inputClass}
                                    placeholder="Nombre del barbero (opcional)"
                                />
                            </div>

                            <div className="pt-4 flex gap-3">
                                <Button type="button" onClick={() => setShowNewModal(false)} variant="secondary" className="flex-1" disabled={saving}>
                                    Cancelar
                                </Button>
                                <Button type="submit" className="flex-1 bg-amber-500 hover:bg-amber-600 text-black border-amber-600" disabled={saving}>
                                    {saving ? 'Guardando...' : 'Guardar Cita'}
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ── Edit Appointment Modal ── */}
            {showEditModal && editingApt && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 w-full max-w-md shadow-2xl">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-bold text-white">Editar Cita</h3>
                            <button onClick={() => { setShowEditModal(false); setEditingApt(null); }} className="text-zinc-500 hover:text-white">
                                <X size={24} />
                            </button>
                        </div>

                        <form onSubmit={handleSaveEdit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-zinc-400 mb-1">Cliente *</label>
                                <input
                                    type="text"
                                    required
                                    value={editingApt.clientName}
                                    onChange={(e) => setEditingApt({ ...editingApt, clientName: e.target.value })}
                                    className={inputClass}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-zinc-400 mb-1">Fecha</label>
                                    <input
                                        type="date"
                                        required
                                        value={editingApt.date}
                                        onChange={(e) => setEditingApt({ ...editingApt, date: e.target.value })}
                                        className={inputClass}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-zinc-400 mb-1">Hora</label>
                                    <input
                                        type="time"
                                        required
                                        value={editingApt.time}
                                        onChange={(e) => setEditingApt({ ...editingApt, time: e.target.value })}
                                        className={inputClass}
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-zinc-400 mb-1">Servicio</label>
                                {services.length > 0 ? (
                                    <select
                                        value={editingApt.service}
                                        onChange={(e) => setEditingApt({ ...editingApt, service: e.target.value })}
                                        className={selectClass}
                                    >
                                        {services.map(s => (
                                            <option key={s.id} value={s.name}>{s.name}</option>
                                        ))}
                                    </select>
                                ) : (
                                    <input
                                        type="text"
                                        value={editingApt.service}
                                        onChange={(e) => setEditingApt({ ...editingApt, service: e.target.value })}
                                        className={inputClass}
                                    />
                                )}
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-zinc-400 mb-1">Barbero</label>
                                <input
                                    type="text"
                                    value={editingApt.barber}
                                    onChange={(e) => setEditingApt({ ...editingApt, barber: e.target.value })}
                                    className={inputClass}
                                />
                            </div>


                            <div>
                                <label className="block text-sm font-medium text-zinc-400 mb-1">Notas</label>
                                <textarea
                                    rows={2}
                                    value={editingApt.notes || ''}
                                    onChange={(e) => setEditingApt({ ...editingApt, notes: e.target.value })}
                                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-3 text-white focus:border-amber-500 focus:outline-none resize-none"
                                    placeholder="Observaciones adicionales..."
                                />
                            </div>

                            <div className="pt-4 flex gap-3">
                                <Button type="button" onClick={() => { setShowEditModal(false); setEditingApt(null); }} variant="secondary" className="flex-1" disabled={saving}>
                                    Cancelar
                                </Button>
                                <Button type="submit" className="flex-1 bg-amber-500 hover:bg-amber-600 text-black border-amber-600" disabled={saving}>
                                    {saving ? 'Guardando...' : 'Guardar Cambios'}
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Appointments;
