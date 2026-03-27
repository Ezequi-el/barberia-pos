import React, { useState, useEffect } from 'react';
import { Customer } from '../types';
import { Users, Search, Plus, Edit2, Phone, Mail, Calendar, Trash2, ChevronLeft, Clock, ShoppingBag, ArrowUpDown, ChevronUp, ChevronDown } from 'lucide-react';
import Button from './Button';
import Modal from './Modal';
import Input from './Input';
import { getCustomers, createCustomer, deleteCustomer, updateCustomer } from '../lib/database';
import { supabase } from '../lib/supabase';


interface CustomersProps {
  onBack: () => void;
}

const Customers: React.FC<CustomersProps> = ({ onBack }) => {
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

    // History state
    const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
    const [historyCustomer, setHistoryCustomer] = useState<Customer | null>(null);
    const [historyData, setHistoryData] = useState<any[]>([]);
    const [loadingHistory, setLoadingHistory] = useState(false);

    // Metrics state
    const [visitasHoy, setVisitasHoy] = useState(0);
    const [ingresosMes, setIngresosMes] = useState(0);

    // Sorting state
    const [sortBy, setSortBy] = useState<'name' | 'visits' | 'totalSpent' | 'lastVisit'>('name');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

    useEffect(() => {
        loadCustomers();
    }, []);

    const loadCustomers = async () => {
        try {
            setLoading(true);
            const data = await getCustomers();
            // Data is already mapped by getCustomers in lib/database.ts
            setCustomers(data);
            
            // Calculate Today's Visits
            const hoy = new Date();
            const inicioHoy = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
            const countHoy = data.filter(c => c.lastVisit && new Date(c.lastVisit) >= inicioHoy).length;
            setVisitasHoy(countHoy);

            // Calculate Monthly Revenue from pedidos
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('business_id')
                    .eq('id', user.id)
                    .single();

                if (profile) {
                    const inicioMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
                    const { data: pedidosMes } = await supabase
                        .from('pedidos')
                        .select('total')
                        .eq('business_id', profile.business_id)
                        .not('customer_id', 'is', null)
                        .gte('created_at', inicioMes.toISOString());
                    
                    const sumMes = (pedidosMes || []).reduce((sum, p) => sum + (Number(p.total) || 0), 0);
                    setIngresosMes(sumMes);
                }
            }
        } catch (err) {
            console.error('Error cargando clientes:', err);
        } finally {
            setLoading(false);
        }
    };

    const filteredCustomers = customers
        .filter(c =>
            c.name.toLowerCase().includes(search.toLowerCase()) ||
            c.phone?.includes(search) ||
            c.email?.toLowerCase().includes(search.toLowerCase())
        )
        .sort((a, b) => {
            let valA: any = a[sortBy];
            let valB: any = b[sortBy];

            if (sortBy === 'lastVisit') {
                valA = valA ? new Date(valA).getTime() : 0;
                valB = valB ? new Date(valB).getTime() : 0;
            }

            if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
            if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
            return 0;
        });

    const handleSort = (field: typeof sortBy) => {
        if (sortBy === field) {
            setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
        } else {
            setSortBy(field);
            setSortOrder('asc');
        }
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('es-MX', {
            style: 'currency',
            currency: 'MXN',
            minimumFractionDigits: 2
        }).format(amount);
    };

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
                visits: 0,
                totalSpent: 0,
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
    const handleEdit = async (customer: Customer) => {
        // Fallback inmediato para que se abra instantáneo, pero con loading de base
        setEditingCustomer({ ...customer });
        setIsEditModalOpen(true);

        try {
            const { data: freshData, error } = await supabase
                .from('customers')
                .select('*')
                .eq('id', customer.id)
                .single();

            if (!error && freshData) {
                setEditingCustomer(prev => prev && prev.id === freshData.id ? {
                    ...prev,
                    visits: freshData.visits || 0,
                    totalSpent: freshData.total_spent || 0,
                    lastVisit: freshData.last_visit,
                } : prev);
            }
        } catch (err) {
            console.error('Error fetching fresh customer data:', err);
        }
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

    // ─── History ─────────────────────────────────────────────────────────────
    const handleViewHistory = async (customer: Customer) => {
        setHistoryCustomer(customer);
        setIsHistoryModalOpen(true);
        setHistoryData([]);
        setLoadingHistory(true);

        try {
            const { data, error } = await supabase
                .from('pedidos')
                .select(`
                    id,
                    created_at,
                    barber,
                    total,
                    payment_method,
                    variantes (
                        name,
                        quantity,
                        price
                    )
                `)
                .eq('customer_id', customer.id)
                .order('created_at', { ascending: false })
                .limit(20);

            if (error) throw error;
            
            const formatted = data.map((p: any) => ({
                id: p.id,
                created_at: p.created_at,
                barber: p.barber,
                total: p.total,
                payment_method: p.payment_method,
                items: p.variantes || []
            }));
            
            setHistoryData(formatted);
        } catch (err) {
            console.error('Error cargando historial:', err);
        } finally {
            setLoadingHistory(false);
        }
    };

    return (
        <div className="min-h-full bg-zinc-950 flex flex-col p-4 md:p-6 max-w-7xl mx-auto w-full">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-4">
                    <button onClick={onBack} className="p-2 hover:bg-zinc-800 rounded-full text-zinc-400 hover:text-white transition-colors">
                        <ChevronLeft size={24} />
                    </button>
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
                            <p className="text-zinc-500 text-xs uppercase font-bold">Visitas Hoy</p>
                            <p className="text-2xl font-heading font-bold text-white">
                                {visitasHoy}
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
                            <p className="text-zinc-500 text-xs uppercase font-bold">Ingresos del Mes</p>
                            <p className="text-2xl font-heading font-bold text-white">
                                ${ingresosMes.toLocaleString()}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Table */}
            <div className="flex-1 overflow-auto bg-zinc-900 border border-zinc-800 rounded-xl shadow-xl">
                <table className="w-full text-left border-collapse">
                    <thead className="bg-zinc-950 text-zinc-400 uppercase text-[10px] font-bold tracking-widest sticky top-0 z-10">
                        <tr>
                            <th className="p-4 border-b border-zinc-800 cursor-pointer hover:bg-zinc-900 transition-colors" onClick={() => handleSort('name')}>
                                <div className="flex items-center gap-2">
                                    Cliente
                                    {sortBy === 'name' ? (sortOrder === 'asc' ? <ChevronUp size={12}/> : <ChevronDown size={12}/>) : <ArrowUpDown size={10} className="text-zinc-600" />}
                                </div>
                            </th>
                            <th className="p-4 border-b border-zinc-800">Contacto</th>
                            <th className="p-4 border-b border-zinc-800 text-center cursor-pointer hover:bg-zinc-900 transition-colors" onClick={() => handleSort('visits')}>
                                <div className="flex items-center justify-center gap-2">
                                    Visitas
                                    {sortBy === 'visits' ? (sortOrder === 'asc' ? <ChevronUp size={12}/> : <ChevronDown size={12}/>) : <ArrowUpDown size={10} className="text-zinc-600" />}
                                </div>
                            </th>
                            <th className="p-4 border-b border-zinc-800 text-right cursor-pointer hover:bg-zinc-900 transition-colors" onClick={() => handleSort('totalSpent')}>
                                <div className="flex items-center justify-end gap-2">
                                    Total Gastado
                                    {sortBy === 'totalSpent' ? (sortOrder === 'asc' ? <ChevronUp size={12}/> : <ChevronDown size={12}/>) : <ArrowUpDown size={10} className="text-zinc-600" />}
                                </div>
                            </th>
                            <th className="p-4 border-b border-zinc-800 text-center cursor-pointer hover:bg-zinc-900 transition-colors" onClick={() => handleSort('lastVisit')}>
                                <div className="flex items-center justify-center gap-2">
                                    Última Visita
                                    {sortBy === 'lastVisit' ? (sortOrder === 'asc' ? <ChevronUp size={12}/> : <ChevronDown size={12}/>) : <ArrowUpDown size={10} className="text-zinc-600" />}
                                </div>
                            </th>
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
                                <td className="p-4 text-right text-amber-500 font-bold">{formatCurrency(customer.totalSpent)}</td>
                                <td className="p-4 text-center text-zinc-400 text-sm">
                                    {customer.lastVisit
                                        ? new Date(customer.lastVisit).toLocaleDateString('es-MX')
                                        : '-'
                                    }
                                </td>
                                 <td className="p-4 text-center">
                                    <div className="flex items-center justify-center gap-1">
                                        <button
                                            onClick={() => handleViewHistory(customer)}
                                            className="p-2 hover:bg-blue-500/10 rounded-lg text-zinc-400 hover:text-blue-500 transition-colors"
                                            title="Ver historial de visitas"
                                        >
                                            <Clock size={16} />
                                        </button>
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
                                    </div>
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
                    {/* Visitas y Total Gastado — solo lectura */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">Visitas</label>
                            <div className="bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-3 cursor-not-allowed flex items-center justify-between">
                                <span className="text-zinc-100 font-bold text-lg">{editingCustomer?.visits ?? 0}</span>
                            </div>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">Total Gastado</label>
                            <div className="bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-3 cursor-not-allowed flex items-center justify-between">
                                <span className="text-amber-400 font-bold text-lg">${(editingCustomer?.totalSpent ?? 0).toLocaleString()}</span>
                            </div>
                        </div>
                    </div>
                    <p className="text-xs text-zinc-600 -mt-2">Se actualiza automáticamente con cada venta</p>
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

            {/* History Modal */}
            <Modal 
                isOpen={isHistoryModalOpen} 
                onClose={() => { setIsHistoryModalOpen(false); setHistoryCustomer(null); }} 
                title="Historial de Visitas"
                maxWidth="max-w-4xl"
            >
                {historyCustomer && (
                    <div className="space-y-6">
                        {/* Cabecera Detail */}
                        <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                            <div>
                                <h3 className="text-xl font-bold text-white">{historyCustomer.name}</h3>
                                <p className="text-zinc-500 text-sm">Registro de actividad comercial</p>
                            </div>
                            <div className="flex gap-4">
                                <div className="text-center px-4 py-2 bg-zinc-900 rounded-lg border border-zinc-800">
                                    <p className="text-[10px] text-zinc-500 uppercase font-bold">Visitas</p>
                                    <p className="text-lg font-heading font-bold text-white">{historyCustomer.visits}</p>
                                </div>
                                <div className="text-center px-4 py-2 bg-zinc-900 rounded-lg border border-zinc-800">
                                    <p className="text-[10px] text-zinc-500 uppercase font-bold">Total Gastado</p>
                                    <p className="text-lg font-heading font-bold text-amber-500">${historyCustomer.totalSpent.toLocaleString()}</p>
                                </div>
                            </div>
                        </div>

                        {/* Tabla de Historial */}
                        <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead className="bg-zinc-950 text-zinc-500 uppercase text-[10px] font-bold tracking-widest">
                                        <tr>
                                            <th className="p-3 border-b border-zinc-800">Fecha / Hora</th>
                                            <th className="p-3 border-b border-zinc-800">Barbero</th>
                                            <th className="p-3 border-b border-zinc-800">Servicios / Productos</th>
                                            <th className="p-3 border-b border-zinc-800 text-right">Total</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-zinc-800">
                                        {loadingHistory ? (
                                            <tr>
                                                <td colSpan={4} className="p-12 text-center text-zinc-500">
                                                    <div className="flex flex-col items-center gap-3">
                                                        <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
                                                        <p>Cargando historial...</p>
                                                    </div>
                                                </td>
                                            </tr>
                                        ) : historyData.length > 0 ? (
                                            historyData.map((visit) => (
                                                <tr key={visit.id} className="hover:bg-zinc-800/30 transition-colors">
                                                    <td className="p-3">
                                                        <div className="text-sm text-zinc-200">
                                                            {new Date(visit.created_at).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })}
                                                        </div>
                                                        <div className="text-[10px] text-zinc-500">
                                                            {new Date(visit.created_at).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                                                        </div>
                                                    </td>
                                                    <td className="p-3 text-sm text-zinc-400 italic">
                                                        {visit.barber}
                                                    </td>
                                                    <td className="p-3">
                                                        <div className="flex flex-wrap gap-1">
                                                            {visit.items.map((item: any, i: number) => (
                                                                <span key={i} className="text-[10px] bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded border border-zinc-700">
                                                                    {item.quantity}x {item.name}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    </td>
                                                    <td className="p-3 text-right">
                                                        <div className="text-sm font-bold text-amber-500">${visit.total.toLocaleString()}</div>
                                                        <div className="text-[9px] text-zinc-600 uppercase tracking-tighter">{visit.payment_method}</div>
                                                    </td>
                                                </tr>
                                            ))
                                        ) : (
                                            <tr>
                                                <td colSpan={4} className="p-12 text-center text-zinc-500">
                                                    <div className="flex flex-col items-center gap-2">
                                                        <ShoppingBag size={32} className="text-zinc-700 mb-2" />
                                                        <p className="font-medium text-zinc-400">Este cliente aún no tiene visitas registradas</p>
                                                        <p className="text-xs">Las ventas procesadas en el POS aparecerán aquí.</p>
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                            {!loadingHistory && historyData.length === 20 && (
                                <div className="p-3 bg-zinc-950 border-t border-zinc-800 text-center">
                                    <p className="text-[10px] text-zinc-600 italic">Mostrando las últimas 20 visitas. El registro completo está disponible en reportes globales.</p>
                                </div>
                            )}
                        </div>
                        <div className="flex justify-end">
                            <Button onClick={() => setIsHistoryModalOpen(false)} variant="secondary">Cerrar</Button>
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    );
};

export default Customers;
