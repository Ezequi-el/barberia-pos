import React, { useState, useEffect } from 'react';
import { Customer } from '../types';
import { Users, Search, Plus, Edit2, Phone, Mail, Calendar, Trash2 } from 'lucide-react';
import Button from './Button';
import Modal from './Modal';
import Input from './Input';
import { getCustomers, createCustomer, deleteCustomer, updateCustomer } from '../lib/database';


const Customers: React.FC = () => {
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [search, setSearch] = useState('');
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
    const [saving, setSaving] = useState(false);
    const [loading, setLoading] = useState(true);

    const [newCustomer, setNewCustomer] = useState<Partial<Customer>>({
        visits: 0,
        totalSpent: 0,
    });

    useEffect(() => {
        loadCustomers();
    }, []);

    const loadCustomers = async () => {
        try {
            setLoading(true);
            const data = await getCustomers();
            const mapped = data.map((r: any) => ({
                id: r.id,
                name: r.name,
                phone: r.phone || '',
                email: r.email || '',
                visits: r.visits || 0,
                totalSpent: r.total_spent || 0,
                lastVisit: r.last_visit || undefined,
                notes: r.notes || '',
            })) as Customer[];
            setCustomers(mapped);
        } catch (err) {
            console.error('Error cargando clientes:', err);
        } finally {
            setLoading(false);
        }
    };

    const filteredCustomers = customers.filter(c =>
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        c.phone?.includes(search) ||
        c.email?.toLowerCase().includes(search.toLowerCase())
    );

    // ─── Validation helpers ───────────────────────────────────────────────────
    const validatePhone = (phone?: string): string | null => {
        if (!phone || phone.trim() === '') return null; // optional field
        if (!/^\d{10}$/.test(phone.trim())) return 'El teléfono debe tener exactamente 10 dígitos numéricos.';
        return null;
    };

    const validateEmail = (email?: string): string | null => {
        if (!email || email.trim() === '') return null; // optional field
        if (!email.includes('@')) return 'El email debe contener @.';
        return null;
    };

    // ─── Add ─────────────────────────────────────────────────────────────────
    const handleAdd = async () => {
        if (!newCustomer.name) {
            alert('El nombre es obligatorio');
            return;
        }
        const phoneErr = validatePhone(newCustomer.phone);
        if (phoneErr) { alert(phoneErr); return; }
        const emailErr = validateEmail(newCustomer.email);
        if (emailErr) { alert(emailErr); return; }

        setSaving(true);
        try {
            await createCustomer({
                name: newCustomer.name,
                phone: newCustomer.phone,
                email: newCustomer.email,
                notes: newCustomer.notes,
            });
            setIsAddModalOpen(false);
            setNewCustomer({ visits: 0, totalSpent: 0 });
            await loadCustomers();
        } catch (err) {
            console.error('Error creando cliente:', err);
            alert('Error al crear el cliente.');
        } finally {
            setSaving(false);
        }
    };

    // ─── Edit ─────────────────────────────────────────────────────────────────
    const handleEdit = (customer: Customer) => {
        setEditingCustomer({ ...customer });
        setIsEditModalOpen(true);
    };

    const handleSaveEdit = async () => {
        if (!editingCustomer) return;
        if (!editingCustomer.name) {
            alert('El nombre es obligatorio');
            return;
        }
        const phoneErr = validatePhone(editingCustomer.phone);
        if (phoneErr) { alert(phoneErr); return; }
        const emailErr = validateEmail(editingCustomer.email);
        if (emailErr) { alert(emailErr); return; }

        setSaving(true);
        try {
            await updateCustomer(editingCustomer.id, {
                name: editingCustomer.name,
                phone: editingCustomer.phone || undefined,
                email: editingCustomer.email || undefined,
                notes: editingCustomer.notes || undefined,
                visits: editingCustomer.visits,
                total_spent: editingCustomer.totalSpent,
            });
            setIsEditModalOpen(false);
            setEditingCustomer(null);
            await loadCustomers();
        } catch (err) {
            console.error('Error actualizando cliente:', err);
            alert('Error al actualizar el cliente.');
        } finally {
            setSaving(false);
        }
    };

    // ─── Delete ───────────────────────────────────────────────────────────────
    const handleDelete = async (id: string, name: string) => {
        if (!confirm(`¿Eliminar a "${name}" definitivamente?`)) return;
        try {
            await deleteCustomer(id);
            await loadCustomers();
        } catch (err) {
            console.error('Error eliminando cliente:', err);
            alert('Error al eliminar el cliente.');
        }
    };

    return (
        <div className="min-h-full bg-zinc-950 flex flex-col p-4 md:p-6 max-w-7xl mx-auto w-full">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-4">
                    <div>
                        <h2 className="text-3xl font-heading font-bold text-white uppercase tracking-wider">Clientes</h2>
                        <p className="text-zinc-500">Gestión de clientes y visitas</p>
                    </div>
                </div>
                <Button onClick={() => setIsAddModalOpen(true)} className="gap-2">
                    <Plus size={18} /> Nuevo Cliente
                </Button>
            </div>

            {/* Toolbar */}
            <div className="mb-6 flex gap-4">
                <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-zinc-500" size={18} />
                    <input
                        type="text"
                        placeholder="Buscar por nombre, teléfono o email..."
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-lg pl-10 pr-4 py-3 text-sm text-white focus:border-amber-500 focus:outline-none"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-500">
                            <Users size={20} />
                        </div>
                        <div>
                            <p className="text-zinc-500 text-xs uppercase font-bold">Total Clientes</p>
                            <p className="text-2xl font-heading font-bold text-white">{customers.length}</p>
                        </div>
                    </div>
                </div>
                <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center text-green-500">
                            <Calendar size={20} />
                        </div>
                        <div>
                            <p className="text-zinc-500 text-xs uppercase font-bold">Visitas Totales</p>
                            <p className="text-2xl font-heading font-bold text-white">
                                {customers.reduce((sum, c) => sum + c.visits, 0)}
                            </p>
                        </div>
                    </div>
                </div>
                <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-500">
                            <span className="text-lg font-bold">$</span>
                        </div>
                        <div>
                            <p className="text-zinc-500 text-xs uppercase font-bold">Ingresos Clientes</p>
                            <p className="text-2xl font-heading font-bold text-white">
                                ${customers.reduce((sum, c) => sum + c.totalSpent, 0).toLocaleString()}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Table */}
            <div className="flex-1 overflow-auto bg-zinc-900 border border-zinc-800 rounded-xl shadow-xl">
                <table className="w-full text-left border-collapse">
                    <thead className="bg-zinc-950 text-zinc-400 uppercase text-xs font-bold tracking-wider sticky top-0 z-10">
                        <tr>
                            <th className="p-4 border-b border-zinc-800">Cliente</th>
                            <th className="p-4 border-b border-zinc-800">Contacto</th>
                            <th className="p-4 border-b border-zinc-800 text-center">Visitas</th>
                            <th className="p-4 border-b border-zinc-800 text-right">Total Gastado</th>
                            <th className="p-4 border-b border-zinc-800 text-center">Última Visita</th>
                            <th className="p-4 border-b border-zinc-800 text-center">Acciones</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800">
                        {filteredCustomers.map(customer => (
                            <tr key={customer.id} className="hover:bg-zinc-800/50 transition-colors">
                                <td className="p-4">
                                    <div>
                                        <p className="font-medium text-zinc-100">{customer.name}</p>
                                        {customer.notes && (
                                            <p className="text-xs text-zinc-500 mt-1">{customer.notes}</p>
                                        )}
                                    </div>
                                </td>
                                <td className="p-4">
                                    <div className="space-y-1">
                                        {customer.phone && (
                                            <div className="flex items-center gap-2 text-zinc-400 text-sm">
                                                <Phone size={12} />
                                                <span>{customer.phone}</span>
                                            </div>
                                        )}
                                        {customer.email && (
                                            <div className="flex items-center gap-2 text-zinc-400 text-sm">
                                                <Mail size={12} />
                                                <span>{customer.email}</span>
                                            </div>
                                        )}
                                    </div>
                                </td>
                                <td className="p-4 text-center font-bold text-zinc-100">{customer.visits}</td>
                                <td className="p-4 text-right text-amber-500 font-bold">${customer.totalSpent.toLocaleString()}</td>
                                <td className="p-4 text-center text-zinc-400 text-sm">
                                    {customer.lastVisit
                                        ? new Date(customer.lastVisit).toLocaleDateString('es-MX')
                                        : '-'
                                    }
                                </td>
                                <td className="p-4 text-center">
                                 <button
                                        onClick={() => handleEdit(customer)}
                                        className="p-2 hover:bg-amber-500/10 rounded-lg text-zinc-400 hover:text-amber-500 transition-colors"
                                        title="Editar cliente"
                                    >
                                        <Edit2 size={16} />
                                    </button>
                                    <button
                                        onClick={() => handleDelete(customer.id, customer.name)}
                                        className="p-2 hover:bg-red-500/10 rounded-lg text-zinc-600 hover:text-red-500 transition-colors"
                                        title="Eliminar cliente"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {filteredCustomers.length === 0 && (
                    <div className="p-12 text-center text-zinc-500">
                        No se encontraron clientes.
                    </div>
                )}
            </div>

            {/* Add Modal */}
            <Modal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} title="Agregar Cliente">
                <div className="space-y-4">
                    <Input
                        label="Nombre Completo *"
                        value={newCustomer.name || ''}
                        onChange={e => setNewCustomer({ ...newCustomer, name: e.target.value })}
                    />
                    <div>
                        <Input
                            label="Teléfono (10 dígitos)"
                            type="tel"
                            maxLength={10}
                            value={newCustomer.phone || ''}
                            onChange={e => setNewCustomer({ ...newCustomer, phone: e.target.value.replace(/\D/g, '').slice(0, 10) })}
                        />
                        {newCustomer.phone && newCustomer.phone.length > 0 && newCustomer.phone.length < 10 && (
                            <p className="text-red-400 text-xs mt-1">{10 - newCustomer.phone.length} dígitos faltantes</p>
                        )}
                    </div>
                    <div>
                        <Input
                            label="Email"
                            type="email"
                            value={newCustomer.email || ''}
                            onChange={e => setNewCustomer({ ...newCustomer, email: e.target.value })}
                        />
                        {newCustomer.email && !newCustomer.email.includes('@') && (
                            <p className="text-red-400 text-xs mt-1">El email debe contener @</p>
                        )}
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">
                            Notas
                        </label>
                        <textarea
                            className="w-full bg-zinc-900 border border-zinc-700 text-zinc-100 rounded-lg px-4 py-3 transition-colors focus:border-amber-500 focus:outline-none resize-none"
                            rows={3}
                            placeholder="Notas adicionales sobre el cliente..."
                            value={newCustomer.notes || ''}
                            onChange={e => setNewCustomer({ ...newCustomer, notes: e.target.value })}
                        />
                    </div>
                    <div className="pt-4">
                        <Button onClick={handleAdd} fullWidth disabled={saving}>
                            {saving ? 'Guardando...' : 'Guardar Cliente'}
                        </Button>
                    </div>
                </div>
            </Modal>

            {/* Edit Modal */}
            <Modal isOpen={isEditModalOpen} onClose={() => { setIsEditModalOpen(false); setEditingCustomer(null); }} title="Editar Cliente">
                <div className="space-y-4">
                    <Input
                        label="Nombre Completo *"
                        value={editingCustomer?.name || ''}
                        onChange={e => setEditingCustomer(editingCustomer ? { ...editingCustomer, name: e.target.value } : null)}
                    />
                    <div>
                        <Input
                            label="Teléfono (10 dígitos)"
                            type="tel"
                            maxLength={10}
                            value={editingCustomer?.phone || ''}
                            onChange={e => setEditingCustomer(editingCustomer ? { ...editingCustomer, phone: e.target.value.replace(/\D/g, '').slice(0, 10) } : null)}
                        />
                        {editingCustomer?.phone && editingCustomer.phone.length > 0 && editingCustomer.phone.length < 10 && (
                            <p className="text-red-400 text-xs mt-1">{10 - editingCustomer.phone.length} dígitos faltantes</p>
                        )}
                    </div>
                    <div>
                        <Input
                            label="Email"
                            type="email"
                            value={editingCustomer?.email || ''}
                            onChange={e => setEditingCustomer(editingCustomer ? { ...editingCustomer, email: e.target.value } : null)}
                        />
                        {editingCustomer?.email && !editingCustomer.email.includes('@') && (
                            <p className="text-red-400 text-xs mt-1">El email debe contener @</p>
                        )}
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <Input
                            label="Visitas"
                            type="number"
                            value={editingCustomer?.visits || 0}
                            onChange={e => setEditingCustomer(editingCustomer ? { ...editingCustomer, visits: Number(e.target.value) } : null)}
                        />
                        <Input
                            label="Total Gastado"
                            type="number"
                            value={editingCustomer?.totalSpent || 0}
                            onChange={e => setEditingCustomer(editingCustomer ? { ...editingCustomer, totalSpent: Number(e.target.value) } : null)}
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">
                            Notas
                        </label>
                        <textarea
                            className="w-full bg-zinc-900 border border-zinc-700 text-zinc-100 rounded-lg px-4 py-3 transition-colors focus:border-amber-500 focus:outline-none resize-none"
                            rows={3}
                            placeholder="Notas adicionales sobre el cliente..."
                            value={editingCustomer?.notes || ''}
                            onChange={e => setEditingCustomer(editingCustomer ? { ...editingCustomer, notes: e.target.value } : null)}
                        />
                    </div>
                    <div className="pt-4">
                        <Button onClick={handleSaveEdit} fullWidth disabled={saving}>
                            {saving ? 'Guardando...' : 'Actualizar Cliente'}
                        </Button>
                    </div>
                </div>
            </Modal>

        </div>
    );
};

export default Customers;
