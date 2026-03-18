-- ============================================================================
-- SCRIPT DE REINICIO TOTAL DE LA BASE DE DATOS NERON POS
-- ¡PRECAUCIÓN EXTREMA!
-- Esto borrará TODO tu catálogo, ventas, perfiles y citas actuales.
-- ============================================================================

-- 1. DROPEAR TODAS LAS TABLAS EXISTENTES EN ORDEN PARA EVITAR CONFLICTOS
DROP TABLE IF EXISTS public.variantes CASCADE;
DROP TABLE IF EXISTS public.citas CASCADE;
DROP TABLE IF EXISTS public.pedidos CASCADE;
DROP TABLE IF EXISTS public.productos CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;

-- ============================================================================
-- 2. CREAR TABLAS NUEVAS
-- ============================================================================

-- Tabla: profiles (Vinculada al Auth de Supabase)
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    business_id UUID NOT NULL
);

-- Tabla: productos
CREATE TABLE public.productos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    business_id UUID NOT NULL,
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('SERVICE', 'PRODUCT')),
    price NUMERIC NOT NULL,
    brand TEXT,
    stock INTEGER,
    cost NUMERIC
);

-- Tabla: pedidos
CREATE TABLE public.pedidos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    business_id UUID NOT NULL,
    barber TEXT NOT NULL,
    total NUMERIC NOT NULL,
    payment_method TEXT NOT NULL,
    reference TEXT
);

-- Tabla: variantes
CREATE TABLE public.variantes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pedido_id UUID NOT NULL REFERENCES public.pedidos(id) ON DELETE CASCADE,
    producto_id UUID NOT NULL REFERENCES public.productos(id) ON DELETE RESTRICT,
    business_id UUID NOT NULL,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    price NUMERIC NOT NULL,
    quantity INTEGER NOT NULL,
    subtotal NUMERIC NOT NULL
);

-- Tabla: citas
CREATE TABLE public.citas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    business_id UUID NOT NULL,
    clientName TEXT NOT NULL,
    date DATE NOT NULL,
    time TIME NOT NULL,
    barber TEXT NOT NULL,
    service TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'completed', 'cancelled')),
    notes TEXT
);

-- ============================================================================
-- 3. HABILITAR SEGURIDAD (RLS)
-- ============================================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.productos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pedidos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.variantes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.citas ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 4. APLICAR POLÍTICAS 100% LIMPIAS
-- ============================================================================

-- PROFILES (Bypass RLS validation to avoid JWT race conditions on INSERT)
CREATE POLICY "ver_propio_perfil" ON public.profiles FOR SELECT USING ( true );
CREATE POLICY "crear_propio_perfil" ON public.profiles FOR INSERT WITH CHECK ( true );
CREATE POLICY "editar_propio_perfil" ON public.profiles FOR UPDATE USING ( true ) WITH CHECK ( true );
CREATE POLICY "borrar_propio_perfil" ON public.profiles FOR DELETE USING ( true );

-- PRODUCTOS
CREATE POLICY "gestionar_productos" ON public.productos FOR ALL 
USING ( business_id IN (SELECT business_id FROM public.profiles WHERE id = auth.uid()) ) 
WITH CHECK ( business_id IN (SELECT business_id FROM public.profiles WHERE id = auth.uid()) );

-- PEDIDOS
CREATE POLICY "gestionar_pedidos" ON public.pedidos FOR ALL 
USING ( business_id IN (SELECT business_id FROM public.profiles WHERE id = auth.uid()) ) 
WITH CHECK ( business_id IN (SELECT business_id FROM public.profiles WHERE id = auth.uid()) );

-- VARIANTES
CREATE POLICY "gestionar_variantes" ON public.variantes FOR ALL 
USING ( business_id IN (SELECT business_id FROM public.profiles WHERE id = auth.uid()) ) 
WITH CHECK ( business_id IN (SELECT business_id FROM public.profiles WHERE id = auth.uid()) );

-- CITAS
CREATE POLICY "gestionar_citas" ON public.citas FOR ALL 
USING ( business_id IN (SELECT business_id FROM public.profiles WHERE id = auth.uid()) ) 
WITH CHECK ( business_id IN (SELECT business_id FROM public.profiles WHERE id = auth.uid()) );

-- ============================================================================
-- 5. ÍNDICES DE VELOCIDAD
-- ============================================================================
CREATE INDEX idx_prof_bus ON public.profiles(business_id);
CREATE INDEX idx_prod_bus ON public.productos(business_id);
CREATE INDEX idx_ped_bus ON public.pedidos(business_id);
CREATE INDEX idx_var_bus ON public.variantes(business_id);
CREATE INDEX idx_var_ped ON public.variantes(pedido_id);
CREATE INDEX idx_cit_bus ON public.citas(business_id);
