import React, { useState, useEffect } from 'react';
import { BarberSession } from '../types';
import { Plus, ChevronLeft, User, Calendar, Hash } from 'lucide-react';
import Button from './Button';
import Modal from './Modal';
import Input from './Input';
import { getBarbers, addBarber } from '../lib/database';

interface StaffProps {
    onBack: () => void;
}

const Staff: React.FC<StaffProps> = ({ onBack }) => {
    const [barbers, setBarbers] = useState<BarberSession[]>([]);
    const [loading, setLoading] = useState(true);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [saving, setSaving] = useState(false);

    // New Barber Form State
    const [newBarber, setNewBarber] = useState<Omit<BarberSession, 'id'>>({
        name: '',
        birthDate: '',
        chairNumber: 1,
    });

    useEffect(() => {
        loadBarbers();
    }, []);

    const loadBarbers = async () => {
        try {
            setLoading(true);
            const data = await getBarbers();
            setBarbers(data);
        } catch (error) {
            console.error('Error loading barbers:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        if (!newBarber.name || !newBarber.birthDate || !newBarber.chairNumber) {
            alert("Por favor completa todos los campos");
            return;
        }

        try {
            setSaving(true);
            await addBarber(newBarber);
            await loadBarbers();
            setIsAddModalOpen(false);
            // Reset form
            setNewBarber({ name: '', birthDate: '', chairNumber: 1 });
        } catch (error) {
            console.error('Error saving barber:', error);
            alert('Error al guardar el barbero');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="h-screen flex items-center justify-center bg-zinc-950">
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
                    <button onClick={onBack} className="p-2 hover:bg-zinc-800 rounded-full text-zinc-400 hover:text-white">
                        <ChevronLeft />
                    </button>
                    <div>
                        <h2 className="text-3xl font-heading font-bold text-white uppercase tracking-wide">Gestión de Personal</h2>
                        <p className="text-zinc-500">Administración de barberos y equipo</p>
                    </div>
                </div>
                <Button onClick={() => setIsAddModalOpen(true)} className="gap-2">
                    <Plus size={18} /> Nuevo Barbero
                </Button>
            </div>

            {/* Grid of Barbers */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 overflow-auto">
                {barbers.map(barber => (
                    <div key={barber.id} className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 hover:border-amber-500/30 transition-all group">
                        <div className="flex items-center gap-4 mb-4">
                            <div className="w-12 h-12 rounded-full bg-zinc-800 flex items-center justify-center text-amber-500 group-hover:bg-amber-500 group-hover:text-black transition-colors">
                                <User size={24} />
                            </div>
                            <div>
                                <h4 className="text-xl font-heading font-bold text-white uppercase">{barber.name}</h4>
                                <span className="text-zinc-500 text-sm">Barbero Profesional</span>
                            </div>
                        </div>

                        <div className="space-y-3 pt-4 border-t border-zinc-800">
                            <div className="flex items-center gap-3 text-zinc-400">
                                <Calendar size={16} className="text-amber-500" />
                                <span className="text-sm">F. Nacimiento: {barber.birthDate}</span>
                            </div>
                            <div className="flex items-center gap-3 text-zinc-400">
                                <Hash size={16} className="text-amber-500" />
                                <span className="text-sm">Número de Silla: {barber.chairNumber}</span>
                            </div>
                        </div>
                    </div>
                ))}
                {barbers.length === 0 && (
                    <div className="col-span-full p-12 text-center text-zinc-500 bg-zinc-900/50 border border-zinc-800 rounded-xl">
                        No hay barberos registrados.
                    </div>
                )}
            </div>

            {/* Add Modal */}
            <Modal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} title="Agregar Barbero">
                <div className="space-y-4">
                    <Input
                        label="Nombre Completo"
                        value={newBarber.name}
                        onChange={e => setNewBarber({ ...newBarber, name: e.target.value })}
                        placeholder="Ej: Juan Pérez"
                    />
                    <Input
                        label="Fecha de Nacimiento"
                        type="date"
                        value={newBarber.birthDate}
                        onChange={e => setNewBarber({ ...newBarber, birthDate: e.target.value })}
                    />
                    <Input
                        label="Número de Silla"
                        type="number"
                        value={newBarber.chairNumber}
                        onChange={e => setNewBarber({ ...newBarber, chairNumber: Number(e.target.value) })}
                        placeholder="1"
                    />
                    <div className="pt-4">
                        <Button onClick={handleSave} fullWidth disabled={saving}>
                            {saving ? 'Guardando...' : 'Guardar Barbero'}
                        </Button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default Staff;
