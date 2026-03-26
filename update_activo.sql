-- Configura los campos "activo" en ambas tablas
ALTER TABLE public.barberos ADD COLUMN IF NOT EXISTS activo BOOLEAN DEFAULT true;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS activo BOOLEAN DEFAULT true;
-- Guarda el email del barbero
ALTER TABLE public.barberos ADD COLUMN IF NOT EXISTS email TEXT;
