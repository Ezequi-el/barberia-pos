-- Ejecuta este script en el editor SQL de tu panel de Supabase
-- Agrega la columna 'fecha_ingreso' a la tabla 'barberos'

ALTER TABLE public.barberos 
ADD COLUMN IF NOT EXISTS fecha_ingreso DATE;
