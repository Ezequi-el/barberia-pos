import React, { useState, useEffect } from 'react';
import { Appointment, BarberSession } from '../types';
import { Plus, ChevronLeft, Calendar as CalendarIcon, Clock, User, Phone, Check, X, Filter } from 'lucide-react';
import Button from './Button';
import Modal from './Modal';
import Input from './Input';
import { getAppointments, createAppointment, updateAppointmentStatus, getBarbers } from '../lib/database';

interface AppointmentsProps {
    onBack: () => void;
}

const Appointments: React.FC<AppointmentsProps> = ({ onBack }) => {
    const [appointments, setAppointments] = useState<Appointment[]>([]);
    const [barbers, setBarbers] = useState<BarberSession[]>([]);
    const [loading, setLoading] = useState(true);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [saving, setSaving] = useState(false);
    const [filter, setFilter] = useState<'ALL' | 'PENDING' | 'COMPLETED' | 'CANCELLED'>('ALL');

    // New Appointment Form State
    const [newAppt, setNewAppt] = useState<Omit<Appointment, 'id'>>({
        customerName: '',
        customerPhone: '',
        date: new Date().toISOString().split('T')[0],
        time: '10:00',
        barberId: '',
        status: 'PENDING',
        notes: ''
    });

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            setLoading(true);
            const [apptsData, barbersData] = await Promise.all([
                getAppointments(),
                getBarbers()
            ]);
            setAppointments(apptsData);
            setBarbers(barbersData);
            if (barbersData.length > 0 && !newAppt.barberId) {
                setNewAppt(prev => ({ ...prev, barberId: barbersData[0].id }));
            }
        } catch (error) {
            console.error('Error loading data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        if (!newAppt.customerName || !newAppt.customerPhone || !newAppt.date || !newAppt.time || !newAppt.barberId) {
            alert("Por favor completa los campos obligatorios");
            return;
        }

        try {
            setSaving(true);
            await createAppointment(newAppt);
            await loadData();
            setIsAddModalOpen(false);
            setNewAppt({
                customerName: '',
                customerPhone: '',
                date: new Date().toISOString().split('T')[0],
                time: '10:00',
                barberId: barbers[0]?.id || '',
                status: 'PENDING',
                notes: ''
            });
        } catch (error) {
            console.error('Error saving appointment:', error);
            alert('Error al agendar la cita');
        } finally {
            setSaving(false);
        }
    };

    const handleStatusChange = async (id: string, status: Appointment['status']) => {
        try {
            await updateAppointmentStatus(id, status);
            await loadData();
        } catch (error) {
            console.error('Error updating status:', error);
        }
    };

    const filteredAppointments = appointments.filter(a => filter === 'ALL' || a.status === filter);

    if (loading) {
        return (
            <div className="h-screen flex items-center justify-center bg-zinc-950">
                <div className="text-center">
                    <div className="w-16 h-16 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-zinc-400 animate-pulse">Cargando citas...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="h-screen bg-zinc-950 flex flex-col p-6 max-w-7xl mx-auto w-full">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-4">
                    <button onClick={onBack} className="p-2 hover:bg-zinc-800 rounded-full text-zinc-400 hover:text-white">
                        <ChevronLeft />
                    </button>
                    <div>
                        <h2 className="text-3xl font-heading font-bold text-white uppercase tracking-wide">Gestión de Citas</h2>
                        <p className="text-zinc-500">Agenda y seguimiento de clientes</p>
                    </div>
                </div>
                <Button onClick={() => setIsAddModalOpen(true)} className="gap-2">
                    <Plus size={18} /> Nueva Cita
                </Button>
            </div>

            {/* Filter Toolbar */}
            <div className="flex items-center gap-4 mb-6">
                <div className="flex items-center gap-2 bg-zinc-900 border border-zinc-800 rounded-lg p-1">
                    {(['ALL', 'PENDING', 'COMPLETED', 'CANCELLED'] as const).map(f => (
                        <button
                            key={f}
                            onClick={() => setFilter(f)}
                            className={`px-4 py-1.5 rounded-md text-xs font-bold uppercase tracking-wider transition-all ${filter === f ? 'bg-amber-500 text-black shadow-lg shadow-amber-500/20' : 'text-zinc-500 hover:text-white'}`}
                        >
                            {f === 'ALL' ? 'Todas' : f === 'PENDING' ? 'Pendientes' : f === 'COMPLETED' ? 'Completadas' : 'Canceladas'}
                        </button>
                    ))}
                </div>
            </div>

            {/* Appointment List */}
            <div className="flex-1 overflow-auto space-y-4 pr-2 custom-scrollbar">
                {filteredAppointments.map(appt => {
                    const barberName = barbers.find(b => b.id === appt.barberId)?.name || 'Sin asignar';
                    return (
                        <div key={appt.id} className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 hover:border-zinc-700/50 transition-all flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                            <div className="flex items-start gap-5">
                                <div className={`w-14 h-14 rounded-xl flex flex-col items-center justify-center shrink-0 ${appt.status === 'PENDING' ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20' : appt.status === 'COMPLETED' ? 'bg-green-500/10 text-green-500 border border-green-500/20' : 'bg-red-500/10 text-red-500 border border-red-500/20'}`}>
                                    <span className="text-lg font-bold leading-tight">{appt.time}</span>
                                    <span className="text-[10px] font-bold uppercase tracking-tighter opacity-70">Hoy</span>
                                </div>

                                <div>
                                    <h4 className="text-xl font-heading font-bold text-white uppercase tracking-wide leading-none mb-2">{appt.customerName}</h4>
                                    <div className="flex flex-wrap gap-x-4 gap-y-2">
                                        <div className="flex items-center gap-2 text-zinc-400 text-sm">
                                            <Phone size={14} className="text-amber-500" />
                                            <span>{appt.customerPhone}</span>
                                        </div>
                                        <div className="flex items-center gap-2 text-zinc-400 text-sm">
                                            <User size={14} className="text-amber-500" />
                                            <span>{barberName}</span>
                                        </div>
                                        <div className="flex items-center gap-2 text-zinc-400 text-sm">
                                            <CalendarIcon size={14} className="text-amber-500" />
                                            <span>{appt.date}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="flex items-center gap-3 w-full md:w-auto self-end md:self-center pt-4 md:pt-0 border-t md:border-t-0 border-zinc-800">
                                {appt.status === 'PENDING' && (
                                    <>
                                        <button
                                            onClick={() => handleStatusChange(appt.id, 'COMPLETED')}
                                            className="flex-1 md:flex-none p-2 rounded-lg bg-green-500/10 text-green-500 hover:bg-green-500 hover:text-black border border-green-500/20 transition-all flex items-center justify-center gap-2"
                                        >
                                            <Check size={18} /> <span className="md:hidden font-bold uppercase text-xs">Completar</span>
                                        </button>
                                        <button
                                            onClick={() => handleStatusChange(appt.id, 'CANCELLED')}
                                            className="flex-1 md:flex-none p-2 rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-black border border-red-500/20 transition-all flex items-center justify-center gap-2"
                                        >
                                            <X size={18} /> <span className="md:hidden font-bold uppercase text-xs">Cancelar</span>
                                        </button>
                                    </>
                                )}
                                {appt.status !== 'PENDING' && (
                                    <span className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-widest border ${appt.status === 'COMPLETED' ? 'bg-green-500/5 text-green-500 border-green-500/20' : 'bg-red-500/5 text-red-500 border-red-500/20'}`}>
                                        {appt.status === 'COMPLETED' ? 'Completada' : 'Cancelada'}
                                    </span>
                                )}
                            </div>
                        </div>
                    );
                })}
                {filteredAppointments.length === 0 && (
                    <div className="p-16 text-center text-zinc-600 bg-zinc-900/30 border-2 border-dashed border-zinc-800 rounded-2xl">
                        <CalendarIcon size={48} className="mx-auto mb-4 opacity-20" />
                        <p className="text-lg">No hay citas en esta categoría.</p>
                    </div>
                )}
            </div>

            {/* Add Appointment Modal */}
            <Modal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} title="Agendar Nueva Cita">
                <div className="space-y-4">
                    <Input
                        label="Cliente (Nombre)"
                        value={newAppt.customerName}
                        onChange={e => setNewAppt({ ...newAppt, customerName: e.target.value })}
                        placeholder="Ej: Carlos Sánchez"
                    />
                    <Input
                        label="Teléfono"
                        value={newAppt.customerPhone}
                        onChange={e => setNewAppt({ ...newAppt, customerPhone: e.target.value })}
                        placeholder="Ej: 55-1234-5678"
                    />
                    <div className="grid grid-cols-2 gap-4">
                        <Input
                            label="Fecha"
                            type="date"
                            value={newAppt.date}
                            onChange={e => setNewAppt({ ...newAppt, date: e.target.value })}
                        />
                        <Input
                            label="Hora"
                            type="time"
                            value={newAppt.time}
                            onChange={e => setNewAppt({ ...newAppt, time: e.target.value })}
                        />
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-sm font-bold text-zinc-400 uppercase tracking-wider">Barbero Asignado</label>
                        <select
                            className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-3 text-sm text-white focus:border-amber-500 focus:outline-none appearance-none"
                            value={newAppt.barberId}
                            onChange={e => setNewAppt({ ...newAppt, barberId: e.target.value })}
                        >
                            <option value="" disabled>Selecciona un barbero</option>
                            {barbers.map(b => (
                                <option key={b.id} value={b.id}>{b.name} (Silla {b.chairNumber})</option>
                            ))}
                        </select>
                    </div>
                    <Input
                        label="Notas (Opcional)"
                        value={newAppt.notes || ''}
                        onChange={e => setNewAppt({ ...newAppt, notes: e.target.value })}
                        placeholder="Ej: Viene por corte y barba"
                    />
                    <div className="pt-4">
                        <Button onClick={handleSave} fullWidth disabled={saving || barbers.length === 0}>
                            {barbers.length === 0 ? 'Registra barberos primero' : saving ? 'Procesando...' : 'Confirmar Cita'}
                        </Button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default Appointments;
