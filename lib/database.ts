import { supabase, isDemoMode } from './supabase';
import { CatalogItem, Transaction, CartItem, Appointment } from '../types';

// ============================================================================
// LOCALSTORAGE HELPERS (DEMO MODE)
// ============================================================================

const STORAGE_KEYS = {
  CATALOG: 'neron_catalog',
  TRANSACTIONS: 'neron_transactions',
  SEEDED: 'neron_seeded',
};

const getFromStorage = <T>(key: string): T | null => {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : null;
  } catch (error) {
    console.error('Error reading from localStorage:', error);
    return null;
  }
};

const saveToStorage = <T>(key: string, value: T): void => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.error('Error saving to localStorage:', error);
  }
};

const generateId = (): string => {
  // Generate unique ID using timestamp + random
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

// ============================================================================
// CATALOG ITEMS OPERATIONS (DUAL MODE)
// ============================================================================

export const getCatalogItems = async (): Promise<CatalogItem[]> => {
  if (isDemoMode) {
    // DEMO MODE: Read from localStorage
    const catalog = getFromStorage<CatalogItem[]>(STORAGE_KEYS.CATALOG);
    return catalog || [];
  } else {
    // SUPABASE MODE: Original logic
    if (!supabase) throw new Error('Supabase not initialized');
    const { data, error } = await supabase
      .from('catalog_items')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching catalog items:', error);
      throw error;
    }

    return data || [];
  }
};

export const addCatalogItem = async (item: Omit<CatalogItem, 'id'>): Promise<CatalogItem> => {
  if (isDemoMode) {
    // DEMO MODE: Add to localStorage
    const catalog = getFromStorage<CatalogItem[]>(STORAGE_KEYS.CATALOG) || [];
    const newItem: CatalogItem = {
      id: generateId(),
      ...item,
    };
    catalog.push(newItem);
    saveToStorage(STORAGE_KEYS.CATALOG, catalog);
    return newItem;
  } else {
    // SUPABASE MODE: Original logic
    if (!supabase) throw new Error('Supabase not initialized');
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
  }
};

export const updateCatalogItem = async (id: string, updates: Partial<CatalogItem>): Promise<void> => {
  if (isDemoMode) {
    // DEMO MODE: Update in localStorage
    const catalog = getFromStorage<CatalogItem[]>(STORAGE_KEYS.CATALOG) || [];
    const updatedCatalog = catalog.map(item =>
      item.id === id ? { ...item, ...updates } : item
    );
    saveToStorage(STORAGE_KEYS.CATALOG, updatedCatalog);
  } else {
    // SUPABASE MODE: Original logic
    if (!supabase) throw new Error('Supabase not initialized');
    const { error } = await supabase
      .from('catalog_items')
      .update(updates)
      .eq('id', id);

    if (error) {
      console.error('Error updating catalog item:', error);
      throw error;
    }
  }
};

export const deductStock = async (itemId: string, quantity: number): Promise<void> => {
  if (isDemoMode) {
    // DEMO MODE: Deduct stock in localStorage
    const catalog = getFromStorage<CatalogItem[]>(STORAGE_KEYS.CATALOG) || [];
    const updatedCatalog = catalog.map(item => {
      if (item.id === itemId && item.stock !== undefined) {
        return { ...item, stock: item.stock - quantity };
      }
      return item;
    });
    saveToStorage(STORAGE_KEYS.CATALOG, updatedCatalog);
  } else {
    // SUPABASE MODE: Original logic
    if (!supabase) throw new Error('Supabase not initialized');
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
  }
};

// ============================================================================
// TRANSACTIONS OPERATIONS (DUAL MODE)
// ============================================================================

export const getTransactions = async (): Promise<Transaction[]> => {
  if (isDemoMode) {
    // DEMO MODE: Read from localStorage
    const transactions = getFromStorage<Transaction[]>(STORAGE_KEYS.TRANSACTIONS);
    return transactions || [];
  } else {
    // SUPABASE MODE: Original logic
    if (!supabase) throw new Error('Supabase not initialized');
    const { data, error } = await supabase
      .from('transactions')
      .select(`
        *,
        transaction_items (*)
      `)
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
  }
};

export const createTransaction = async (
  transaction: Omit<Transaction, 'id' | 'date'>
): Promise<Transaction> => {
  if (isDemoMode) {
    // DEMO MODE: Save to localStorage
    const transactions = getFromStorage<Transaction[]>(STORAGE_KEYS.TRANSACTIONS) || [];

    const newTransaction: Transaction = {
      id: generateId(),
      date: new Date().toISOString(),
      ...transaction,
    };

    transactions.push(newTransaction);
    saveToStorage(STORAGE_KEYS.TRANSACTIONS, transactions);

    // Deduct stock for products
    for (const item of transaction.items) {
      if (item.type === 'PRODUCT' && item.stock !== undefined) {
        await deductStock(item.id, item.quantity);
      }
    }

    return newTransaction;
  } else {
    // SUPABASE MODE: Original logic
    if (!supabase) throw new Error('Supabase not initialized');
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
  }
};

// ============================================================================
// SEED CATALOG (DUAL MODE)
// ============================================================================

export const seedCatalog = async (seedData: Omit<CatalogItem, 'id'>[]): Promise<void> => {
  if (isDemoMode) {
    // DEMO MODE: Check if already seeded, then load from constants.ts
    const alreadySeeded = getFromStorage<boolean>(STORAGE_KEYS.SEEDED);

    if (alreadySeeded) {
      // Already seeded, skip
      return;
    }

    // Seed the catalog with IDs
    const catalog: CatalogItem[] = seedData.map(item => ({
      id: generateId(),
      ...item,
    }));

    saveToStorage(STORAGE_KEYS.CATALOG, catalog);
    saveToStorage(STORAGE_KEYS.SEEDED, true);
    console.log('✅ Demo Mode: Catalog seeded with', catalog.length, 'items');
  } else {
    // SUPABASE MODE: Original logic
    if (!supabase) throw new Error('Supabase not initialized');
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) throw new Error('User not authenticated');

    // Check if user already has catalog items
    const { data: existing } = await supabase
      .from('catalog_items')
      .select('id')
      .eq('user_id', user.id)
      .limit(1);

    if (existing && existing.length > 0) {
      // User already has catalog items, don't seed
      return;
    }

    // Insert seed data
    const catalogItems = seedData.map(item => ({
      user_id: user.id,
      name: item.name,
      type: item.type,
      price: item.price,
      brand: item.brand,
      stock: item.stock,
      cost: item.cost,
    }));

    const { error } = await supabase
      .from('catalog_items')
      .insert(catalogItems);

    if (error) {
      console.error('Error seeding catalog:', error);
      throw error;
    }
  }
};

// ============================================================================
// APPOINTMENTS OPERATIONS (DUAL MODE)
// ============================================================================

export const getAppointments = async (): Promise<Appointment[]> => {
  if (isDemoMode) {
    const stored = localStorage.getItem('neron_appointments');
    return stored ? JSON.parse(stored) : [];
  } else {
    if (!supabase) throw new Error('Supabase not initialized');
    const { data, error } = await supabase
      .from('appointments')
      .select('*')
      .order('date', { ascending: true });

    if (error) throw error;
    return data || [];
  }
};

export const createAppointment = async (appointment: Omit<Appointment, 'id'>): Promise<Appointment> => {
  if (isDemoMode) {
    const appointments = await getAppointments();
    const newAppointment: Appointment = {
      ...appointment,
      id: generateId()
    };
    appointments.push(newAppointment);
    localStorage.setItem('neron_appointments', JSON.stringify(appointments));
    return newAppointment;
  } else {
    if (!supabase) throw new Error('Supabase not initialized');
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('appointments')
      .insert([{ ...appointment, user_id: user.id }])
      .select()
      .single();

    if (error) throw error;
    return data;
  }
};

export const updateAppointment = async (id: string, updates: Partial<Appointment>): Promise<Appointment> => {
  if (isDemoMode) {
    const appointments = await getAppointments();
    const index = appointments.findIndex(a => a.id === id);
    if (index === -1) throw new Error('Appointment not found');

    const updatedAppointment = { ...appointments[index], ...updates };
    appointments[index] = updatedAppointment;
    localStorage.setItem('neron_appointments', JSON.stringify(appointments));
    return updatedAppointment;
  } else {
    if (!supabase) throw new Error('Supabase not initialized');
    const { data, error } = await supabase
      .from('appointments')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }
};

export const deleteAppointment = async (id: string): Promise<void> => {
  if (isDemoMode) {
    const appointments = await getAppointments();
    const filtered = appointments.filter(a => a.id !== id);
    localStorage.setItem('neron_appointments', JSON.stringify(filtered));
  } else {
    if (!supabase) throw new Error('Supabase not initialized');
    const { error } = await supabase
      .from('appointments')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }
};
