-- add password_changed boolean DEFAULT false to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS password_changed boolean DEFAULT false;
