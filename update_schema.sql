-- 1. Add `role` to `profiles` with default 'owner'
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'owner' CHECK (role IN ('owner', 'barber'));

-- 2. Rename `brand` to `category` in `productos`
-- Because we are renaming, we verify if the column exists first (this syntax works if brand exists)
ALTER TABLE public.productos RENAME COLUMN brand TO category;
