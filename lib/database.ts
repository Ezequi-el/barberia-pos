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
// SUPABASE MULTI-TENANT HELPER
// ============================================================================

const getBusinessId = async (): Promise<string> => {
  if (isDemoMode) return 'demo-business-id';
  if (!supabase) throw new Error('Supabase not initialized');
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');

  // Check if profile exists
  let { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('business_id')
    .eq('id', user.id)
    .single();

  if (profileError && profileError.code !== 'PGRST116') { 
    console.error('Error fetching profile:', profileError);
    alert('DB Error fetching profile: ' + profileError.message);
    throw profileError;
  }

  // If no profile, create one with a fallback UUID generation
  if (!profile) {
    const newBusinessId = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : generateId();
    const { data: newProfile, error: insertError } = await supabase
      .from('profiles')
      .insert([{ id: user.id, business_id: newBusinessId }])
      .select('business_id')
      .single();
      
    if (insertError) {
      console.error('Error creating profile:', insertError);
      alert('DB Error creating profile: ' + insertError.message);
      throw insertError;
    }
    profile = newProfile;
  }

  return profile?.business_id;
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
    const businessId = await getBusinessId();
    
    const { data, error } = await supabase
      .from('productos')
      .select('*')
      .eq('business_id', businessId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching catalog items:', error);
      alert('DB Error fetching catalog items: ' + error.message);
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
    
    const businessId = await getBusinessId();

    const { data, error } = await supabase
      .from('productos')
      .insert([{
        user_id: user.id,
        business_id: businessId,
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
      alert('DB Error adding catalog item: ' + error.message);
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
    const businessId = await getBusinessId();

    const { error } = await supabase
      .from('productos')
      .update(updates)
      .eq('id', id)
      .eq('business_id', businessId);

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
    const businessId = await getBusinessId();

    // Get current stock
    const { data: item, error: fetchError } = await supabase
      .from('productos')
      .select('stock')
      .eq('id', itemId)
      .eq('business_id', businessId)
      .single();

    if (fetchError) throw fetchError;
    if (!item || item.stock === null) return;

    // Update stock
    const newStock = item.stock - quantity;
    const { error: updateError } = await supabase
      .from('productos')
      .update({ stock: newStock })
      .eq('id', itemId)
      .eq('business_id', businessId);

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
    const businessId = await getBusinessId();

    const { data, error } = await supabase
      .from('pedidos')
      .select(`
        *,
        variantes (*)
      `)
      .eq('business_id', businessId)
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
      items: (t.variantes || []).map((ti: any) => ({
        id: ti.producto_id || ti.id,
        name: ti.name || ti.item_name,
        type: ti.type || ti.item_type,
        price: parseFloat(ti.price || ti.item_price),
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
    
    const businessId = await getBusinessId();

    // Start a transaction by inserting the main transaction record
    const { data: transactionData, error: transactionError } = await supabase
      .from('pedidos')
      .insert([{
        user_id: user.id,
        business_id: businessId,
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
      pedido_id: transactionData.id,
      producto_id: item.id,
      name: item.name,
      type: item.type,
      price: item.price,
      quantity: item.quantity,
      subtotal: item.price * item.quantity,
      business_id: businessId, 
    }));

    const { error: itemsError } = await supabase
      .from('variantes')
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
      return;
    }

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
    
    const businessId = await getBusinessId();

    // Check if user already has catalog items
    const { data: existing } = await supabase
      .from('productos')
      .select('id')
      .eq('business_id', businessId)
      .limit(1);

    if (existing && existing.length > 0) {
      return;
    }

    // Insert seed data
    const catalogItems = seedData.map(item => ({
      user_id: user.id,
      business_id: businessId,
      name: item.name,
      type: item.type,
      price: item.price,
      brand: item.brand,
      stock: item.stock,
      cost: item.cost,
    }));

    const { error } = await supabase
      .from('productos')
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
    const businessId = await getBusinessId();

    const { data, error } = await supabase
      .from('citas')
      .select('*')
      .eq('business_id', businessId)
      .order('date', { ascending: true });

    if (error) throw error;
    
    // Fix camelCase vs lowercase DB mapping for clientName
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
    
    const businessId = await getBusinessId();

    const { data, error } = await supabase
      .from('citas')
      .insert([{ 
        clientname: appointment.clientName,
        date: appointment.date,
        time: appointment.time,
        barber: appointment.barber,
        service: appointment.service,
        status: appointment.status,
        notes: appointment.notes,
        user_id: user.id, 
        business_id: businessId 
      }])
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
    const businessId = await getBusinessId();

    // Prepare updates with correct snake_case/lowercase equivalents
    const dbUpdates: any = { ...updates };
    if (updates.clientName) {
      dbUpdates.clientname = updates.clientName;
      delete dbUpdates.clientName;
    }

    const { data, error } = await supabase
      .from('citas')
      .update(dbUpdates)
      .eq('id', id)
      .eq('business_id', businessId)
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
    const businessId = await getBusinessId();

    const { error } = await supabase
      .from('citas')
      .delete()
      .eq('id', id)
      .eq('business_id', businessId);

    if (error) throw error;
  }
};
