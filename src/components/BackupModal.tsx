import React, { useState, useRef } from 'react';
import { X, Download, UploadCloud, RefreshCcw, CheckCircle, Database } from 'lucide-react';
import { fleetDb } from '../services/db';

interface BackupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDataRestored: () => void;
  onOpenSupabaseSync?: () => void;
}

export const BackupModal: React.FC<BackupModalProps> = ({
  isOpen,
  onClose,
  onDataRestored,
  onOpenSupabaseSync,
}) => {
  const [msg, setMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  if (!isOpen) return null;

  const handleExportJSON = () => {
    const json = fleetDb.exportDatabaseJSON();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `MileageSoft_Backup_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setMsg('Database backup downloaded successfully.');
  };

  const handleImportJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onload = (evt) => {
        try {
          const content = evt.target?.result as string;
          const success = fleetDb.importDatabaseJSON(content);
          if (success) {
            setMsg('Database restored successfully from file!');
            onDataRestored();
          } else {
            setMsg('Failed to restore: invalid JSON backup format.');
          }
        } catch (err: any) {
          setMsg(`Error reading file: ${err.message}`);
        }
      };
      reader.readAsText(file);
    }
  };

  const handleResetDefaults = () => {
    if (confirm('Reset entire fleet database to default seed data (440 vehicles, September 2026)?')) {
      fleetDb.resetToDefaults();
      setMsg('Database reset to defaults successfully.');
      onDataRestored();
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
            <Database className="w-4 h-4 text-cyan-600" />
            Database Backup & Migration
          </h3>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4 text-xs">
          {msg && (
            <div className="p-3 bg-cyan-50 border border-cyan-200 text-cyan-800 rounded-lg flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-cyan-600 shrink-0" />
              <span>{msg}</span>
            </div>
          )}

          <p className="text-slate-500 leading-relaxed">
            Export a full JSON backup of the current 440 vehicles, GPS logs, fuel records and mileage standards, or restore from a previous save.
          </p>

          <div className="space-y-2.5">
            {/* Export */}
            <button
              onClick={handleExportJSON}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors cursor-pointer shadow-2xs"
            >
              <Download className="w-4 h-4 text-slate-500" />
              Export Full Database Backup (.json)
            </button>

            {/* Import */}
            <input
              type="file"
              ref={fileInputRef}
              accept=".json"
              onChange={handleImportJSON}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 font-semibold text-cyan-700 bg-cyan-50 border border-cyan-200 hover:bg-cyan-100 rounded-lg transition-colors cursor-pointer"
            >
              <UploadCloud className="w-4 h-4 text-cyan-600" />
              Restore Database from JSON
            </button>

            {/* Supabase SQL Workspace Sync */}
            {onOpenSupabaseSync && (
              <button
                onClick={() => {
                  onClose();
                  onOpenSupabaseSync();
                }}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 font-semibold text-emerald-800 bg-emerald-50 border border-emerald-300 hover:bg-emerald-100 rounded-lg transition-colors cursor-pointer"
              >
                <Database className="w-4 h-4 text-emerald-600" />
                Supabase SQL Workspace Sync
              </button>
            )}

            {/* Reset Defaults */}
            <button
              onClick={handleResetDefaults}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 font-semibold text-rose-600 bg-rose-50 border border-rose-200 hover:bg-rose-100 rounded-lg transition-colors cursor-pointer"
            >
              <RefreshCcw className="w-4 h-4 text-rose-500" />
              Reset All to 440 Vehicle Demo Data
            </button>
          </div>
        </div>

        <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-200/70 rounded-lg cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
