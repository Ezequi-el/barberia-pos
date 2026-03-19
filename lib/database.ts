import { supabase } from './supabase';
import { CatalogItem, Transaction, CartItem, Appointment } from '../types';
import { Globals } from './globals';

// ============================================================================
// TIMEOUT UTILITY
// ============================================================================

const withTimeout = async <T>(promise: PromiseLike<T>, ms: number = 8000, context: string = 'DB'): Promise<T> => {
  return await promise;
};

// ============================================================================
// SUPABASE MULTI-TENANT HELPER
// ============================================================================

const generateId = (): string => {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

let cachedBusinessId: string | null = null;
let lastBusinessIdFetch = 0;

const requireUserId = async (): Promise<string> => {
  if (Globals.USER_ID) return Globals.USER_ID;
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) throw new Error('User not authenticated');
  return session.user.id;
};

export const getBusinessId = async (): Promise<string> => {
  if (Globals.BUSINESS_ID) return Globals.BUSINESS_ID;

  if (!supabase) throw new Error('Supabase not initialized');
  
  // Use memory cache if less than 5 minutes old
  if (cachedBusinessId && Date.now() - lastBusinessIdFetch < 1000 * 60 * 5) {
    return cachedBusinessId;
  }

  const userId = await requireUserId();

  let { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('business_id')
    .eq('id', userId)
    .single();

  if (profileError && profileError.code !== 'PGRST116') { 
    console.error('Error fetching profile:', profileError);
    alert('DB Error fetching profile: ' + profileError.message);
    throw profileError;
  }

  if (!profile) {
    const newBusinessId = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : generateId();
    const { data: newProfile, error: insertError } = await withTimeout(supabase
      .from('profiles')
      .insert([{ id: userId, business_id: newBusinessId, role: 'owner' }])
      .select('business_id')
      .single(), 8000, 'create profile');
      
    if (insertError) {
      console.error('Error creating profile:', insertError);
      alert('DB Error creating profile: ' + insertError.message);
      throw insertError;
    }
    profile = newProfile;
  }

  cachedBusinessId = profile?.business_id;
  lastBusinessIdFetch = Date.now();
  return cachedBusinessId as string;
};

// ============================================================================
// CATALOG ITEMS OPERATIONS
// ============================================================================

export const getCatalogItems = async (): Promise<CatalogItem[]> => {
  if (!supabase) throw new Error('Supabase not initialized');
  const businessId = await getBusinessId();
  
  const { data, error } = await withTimeout(supabase
    .from('productos')
    .select('*')
    .eq('business_id', businessId)
    .order('created_at', { ascending: false }), 8000, 'getCatalogItems');

  if (error) {
    console.error('Error fetching catalog items:', error);
    alert('DB Error fetching catalog items: ' + error.message);
    throw error;
  }

  return data || [];
};

export const addCatalogItem = async (item: Omit<CatalogItem, 'id'>): Promise<CatalogItem> => {
  if (!supabase) throw new Error('Supabase not initialized');
  const userId = await requireUserId();
  
  const businessId = await getBusinessId();

  const { data, error } = await withTimeout(supabase
    .from('productos')
    .insert([{
      user_id: userId,
      business_id: businessId,
      name: item.name,
      type: item.type,
      price: Number(item.price),
      brand: item.brand || 'General',
      stock: item.stock !== undefined && item.stock !== null ? Number(item.stock) : null,
    }])
    .select()
    .single(), 8000, 'addCatalogItem');

  if (error) {
    console.error('Error adding catalog item:', error);
    alert('DB Error adding catalog item: ' + error.message);
    throw error;
  }

  return data;
};

export const updateCatalogItem = async (id: string, updates: Partial<CatalogItem>): Promise<void> => {
  if (!supabase) throw new Error('Supabase not initialized');
  const businessId = await getBusinessId();

  // Create a clean payload mapping explicitly to database columns
  // Omit ID and any other injected fields like user_id or created_at
  const dbUpdates: any = {};

  if ('name' in updates && updates.name !== undefined) dbUpdates.name = updates.name;
  if ('type' in updates && updates.type !== undefined) dbUpdates.type = updates.type;
  if ('brand' in updates && updates.brand !== undefined) dbUpdates.brand = updates.brand;
  
  // Force numeric conversions
  if ('price' in updates && updates.price !== undefined) {
    dbUpdates.price = Number(updates.price);
  }
  
  if ('stock' in updates && updates.stock !== undefined) {
    dbUpdates.stock = updates.stock === null || String(updates.stock) === '' ? null : Number(updates.stock);
  }

  // Cost isn't supported in all environments; dropping to ensure safe mapping.

  const { data, error } = await withTimeout(supabase
    .from('productos')
    .update(dbUpdates)
    .eq('id', id)
    .eq('business_id', businessId)
    .select(), 8000, 'updateCatalogItem');

  if (error) {
    console.error('Supabase Update Error:', error);
    throw new Error(`DB Error: ${error.message} - ${error.details || ''}`);
  }

  if (!data || data.length === 0) {
    console.error(`Update failed: No rows matched id=${id} and business_id=${businessId}`);
    throw new Error('El producto no existe o no pertenece a este negocio.');
  }
};

export const deleteCatalogItem = async (id: string): Promise<void> => {
  if (!supabase) throw new Error('Supabase not initialized');
  const businessId = await getBusinessId();

  const { error } = await withTimeout(supabase
    .from('productos')
    .delete()
    .eq('id', id)
    .eq('business_id', businessId), 8000, 'deleteCatalogItem');

  if (error) {
    console.error('Supabase Delete Error:', error);
    if (error.code === '23503') {
      throw new Error('Seguridad: No se puede borrar este ítem porque ya tiene ventas registradas en el historial. Si ya no lo usas, edítalo y ponle "[INACTIVO]" en el nombre.');
    }
    throw new Error(`DB Delete Error: ${error.message}`);
  }
};

export const deductStock = async (itemId: string, quantity: number): Promise<void> => {
  if (!supabase) throw new Error('Supabase not initialized');
  const businessId = await getBusinessId();

  const { data: item, error: fetchError } = await withTimeout(supabase
    .from('productos')
    .select('stock')
    .eq('id', itemId)
    .eq('business_id', businessId)
    .single(), 8000, 'deductStock fetch');

  if (fetchError) throw fetchError;
  if (!item || item.stock === null) return;

  const newStock = item.stock - quantity;
  const { error: updateError } = await withTimeout(supabase
    .from('productos')
    .update({ stock: newStock })
    .eq('id', itemId)
    .eq('business_id', businessId), 8000, 'deductStock update');

  if (updateError) throw updateError;
};

// ============================================================================
// TRANSACTIONS OPERATIONS
// ============================================================================

export const getTransactions = async (): Promise<Transaction[]> => {
  if (!supabase) throw new Error('Supabase not initialized');
  const businessId = await getBusinessId();

  const { data, error } = await withTimeout(supabase
    .from('pedidos')
    .select(`*, variantes (*)`)
    .eq('business_id', businessId)
    .order('created_at', { ascending: false }), 8000, 'getTransactions');

  if (error) {
    console.error('Error fetching transactions:', error);
    throw error;
  }

  const transactions: Transaction[] = (data || []).map((t: any) => ({
    id: t.id,
    date: t.created_at,
    userId: t.user_id,
    barber: t.barber,
    total: parseFloat(t.total),
    paymentMethod: t.payment_method,
    reference: t.reference,
    items: (t.variantes || []).map((ti: any) => ({
      id: ti.producto_id || ti.id,
      name: ti.name || ti.item_name,
      type: ti.type || ti.item_type,
      price: parseFloat(ti.price || ti.item_price),
      quantity: ti.quantity,
    })),
  }));

  return transactions;
};

export const createTransaction = async (
  transaction: Omit<Transaction, 'id' | 'date'>
): Promise<Transaction> => {
  if (!supabase) throw new Error('Supabase not initialized');
  const userId = await requireUserId();
  const businessId = await getBusinessId();

  const { data: transactionData, error: transactionError } = await withTimeout(supabase
    .from('pedidos')
    .insert([{
      user_id: userId,
      business_id: businessId,
      barber: transaction.barber,
      total: transaction.total,
      payment_method: transaction.paymentMethod,
      reference: transaction.reference,
    }])
    .select()
    .single(), 8000, 'createTransaction base');

  if (transactionError) {
    console.error('Error creating transaction:', transactionError);
    throw transactionError;
  }

  const transactionItems = transaction.items.map((item: CartItem) => ({
    pedido_id: transactionData.id,
    producto_id: item.id,
    name: item.name,
    type: item.type,
    price: item.price,
    quantity: item.quantity,
    subtotal: item.price * item.quantity,
    business_id: businessId, 
  }));

  const { error: itemsError } = await withTimeout(supabase
    .from('variantes')
    .insert(transactionItems), 8000, 'createTransaction items');

  if (itemsError) {
    console.error('Error creating transaction items:', itemsError);
    throw itemsError;
  }

  for (const item of transaction.items) {
    if (item.type === 'PRODUCT' && item.stock !== undefined) {
      await deductStock(item.id, item.quantity);
    }
  }

  return {
    id: transactionData.id,
    date: transactionData.created_at,
    barber: transaction.barber,
    total: transaction.total,
    paymentMethod: transaction.paymentMethod,
    reference: transaction.reference,
    items: transaction.items,
  };
};

export const seedCatalog = async (seedData: Omit<CatalogItem, 'id'>[]): Promise<void> => {
  if (!supabase) throw new Error('Supabase not initialized');
  const userId = await requireUserId();
  
  const businessId = await getBusinessId();

  const { data: existing } = await withTimeout(supabase
    .from('productos')
    .select('id')
    .eq('business_id', businessId)
    .limit(1), 8000, 'seedCatalog load');

  if (existing && existing.length > 0) return;

  const catalogItems = seedData.map(item => ({
    user_id: userId,
    business_id: businessId,
    name: item.name,
    type: item.type,
    price: item.price,
    brand: item.brand,
    stock: item.stock,
    cost: item.cost,
  }));

  const { error } = await withTimeout(supabase
    .from('productos')
    .insert(catalogItems), 8000, 'seedCatalog items');

  if (error) {
    console.error('Error seeding catalog:', error);
    alert('DB Error seeding catalog: ' + error.message);
    throw error;
  }
};

// ============================================================================
// APPOINTMENTS OPERATIONS
// ============================================================================

export const getAppointments = async (): Promise<Appointment[]> => {
  if (!supabase) throw new Error('Supabase not initialized');
  const businessId = await getBusinessId();

  const { data, error } = await withTimeout(supabase
    .from('citas')
    .select('*')
    .eq('business_id', businessId)
    .order('date', { ascending: true }), 8000, 'getAppointments');

  if (error) throw error;
  
  return (data || []).map((a: any) => ({
    id: a.id,
    clientName: a.clientname || a.clientName,
    date: a.date,
    time: a.time,
    barber: a.barber,
    service: a.service,
    status: a.status,
    notes: a.notes
  }));
};

export const createAppointment = async (appointment: Omit<Appointment, 'id'>): Promise<Appointment> => {
  if (!supabase) throw new Error('Supabase not initialized');
  const userId = await requireUserId();
  
  const businessId = await getBusinessId();

  const { data, error } = await withTimeout(supabase
    .from('citas')
    .insert([{ 
      clientname: appointment.clientName,
      date: appointment.date,
      time: appointment.time,
      barber: appointment.barber,
      service: appointment.service,
      status: appointment.status,
      notes: appointment.notes,
      user_id: userId, 
      business_id: businessId 
    }])
    .select()
    .single(), 8000, 'createAppointment');

  if (error) throw error;
  return data;
};

export const updateAppointment = async (id: string, updates: Partial<Appointment>): Promise<Appointment> => {
  if (!supabase) throw new Error('Supabase not initialized');
  const businessId = await getBusinessId();

  const dbUpdates: any = { ...updates };
  if (updates.clientName) {
    dbUpdates.clientname = updates.clientName;
    delete dbUpdates.clientName;
  }

  const { data, error } = await withTimeout(supabase
    .from('citas')
    .update(dbUpdates)
    .eq('id', id)
    .eq('business_id', businessId)
    .select()
    .single(), 8000, 'updateAppointment');

  if (error) throw error;
  return data;
};

export const deleteAppointment = async (id: string): Promise<void> => {
  if (!supabase) throw new Error('Supabase not initialized');
  const businessId = await getBusinessId();

  const { error } = await withTimeout(supabase
    .from('citas')
    .delete()
    .eq('id', id)
    .eq('business_id', businessId), 8000, 'deleteAppointment');

  if (error) throw error;
};

// ============================================================================
// CUSTOMERS OPERATIONS
// ============================================================================

export const getCustomers = async () => {
  if (!supabase) throw new Error('Supabase not initialized');
  const businessId = await getBusinessId();

  const { data, error } = await supabase
    .from('customers')
    .select('*')
    .eq('business_id', businessId)
    .order('name', { ascending: true });

  if (error) throw error;
  return data || [];
};

export const createCustomer = async (customer: {
  name: string;
  phone?: string;
  email?: string;
  notes?: string;
}) => {
  if (!supabase) throw new Error('Supabase not initialized');
  const businessId = await getBusinessId();

  const { data, error } = await supabase
    .from('customers')
    .insert([{
      name: customer.name,
      phone: customer.phone || null,
      email: customer.email || null,
      notes: customer.notes || null,
      visits: 0,
      total_spent: 0,
      business_id: businessId,
    }])
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const deleteCustomer = async (id: string): Promise<void> => {
  if (!supabase) throw new Error('Supabase not initialized');
  const businessId = await getBusinessId();

  const { error } = await supabase
    .from('customers')
    .delete()
    .eq('id', id)
    .eq('business_id', businessId);

  if (error) throw error;
};
