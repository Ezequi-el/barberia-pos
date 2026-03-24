import React, { useState, useEffect } from 'react';
import { CatalogItem, ItemType } from '../types';
import { Plus, Search, Edit2, Trash2, PackageSearch } from 'lucide-react';
import Button from './Button';
import Modal from './Modal';
import Input from './Input';
import { getCatalogItems, addCatalogItem, updateCatalogItem, deleteCatalogItem } from '../lib/database';
import { useAuth } from '../contexts/AuthContext';

const Inventory: React.FC = () => {
  const { profile } = useAuth();
  const [items, setItems] = useState<CatalogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [saving, setSaving] = useState(false);
  const [editingItem, setEditingItem] = useState<CatalogItem | null>(null);

  // New Product Form State
  const [newItem, setNewItem] = useState<Partial<CatalogItem>>({
    type: ItemType.PRODUCT,
    brand: 'General',
  });

  // Access Control: Only 'owner' can truly use this module, though App.tsx blocks 'barber'
  // But just in case they bypass it, we show an empty restricted screen
  if (profile?.role === 'barber') {
    return (
      <div className="h-screen flex items-center justify-center bg-[#0f172a] p-6">
        <div className="text-center bg-[#1e293b] border border-rose-900/30 p-8 rounded-2xl max-w-sm">
          <PackageSearch size={48} className="mx-auto text-rose-500 mb-4 opacity-50" />
          <h2 className="text-2xl font-bold text-[#f8fafc] mb-2">Acceso Denegado</h2>
          <p className="text-[#94a3b8]">Solo los propietarios pueden acceder a la gestión del catálogo.</p>
        </div>
      </div>
    );
  }

  useEffect(() => {
    loadItems();
  }, []);

  const loadItems = async () => {
    try {
      setLoading(true);
      const catalogItems = await getCatalogItems();
      setItems(catalogItems);
    } catch (error) {
      console.error('Error loading items:', error);
      alert('Error al cargar el inventario');
    } finally {
      setLoading(false);
    }
  };

  const filteredItems = items.filter(i => 
    i.name.toLowerCase().includes(search.toLowerCase()) || 
    i.brand?.toLowerCase().includes(search.toLowerCase())
  );

  const handleSave = async () => {
    if (!newItem.name || !newItem.price) {
      alert("Completa el nombre y precio.");
      return;
    }

    try {
      setSaving(true);
      await addCatalogItem({
        name: newItem.name,
        type: newItem.type || ItemType.PRODUCT,
        price: Number(newItem.price),
        cost: Number(newItem.cost || 0),
        stock: newItem.type === ItemType.PRODUCT ? Number(newItem.stock || 0) : undefined,
        brand: newItem.brand || 'General'
      });

      await loadItems();
      setIsAddModalOpen(false);
      setNewItem({ type: ItemType.PRODUCT, brand: 'General' });
    } catch (error) {
      console.error('Error adding item:', error);
      alert('Error al agregar el elemento al catálogo');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (item: CatalogItem) => {
    setEditingItem({ ...item });
    setIsEditModalOpen(true);
  };

  const handleUpdate = async () => {
    if (!editingItem || !editingItem.name || !editingItem.price) {
      alert("Completa los campos obligatorios");
      return;
    }

    try {
      setSaving(true);
      await updateCatalogItem(editingItem.id, {
        name: editingItem.name,
        type: editingItem.type,
        price: Number(editingItem.price),
        cost: Number(editingItem.cost || 0),
        stock: editingItem.type === ItemType.PRODUCT ? Number(editingItem.stock || 0) : undefined,
        brand: editingItem.brand || 'General'
      });

      await loadItems();
      setIsEditModalOpen(false);
      setEditingItem(null);
    } catch (error) {
      console.error('Error updating item:', error);
      alert('Error al actualizar el producto');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (confirm(`¿Estás sumamente seguro de eliminar definitivamente "${name}" del catálogo?`)) {
      try {
        setLoading(true);
        await deleteCatalogItem(id);
        await loadItems();
      } catch (error) {
        console.error('Error deleting item:', error);
        alert(error instanceof Error ? error.message : 'Error al borrar el producto.');
        setLoading(false);
      }
    }
  };

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-[#0f172a]">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-[#e2b808] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-[#94a3b8] animate-pulse">Cargando catálogo...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-[#0f172a] flex flex-col p-6 max-w-7xl mx-auto w-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <div>
            <h2 className="text-3xl font-heading font-bold text-[#e2b808] uppercase tracking-wider">Gestión del Catálogo</h2>
            <p className="text-[#94a3b8]">Administra servicios y stock de productos</p>
          </div>
        </div>
        <Button 
          onClick={() => setIsAddModalOpen(true)} 
          className="gap-2 bg-[#e2b808] hover:bg-[#d4a017] text-[#0f172a] border-[#d4a017]"
        >
          <Plus size={18} /> Nuevo Ítem
        </Button>
      </div>

      {/* Toolbar */}
      <div className="mb-6 flex gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#64748b]" size={18} />
          <input
            type="text"
            placeholder="Buscar en catálogo..."
            className="w-full bg-[#1e293b] border border-[#334155] rounded-lg pl-10 pr-4 py-3 text-sm text-[#f8fafc] focus:border-[#e2b808] focus:outline-none"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto bg-[#1e293b] border border-[#334155] rounded-xl shadow-xl">
        <table className="w-full text-left border-collapse">
          <thead className="bg-[#0f172a] text-[#94a3b8] uppercase text-xs font-bold tracking-wider sticky top-0 z-10">
            <tr>
              <th className="p-4 border-b border-[#334155]">Nombre</th>
              <th className="p-4 border-b border-[#334155]">Tipo / Categoría</th>
              <th className="p-4 border-b border-[#334155] text-right">Precio</th>
              <th className="p-4 border-b border-[#334155] text-center">Stock</th>
              <th className="p-4 border-b border-[#334155] text-center">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#334155]">
            {filteredItems.map(item => (
              <tr key={item.id} className="hover:bg-[#334155]/50 transition-colors">
                <td className="p-4 font-medium text-[#f8fafc]">{item.name}</td>
                <td className="p-4">
                  <span className={`text-xs px-2 py-1 rounded-full uppercase tracking-wider font-bold ${item.type === ItemType.SERVICE ? 'bg-[#e2b808]/10 text-[#e2b808]' : 'bg-[#38bdf8]/10 text-[#38bdf8]'}`}>
                    {item.type === ItemType.SERVICE ? 'Servicio' : 'Producto'}
                  </span>
                  {item.category && <span className="ml-2 text-xs text-[#64748b] uppercase">{item.category}</span>}
                </td>
                <td className="p-4 text-right text-emerald-400 font-bold">${item.price}</td>
                <td className="p-4 text-center">
                  {item.type === ItemType.PRODUCT ? (
                     <span className={`font-bold ${item.stock! <= 5 ? 'text-rose-500' : 'text-[#f8fafc]'}`}>
                        {item.stock} un.
                     </span>
                  ) : <span className="text-[#64748b]">-</span>}
                </td>
                <td className="p-4">
                  <div className="flex items-center justify-center gap-2">
                    <button
                      onClick={() => handleEdit(item)}
                      className="p-2 hover:bg-[#e2b808]/10 rounded-lg text-[#94a3b8] hover:text-[#e2b808] transition-colors"
                      title="Editar"
                    >
                      <Edit2 size={16} />
                    </button>
                    <button
                      onClick={() => handleDelete(item.id, item.name)}
                      className="p-2 hover:bg-rose-500/10 rounded-lg text-[#94a3b8] hover:text-rose-500 transition-colors"
                      title="Borrar"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filteredItems.length === 0 && (
          <div className="p-12 text-center text-[#64748b]">
            No se encontraron elementos en el catálogo.
          </div>
        )}
      </div>

      {/* Add Modal */}
      <Modal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} title="Agregar Ítem al Catálogo">
        <div className="space-y-4">
          <Input
            label="Nombre del Servicio / Producto *"
            value={newItem.name || ''}
            onChange={e => setNewItem({ ...newItem, name: e.target.value })}
          />
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-[#94a3b8] uppercase tracking-wider mb-2">
                Tipo *
              </label>
              <select
                className="w-full bg-[#0f172a] border border-[#334155] text-[#f8fafc] rounded-lg px-4 py-3 transition-colors focus:border-[#e2b808] focus:outline-none appearance-none"
                value={newItem.type}
                onChange={e => setNewItem({ ...newItem, type: e.target.value as ItemType })}
              >
                <option value={ItemType.SERVICE}>Servicio</option>
                <option value={ItemType.PRODUCT}>Producto Físico</option>
              </select>
            </div>
            <Input
              label="Marca / Categoría"
              value={newItem.brand || ''}
              onChange={e => setNewItem({ ...newItem, brand: e.target.value })}
              placeholder="Ej: Barberlife, Ceras"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Precio al Público *"
              type="number"
              value={newItem.price || ''}
              onChange={e => setNewItem({ ...newItem, price: Number(e.target.value) })}
            />
            {newItem.type === ItemType.PRODUCT && (
              <Input
                label="Stock Disponible *"
                type="number"
                value={newItem.stock || ''}
                onChange={e => setNewItem({ ...newItem, stock: Number(e.target.value) })}
              />
            )}
          </div>
          <div className="pt-4 flex justify-end gap-3">
             <Button variant="secondary" onClick={() => setIsAddModalOpen(false)}>Cancelar</Button>
             <Button 
               onClick={handleSave} 
               disabled={saving}
               className="bg-[#e2b808] hover:bg-[#d4a017] text-[#0f172a] border-[#d4a017]"
             >
               {saving ? 'Guardando...' : 'Guardar Ítem'}
             </Button>
          </div>
        </div>
      </Modal>

      {/* Edit Modal */}
      <Modal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} title="Editar Ítem">
        <div className="space-y-4">
          <Input
            label="Nombre del Servicio / Producto *"
            value={editingItem?.name || ''}
            onChange={e => setEditingItem(editingItem ? { ...editingItem, name: e.target.value } : null)}
          />
          <div className="grid grid-cols-2 gap-4">
             <div>
              <label className="block text-xs font-bold text-[#94a3b8] uppercase tracking-wider mb-2">
                Tipo *
              </label>
              <select
                className="w-full bg-[#0f172a] border border-[#334155] text-[#f8fafc] rounded-lg px-4 py-3 transition-colors focus:border-[#e2b808] focus:outline-none appearance-none"
                value={editingItem?.type || ItemType.PRODUCT}
                onChange={e => setEditingItem(editingItem ? { ...editingItem, type: e.target.value as ItemType } : null)}
              >
                <option value={ItemType.SERVICE}>Servicio</option>
                <option value={ItemType.PRODUCT}>Producto Físico</option>
              </select>
            </div>
            <Input
              label="Marca / Categoría"
              value={editingItem?.brand || ''}
              onChange={e => setEditingItem(editingItem ? { ...editingItem, brand: e.target.value } : null)}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Precio al Público *"
              type="number"
              value={editingItem?.price || ''}
              onChange={e => setEditingItem(editingItem ? { ...editingItem, price: Number(e.target.value) } : null)}
            />
            {editingItem?.type === ItemType.PRODUCT && (
              <Input
                label="Stock Disponible *"
                type="number"
                value={editingItem?.stock || 0}
                onChange={e => setEditingItem(editingItem ? { ...editingItem, stock: Number(e.target.value) } : null)}
              />
            )}
          </div>
          <div className="pt-4 flex justify-end gap-3">
             <Button variant="secondary" onClick={() => setIsEditModalOpen(false)}>Cancelar</Button>
             <Button 
               onClick={handleUpdate} 
               disabled={saving}
               className="bg-[#e2b808] hover:bg-[#d4a017] text-[#0f172a] border-[#d4a017]"
             >
               {saving ? 'Actualizando...' : 'Actualizar Ítem'}
             </Button>
          </div>
        </div>
      </Modal>

    </div>
  );
};

export default Inventory;