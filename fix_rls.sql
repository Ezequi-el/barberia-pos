-- 1. Enable RLS (just in case)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 2. Drop any previous policies that might be conflicting
DROP POLICY IF EXISTS "Users can manage their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

-- 3. Create permissive but secure policies
CREATE POLICY "Permitir a usuarios ver su propio perfil" 
ON public.profiles FOR SELECT 
USING ( auth.uid() = id );

CREATE POLICY "Permitir a usuarios crear su propio perfil" 
ON public.profiles FOR INSERT 
WITH CHECK ( auth.uid() = id );

CREATE POLICY "Permitir a usuarios actualizar su propio perfil" 
ON public.profiles FOR UPDATE 
USING ( auth.uid() = id )
WITH CHECK ( auth.uid() = id );
