import React, { useState, useEffect } from 'react';
import { ChevronLeft, Calendar as CalendarIcon, Clock, User, Scissors, Plus, X, Trash2 } from 'lucide-react';
import Button from './Button';
import { Appointment } from '../types';
import { getAppointments, createAppointment, deleteAppointment } from '../lib/database';

interface AppointmentsProps {
    onBack: () => void;
}

const Appointments: React.FC<AppointmentsProps> = ({ onBack }) => {
    const [appointments, setAppointments] = useState<Appointment[]>([]);
    const [selectedDate, setSelectedDate] = useState<Date>(new Date());
    const [showNewAppointmentModal, setShowNewAppointmentModal] = useState(false);
    const [loading, setLoading] = useState(true);

    // Form state
    const [newClientName, setNewClientName] = useState('');
    const [newTime, setNewTime] = useState('12:00');
    const [newBarber, setNewBarber] = useState('Barbero 1');
    const [newService, setNewService] = useState('Corte de Cabello');

    useEffect(() => {
        loadAppointments();
    }, []);

    const loadAppointments = async () => {
        try {
            const data = await getAppointments();
            setAppointments(data);
        } catch (error) {
            console.error('Error loading appointments:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateAppointment = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const dateStr = selectedDate.toISOString().split('T')[0];
            await createAppointment({
                clientName: newClientName,
                date: dateStr,
                time: newTime,
                barber: newBarber,
                service: newService,
                status: 'scheduled'
            });
            setShowNewAppointmentModal(false);
            setNewClientName('');
            loadAppointments();
        } catch (error) {
            console.error('Error creating appointment:', error);
            alert('Error al crear la cita');
        }
    };

    const handleDeleteAppointment = async (id: string) => {
        if (confirm('¿Estás seguro de eliminar esta cita?')) {
            try {
                await deleteAppointment(id);
                loadAppointments();
            } catch (error) {
                console.error('Error deleting appointment:', error);
            }
        }
    };

    // Calendar Logic
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

    return (
        <div className="min-h-screen bg-zinc-950 flex flex-col p-6 max-w-7xl mx-auto w-full">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-4">
                    <button onClick={onBack} className="p-2 hover:bg-zinc-800 rounded-full text-zinc-400 hover:text-white">
                        <ChevronLeft />
                    </button>
                    <div>
                        <h2 className="text-3xl font-heading font-bold text-white uppercase tracking-wide">Agenda</h2>
                        <p className="text-zinc-500">Gestión de citas y horarios</p>
                    </div>
                </div>
                <Button onClick={() => setShowNewAppointmentModal(true)} className="gap-2 bg-amber-500 hover:bg-amber-600 text-black border-amber-600">
                    <Plus size={18} /> Nueva Cita
                </Button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 h-full">
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
                                            <div key={i} className="text-[10px] bg-zinc-800 px-1 rounded truncate w-full text-left">
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
                <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 flex flex-col h-full overflow-hidden">
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
                                    <div key={apt.id} className="bg-zinc-950 border border-zinc-800 p-4 rounded-lg group hover:border-zinc-700 transition-colors">
                                        <div className="flex justify-between items-start mb-2">
                                            <div className="flex items-center gap-2 text-amber-500 font-mono font-bold">
                                                <Clock size={16} />
                                                {apt.time}
                                            </div>
                                            <button
                                                onClick={() => handleDeleteAppointment(apt.id)}
                                                className="text-zinc-600 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                        <h4 className="text-white font-bold mb-1">{apt.clientName}</h4>
                                        <div className="flex items-center gap-2 text-sm text-zinc-400 mb-1">
                                            <Scissors size={14} />
                                            {apt.service}
                                        </div>
                                        <div className="flex items-center gap-2 text-xs text-zinc-500">
                                            <User size={12} />
                                            {apt.barber}
                                        </div>
                                    </div>
                                ))
                        )}
                    </div>
                </div>
            </div>

            {/* New Appointment Modal */}
            {showNewAppointmentModal && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 w-full max-w-md shadow-2xl">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-bold text-white">Nueva Cita</h3>
                            <button onClick={() => setShowNewAppointmentModal(false)} className="text-zinc-500 hover:text-white">
                                <X size={24} />
                            </button>
                        </div>

                        <form onSubmit={handleCreateAppointment} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-zinc-400 mb-1">Cliente</label>
                                <input
                                    type="text"
                                    required
                                    value={newClientName}
                                    onChange={(e) => setNewClientName(e.target.value)}
                                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-3 text-white focus:border-amber-500 focus:outline-none"
                                    placeholder="Nombre del cliente"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-zinc-400 mb-1">Fecha</label>
                                    <input
                                        type="date"
                                        required
                                        value={selectedDate.toISOString().split('T')[0]}
                                        onChange={(e) => setSelectedDate(new Date(e.target.value))}
                                        className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-3 text-white focus:border-amber-500 focus:outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-zinc-400 mb-1">Hora</label>
                                    <input
                                        type="time"
                                        required
                                        value={newTime}
                                        onChange={(e) => setNewTime(e.target.value)}
                                        className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-3 text-white focus:border-amber-500 focus:outline-none"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-zinc-400 mb-1">Servicio</label>
                                <select
                                    value={newService}
                                    onChange={(e) => setNewService(e.target.value)}
                                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-3 text-white focus:border-amber-500 focus:outline-none"
                                >
                                    <option>Corte de Cabello</option>
                                    <option>Barba</option>
                                    <option>Corte + Barba</option>
                                    <option>Tinte</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-zinc-400 mb-1">Barbero</label>
                                <select
                                    value={newBarber}
                                    onChange={(e) => setNewBarber(e.target.value)}
                                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-3 text-white focus:border-amber-500 focus:outline-none"
                                >
                                    <option>Barbero 1</option>
                                    <option>Barbero 2</option>
                                </select>
                            </div>

                            <div className="pt-4 flex gap-3">
                                <Button type="button" onClick={() => setShowNewAppointmentModal(false)} className="flex-1 bg-zinc-800 hover:bg-zinc-700 border-zinc-700">
                                    Cancelar
                                </Button>
                                <Button type="submit" className="flex-1 bg-amber-500 hover:bg-amber-600 text-black border-amber-600">
                                    Guardar Cita
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
