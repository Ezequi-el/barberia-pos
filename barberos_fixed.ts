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

export const addBarber = async (barber: Omit<BarberSession, 'id'>): Promise<BarberSession> => {
  try {
    if (isDemoMode) {
      console.log('[DEMO] Agregando barbero:', barber);
      return { ...barber, id: 'demo-' + Date.now() };
    }
    
    if (!supabase) throw new Error('Cliente Supabase no inicializado');
    
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