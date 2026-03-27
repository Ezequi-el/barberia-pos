-- Asegurar que las columnas activo y password_changed existan en profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS activo boolean DEFAULT true;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS password_changed boolean DEFAULT false;

-- Asegurar que el RLS permita la lectura de estas columnas para el propio usuario
-- (Generalmente ya existe una política de lectura para profiles, pero esto lo refuerza)
CREATE POLICY IF NOT EXISTS "Users can view their own profiles" 
ON public.profiles FOR SELECT 
USING (auth.uid() = id);

-- También permitir que los dueños (owners) vean perfiles de sus barberos
-- Esto es útil para el POS
CREATE POLICY IF NOT EXISTS "Owners can view profiles in their business"
ON public.profiles FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.role = 'owner' AND p.business_id = profiles.business_id
  )
);
