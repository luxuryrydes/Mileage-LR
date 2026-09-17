import React from 'react';
import { Truck, Calendar, Download, RefreshCw, UserCheck, ShieldAlert, Database, Smartphone } from 'lucide-react';
import { UserAccount, UserRole } from '../types/fleet';
import { PWAInstallButton } from './PWAInstallButton';

interface HeaderProps {
  selectedMonth: string; // YYYY-MM
  onMonthChange: (month: string) => void;
  onOpenGpsModule: () => void;
  onOpenBackupModal: () => void;
  onOpenSupabaseSync: () => void;
  onOpenApkModal: () => void;
  currentUser: UserAccount;
  onRoleChange: (role: UserRole) => void;
  onSyncGps: () => void;
  isSyncingGps: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  selectedMonth,
  onMonthChange,
  onOpenGpsModule,
  onOpenBackupModal,
  onOpenSupabaseSync,
  onOpenApkModal,
  currentUser,
  onRoleChange,
  onSyncGps,
  isSyncingGps,
}) => {
  // Format month for display e.g. "September, 2026"
  const [year, month] = selectedMonth.split('-');
  const dateObj = new Date(parseInt(year, 10), parseInt(month, 10) - 1, 1);
  const monthDisplay = dateObj.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  return (
    <header className="bg-white border-b border-slate-200 px-6 py-4">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        {/* Left: Brand & Tagline */}
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-cyan-50 border border-cyan-200 flex items-center justify-center text-cyan-600 shadow-xs">
            <Truck className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                Fleet Mileage Tracker
              </h1>
              <span className="text-xs px-2 py-0.5 font-semibold bg-cyan-100 text-cyan-800 rounded-md">
                Mileage Soft
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium">
              Fleet loaded from Mosfet GPS. Fuel entered by you. Mileage = GPS KM ÷ Fuel quantity.
            </p>
          </div>
        </div>

        {/* Right: Actions, Month Picker & Role Selector */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Month Selector */}
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-300 rounded-lg px-3 py-1.5 shadow-2xs">
            <Calendar className="w-4 h-4 text-slate-500" />
            <span className="text-xs font-medium text-slate-500">Month:</span>
            <select
              value={selectedMonth}
              onChange={(e) => onMonthChange(e.target.value)}
              className="bg-transparent text-sm font-semibold text-slate-800 focus:outline-none cursor-pointer"
            >
              <option value="2026-09">September, 2026</option>
              <option value="2026-08">August, 2026</option>
              <option value="2026-07">July, 2026</option>
              <option value="2026-06">June, 2026</option>
              <option value="2026-05">May, 2026</option>
            </select>
          </div>

          {/* Backup / Export Data */}
          <button
            onClick={onOpenBackupModal}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors shadow-2xs cursor-pointer"
            title="Import or export complete database JSON"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            Backup & Restore
          </button>

          {/* Supabase SQL Workspace Sync */}
          <button
            onClick={onOpenSupabaseSync}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-300 rounded-lg hover:bg-emerald-100 transition-colors shadow-2xs cursor-pointer"
            title="Sync Vehicles, IGL Cards, Standards & Fuel to Supabase SQL Workspace"
          >
            <Database className="w-3.5 h-3.5 text-emerald-600" />
            Supabase SQL Sync
          </button>

          {/* Mobile APK / PWA Install Button */}
          <PWAInstallButton onOpenApkModal={onOpenApkModal} />

          {/* GPS & Daily KM Button */}
          <button
            onClick={onOpenGpsModule}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-cyan-700 bg-cyan-50 border border-cyan-300 rounded-lg hover:bg-cyan-100 transition-colors shadow-2xs cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncingGps ? 'animate-spin' : ''}`} />
            GPS & Daily KM
          </button>

          {/* Role switcher simulation */}
          <div className="flex items-center gap-1.5 bg-slate-100 border border-slate-200 rounded-lg px-2.5 py-1">
            <UserCheck className="w-3.5 h-3.5 text-slate-600" />
            <select
              value={currentUser.role}
              onChange={(e) => onRoleChange(e.target.value as UserRole)}
              className="bg-transparent text-xs font-semibold text-slate-800 focus:outline-none cursor-pointer"
              title="Switch user role"
            >
              <option value="Admin">Admin (Full Access)</option>
              <option value="Operations">Operations (GPS & Fleet)</option>
              <option value="Accounts">Accounts (Fuel & Costs)</option>
              <option value="Management">Management (Reports Only)</option>
              <option value="Viewer">Viewer (Read-Only)</option>
            </select>
          </div>
        </div>
      </div>
    </header>
  );
};
