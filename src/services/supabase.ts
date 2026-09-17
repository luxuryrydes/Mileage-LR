import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Vehicle, IGLCard, FuelRecord, VehicleMileageStandard } from '../types/fleet';

let supabaseClient: SupabaseClient | null = null;

export function getSupabaseConfig(): { url?: string; hasKey: boolean } {
  const url = (import.meta as any).env?.VITE_SUPABASE_URL || '';
  const key = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || '';
  return {
    url: url || undefined,
    hasKey: !!key,
  };
}

export function isSupabaseConfigured(): boolean {
  const cfg = getSupabaseConfig();
  return Boolean(cfg.url && cfg.hasKey);
}

export function getSupabaseClient(): SupabaseClient | null {
  if (supabaseClient) return supabaseClient;

  const url = (import.meta as any).env?.VITE_SUPABASE_URL;
  const key = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY;

  if (url && key) {
    try {
      supabaseClient = createClient(url, key);
    } catch (e) {
      console.warn('Failed to initialize Supabase client:', e);
      return null;
    }
  }
  return supabaseClient;
}

/**
 * Fetch SQL table entries from user's Supabase workspace
 * Constraint: DO NOT fetch or store real-time GPS tracking of Daily KMs here.
 */
export async function fetchSupabaseTables(): Promise<{
  vehicles?: Vehicle[];
  iglCards?: IGLCard[];
  fuelRecords?: FuelRecord[];
  standards?: VehicleMileageStandard[];
  error?: string;
}> {
  const client = getSupabaseClient();
  if (!client) {
    return { error: 'Supabase workspace is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.' };
  }

  try {
    const [vehRes, cardRes, fuelRes, stdRes] = await Promise.all([
      client.from('vehicles').select('*'),
      client.from('igl_cards').select('*'),
      client.from('fuel_records').select('*'),
      client.from('mileage_standards').select('*'),
    ]);

    return {
      vehicles: vehRes.data || undefined,
      iglCards: cardRes.data || undefined,
      fuelRecords: fuelRes.data || undefined,
      standards: stdRes.data || undefined,
      error: vehRes.error?.message || cardRes.error?.message || fuelRes.error?.message || stdRes.error?.message,
    };
  } catch (err: any) {
    return { error: err.message || 'Error fetching Supabase SQL tables' };
  }
}

/**
 * Fetch status of Supabase connection from server or client
 */
export async function checkSupabaseStatus(): Promise<{
  configured: boolean;
  connected: boolean;
  tables?: { vehicles: number; igl_cards: number; fuel_records: number };
  realtimeGpsConstraint?: string;
  error?: string;
}> {
  try {
    const res = await fetch('/api/supabase/status');
    if (res.ok) {
      const data = await res.json();
      return data;
    }
  } catch {
    // Fall back to client-side check
  }

  const client = getSupabaseClient();
  if (!client) {
    return {
      configured: false,
      connected: false,
      realtimeGpsConstraint: 'Real-time GPS tracking is stored locally & via Mosfet GPS API (excluded from Supabase as requested)',
    };
  }

  try {
    const [vehRes, cardsRes, fuelRes] = await Promise.all([
      client.from('vehicles').select('*', { count: 'exact', head: true }),
      client.from('igl_cards').select('*', { count: 'exact', head: true }),
      client.from('fuel_records').select('*', { count: 'exact', head: true }),
    ]);

    return {
      configured: true,
      connected: !vehRes.error && !cardsRes.error && !fuelRes.error,
      tables: {
        vehicles: vehRes.count ?? 0,
        igl_cards: cardsRes.count ?? 0,
        fuel_records: fuelRes.count ?? 0,
      },
      realtimeGpsConstraint: 'Compliant: Real-time GPS tracking is excluded from Supabase and powered exclusively by Mosfet GPS API',
      error: vehRes.error?.message || cardsRes.error?.message || fuelRes.error?.message,
    };
  } catch (err: any) {
    return {
      configured: true,
      connected: false,
      error: err.message,
    };
  }
}

/**
 * Upsert Fleet SQL table entries to user's Supabase workspace
 */
export async function syncTablesToSupabase(payload: {
  vehicles: Vehicle[];
  iglCards: IGLCard[];
  fuelRecords: FuelRecord[];
  standards: VehicleMileageStandard[];
}): Promise<{ success: boolean; message: string; details?: any }> {
  // 1. Try server-side endpoint first (/api/supabase/sync)
  try {
    const srvRes = await fetch('/api/supabase/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        vehicles: payload.vehicles,
        iglCards: payload.iglCards,
        standards: payload.standards,
        fuelRecords: payload.fuelRecords,
      }),
    });

    if (srvRes.ok) {
      const srvData = await srvRes.json();
      if (srvData.success) {
        return {
          success: true,
          message: srvData.message || `Successfully synced ${payload.vehicles.length} vehicles, ${payload.iglCards.length} cards, and ${payload.fuelRecords.length} fuel entries to Supabase SQL tables!`,
        };
      }
    }
  } catch {
    // Proceed to client-side fallback
  }

  // 2. Fallback to client-side direct Supabase client
  const client = getSupabaseClient();
  if (!client) {
    return {
      success: false,
      message: 'Supabase workspace credentials (SUPABASE_URL, SUPABASE_ANON_KEY) are not yet configured in .env or Settings. Please provide your Supabase URL and Key.',
    };
  }

  try {
    // 1. Sync Vehicles (without live GPS daily tracks)
    if (payload.vehicles.length > 0) {
      const { error: vErr } = await client.from('vehicles').upsert(payload.vehicles, { onConflict: 'registration_number' });
      if (vErr) throw new Error(`Vehicles sync failed: ${vErr.message}`);
    }

    // 2. Sync IGL Cards
    if (payload.iglCards.length > 0) {
      const { error: cErr } = await client.from('igl_cards').upsert(payload.iglCards, { onConflict: 'card_number' });
      if (cErr) throw new Error(`IGL Cards sync failed: ${cErr.message}`);
    }

    // 3. Sync Mileage Standards
    if (payload.standards.length > 0) {
      const { error: sErr } = await client.from('mileage_standards').upsert(payload.standards, { onConflict: 'car_type,fuel_type' });
      if (sErr) throw new Error(`Mileage standards sync failed: ${sErr.message}`);
    }

    // 4. Sync Fuel Records
    if (payload.fuelRecords.length > 0) {
      const chunkSize = 200;
      for (let i = 0; i < payload.fuelRecords.length; i += chunkSize) {
        const chunk = payload.fuelRecords.slice(i, i + chunkSize);
        const { error: fErr } = await client.from('fuel_records').upsert(chunk, { onConflict: 'id' });
        if (fErr) throw new Error(`Fuel records sync failed: ${fErr.message}`);
      }
    }

    return {
      success: true,
      message: `Successfully synchronized SQL tables to Supabase (${payload.vehicles.length} vehicles, ${payload.iglCards.length} cards, ${payload.fuelRecords.length} fuel entries)!`,
    };
  } catch (err: any) {
    return { success: false, message: err.message };
  }
}
