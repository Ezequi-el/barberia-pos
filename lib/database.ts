import { supabase } from './supabase';
import { CatalogItem, Transaction, CartItem, BarberSession, Appointment } from '../types';
import { SEED_CATALOG } from '../constants';

/**
 * Catalog Items Operations
 */
export const getCatalogItems = async (): Promise<CatalogItem[]> => {
  const { data: { user } } = await supabase.auth.getUser();
  const userId = user?.id || 'demo-user-id';

  const { data, error } = await supabase
    .from('catalog_items')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching catalog items:', error);
    throw error;
  }

  // Auto-seed if empty or missing core services in Demo Mode
  const hasCoreServices = data && data.some(item => item.name === 'Corte de Cabello');
  if (!data || data.length === 0 || !hasCoreServices) {
    console.log('Catalog empty or missing core services, seeding...');
    await seedCatalog(SEED_CATALOG);
    // Fetch again to get IDs or return combined
    const { data: updatedData } = await supabase
      .from('catalog_items')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    return updatedData || (SEED_CATALOG as CatalogItem[]);
  }

  return data || [];
};

export const addCatalogItem = async (item: Omit<CatalogItem, 'id'>): Promise<CatalogItem> => {
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) throw new Error('User not authenticated');

  const { data, error } = await supabase
    .from('catalog_items')
    .insert([{
      user_id: user.id,
      name: item.name,
      type: item.type,
      price: item.price,
      brand: item.brand,
      stock: item.stock,
      cost: item.cost,
    }])
    .select()
    .single();

  if (error) {
    console.error('Error adding catalog item:', error);
    throw error;
  }

  return data;
};

export const updateCatalogItem = async (id: string, updates: Partial<CatalogItem>): Promise<void> => {
  const { error } = await supabase
    .from('catalog_items')
    .update(updates)
    .eq('id', id);

  if (error) {
    console.error('Error updating catalog item:', error);
    throw error;
  }
};

export const deductStock = async (itemId: string, quantity: number): Promise<void> => {
  // Get current stock
  const { data: item, error: fetchError } = await supabase
    .from('catalog_items')
    .select('stock')
    .eq('id', itemId)
    .single();

  if (fetchError) throw fetchError;
  if (!item || item.stock === null) return;

  // Update stock
  const newStock = item.stock - quantity;
  const { error: updateError } = await supabase
    .from('catalog_items')
    .update({ stock: newStock })
    .eq('id', itemId);

  if (updateError) throw updateError;
};

/**
 * Transactions Operations
 */
export const getTransactions = async (): Promise<Transaction[]> => {
  const { data: { user } } = await supabase.auth.getUser();
  const userId = user?.id || 'demo-user-id';

  const { data, error } = await supabase
    .from('transactions')
    .select(`
      *,
      transaction_items (*)
    `)
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching transactions:', error);
    throw error;
  }

  // Transform the data to match our Transaction type
  const transactions: Transaction[] = (data || []).map((t: any) => ({
    id: t.id,
    date: t.created_at,
    barber: t.barber,
    total: parseFloat(t.total),
    paymentMethod: t.payment_method,
    reference: t.reference,
    items: (t.transaction_items || []).map((ti: any) => ({
      id: ti.catalog_item_id || ti.id,
      name: ti.item_name,
      type: ti.item_type,
      price: parseFloat(ti.item_price),
      quantity: ti.quantity,
    })),
  }));

  return transactions;
};

export const createTransaction = async (
  transaction: Omit<Transaction, 'id' | 'date'>
): Promise<Transaction> => {
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) throw new Error('User not authenticated');

  // Start a transaction by inserting the main transaction record
  const { data: transactionData, error: transactionError } = await supabase
    .from('transactions')
    .insert([{
      user_id: user.id,
      barber: transaction.barber,
      total: transaction.total,
      payment_method: transaction.paymentMethod,
      reference: transaction.reference,
    }])
    .select()
    .single();

  if (transactionError) {
    console.error('Error creating transaction:', transactionError);
    throw transactionError;
  }

  // Insert transaction items
  const transactionItems = transaction.items.map((item: CartItem) => ({
    transaction_id: transactionData.id,
    catalog_item_id: item.id,
    item_name: item.name,
    item_type: item.type,
    item_price: item.price,
    quantity: item.quantity,
    subtotal: item.price * item.quantity,
  }));

  const { error: itemsError } = await supabase
    .from('transaction_items')
    .insert(transactionItems);

  if (itemsError) {
    console.error('Error creating transaction items:', itemsError);
    throw itemsError;
  }

  // Deduct stock for products
  for (const item of transaction.items) {
    if (item.type === 'PRODUCT' && item.stock !== undefined) {
      await deductStock(item.id, item.quantity);
    }
  }

  // Return the created transaction with items
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

/**
 * Initialize catalog with seed data
 */
export const seedCatalog = async (seedData: Omit<CatalogItem, 'id'>[]): Promise<void> => {
  const { data: { user } } = await supabase.auth.getUser();
  const userId = user?.id || 'demo-user-id';

  // Check if user already has catalog items
  const { data: existing } = await supabase
    .from('catalog_items')
    .select('id')
    .eq('user_id', userId)
    .limit(1);

  if (existing && existing.length > 0) {
    // User already has catalog items, don't seed
    return;
  }

  // Insert seed data
  const catalogItems = seedData.map(item => ({
    user_id: userId,
    name: item.name,
    type: item.type,
    price: item.price,
    brand: item.brand,
    stock: item.stock || 0,
    cost: item.cost || 0,
  }));

  // Filtering out items that already exist by name
  const filteredItems = [];
  for (const item of catalogItems) {
    const { data: exists } = await supabase
      .from('catalog_items')
      .select('id')
      .eq('user_id', userId)
      .eq('name', item.name)
      .limit(1);
    if (!exists || exists.length === 0) {
      filteredItems.push(item);
    }
  }

  if (filteredItems.length === 0) return;

  const { error } = await supabase
    .from('catalog_items')
    .insert(filteredItems);

  if (error) {
    console.error('Error seeding catalog:', error);
    throw error;
  }
};

/**
 * Staff Operations
 */
export const getBarbers = async (): Promise<BarberSession[]> => {
  const { data: { user } } = await supabase.auth.getUser();
  const userId = user?.id || 'demo-user-id';

  const { data, error } = await supabase
    .from('barbers')
    .select('*')
    .eq('user_id', userId)
    .order('name', { ascending: true });

  if (error) throw error;
  return (data || []).map((b: any) => ({
    id: b.id,
    name: b.name,
    birthDate: b.fecha_nacimiento,
    chairNumber: b.numero_silla
  }));
};

export const addBarber = async (barber: Omit<BarberSession, 'id'>): Promise<BarberSession> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');

  const { data, error } = await supabase
    .from('barbers')
    .insert([{
      user_id: user.id,
      name: barber.name,
      fecha_nacimiento: barber.birthDate,
      numero_silla: barber.chairNumber
    }])
    .select()
    .single();

  if (error) throw error;
  return {
    id: data.id,
    name: data.name,
    birthDate: data.fecha_nacimiento,
    chairNumber: data.numero_silla
  };
};

/**
 * Appointments Operations
 */
export const getAppointments = async (): Promise<Appointment[]> => {
  const { data: { user } } = await supabase.auth.getUser();
  const userId = user?.id || 'demo-user-id';

  const { data, error } = await supabase
    .from('appointments')
    .select('*')
    .eq('user_id', userId)
    .order('date', { ascending: true });

  if (error) throw error;
  return (data || []).map((a: any) => ({
    id: a.id,
    customerName: a.customer_name,
    customerPhone: a.customer_phone,
    date: a.date,
    time: a.time,
    barberId: a.barber_id,
    status: a.status,
    notes: a.notes
  }));
};

export const createAppointment = async (appointment: Omit<Appointment, 'id'>): Promise<Appointment> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');

  const { data, error } = await supabase
    .from('appointments')
    .insert([{
      user_id: user.id,
      customer_name: appointment.customerName,
      customer_phone: appointment.customerPhone,
      date: appointment.date,
      time: appointment.time,
      barber_id: appointment.barberId,
      status: appointment.status,
      notes: appointment.notes
    }])
    .select()
    .single();

  if (error) throw error;
  return {
    id: data.id,
    customerName: data.customer_name,
    customerPhone: data.customer_phone,
    date: data.date,
    time: data.time,
    barberId: data.barber_id,
    status: data.status,
    notes: data.notes
  };
};

export const updateAppointmentStatus = async (id: string, status: Appointment['status']): Promise<void> => {
  const { error } = await supabase
    .from('appointments')
    .update({ status })
    .eq('id', id);

  if (error) throw error;
};

