import React, { useState, useRef } from 'react';
import {
  Calendar,
  Search,
  Upload,
  RefreshCw,
  Edit2,
  FileSpreadsheet,
  AlertTriangle,
  CheckCircle2,
  Download,
  Clock,
  X,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { GPSDailyKM, Vehicle } from '../types/fleet';
import { formatKM, normalizeRegNo } from '../utils/normalize';
import { exportGpsRecordsExcel, exportToExcel } from '../services/export';

interface DailyGPSViewProps {
  gpsRecords: GPSDailyKM[];
  vehicles: Vehicle[];
  onSyncGps: () => Promise<void>;
  isSyncing: boolean;
  onCorrectGps: (id: string, newKm: number, reason: string) => { success: boolean; message: string };
  onBulkImportGps: (rows: any[]) => {
    totalUploaded: number;
    inserted: number;
    updated: number;
    duplicates: number;
    unknownVehicles: number;
    invalidRecords: number;
    errors: string[];
    rejectedRows: any[];
  };
  canEdit: boolean;
}

export const DailyGPSView: React.FC<DailyGPSViewProps> = ({
  gpsRecords,
  vehicles,
  onSyncGps,
  isSyncing,
  onCorrectGps,
  onBulkImportGps,
  canEdit,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDate, setSelectedDate] = useState<string>('2026-09-16');
  const [correctionModalOpen, setCorrectionModalOpen] = useState(false);
  const [activeRecord, setActiveRecord] = useState<GPSDailyKM | null>(null);
  const [newKmValue, setNewKmValue] = useState<number>(0);
  const [correctionReason, setCorrectionReason] = useState<string>('');
  const [correctionError, setCorrectionError] = useState<string>('');

  // Import summary modal
  const [importSummary, setImportSummary] = useState<any | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleOpenCorrection = (rec: GPSDailyKM) => {
    setActiveRecord(rec);
    setNewKmValue(rec.daily_gps_km);
    setCorrectionReason('');
    setCorrectionError('');
    setCorrectionModalOpen(true);
  };

  const handleSaveCorrection = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeRecord) return;
    if (isNaN(newKmValue) || newKmValue < 0) {
      setCorrectionError('Please enter a valid, non-negative KM.');
      return;
    }
    if (!correctionReason.trim()) {
      setCorrectionError('A mandatory correction reason is required for the audit trail.');
      return;
    }

    const res = onCorrectGps(activeRecord.id, newKmValue, correctionReason);
    if (res.success) {
      setCorrectionModalOpen(false);
      setActiveRecord(null);
    } else {
      setCorrectionError(res.message);
    }
  };

  // Excel / CSV File upload
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      e.target.value = ''; // Reset input to allow re-uploading the same file
      const reader = new FileReader();
      reader.onload = (evt) => {
        try {
          const data = new Uint8Array(evt.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });
          const sheet = workbook.Sheets[workbook.SheetNames[0]];
          const json: any[] = XLSX.utils.sheet_to_json(sheet, { defval: '' });

          const rowsToImport = json.map((row) => ({
            regNo: row['Reg No'] || row['Vehicle Name'] || row['Vehicle'] || row['Registration'] || row['registration_number'] || '',
            date: row['Date'] || selectedDate || '2026-09-16',
            dailyKm: parseFloat(row['KM (GPS)'] || row['Daily KM'] || row['GPS KM'] || row['daily_gps_km'] || '0'),
            openingKm: parseFloat(row['Opening KM'] || '50000'),
            closingKm: parseFloat(row['Closing KM'] || '0'),
            imei: row['GPS Device/IMEI'] || row['GPS IMEI'] || '',
          }));

          const summary = onBulkImportGps(rowsToImport);
          setImportSummary(summary);
        } catch (err: any) {
          alert(`Failed to parse spreadsheet: ${err.message}`);
        }
      };
      reader.readAsArrayBuffer(file);
    }
  };

  // Filter records
  const filtered = gpsRecords.filter((r) => {
    if (selectedDate && r.date !== selectedDate) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        (r.registration_number || '').toLowerCase().includes(q) ||
        (r.gps_device_imei || '').toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="px-6 py-5 space-y-4">
      {/* Advance Form / GPS Module Top Controls */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-slate-900">
              Advance Form / GPS Daily KM Master
            </h2>
            <span className="text-xs px-2.5 py-0.5 font-bold bg-cyan-50 text-cyan-700 border border-cyan-200 rounded-md">
              Single Source of Truth
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Centralized repository for all vehicle daily GPS kilometres. Supports live RoadCast / Track360 API pulls, Excel bulk uploads, and auditable manual corrections.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Automatic GPS Fetch */}
          <button
            onClick={onSyncGps}
            disabled={isSyncing}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-cyan-600 hover:bg-cyan-700 rounded-lg transition-colors shadow-2xs cursor-pointer disabled:opacity-50"
            title="Fetch daily GPS distances from Track360 / Mosfet server"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
            {isSyncing ? 'Pulling GPS...' : 'Fetch Live GPS (Track360)'}
          </button>

          {/* Manual Excel / CSV Upload */}
          <input
            type="file"
            ref={fileInputRef}
            accept=".xlsx,.xls,.csv"
            onChange={handleFileChange}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors shadow-2xs cursor-pointer"
          >
            <Upload className="w-3.5 h-3.5 text-slate-500" />
            Upload GPS Sheet
          </button>

          {/* Export Excel */}
          <button
            onClick={() => exportGpsRecordsExcel(filtered)}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors shadow-2xs cursor-pointer"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-slate-500" />
            Export GPS
          </button>
        </div>
      </div>

      {/* Date & Filter Row */}
      <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-slate-400" />
            <span className="text-xs font-semibold text-slate-600">Select Date:</span>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="text-xs font-semibold bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-cyan-500 cursor-pointer"
            />
          </div>

          <button
            onClick={() => setSelectedDate('')}
            className={`text-xs px-2.5 py-1.5 rounded-lg border transition-colors cursor-pointer ${
              !selectedDate
                ? 'bg-cyan-50 text-cyan-700 border-cyan-300 font-semibold'
                : 'text-slate-600 border-slate-200 hover:bg-slate-50'
            }`}
          >
            All Dates (Full Month)
          </button>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative w-64">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search vehicle or IMEI..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-cyan-500"
            />
          </div>

          <span className="text-xs text-slate-400">
            Records: <b>{filtered.length}</b>
          </span>
        </div>
      </div>

      {/* GPS Records Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50/90 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10.5px]">
                <th className="py-3 px-4">VEHICLE</th>
                <th className="py-3 px-4">DATE</th>
                <th className="py-3 px-4">GPS IMEI</th>
                <th className="py-3 px-4 text-right">OPENING KM</th>
                <th className="py-3 px-4 text-right">CLOSING KM</th>
                <th className="py-3 px-4 text-right">DAILY GPS KM</th>
                <th className="py-3 px-4 text-center">SOURCE</th>
                <th className="py-3 px-4 text-center">CORRECTIONS</th>
                <th className="py-3 px-4 text-right">ACTION</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-800 font-medium">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-10 text-center text-slate-400">
                    No GPS records found for {selectedDate || 'the selected filter'}.
                  </td>
                </tr>
              ) : (
                filtered.slice(0, 150).map((r) => {
                  const hasCorrections = r.correction_history && r.correction_history.length > 0;
                  return (
                    <tr key={r.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3 px-4 font-bold text-slate-900">
                        {r.registration_number}
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-600">
                        {r.date}
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-500 text-[11px]">
                        {r.gps_device_imei}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-slate-600">
                        {formatKM(r.opening_km, 1)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-slate-600">
                        {formatKM(r.closing_km, 1)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                        <span className={r.daily_gps_km === 0 ? 'text-slate-400' : 'text-slate-900'}>
                          {formatKM(r.daily_gps_km, 1)} KM
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold ${
                          r.source === 'API'
                            ? 'bg-cyan-50 text-cyan-700 border border-cyan-200'
                            : r.source === 'Manual Correction'
                            ? 'bg-purple-50 text-purple-700 border border-purple-200'
                            : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        }`}>
                          {r.source}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        {hasCorrections ? (
                          <span
                            className="inline-flex items-center gap-1 text-[10.5px] text-purple-700 font-semibold cursor-help"
                            title={`Last corrected by ${r.correction_history?.[0]?.user}: ${r.correction_history?.[0]?.reason}`}
                          >
                            <Clock className="w-3 h-3" />
                            {r.correction_history?.length} edits
                          </span>
                        ) : (
                          <span className="text-slate-300 text-xs">—</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        {canEdit && (
                          <button
                            onClick={() => handleOpenCorrection(r)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-cyan-700 bg-cyan-50 hover:bg-cyan-100 rounded-lg transition-colors cursor-pointer"
                          >
                            <Edit2 className="w-3 h-3" />
                            Correct KM
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Manual GPS Correction Modal (With mandatory audit reason) */}
      {correctionModalOpen && activeRecord && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <Edit2 className="w-4 h-4 text-cyan-600" />
                Manual GPS KM Correction
              </h3>
              <button
                onClick={() => setCorrectionModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveCorrection} className="p-6 space-y-4">
              {correctionError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg">
                  {correctionError}
                </div>
              )}

              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-500">Vehicle:</span>
                  <span className="font-bold text-slate-900">{activeRecord.registration_number}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Date:</span>
                  <span className="font-mono text-slate-700">{activeRecord.date}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Current Recorded KM:</span>
                  <span className="font-mono font-bold text-slate-900">{activeRecord.daily_gps_km} KM</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  New Daily GPS KM
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  value={newKmValue}
                  onChange={(e) => setNewKmValue(parseFloat(e.target.value))}
                  className="w-full text-xs font-bold bg-white border border-slate-300 rounded-lg p-2.5 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Reason for Correction (Mandatory for Audit Trail)
                </label>
                <textarea
                  rows={3}
                  value={correctionReason}
                  onChange={(e) => setCorrectionReason(e.target.value)}
                  placeholder="e.g. GPS hardware wire loose / Trip slip verified / Odometer calibration"
                  className="w-full text-xs bg-white border border-slate-300 rounded-lg p-2.5 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                  required
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setCorrectionModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold text-white bg-cyan-600 hover:bg-cyan-700 rounded-lg transition-colors shadow-xs cursor-pointer"
                >
                  Commit Correction & Log Audit
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Import Summary & Error Modal (Section 6 requirement) */}
      {importSummary && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                GPS Import Validation Summary
              </h3>
              <button
                onClick={() => setImportSummary(null)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs text-center">
                <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                  <span className="text-[10.5px] text-slate-500 block">Uploaded</span>
                  <span className="text-base font-bold text-slate-900">{importSummary.totalUploaded}</span>
                </div>
                <div className="bg-emerald-50 p-2.5 rounded-lg border border-emerald-200">
                  <span className="text-[10.5px] text-emerald-600 block">Inserted</span>
                  <span className="text-base font-bold text-emerald-700">{importSummary.inserted}</span>
                </div>
                <div className="bg-blue-50 p-2.5 rounded-lg border border-blue-200">
                  <span className="text-[10.5px] text-blue-600 block">Updated</span>
                  <span className="text-base font-bold text-blue-700">{importSummary.updated}</span>
                </div>
                <div className="bg-amber-50 p-2.5 rounded-lg border border-amber-200">
                  <span className="text-[10.5px] text-amber-600 block">Duplicates</span>
                  <span className="text-base font-bold text-amber-700">{importSummary.duplicates}</span>
                </div>
                <div className="bg-rose-50 p-2.5 rounded-lg border border-rose-200">
                  <span className="text-[10.5px] text-rose-600 block">Unknown Cars</span>
                  <span className="text-base font-bold text-rose-700">{importSummary.unknownVehicles}</span>
                </div>
                <div className="bg-rose-50 p-2.5 rounded-lg border border-rose-200">
                  <span className="text-[10.5px] text-rose-600 block">Invalid Rows</span>
                  <span className="text-base font-bold text-rose-700">{importSummary.invalidRecords}</span>
                </div>
              </div>

              {/* Errors list */}
              {importSummary.errors.length > 0 && (
                <div className="mt-3">
                  <p className="text-xs font-bold text-rose-700 mb-1.5 flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    Validation Errors ({importSummary.errors.length}):
                  </p>
                  <div className="bg-rose-50/60 border border-rose-200 rounded-lg p-3 max-h-40 overflow-y-auto space-y-1 text-[11px] text-rose-800 font-mono">
                    {importSummary.errors.map((err: string, i: number) => (
                      <div key={i}>• {err}</div>
                    ))}
                  </div>
                </div>
              )}

              {/* Download rejected records */}
              {importSummary.rejectedRows.length > 0 && (
                <div className="pt-1">
                  <button
                    onClick={() => exportToExcel(importSummary.rejectedRows, 'Rejected_GPS_Records')}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-300 rounded-lg transition-colors cursor-pointer w-full justify-center"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Download Rejected Error Records (.xlsx)
                  </button>
                </div>
              )}
            </div>

            <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex justify-end">
              <button
                onClick={() => setImportSummary(null)}
                className="px-4 py-2 text-xs font-semibold text-white bg-slate-800 hover:bg-slate-900 rounded-lg transition-colors cursor-pointer"
              >
                Close Summary
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
