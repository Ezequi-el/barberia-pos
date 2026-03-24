export const getAppointments = async (): Promise<Appointment[]> => {
  try {
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

export const createAppointment = async (
  appointment: Omit<Appointment, 'id' | 'createdAt'>
): Promise<Appointment> => {
  try {
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

export const deleteAppointment = async (id: string): Promise<void> => {
  if (isDemoMode) {
    console.log(`[DEMO] Eliminando cita ${id}`);
    return;
  }
  
  if (!supabase) throw new Error('Cliente Supabase no inicializado');
  
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
};

export const updateAppointment = async (id: string, updates: Partial<Appointment>): Promise<Appointment> => {
  if (isDemoMode) {
    console.log(`[DEMO] Actualizando cita ${id}:`, updates);
    return { ...updates, id } as Appointment;
  }
  
  if (!supabase) throw new Error('Cliente Supabase no inicializado');
  
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
};