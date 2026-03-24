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
            <div className="h-screen flex items-center justify-center bg-[#0f172a]">
                <div className="text-center">
                    <div className="w-16 h-16 border-4 border-[#e2b808] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-[#94a3b8] animate-pulse">Cargando personal...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="h-screen bg-[#0f172a] flex flex-col p-6 max-w-7xl mx-auto w-full">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-4">
                    <button onClick={onBack} className="p-2 hover:bg-[#334155] rounded-full text-[#94a3b8] hover:text-[#f8fafc]">
                        <ChevronLeft />
                    </button>
                    <div>
                        <h2 className="text-3xl font-heading font-bold text-[#e2b808] uppercase tracking-wide">Gestión de Personal</h2>
                        <p className="text-[#94a3b8]">Administración de barberos y equipo</p>
                    </div>
                </div>
                <Button onClick={() => setIsAddModalOpen(true)} className="gap-2 bg-[#e2b808] hover:bg-[#d4a017] text-[#0f172a] border-[#d4a017]">
                    <Plus size={18} /> Nuevo Barbero
                </Button>
            </div>

            {/* Grid of Barbers */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 overflow-auto">
                {barbers.map(barber => (
                    <div key={barber.id} className="bg-[#1e293b] border border-[#334155] rounded-xl p-6 hover:border-[#e2b808]/30 transition-all group">
                        <div className="flex items-center gap-4 mb-4">
                            <div className="w-12 h-12 rounded-full bg-[#334155] flex items-center justify-center text-[#e2b808] group-hover:bg-[#e2b808] group-hover:text-[#0f172a] transition-colors">
                                <User size={24} />
                            </div>
                            <div>
                                <h4 className="text-xl font-heading font-bold text-[#f8fafc] uppercase">{barber.name}</h4>
                                <span className="text-[#94a3b8] text-sm">Barbero Profesional</span>
                            </div>
                        </div>

                        <div className="space-y-3 pt-4 border-t border-[#334155]">
                            <div className="flex items-center gap-3 text-[#94a3b8]">
                                <Calendar size={16} className="text-[#e2b808]" />
                                <span className="text-sm">F. Nacimiento: {barber.birthDate}</span>
                            </div>
                            <div className="flex items-center gap-3 text-[#94a3b8]">
                                <Hash size={16} className="text-[#e2b808]" />
                                <span className="text-sm">Número de Silla: {barber.chairNumber}</span>
                            </div>
                        </div>
                    </div>
                ))}
                {barbers.length === 0 && (
                    <div className="col-span-full p-12 text-center text-[#64748b] bg-[#1e293b]/50 border border-[#334155] rounded-xl">
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
                        <Button onClick={handleSave} fullWidth disabled={saving} className="bg-[#e2b808] hover:bg-[#d4a017] text-[#0f172a] border-[#d4a017]">
                            {saving ? 'Guardando...' : 'Guardar Barbero'}
                        </Button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default Staff;