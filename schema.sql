-- ==========================================================
-- TINY CROCHET FRIENDS - SUPABASE DATABASE SCHEMA & POLICIES
-- Clean Slate Setup with Supabase Email/Password Auth
-- ==========================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ----------------------------------------------------------
-- 1. CATEGORIES TABLE (Empty / Clean Slate)
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL UNIQUE,
    slug TEXT NOT NULL UNIQUE,
    description TEXT,
    icon TEXT DEFAULT '🧶',
    display_order INT DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ----------------------------------------------------------
-- 2. PRODUCTS TABLE (100% Made-to-Order, No Physical Stock)
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    description TEXT NOT NULL,
    price NUMERIC(10, 2) NOT NULL CHECK (price >= 0),
    category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
    image_url TEXT NOT NULL,
    -- Color options stored as JSON array: [{"name": "Blush Pink", "hex": "#F4A6B8"}, ...]
    color_options JSONB DEFAULT '[]'::jsonb,
    craft_days INT DEFAULT 7, -- 5 to 8 working days standard making time
    is_featured BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true NOT NULL, -- Toggle product visibility (Visible / Hidden)
    gallery_images JSONB DEFAULT '[]'::jsonb, -- Array of additional gallery image URLs: ["url1", "url2", ...]
    dimensions TEXT,
    materials TEXT DEFAULT '100% Premium Milk Cotton Yarn & Hypoallergenic Fiberfill',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Ensure is_active & gallery_images columns exist if upgrading an existing database
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS gallery_images JSONB DEFAULT '[]'::jsonb;

-- ----------------------------------------------------------
-- 3. ORDERS TABLE (Regular Made-to-Order Checkouts)
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.orders (
    id TEXT PRIMARY KEY, -- e.g. 'ORD-829104'
    customer_name TEXT NOT NULL,
    customer_phone TEXT NOT NULL,
    customer_email TEXT,
    shipping_address TEXT NOT NULL,
    city TEXT NOT NULL,
    postal_code TEXT,
    notes TEXT,
    items JSONB NOT NULL DEFAULT '[]'::jsonb,
    total_amount NUMERIC(10, 2) NOT NULL,
    -- Status pipeline: 'Pending', 'Processing', 'Crafting', 'Packaged', 'Delivered', 'Cancelled'
    status TEXT NOT NULL DEFAULT 'Pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ----------------------------------------------------------
-- 4. CUSTOM_ORDERS TABLE (Bespoke Inquiries with Inspiration Photos)
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.custom_orders (
    id TEXT PRIMARY KEY, -- e.g. 'CUST-392184'
    customer_name TEXT NOT NULL,
    customer_phone TEXT NOT NULL,
    customer_email TEXT,
    item_category TEXT,
    description TEXT NOT NULL,
    color_preferences TEXT,
    budget_range TEXT,
    date_needed DATE,
    image_url TEXT, -- Stored in 'custom-orders' bucket
    -- Status pipeline: 'Pending Review', 'Quoted', 'In Progress', 'Completed', 'Declined'
    status TEXT NOT NULL DEFAULT 'Pending Review',
    admin_notes TEXT,
    quote_amount NUMERIC(10, 2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ----------------------------------------------------------
-- 5. ROW LEVEL SECURITY (RLS) POLICIES WITH SUPABASE AUTH
-- ----------------------------------------------------------
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.custom_orders ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if re-running
DROP POLICY IF EXISTS "Public can view categories" ON public.categories;
DROP POLICY IF EXISTS "Admins can manage categories" ON public.categories;
DROP POLICY IF EXISTS "Public can view products" ON public.products;
DROP POLICY IF EXISTS "Admins can manage products" ON public.products;
DROP POLICY IF EXISTS "Public can insert orders" ON public.orders;
DROP POLICY IF EXISTS "Public can view orders by id" ON public.orders;
DROP POLICY IF EXISTS "Admins can manage orders" ON public.orders;
DROP POLICY IF EXISTS "Public can insert custom orders" ON public.custom_orders;
DROP POLICY IF EXISTS "Public can view custom orders by id" ON public.custom_orders;
DROP POLICY IF EXISTS "Admins can manage custom orders" ON public.custom_orders;

-- CATEGORIES: Public can view, Authenticated Admin can manage
CREATE POLICY "Public can view categories" 
ON public.categories FOR SELECT 
USING (true);

CREATE POLICY "Admins can manage categories" 
ON public.categories FOR ALL 
TO authenticated 
USING (true) WITH CHECK (true);

-- PRODUCTS: Public can view, Authenticated Admin can manage
CREATE POLICY "Public can view products" 
ON public.products FOR SELECT 
USING (true);

CREATE POLICY "Admins can manage products" 
ON public.products FOR ALL 
TO authenticated 
USING (true) WITH CHECK (true);

-- ORDERS: Public can place orders and track by ID; Authenticated Admin has full access
CREATE POLICY "Public can insert orders" 
ON public.orders FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Public can view orders by id" 
ON public.orders FOR SELECT 
USING (true);

CREATE POLICY "Admins can manage orders" 
ON public.orders FOR ALL 
TO authenticated 
USING (true) WITH CHECK (true);

-- CUSTOM ORDERS: Public can submit and track by ID; Authenticated Admin has full access
CREATE POLICY "Public can insert custom orders" 
ON public.custom_orders FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Public can view custom orders by id" 
ON public.custom_orders FOR SELECT 
USING (true);

CREATE POLICY "Admins can manage custom orders" 
ON public.custom_orders FOR ALL 
TO authenticated 
USING (true) WITH CHECK (true);

-- ----------------------------------------------------------
-- 6. STORAGE BUCKETS SETUP (Run in Supabase SQL Editor)
-- ----------------------------------------------------------
INSERT INTO storage.buckets (id, name, public) 
VALUES ('custom-orders', 'custom-orders', true)
ON CONFLICT (id) DO UPDATE SET public = true;

INSERT INTO storage.buckets (id, name, public) 
VALUES ('product-images', 'product-images', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Storage RLS Policies
DROP POLICY IF EXISTS "Public can upload to custom-orders" ON storage.objects;
DROP POLICY IF EXISTS "Public can read custom-orders" ON storage.objects;
DROP POLICY IF EXISTS "Admins can upload product-images" ON storage.objects;
DROP POLICY IF EXISTS "Public can read product-images" ON storage.objects;

-- Allow public to upload inspiration images for custom orders
CREATE POLICY "Public can upload to custom-orders" 
ON storage.objects FOR INSERT 
WITH CHECK (bucket_id = 'custom-orders');

-- Allow public to view uploaded custom order inspiration images
CREATE POLICY "Public can read custom-orders" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'custom-orders');

-- Allow authenticated admins to upload product photos
CREATE POLICY "Admins can upload product-images" 
ON storage.objects FOR INSERT 
TO authenticated 
WITH CHECK (bucket_id = 'product-images');

-- Allow public to view product photos
CREATE POLICY "Public can read product-images" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'product-images');

-- Allow authenticated admins full control over storage
CREATE POLICY "Admins have full access to storage" 
ON storage.objects FOR ALL 
TO authenticated 
USING (true) WITH CHECK (true);

-- ==========================================================
-- CLEAN SLATE READY!
-- No sample products or categories inserted.
-- Log in as Admin to add your categories and handmade creations.
-- ==========================================================
