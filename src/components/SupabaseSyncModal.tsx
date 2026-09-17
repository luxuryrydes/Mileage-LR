import React, { useState, useEffect } from 'react';
import { X, Database, RefreshCw, CheckCircle2, AlertCircle, ShieldCheck, Copy, Check, ExternalLink, ArrowUpRight } from 'lucide-react';
import { checkSupabaseStatus, syncTablesToSupabase } from '../services/supabase';
import { Vehicle, IGLCard, FuelRecord, VehicleMileageStandard } from '../types/fleet';

interface SupabaseSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  vehicles: Vehicle[];
  cards: IGLCard[];
  fuelRecords: FuelRecord[];
  standards: VehicleMileageStandard[];
}

export const SupabaseSyncModal: React.FC<SupabaseSyncModalProps> = ({
  isOpen,
  onClose,
  vehicles,
  cards,
  fuelRecords,
  standards,
}) => {
  const [status, setStatus] = useState<{
    configured: boolean;
    connected: boolean;
    tables?: { vehicles: number; igl_cards: number; fuel_records: number };
    realtimeGpsConstraint?: string;
    error?: string;
  } | null>(null);

  const [isChecking, setIsChecking] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<{ success: boolean; message: string } | null>(null);
  const [copiedSql, setCopiedSql] = useState(false);

  const loadStatus = async () => {
    setIsChecking(true);
    try {
      const res = await checkSupabaseStatus();
      setStatus(res);
    } catch (e: any) {
      setStatus({
        configured: false,
        connected: false,
        error: e.message,
      });
    } finally {
      setIsChecking(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadStatus();
      setSyncResult(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSyncNow = async () => {
    setIsSyncing(true);
    setSyncResult(null);
    try {
      const res = await syncTablesToSupabase({
        vehicles,
        iglCards: cards,
        fuelRecords,
        standards,
      });
      setSyncResult(res);
      if (res.success) {
        await loadStatus();
      }
    } catch (err: any) {
      setSyncResult({ success: false, message: err.message });
    } finally {
      setIsSyncing(false);
    }
  };

  const handleCopySchemaSql = () => {
    const sqlText = `-- Mileage Soft: Supabase SQL Tables Schema (Without Live GPS Daily KMs)
CREATE TABLE IF NOT EXISTS public.vehicles (
  id TEXT PRIMARY KEY,
  registration_number TEXT NOT NULL UNIQUE,
  normalized_reg TEXT NOT NULL UNIQUE,
  vehicle_name TEXT,
  vehicle_type TEXT NOT NULL,
  make TEXT,
  model TEXT,
  fuel_type TEXT NOT NULL,
  owner_type TEXT DEFAULT 'Owned',
  vendor TEXT DEFAULT 'LR Taxi Fleet',
  gps_device_id TEXT,
  gps_imei TEXT,
  igl_card_number TEXT,
  igl_smart_card_number TEXT,
  fuel_tank_capacity NUMERIC,
  status TEXT DEFAULT 'Active',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.igl_cards (
  id TEXT PRIMARY KEY,
  card_number TEXT NOT NULL UNIQUE,
  vehicle_registration TEXT,
  linked_vehicle_reg TEXT,
  normalized_reg TEXT,
  balance NUMERIC DEFAULT 0,
  monthly_limit NUMERIC DEFAULT 45000,
  status TEXT DEFAULT 'Active',
  last_used_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

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
  receipt_number TEXT,
  igl_card_number TEXT,
  payment_mode TEXT DEFAULT 'IGL Smart Card',
  source TEXT DEFAULT 'Manual',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.mileage_standards (
  id TEXT PRIMARY KEY,
  car_type TEXT NOT NULL,
  fuel_type TEXT NOT NULL,
  standard_value NUMERIC NOT NULL,
  mileage_type TEXT NOT NULL,
  unit TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(car_type, fuel_type)
);`;

    const doCopySuccess = () => {
      setCopiedSql(true);
      setTimeout(() => setCopiedSql(false), 2500);
    };

    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(sqlText).then(doCopySuccess).catch(() => {
        try {
          const ta = document.createElement('textarea');
          ta.value = sqlText;
          ta.style.position = 'fixed';
          ta.style.opacity = '0';
          document.body.appendChild(ta);
          ta.focus();
          ta.select();
          document.execCommand('copy');
          document.body.removeChild(ta);
          doCopySuccess();
        } catch (e) {
          console.warn('Clipboard fallback copy error:', e);
        }
      });
    } else {
      try {
        const ta = document.createElement('textarea');
        ta.value = sqlText;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.focus();
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
        doCopySuccess();
      } catch (e) {
        console.warn('Clipboard fallback copy error:', e);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-xl w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-slate-900 to-slate-800 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-400">
              <Database className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm">Supabase SQL Workspace Sync</h3>
              <p className="text-[11px] text-slate-300">Synchronize fleet SQL tables to your cloud PostgreSQL database</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5 text-xs">
          {/* User Constraint Banner */}
          <div className="p-3.5 bg-emerald-50/80 border border-emerald-200 rounded-xl flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <div className="font-bold text-emerald-900 text-xs">Constraint Enforced: GPS Tracking Kept Local</div>
              <p className="text-emerald-700 text-[11px] mt-0.5 leading-relaxed">
                As requested, real-time GPS tracking of Daily KMs is strictly isolated from Supabase and powered exclusively via the Mosfet GPS API. Only Vehicle Master, IGL Cards, Fuel Expenses, and Mileage Standards are synchronized to SQL tables.
              </p>
            </div>
          </div>

          {/* Connection Status Card */}
          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-700 uppercase tracking-wider text-[10px]">Database Workspace Status</span>
              <button
                onClick={loadStatus}
                disabled={isChecking}
                className="flex items-center gap-1.5 text-cyan-700 hover:text-cyan-800 font-semibold text-[11px] cursor-pointer"
              >
                <RefreshCw className={`w-3 h-3 ${isChecking ? 'animate-spin' : ''}`} />
                Check Status
              </button>
            </div>

            <div className="flex items-center justify-between bg-white p-3 rounded-lg border border-slate-200">
              <div className="flex items-center gap-2.5">
                <span className={`w-2.5 h-2.5 rounded-full ${status?.connected ? 'bg-emerald-500 ring-4 ring-emerald-100' : status?.configured ? 'bg-amber-500' : 'bg-slate-300'}`} />
                <div>
                  <div className="font-bold text-slate-800">
                    {status?.connected ? 'Connected to Supabase Workspace' : status?.configured ? 'Configured (Verifying Tables...)' : 'Supabase Credentials Not Yet Configured'}
                  </div>
                  <div className="text-slate-500 text-[11px]">
                    {status?.connected
                      ? `PostgreSQL tables live (${status.tables?.vehicles || 0} vehicles, ${status.tables?.igl_cards || 0} cards, ${status.tables?.fuel_records || 0} fuel records in cloud)`
                      : 'Set SUPABASE_URL and SUPABASE_ANON_KEY in project settings or .env'}
                  </div>
                </div>
              </div>

              <span className={`text-[10.5px] font-bold px-2 py-0.5 rounded ${status?.connected ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-700'}`}>
                {status?.connected ? 'Ready' : 'Pending Config'}
              </span>
            </div>
          </div>

          {/* Local Data Ready to Sync */}
          <div className="grid grid-cols-4 gap-2 text-center">
            <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200">
              <div className="font-bold text-slate-900 text-sm font-mono">{vehicles.length}</div>
              <div className="text-[10px] text-slate-500">Vehicles</div>
            </div>
            <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200">
              <div className="font-bold text-slate-900 text-sm font-mono">{cards.length}</div>
              <div className="text-[10px] text-slate-500">IGL Cards</div>
            </div>
            <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200">
              <div className="font-bold text-slate-900 text-sm font-mono">{fuelRecords.length}</div>
              <div className="text-[10px] text-slate-500">Fuel Entries</div>
            </div>
            <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200">
              <div className="font-bold text-slate-900 text-sm font-mono">{standards.length}</div>
              <div className="text-[10px] text-slate-500">Standards</div>
            </div>
          </div>

          {/* Results feedback */}
          {syncResult && (
            <div className={`p-3 rounded-xl border flex items-start gap-2.5 ${syncResult.success ? 'bg-emerald-50 border-emerald-200 text-emerald-900' : 'bg-rose-50 border-rose-200 text-rose-900'}`}>
              {syncResult.success ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              )}
              <span className="text-[11.5px] leading-relaxed">{syncResult.message}</span>
            </div>
          )}

          {/* Action Row */}
          <div className="flex flex-col sm:flex-row items-center gap-2.5 pt-2">
            <button
              onClick={handleSyncNow}
              disabled={isSyncing}
              className="w-full sm:flex-1 py-2.5 px-4 bg-cyan-700 hover:bg-cyan-800 disabled:opacity-50 text-white font-bold rounded-xl flex items-center justify-center gap-2 cursor-pointer shadow-sm transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
              {isSyncing ? 'Syncing to Supabase...' : 'Sync SQL Tables to Supabase Now'}
            </button>

            <button
              onClick={handleCopySchemaSql}
              className="w-full sm:w-auto py-2.5 px-3.5 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 font-semibold rounded-xl flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
              title="Copy DDL schema to paste into Supabase SQL editor"
            >
              {copiedSql ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4 text-slate-500" />}
              {copiedSql ? 'Copied SQL!' : 'Copy Supabase DDL'}
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-[11px] text-slate-500">
          <span>Schema file: <code className="bg-slate-200/80 px-1 py-0.5 rounded font-mono text-[10px]">supabase_schema.sql</code></span>
          <button
            onClick={onClose}
            className="px-3.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-200 rounded-lg cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
