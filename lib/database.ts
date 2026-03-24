// ============================================================================
// DATABASE MODULE - Usando funciones RPC y esquema español de base de datos
// ============================================================================

import { supabase } from './supabase';
import { 
  CatalogItem, 
  CartItem, 
  Transaction, 
  Appointment,
  BarberSession,
  CreateTransactionDTO,
  ItemType,
  PaymentMethod,
  DBProducto,
  DBPedido,
  DBVariante,
  DBCita,
  ApiResponse,
  ValidationResult
} from '../types';
import adminModule from './admin';

// ============================================================================
// 1. CONFIGURACIÓN Y VARIABLES GLOBALES
// ============================================================================

const isDemoMode = import.meta.env.VITE_DEMO_MODE === 'true';

// ============================================================================
// 2. VALIDACIONES
// ============================================================================

/**
 * Valida un item del catálogo antes de operaciones
 */
const validateCatalogItem = (item: CatalogItem): ValidationResult => {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!item.name || item.name.trim().length === 0) {
    errors.push('El nombre del producto/servicio es requerido');
  }

  if (item.price <= 0) {
    errors.push('El precio debe ser mayor a 0');
  }

  if (item.price > 1000000) {
    warnings.push('Precio muy alto, verificar');
  }

  if (item.type === ItemType.PRODUCT) {
    if (item.stock !== undefined && item.stock < 0) {
      errors.push('El stock no puede ser negativo');
    }
    
    if (item.stock !== undefined && item.stock < 5) {
      warnings.push('Stock bajo, considerar reabastecimiento');
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
};

/**
 * Valida items del carrito antes de crear transacción
 */
const validateCartItems = (items: CartItem[]): ValidationResult => {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (items.length === 0) {
    errors.push('El carrito está vacío');
  }

  let totalItems = 0;
  for (const item of items) {
    totalItems += item.quantity;
    
    if (item.quantity <= 0) {
      errors.push(`Cantidad inválida para ${item.name}`);
    }
    
    if (item.quantity > 100) {
      warnings.push(`Cantidad alta para ${item.name}, verificar`);
    }
    
    if (item.price <= 0) {
      errors.push(`Precio inválido para ${item.name}`);
    }
  }

  if (totalItems > 50) {
    warnings.push('Cantidad total de items muy alta, verificar');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
};

// ============================================================================
// 3. OPERACIONES DE PRODUCTOS/CATÁLOGO
// ============================================================================

/**
 * Obtiene todos los productos del catálogo (con lazy loading opcional)
 */
export const getCatalogItems = async (
  limit: number = 100,
  offset: number = 0,
  type?: ItemType
): Promise<CatalogItem[]> => {
  try {
    if (isDemoMode) {
      console.log('[DEMO] Obteniendo productos del catálogo');
      return [
        { id: '1', name: 'Corte Clásico', type: ItemType.SERVICE, price: 250, brand: 'Premium', stock: undefined, cost: 100 },
        { id: '2', name: 'Afeitado Tradicional', type: ItemType.SERVICE, price: 180, brand: 'Premium', stock: undefined, cost: 80 },
        { id: '3', name: 'Tinte Cabello', type: ItemType.SERVICE, price: 450, brand: 'Premium', stock: undefined, cost: 200 },
        { id: '4', name: 'Gel Fijador', type: ItemType.PRODUCT, price: 120, brand: 'Loreal', stock: 25, cost: 60 },
        { id: '5', name: 'Cera Modeladora', type: ItemType.PRODUCT, price: 150, brand: 'American Crew', stock: 18, cost: 75 }
      ];
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Usuario no autenticado');

    // Obtener business_id del perfil
    const { data: profile } = await supabase
      .from('profiles')
      .select('business_id')
      .eq('id', user.id)
      .single();

    if (!profile) throw new Error('Perfil de usuario no encontrado');

    let query = supabase
      .from('productos')
      .select('*')
      .eq('business_id', profile.business_id)
      .order('created_at', { ascending: false });

    if (type) {
      query = query.eq('type', type);
    }

    // Aplicar paginación para lazy loading
    query = query.range(offset, offset + limit - 1);

    const { data, error } = await query;

    if (error) throw error;

    // Mapear a CatalogItem
    return (data || []).map((item: DBProducto): CatalogItem => ({
      id: item.id,
      name: item.name,
      type: item.type as ItemType,
      price: item.price,
      brand: item.brand,
      stock: item.stock,
      cost: item.cost
    }));
  } catch (error: any) {
    console.error('Error obteniendo catálogo:', error);
    throw new Error(`Error al cargar catálogo: ${error.message}`);
  }
};

/**
 * Cuenta total de productos para paginación
 */
export const getCatalogCount = async (type?: ItemType): Promise<number> => {
  try {
    if (isDemoMode) {
      return 5; // Número de productos demo
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Usuario no autenticado');

    const { data: profile } = await supabase
      .from('profiles')
      .select('business_id')
      .eq('id', user.id)
      .single();

    if (!profile) throw new Error('Perfil de usuario no encontrado');

    let query = supabase
      .from('productos')
      .select('id', { count: 'exact', head: true })
      .eq('business_id', profile.business_id);

    if (type) {
      query = query.eq('type', type);
    }

    const { count, error } = await query;

    if (error) throw error;

    return count || 0;
  } catch (error: any) {
    console.error('Error contando productos:', error);
    return 0;
  }
};

/**
 * Agrega un nuevo producto al catálogo
 */
export const addCatalogItem = async (item: Omit<CatalogItem, 'id'>): Promise<CatalogItem> => {
  try {
    // Validar item
    const validation = validateCatalogItem(item as CatalogItem);
    if (!validation.isValid) {
      throw new Error(validation.errors.join(', '));
    }

    if (isDemoMode) {
      console.log('[DEMO] Agregando producto al catálogo:', item);
      return { ...item, id: 'demo-' + Date.now() };
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Usuario no autenticado');

    // Obtener business_id
    const { data: profile } = await supabase
      .from('profiles')
      .select('business_id')
      .eq('id', user.id)
      .single();

    if (!profile) throw new Error('Perfil de usuario no encontrado');

    // Verificar duplicados por nombre
    const { data: existing } = await supabase
      .from('productos')
      .select('id')
      .eq('business_id', profile.business_id)
      .eq('name', item.name)
      .limit(1);

    if (existing && existing.length > 0) {
      throw new Error(`Ya existe un producto/servicio con el nombre "${item.name}"`);
    }

    // Insertar producto
    const { data, error } = await supabase
      .from('productos')
      .insert([{
        user_id: user.id,
        business_id: profile.business_id,
        name: item.name,
        type: item.type,
        price: item.price,
        brand: item.brand,
        stock: item.type === ItemType.PRODUCT ? (item.stock || 0) : null,
        cost: item.cost
      }])
      .select()
      .single();

    if (error) throw error;

    // Registrar auditoría
    await adminModule.logAuditEvent({
      business_id: profile.business_id,
      user_id: user.id,
      action: 'CATALOG_ITEM_ADDED',
      details: {
        item_id: data.id,
        item_name: item.name,
        item_type: item.type,
        price: item.price,
        stock: item.stock
      }
    });

    return {
      id: data.id,
      name: data.name,
      type: data.type as ItemType,
      price: data.price,
      brand: data.brand,
      stock: data.stock,
      cost: data.cost
    };
  } catch (error: any) {
    console.error('Error agregando item al catálogo:', error);
    throw new Error(`Error al agregar item: ${error.message}`);
  }
};

/**
 * Actualiza un item del catálogo
 */
export const updateCatalogItem = async (
  id: string, 
  updates: Partial<CatalogItem>
): Promise<void> => {
  try {
    if (isDemoMode) {
      console.log(`[DEMO] Actualizando producto ${id}:`, updates);
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Usuario no autenticado');

    // Obtener business_id
    const { data: profile } = await supabase
      .from('profiles')
      .select('business_id')
      .eq('id', user.id)
      .single();

    if (!profile) throw new Error('Perfil de usuario no encontrado');

    // Preparar actualizaciones
    const dbUpdates: any = {};
    
    if (updates.name !== undefined) dbUpdates.name = updates.name;
    if (updates.price !== undefined) {
      if (updates.price <= 0) throw new Error('El precio debe ser mayor a 0');
      dbUpdates.price = updates.price;
    }
    if (updates.brand !== undefined) dbUpdates.brand = updates.brand;
    if (updates.stock !== undefined) {
      if (updates.stock < 0) throw new Error('El stock no puede ser negativo');
      dbUpdates.stock = updates.stock;
    }
    if (updates.cost !== undefined) dbUpdates.cost = updates.cost;

    // Actualizar
    const { error } = await supabase
      .from('productos')
      .update(dbUpdates)
      .eq('id', id)
      .eq('business_id', profile.business_id);

    if (error) throw error;

    // Registrar auditoría
    await adminModule.logAuditEvent({
      business_id: profile.business_id,
      user_id: user.id,
      action: 'CATALOG_ITEM_UPDATED',
      details: {
        item_id: id,
        updates: dbUpdates
      }
    });
  } catch (error: any) {
    console.error('Error actualizando item:', error);
    throw new Error(`Error al actualizar item: ${error.message}`);
  }
};

/**
 * Elimina un item del catálogo (para compatibilidad con Inventory.tsx)
 */
export const deleteCatalogItem = async (id: string): Promise<void> => {
  try {
    if (isDemoMode) {
      console.log(`[DEMO] Eliminando producto ${id}`);
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Usuario no autenticado');

    // Obtener business_id
    const { data: profile } = await supabase
      .from('profiles')
      .select('business_id')
      .eq('id', user.id)
      .single();

    if (!profile) throw new Error('Perfil de usuario no encontrado');

    // Eliminar producto
    const { error } = await supabase
      .from('productos')
      .delete()
      .eq('id', id)
      .eq('business_id', profile.business_id);

    if (error) throw error;

    // Registrar auditoría
    await adminModule.logAuditEvent({
      business_id: profile.business_id,
      user_id: user.id,
      action: 'CATALOG_ITEM_DELETED',
      details: {
        item_id: id
      }
    });
  } catch (error: any) {
    console.error('Error eliminando item:', error);
    throw new Error(`Error al eliminar item: ${error.message}`);
  }
};

// ============================================================================
// 4. OPERACIONES DE TRANSACCIONES (USANDO RPC)
// ============================================================================

/**
 * Obtiene todas las transacciones
 */
export const getTransactions = async (limit: number = 100): Promise<Transaction[]> => {
  try {
    if (isDemoMode) {
      console.log('[DEMO] Obteniendo transacciones');
      return [
        {
          id: '1',
          date: '2024-01-15T14:30:00',
          barber: 'Juan Pérez',
          total: 430,
          paymentMethod: PaymentMethod.CASH,
          reference: 'REF-001',
          items: [
            { id: '1', name: 'Corte Clásico', type: ItemType.SERVICE, price: 250, quantity: 1, subtotal: 250 },
            { id: '4', name: 'Gel Fijador', type: ItemType.PRODUCT, price: 120, quantity: 1, subtotal: 120 },
            { id: '5', name: 'Cera Modeladora', type: ItemType.PRODUCT, price: 150, quantity: 1, subtotal: 150 }
          ]
        },
        {
          id: '2',
          date: '2024-01-14T11:15:00',
          barber: 'Carlos López',
          total: 180,
          paymentMethod: PaymentMethod.CARD,
          reference: 'REF-002',
          items: [
            { id: '2', name: 'Afeitado Tradicional', type: ItemType.SERVICE, price: 180, quantity: 1, subtotal: 180 }
          ]
        }
      ];
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Usuario no autenticado');

    // Obtener business_id
    const { data: profile } = await supabase
      .from('profiles')
      .select('business_id')
      .eq('id', user.id)
      .single();

    if (!profile) throw new Error('Perfil de usuario no encontrado');

    // Obtener pedidos
    const { data: pedidos, error: pedidosError } = await supabase
      .from('pedidos')
      .select('*')
      .eq('business_id', profile.business_id)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (pedidosError) throw pedidosError;

    // Para cada pedido, obtener sus variantes
    const transactions: Transaction[] = [];

    for (const pedido of pedidos || []) {
      const { data: variantes, error: variantesError } = await supabase
        .from('variantes')
        .select('*')
        .eq('pedido_id', pedido.id);

      if (variantesError) throw variantesError;

      // Mapear a Transaction
      transactions.push({
        id: pedido.id,
        date: pedido.created_at,
        barber: pedido.barber,
        total: pedido.total,
        paymentMethod: pedido.payment_method as PaymentMethod,
        reference: pedido.reference,
        items: (variantes || []).map((v: DBVariante): CartItem => ({
          id: v.producto_id,
          name: v.name,
          type: v.type as ItemType,
          price: v.price,
          quantity: v.quantity,
          subtotal: v.subtotal
        }))
      });
    }

    return transactions;
  } catch (error: any) {
    console.error('Error obteniendo transacciones:', error);
    throw new Error(`Error al cargar transacciones: ${error.message}`);
  }
};

/**
 * Crea una transacción usando la función RPC
 */
export const createTransaction = async (
  transaction: Omit<Transaction, 'id' | 'date'>
): Promise<Transaction> => {
  try {
    // Validar carrito
    const cartValidation = validateCartItems(transaction.items);
    if (!cartValidation.isValid) {
      throw new Error(cartValidation.errors.join(', '));
    }

    if (isDemoMode) {
      console.log('[DEMO] Creando transacción:', transaction);
      return {
        id: 'demo-' + Date.now(),
        date: new Date().toISOString(),
        barber: transaction.barber,
        total: transaction.total,
        paymentMethod: transaction.paymentMethod,
        reference: transaction.reference,
        items: transaction.items
      };
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Usuario no autenticado');

    // Obtener business_id
    const { data: profile } = await supabase
      .from('profiles')
      .select('business_id')
      .eq('id', user.id)
      .single();

    if (!profile) throw new Error('Perfil de usuario no encontrado');

    // Preparar DTO para RPC
    const transactionDTO: CreateTransactionDTO = {
      user_id: user.id,
      business_id: profile.business_id,
      barber: transaction.barber,
      total: transaction.total,
      payment_method: transaction.paymentMethod,
      reference: transaction.reference,
      items: transaction.items.map(item => ({
        producto_id: item.id,
        name: item.name,
        type: item.type,
        price: item.price,
        quantity: item.quantity
      }))
    };

    // Validar total calculado vs total enviado
    const calculatedTotal = transaction.items.reduce(
      (sum, item) => sum + (item.price * item.quantity), 
      0
    );

    if (Math.abs(calculatedTotal - transaction.total) > 0.01) {
      throw new Error(`El total calculado ($${calculatedTotal}) no coincide con el total enviado ($${transaction.total})`);
    }

    // Llamar a la función RPC
    const { data: transactionId, error: rpcError } = await supabase.rpc(
      'create_complete_transaction',
      {
        p_user_id: transactionDTO.user_id,
        p_business_id: transactionDTO.business_id,
        p_barber: transactionDTO.barber,
        p_total: transactionDTO.total,
        p_payment_method: transactionDTO.payment_method,
        p_reference: transactionDTO.reference || null,
        p_items: JSON.stringify(transactionDTO.items)
      }
    );

    if (rpcError) throw rpcError;

    if (!transactionId) {
      throw new Error('No se recibió ID de transacción');
    }

    // Obtener la transacción creada
    const { data: pedido, error: pedidoError } = await supabase
      .from('pedidos')
      .select('*')
      .eq('id', transactionId)
      .single();

    if (pedidoError) throw pedidoError;

    // Obtener variantes
    const { data: variantes, error: variantesError } = await supabase
      .from('variantes')
      .select('*')
      .eq('pedido_id', transactionId);

    if (variantesError) throw variantesError;

    // Registrar auditoría
    await adminModule.logAuditEvent({
      business_id: profile.business_id,
      user_id: user.id,
      action: 'TRANSACTION_CREATED',
      details: {
        transaction_id: transactionId,
        barber: transaction.barber,
        total: transaction.total,
        payment_method: transaction.paymentMethod,
        items_count: transaction.items.length
      }
    });

    // Retornar transacción completa
    return {
      id: pedido.id,
      date: pedido.created_at,
      barber: pedido.barber,
      total: pedido.total,
      paymentMethod: pedido.payment_method as PaymentMethod,
      reference: pedido.reference,
      items: (variantes || []).map((v: DBVariante): CartItem => ({
        id: v.producto_id,
        name: v.name,
        type: v.type as ItemType,
        price: v.price,
        quantity: v.quantity,
        subtotal: v.subtotal
      }))
    };
  } catch (error: any) {
    console.error('Error creando transacción:', error);
    
    // Registrar error en auditoría
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { data: profile } = await supabase
        .from('profiles')
        .select('business_id')
        .eq('id', user?.id || '')
        .single();

      if (profile && user) {
        await adminModule.logAuditEvent({
          business_id: profile.business_id,
          user_id: user.id,
          action: 'TRANSACTION_FAILED',
          details: {
            error: error.message,
            barber: transaction.barber,
            total: transaction.total
          }
        });
      }
    } catch (auditError) {
      console.error('Error registrando auditoría de fallo:', auditError);
    }

    throw new Error(`Error al crear transacción: ${error.message}`);
  }
};

// ============================================================================
// 5. OPERACIONES DE CITAS (ESQUEMA ESPAÑOL)
// ============================================================================

/**
 * Obtiene todas las citas
 */
export const getAppointments = async (): Promise<Appointment[]> => {
  try {
    if (isDemoMode) {
      console.log('[DEMO] Obteniendo citas');
      return [
        {
          id: '1',
          clientName: 'Carlos Rodríguez',
          date: '2024-01-20',
          time: '10:00',
          barber: 'Juan Pérez',
          service: 'Corte Clásico',
          status: 'scheduled',
          notes: 'Cliente regular',
          createdAt: '2024-01-15T09:30:00'
        },
        {
          id: '2',
          clientName: 'Miguel Sánchez',
          date: '2024-01-20',
          time: '11:30',
          barber: 'Carlos López',
          service: 'Afeitado Tradicional',
          status: 'scheduled',
          notes: '',
          createdAt: '2024-01-16T14:15:00'
        }
      ];
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Usuario no autenticado');
    
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, business_id')
      .eq('id', user.id)
      .single();
      
    if (!profile) {
      throw new Error('Perfil de usuario no encontrado');
    }
    
    const { data, error } = await supabase
      .from('citas')
      .select('*')
      .eq('business_id', profile.business_id)
      .order('date', { ascending: true })
      .order('time', { ascending: true });
      
    if (error) throw error;
    
    return (data || []).map((cita: any): Appointment => ({
      id: cita.id,
      clientName: cita.clientname,
      date: cita.date,
      time: cita.time,
      barber: cita.barber,
      service: cita.service,
      status: cita.status,
      notes: cita.notes || '',
      createdAt: cita.created_at
    }));
  } catch (error: any) {
    console.error('Error cargando citas:', error);
    throw new Error(`Error al cargar citas: ${error.message}`);
  }
};

/**
 * Crea una nueva cita
 */
export const createAppointment = async (
  appointment: Omit<Appointment, 'id' | 'createdAt'>
): Promise<Appointment> => {
  try {
    if (isDemoMode) {
      console.log('[DEMO] Creando cita:', appointment);
      return {
        ...appointment,
        id: 'demo-' + Date.now(),
        createdAt: new Date().toISOString()
      };
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Usuario no autenticado');
    
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, business_id')
      .eq('id', user.id)
      .single();
      
    if (!profile) {
      throw new Error('Perfil de usuario no encontrado');
    }
    
    const appointmentDate = new Date(`${appointment.date}T${appointment.time}`);
    if (appointmentDate < new Date()) {
      throw new Error('No se pueden crear citas en el pasado');
    }
    
    const { data: existing } = await supabase
      .from('citas')
      .select('*')
      .eq('business_id', profile.business_id)
      .eq('date', appointment.date)
      .eq('time', appointment.time)
      .eq('barber', appointment.barber);
      
    if (existing && existing.length > 0) {
      throw new Error('El barbero ya tiene una cita a esa hora');
    }
    
    const { data, error } = await supabase
      .from('citas')
      .insert([{
        clientname: appointment.clientName,
        date: appointment.date,
        time: appointment.time,
        barber: appointment.barber,
        service: appointment.service,
        status: 'scheduled',
        notes: appointment.notes,
        user_id: user.id,
        business_id: profile.business_id
      }])
      .select();
      
    if (error) throw error;
    
    // Registrar auditoría
    await adminModule.logAuditEvent({
      business_id: profile.business_id,
      user_id: user.id,
      action: 'APPOINTMENT_CREATED',
      details: {
        appointment_id: data[0].id,
        client_name: appointment.clientName,
        date: appointment.date,
        time: appointment.time,
        barber: appointment.barber
      }
    });
    
    return {
      id: data[0].id,
      clientName: data[0].clientname,
      date: data[0].date,
      time: data[0].time,
      barber: data[0].barber,
      service: data[0].service,
      status: data[0].status,
      notes: data[0].notes || '',
      createdAt: data[0].created_at
    };
  } catch (error: any) {
    console.error('Error creando cita:', error);
    throw new Error(`Error al crear cita: ${error.message}`);
  }
};

/**
 * Elimina una cita
 */
export const deleteAppointment = async (id: string): Promise<void> => {
  try {
    if (isDemoMode) {
      console.log(`[DEMO] Eliminando cita ${id}`);
      return;
    }
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Usuario no autenticado');
    
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, business_id')
      .eq('id', user.id)
      .single();
      
    if (!profile) {
      throw new Error('Perfil de usuario no encontrado');
    }
    
    const { error } = await supabase
      .from('citas')
      .delete()
      .eq('id', id)
      .eq('business_id', profile.business_id);
      
    if (error) throw error;

    // Registrar auditoría
    await adminModule.logAuditEvent({
      business_id: profile.business_id,
      user_id: user.id,
      action: 'APPOINTMENT_DELETED',
      details: {
        appointment_id: id
      }
    });
  } catch (error: any) {
    console.error('Error eliminando cita:', error);
    throw new Error(`Error al eliminar cita: ${error.message}`);
  }
};

/**
 * Actualiza una cita
 */
export const updateAppointment = async (id: string, updates: Partial<Appointment>): Promise<Appointment> => {
  try {
    if (isDemoMode) {
      console.log(`[DEMO] Actualizando cita ${id}:`, updates);
      return { ...updates, id } as Appointment;
    }
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Usuario no autenticado');
    
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, business_id')
      .eq('id', user.id)
      .single();
      
    if (!profile) {
      throw new Error('Perfil de usuario no encontrado');
    }
    
    const dbUpdates: any = {};
    if (updates.clientName !== undefined) dbUpdates.clientname = updates.clientName;
    if (updates.date !== undefined) dbUpdates.date = updates.date;
    if (updates.time !== undefined) dbUpdates.time = updates.time;
    if (updates.barber !== undefined) dbUpdates.barber = updates.barber;
    if (updates.service !== undefined) dbUpdates.service = updates.service;
    if (updates.status !== undefined) dbUpdates.status = updates.status;
    if (updates.notes !== undefined) dbUpdates.notes = updates.notes;
    
    const { data, error } = await supabase
      .from('citas')
      .update(dbUpdates)
      .eq('id', id)
      .eq('business_id', profile.business_id)
      .select();
      
    if (error) throw error;

    // Registrar auditoría
    await adminModule.logAuditEvent({
      business_id: profile.business_id,
      user_id: user.id,
      action: 'APPOINTMENT_UPDATED',
      details: {
        appointment_id: id,
        updates: dbUpdates
      }
    });
    
    return {
      id: data[0].id,
      clientName: data[0].clientname,
      date: data[0].date,
      time: data[0].time,
      barber: data[0].barber,
      service: data[0].service,
      status: data[0].status,
      notes: data[0].notes || '',
      createdAt: data[0].created_at
    };
  } catch (error: any) {
    console.error('Error actualizando cita:', error);
    throw new Error(`Error al actualizar cita: ${error.message}`);
  }
};

// ============================================================================
// 6. OPERACIONES DE BARBEROS (ESQUEMA ESPAÑOL)
// ============================================================================

/**
 * Obtiene todos los barberos
 */
export const getBarbers = async (): Promise<BarberSession[]> => {
  try {
    if (isDemoMode) {
      console.log('[DEMO] Obteniendo barberos');
      return [
        { id: '1', name: 'Juan Pérez', birthDate: '1990-05-15', chairNumber: 1 },
        { id: '2', name: 'Carlos López', birthDate: '1988-08-22', chairNumber: 2 },
        { id: '3', name: 'Miguel Ángel', birthDate: '1992-03-10', chairNumber: 3 }
      ];
    }
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Usuario no autenticado');
    
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, business_id')
      .eq('id', user.id)
      .single();
      
    if (!profile) {
      throw new Error('Perfil de usuario no encontrado');
    }
    
    const { data, error } = await supabase
      .from('barberos')
      .select('*')
      .order('nombre');
      
    if (error) throw error;
    
    return (data || []).map((barbero: any): BarberSession => ({
      id: barbero.id,
      name: barbero.nombre,
      birthDate: barbero.fecha_nacimiento || '',
      chairNumber: barbero.numero_silla || 1
    }));
  } catch (error: any) {
    console.error('Error cargando barberos:', error);
    throw new Error(`Error al cargar barberos: ${error.message}`);
  }
};

/**
 * Agrega un nuevo barbero
 */
export const addBarber = async (barber: Omit<BarberSession, 'id'>): Promise<BarberSession> => {
  try {
    if (isDemoMode) {
      console.log('[DEMO] Agregando barbero:', barber);
      return { ...barber, id: 'demo-' + Date.now() };
    }
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Usuario no autenticado');
    
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, business_id, role')
      .eq('id', user.id)
      .single();
      
    if (!profile || profile.role !== 'admin') {
      throw new Error('No tienes permisos para agregar barberos');
    }
    
    const { data, error } = await supabase
      .from('barberos')
      .insert([{
        nombre: barber.name,
        fecha_nacimiento: barber.birthDate || null,
        numero_silla: barber.chairNumber || 1
      }])
      .select();
      
    if (error) throw error;

    // Registrar auditoría
    await adminModule.logAuditEvent({
      business_id: profile.business_id,
      user_id: user.id,
      action: 'BARBER_ADDED',
      details: {
        barber_id: data[0].id,
        barber_name: barber.name,
        chair_number: barber.chairNumber
      }
    });
    
    return {
      id: data[0].id,
      name: data[0].nombre,
      birthDate: data[0].fecha_nacimiento || '',
      chairNumber: data[0].numero_silla || 1
    };
  } catch (error: any) {
    console.error('Error agregando barbero:', error);
    throw new Error(`Error al agregar barbero: ${error.message}`);
  }
};

// ============================================================================
// 7. EXPORTACIÓN
// ============================================================================

export {
  validateCatalogItem,
  validateCartItems
};