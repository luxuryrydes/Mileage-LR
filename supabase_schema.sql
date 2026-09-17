-- =====================================================================
-- Mileage Soft: Fleet & Fuel Management - Supabase / PostgreSQL Schema
-- NOTE: Real-time GPS tracking is handled exclusively via the Mosfet GPS API.
-- This schema stores Fleet Vehicles, IGL Smart Cards, Fuel Records, Standards, and Audit Logs.
-- =====================================================================

-- 1. VEHICLES TABLE
CREATE TABLE IF NOT EXISTS public.vehicles (
    id TEXT PRIMARY KEY,
    registration_number TEXT NOT NULL UNIQUE,
    normalized_reg TEXT NOT NULL UNIQUE,
    vehicle_name TEXT,
    vehicle_type TEXT NOT NULL,
    make TEXT,
    model TEXT,
    fuel_type TEXT NOT NULL,
    manufacturing_year INTEGER,
    purchase_date DATE,
    owner_type TEXT DEFAULT 'Owned',
    vendor TEXT DEFAULT 'LR Taxi Fleet',
    gps_device_id TEXT,
    gps_imei TEXT,
    gps_vendor TEXT DEFAULT 'Mosfet GPS',
    gps_status TEXT DEFAULT 'Active',
    igl_card_number TEXT,
    igl_smart_card_number TEXT,
    fuel_tank_capacity NUMERIC,
    monthly_target_km NUMERIC DEFAULT 2500,
    status TEXT DEFAULT 'Active',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_vehicles_norm_reg ON public.vehicles(normalized_reg);
CREATE INDEX IF NOT EXISTS idx_vehicles_igl_card ON public.vehicles(igl_card_number);

-- 2. IGL SMART CARDS TABLE
CREATE TABLE IF NOT EXISTS public.igl_cards (
    id TEXT PRIMARY KEY,
    card_number TEXT NOT NULL UNIQUE,
    vehicle_registration TEXT,
    linked_vehicle_reg TEXT,
    normalized_reg TEXT,
    balance NUMERIC DEFAULT 0,
    balance_amount NUMERIC DEFAULT 0,
    monthly_limit NUMERIC DEFAULT 45000,
    status TEXT DEFAULT 'Active',
    last_used_date DATE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_igl_cards_card_no ON public.igl_cards(card_number);
CREATE INDEX IF NOT EXISTS idx_igl_cards_norm_reg ON public.igl_cards(normalized_reg);

-- 3. FUEL RECORDS TABLE
CREATE TABLE IF NOT EXISTS public.fuel_records (
    id TEXT PRIMARY KEY,
    vehicle_id TEXT,
    registration_number TEXT NOT NULL,
    normalized_reg TEXT NOT NULL,
    car_type TEXT NOT NULL,
    date DATE NOT NULL,
    fuel_type TEXT NOT NULL,
    quantity NUMERIC NOT NULL,
    rate NUMERIC NOT NULL,
    total_amount NUMERIC NOT NULL,
    fuel_station TEXT,
    receipt_number TEXT,
    igl_card_number TEXT,
    odometer NUMERIC,
    payment_mode TEXT DEFAULT 'IGL Smart Card',
    payment_reference TEXT,
    source TEXT DEFAULT 'IGL Import',
    remarks TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_fuel_records_norm_reg ON public.fuel_records(normalized_reg);
CREATE INDEX IF NOT EXISTS idx_fuel_records_date ON public.fuel_records(date);
CREATE INDEX IF NOT EXISTS idx_fuel_records_card_no ON public.fuel_records(igl_card_number);

-- 4. VEHICLE MILEAGE STANDARDS (Combustion only)
CREATE TABLE IF NOT EXISTS public.mileage_standards (
    id TEXT PRIMARY KEY,
    car_type TEXT NOT NULL,
    fuel_type TEXT NOT NULL,
    standard_value NUMERIC NOT NULL,
    mileage_type TEXT NOT NULL,
    unit TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_standard_car_fuel UNIQUE (car_type, fuel_type)
);

-- 5. AUDIT LOGS
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id TEXT PRIMARY KEY,
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    "user" TEXT NOT NULL,
    action TEXT NOT NULL,
    details TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security (RLS) if needed
ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.igl_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fuel_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mileage_standards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Anonymous/Authenticated Read/Write policies for authorized workspace clients
CREATE POLICY "Allow read vehicles" ON public.vehicles FOR SELECT USING (true);
CREATE POLICY "Allow insert/update vehicles" ON public.vehicles FOR ALL USING (true);

CREATE POLICY "Allow read igl_cards" ON public.igl_cards FOR SELECT USING (true);
CREATE POLICY "Allow insert/update igl_cards" ON public.igl_cards FOR ALL USING (true);

CREATE POLICY "Allow read fuel_records" ON public.fuel_records FOR SELECT USING (true);
CREATE POLICY "Allow insert/update fuel_records" ON public.fuel_records FOR ALL USING (true);

CREATE POLICY "Allow read mileage_standards" ON public.mileage_standards FOR SELECT USING (true);
CREATE POLICY "Allow insert/update mileage_standards" ON public.mileage_standards FOR ALL USING (true);

CREATE POLICY "Allow read audit_logs" ON public.audit_logs FOR SELECT USING (true);
CREATE POLICY "Allow insert audit_logs" ON public.audit_logs FOR INSERT WITH CHECK (true);
