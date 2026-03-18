import React, { useState, useEffect } from 'react';
import { CatalogItem, ItemType } from '../types';
import { Plus, ChevronLeft, Search, Edit2 } from 'lucide-react';
import Button from './Button';
import Modal from './Modal';
import Input from './Input';
import { getCatalogItems, addCatalogItem, updateCatalogItem } from '../lib/database';

interface InventoryProps {
  onBack: () => void;
}

const Inventory: React.FC<InventoryProps> = ({ onBack }) => {
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
    brand: 'Barberlife',
  });

  // Load items on mount
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

  const products = items.filter(i => i.type === ItemType.PRODUCT && i.name.toLowerCase().includes(search.toLowerCase()));

  const handleSave = async () => {
    if (!newItem.name || !newItem.price || newItem.stock === undefined) {
      alert("Completa los campos obligatorios");
      return;
    }

    try {
      setSaving(true);
      await addCatalogItem({
        name: newItem.name,
        type: ItemType.PRODUCT,
        price: Number(newItem.price),
        cost: Number(newItem.cost || 0),
        stock: Number(newItem.stock),
        brand: newItem.brand || 'General'
      });

      // Reload items
      await loadItems();

      setIsAddModalOpen(false);
      setNewItem({ type: ItemType.PRODUCT, brand: 'Barberlife' });
    } catch (error) {
      console.error('Error adding item:', error);
      alert('Error al agregar el producto');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (item: CatalogItem) => {
    setEditingItem({ ...item });
    setIsEditModalOpen(true);
  };

  const handleUpdate = async () => {
    if (!editingItem || !editingItem.name || !editingItem.price || editingItem.stock === undefined) {
      alert("Completa los campos obligatorios");
      return;
    }

    try {
      setSaving(true);
      await updateCatalogItem(editingItem.id, {
        name: editingItem.name,
        price: Number(editingItem.price),
        cost: Number(editingItem.cost || 0),
        stock: Number(editingItem.stock),
        brand: editingItem.brand || 'General'
      });

      // Reload items
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

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-zinc-950">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-zinc-400 animate-pulse">Cargando inventario...</p>
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
            <h2 className="text-3xl font-heading font-bold text-white uppercase tracking-wide">Inventario</h2>
            <p className="text-zinc-500">Gestión de stock de productos</p>
          </div>
        </div>
        <Button onClick={() => setIsAddModalOpen(true)} className="gap-2">
          <Plus size={18} /> Nuevo Producto
        </Button>
      </div>

      {/* Toolbar */}
      <div className="mb-6 flex gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-zinc-500" size={18} />
          <input
            type="text"
            placeholder="Buscar producto..."
            className="w-full bg-zinc-900 border border-zinc-800 rounded-lg pl-10 pr-4 py-3 text-sm text-white focus:border-amber-500 focus:outline-none"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto bg-zinc-900 border border-zinc-800 rounded-xl shadow-xl">
        <table className="w-full text-left border-collapse">
          <thead className="bg-zinc-950 text-zinc-400 uppercase text-xs font-bold tracking-wider sticky top-0 z-10">
            <tr>
              <th className="p-4 border-b border-zinc-800">Producto</th>
              <th className="p-4 border-b border-zinc-800">Marca</th>
              <th className="p-4 border-b border-zinc-800 text-right">Costo</th>
              <th className="p-4 border-b border-zinc-800 text-right">Precio Venta</th>
              <th className="p-4 border-b border-zinc-800 text-center">Stock</th>
              <th className="p-4 border-b border-zinc-800 text-center">Estado</th>
              <th className="p-4 border-b border-zinc-800 text-center">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800">
            {products.map(product => (
              <tr key={product.id} className="hover:bg-zinc-800/50 transition-colors">
                <td className="p-4 font-medium text-zinc-100">{product.name}</td>
                <td className="p-4 text-zinc-400">{product.brand}</td>
                <td className="p-4 text-right text-zinc-500">${product.cost}</td>
                <td className="p-4 text-right text-amber-500 font-bold">${product.price}</td>
                <td className="p-4 text-center font-bold">{product.stock}</td>
                <td className="p-4 text-center">
                  <span className={`text-xs px-2 py-1 rounded uppercase font-bold ${(product.stock || 0) < 5 ? 'bg-red-500/10 text-red-500' : 'bg-green-500/10 text-green-500'}`}>
                    {(product.stock || 0) < 5 ? 'Bajo' : 'OK'}
                  </span>
                </td>
                <td className="p-4 text-center">
                  <button
                    onClick={() => handleEdit(product)}
                    className="p-2 hover:bg-amber-500/10 rounded-lg text-zinc-400 hover:text-amber-500 transition-colors"
                    title="Editar producto"
                  >
                    <Edit2 size={16} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {products.length === 0 && (
          <div className="p-12 text-center text-zinc-500">
            No se encontraron productos.
          </div>
        )}
      </div>

      {/* Add Modal */}
      <Modal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} title="Agregar Producto">
        <div className="space-y-4">
          <Input
            label="Nombre del Producto"
            value={newItem.name || ''}
            onChange={e => setNewItem({ ...newItem, name: e.target.value })}
          />
          <Input
            label="Marca"
            value={newItem.brand || ''}
            onChange={e => setNewItem({ ...newItem, brand: e.target.value })}
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Precio Compra (Costo)"
              type="number"
              value={newItem.cost || ''}
              onChange={e => setNewItem({ ...newItem, cost: Number(e.target.value) })}
            />
            <Input
              label="Precio Venta"
              type="number"
              value={newItem.price || ''}
              onChange={e => setNewItem({ ...newItem, price: Number(e.target.value) })}
            />
          </div>
          <Input
            label="Stock Inicial"
            type="number"
            value={newItem.stock || ''}
            onChange={e => setNewItem({ ...newItem, stock: Number(e.target.value) })}
          />
          <div className="pt-4">
            <Button onClick={handleSave} fullWidth disabled={saving}>
              {saving ? 'Guardando...' : 'Guardar Producto'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Edit Modal */}
      <Modal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} title="Editar Producto">
        <div className="space-y-4">
          <Input
            label="Nombre del Producto"
            value={editingItem?.name || ''}
            onChange={e => setEditingItem(editingItem ? { ...editingItem, name: e.target.value } : null)}
          />
          <Input
            label="Marca"
            value={editingItem?.brand || ''}
            onChange={e => setEditingItem(editingItem ? { ...editingItem, brand: e.target.value } : null)}
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Precio Compra (Costo)"
              type="number"
              value={editingItem?.cost || ''}
              onChange={e => setEditingItem(editingItem ? { ...editingItem, cost: Number(e.target.value) } : null)}
            />
            <Input
              label="Precio Venta"
              type="number"
              value={editingItem?.price || ''}
              onChange={e => setEditingItem(editingItem ? { ...editingItem, price: Number(e.target.value) } : null)}
            />
          </div>
          <Input
            label="Stock Actual"
            type="number"
            value={editingItem?.stock || ''}
            onChange={e => setEditingItem(editingItem ? { ...editingItem, stock: Number(e.target.value) } : null)}
          />
          <div className="pt-4">
            <Button onClick={handleUpdate} fullWidth disabled={saving}>
              {saving ? 'Actualizando...' : 'Actualizar Producto'}
            </Button>
          </div>
        </div>
      </Modal>

    </div>
  );
};

export default Inventory;