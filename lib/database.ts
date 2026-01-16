import { supabase } from './supabase';
import { CatalogItem, Transaction, CartItem, BarberSession, Appointment } from '../types';
import { SEED_CATALOG } from '../constants';

/**
 * Catalog Items Operations
 */
/**
 * Catalog Items Operations
 */
export const getCatalogItems = async (): Promise<CatalogItem[]> => {
  const { data: { user } } = await supabase.auth.getUser();
  const userId = user?.id || 'demo-user-id';

  // Fetch Services
  const { data: services, error: servicesError } = await supabase
    .from('servicios')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (servicesError) {
    console.error('Error fetching services:', servicesError);
  }

  // Fetch Inventory (Products)
  const { data: products, error: productsError } = await supabase
    .from('inventario')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (productsError) {
    console.error('Error fetching inventory:', productsError);
  }

  const mappedServices = (services || []).map((item: any) => ({
    id: item.id,
    name: item.nombre,
    type: item.categoria || 'SERVICE', // Ensure type/category
    price: item.precio,
    // Services generally don't have brand/stock/cost, but satisfying type definition
    brand: undefined,
    stock: undefined,
    cost: undefined,
  }));

  const mappedProducts = (products || []).map((item: any) => ({
    id: item.id,
    name: item.nombre,
    type: 'PRODUCT', // Explicitly PRODUCT for inventory
    price: item.precio_venta,
    brand: item.marca,
    stock: item.stock,
    cost: 0, // cost not specified in read requirement, defaulting to 0 or check if exists
  }));

  // Auto-seed not reimplemented effectively unless checked against both, assuming DB is primed or we don't need auto-seed for new structure immediately.
  // Leaving it out or keeping simple check if absolutely empty? 
  // User said "La base de datos ... ha sido actualizada", so maybe seeding isn't critical or seeds should go to specific tables.
  // Skipping complex auto-seed for now to focus on structure.

  return [...mappedServices, ...mappedProducts];
};

export const addService = async (item: Omit<CatalogItem, 'id'>): Promise<CatalogItem> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');

  const { data, error } = await supabase
    .from('servicios')
    .insert([{
      user_id: user.id,
      nombre: item.name,
      categoria: item.type, // 'SERVICE' or specific category
      precio: item.price,
    }])
    .select()
    .single();

  if (error) {
    console.error('Error adding service:', error);
    throw error;
  }

  return {
    id: data.id,
    name: data.nombre,
    type: data.categoria,
    price: data.precio,
  } as CatalogItem;
};

export const addProduct = async (item: Omit<CatalogItem, 'id'>): Promise<CatalogItem> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');

  const { data, error } = await supabase
    .from('inventario')
    .insert([{
      user_id: user.id,
      nombre: item.name,
      precio_venta: item.price,
      marca: item.brand,
      stock: item.stock,
    }])
    .select()
    .single();

  if (error) {
    console.error('Error adding product:', error);
    throw error;
  }

  return {
    id: data.id,
    name: data.nombre,
    type: 'PRODUCT',
    price: data.precio_venta,
    brand: data.marca,
    stock: data.stock,
  } as CatalogItem;
};

// Deprecated or mapped wrapper for backward compatibility if needed, but components will be updated.
export const addCatalogItem = async (item: Omit<CatalogItem, 'id'>): Promise<CatalogItem> => {
  if (item.type === 'PRODUCT') {
    return addProduct(item);
  } else {
    return addService(item);
  }
};

export const updateCatalogItem = async (id: string, updates: Partial<CatalogItem>, type: 'SERVICE' | 'PRODUCT'): Promise<void> => {
  const table = type === 'PRODUCT' ? 'inventario' : 'servicios';
  const dbUpdates: any = {};

  if (updates.name) dbUpdates.nombre = updates.name;
  if (updates.price) {
    if (type === 'PRODUCT') dbUpdates.precio_venta = updates.price;
    else dbUpdates.precio = updates.price;
  }
  if (type === 'PRODUCT') {
    if (updates.brand) dbUpdates.marca = updates.brand;
    if (updates.stock !== undefined) dbUpdates.stock = updates.stock;
  } else {
    if (updates.type) dbUpdates.categoria = updates.type;
  }

  const { error } = await supabase
    .from(table)
    .update(dbUpdates)
    .eq('id', id);

  if (error) {
    console.error('Error updating item:', error);
    throw error;
  }
};

export const deductStock = async (itemId: string, quantity: number): Promise<void> => {
  // Get current stock from INVENTARIO
  const { data: item, error: fetchError } = await supabase
    .from('inventario')
    .select('stock')
    .eq('id', itemId)
    .single();

  if (fetchError) throw fetchError;
  if (!item || item.stock === null) return;

  // Update stock
  const newStock = item.stock - quantity;
  const { error: updateError } = await supabase
    .from('inventario')
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
    // Link to services table if it's a service
    servicio_id: item.type === 'SERVICE' ? item.id : null,
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
    name: b.nombre,
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
      nombre: barber.name,
      fecha_nacimiento: barber.birthDate,
      numero_silla: barber.chairNumber
    }])
    .select()
    .single();

  if (error) throw error;
  return {
    id: data.id,
    name: data.nombre,
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

