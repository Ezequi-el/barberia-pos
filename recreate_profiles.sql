-- Este script eliminará la tabla profiles actual y la creará exactamente como la app la espera.
-- PRECAUCIÓN: Esto borrará los perfiles existentes, pero la app los creará solos al iniciar sesión otra vez.

-- 1. Eliminar la tabla y cualquier política que dependa de ella
DROP TABLE IF EXISTS public.profiles CASCADE;

-- 2. Crear la tabla profiles para que la columna 'id' sea el user.id exacto
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    business_id UUID NOT NULL
);

-- 3. Habilitar la seguridad RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 4. Añadir las políticas precisas
CREATE POLICY "profiles_select_policy" 
ON public.profiles FOR SELECT 
USING ( auth.uid() = id );

CREATE POLICY "profiles_insert_policy" 
ON public.profiles FOR INSERT 
WITH CHECK ( auth.uid() = id );

CREATE POLICY "profiles_update_policy" 
ON public.profiles FOR UPDATE 
USING ( auth.uid() = id )
WITH CHECK ( auth.uid() = id );

CREATE POLICY "profiles_delete_policy" 
ON public.profiles FOR DELETE 
USING ( auth.uid() = id );
