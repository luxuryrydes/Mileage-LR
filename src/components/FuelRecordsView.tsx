import React, { useState, useRef, useMemo, useEffect } from 'react';
import {
  Plus,
  Camera,
  UploadCloud,
  Search,
  Trash2,
  FileSpreadsheet,
  CheckCircle,
  AlertCircle,
  Smartphone,
  CreditCard,
  RefreshCw,
  Fuel,
  Car,
  TrendingUp,
  ChevronLeft,
  ChevronRight,
  Database,
  Calendar,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { FuelRecord, Vehicle, FuelType } from '../types/fleet';
import { formatINR } from '../utils/normalize';
import { exportFuelRecordsExcel } from '../services/export';
import { fleetDb } from '../services/db';

interface FuelRecordsViewProps {
  records: FuelRecord[];
  vehicles: Vehicle[];
  onAddFuelRecord: (record: Omit<FuelRecord, 'id' | 'normalized_reg' | 'created_at'>) => { success: boolean; message: string; record?: FuelRecord; isDuplicate?: boolean };
  onDeleteFuelRecord: (id: string) => boolean;
  onBulkImportFuel: (records: Array<Omit<FuelRecord, 'id' | 'normalized_reg' | 'created_at'>>) => {
    totalUploaded?: number;
    inserted: number;
    skippedDuplicates?: number;
    errors: string[];
    duplicateReasons?: string[];
  };
  onOpenScanReceiptModal: () => void;
  onRefreshRefuelingData?: () => { count: number; totalAmount: number; totalQuantity: number; uniqueVehicles: number } | void;
  canEdit: boolean;
}

export const FuelRecordsView: React.FC<FuelRecordsViewProps> = ({
  records,
  vehicles,
  onAddFuelRecord,
  onDeleteFuelRecord,
  onBulkImportFuel,
  onOpenScanReceiptModal,
  onRefreshRefuelingData,
  canEdit,
}) => {
  // Manual Entry Form State
  const [selectedVehicleReg, setSelectedVehicleReg] = useState('');
  const [date, setDate] = useState('2026-09-17');
  const [fuelType, setFuelType] = useState<FuelType>('CNG');
  const [quantity, setQuantity] = useState<string>('');
  const [rate, setRate] = useState<string>('86.98');
  const [odometer, setOdometer] = useState<string>('');
  const [fuelStation, setFuelStation] = useState('IGL CNG Station Millennium Park');
  const [paymentMode, setPaymentMode] = useState<'Cash' | 'Card' | 'GPay' | 'IGL Smart Card'>('IGL Smart Card');
  const [upiRef, setUpiRef] = useState('');
  const [formMsg, setFormMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Table Filters State
  const [searchQuery, setSearchQuery] = useState('');
  const [filterVehicle, setFilterVehicle] = useState('All');
  const [filterFuel, setFilterFuel] = useState('All');
  const [filterPayment, setFilterPayment] = useState('All');

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);

  // Refresh animation state
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshSuccessMsg, setRefreshSuccessMsg] = useState<string | null>(null);

  // Drag & drop file upload
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [importStatus, setImportStatus] = useState<string | null>(null);

  // Summary Metrics calculated from all active refueling records
  const refuelMetrics = useMemo(() => {
    const totalCost = records.reduce((sum, r) => sum + r.total_amount, 0);
    const totalQty = records.reduce((sum, r) => sum + r.quantity, 0);
    const uniqueVehicles = new Set(records.map((r) => r.normalized_reg)).size;
    const gpayCount = records.filter((r) => r.payment_mode === 'GPay').length;
    const iglCount = records.filter((r) => r.payment_mode === 'IGL Smart Card').length;
    const cashCount = records.filter((r) => r.payment_mode === 'Cash').length;
    return {
      totalCost,
      totalQty,
      uniqueVehicles,
      gpayCount,
      iglCount,
      cashCount,
      avgRate: totalQty > 0 ? totalCost / totalQty : 0,
    };
  }, [records]);

  // Handle Refresh Refueling Data
  const handleRefreshClick = () => {
    if (!onRefreshRefuelingData) return;
    setIsRefreshing(true);
    try {
      const stats = onRefreshRefuelingData();
      if (stats && 'count' in stats) {
        setRefreshSuccessMsg(`Refreshed ${stats.count} fuel entries across ${stats.uniqueVehicles} vehicles! Total: ${formatINR(stats.totalAmount)}`);
      } else {
        setRefreshSuccessMsg(`Refueling data refreshed successfully from sheet!`);
      }
      setTimeout(() => setRefreshSuccessMsg(null), 5000);
    } finally {
      setTimeout(() => setIsRefreshing(false), 500);
    }
  };

  // Auto-calculated total amount
  const parsedQty = parseFloat(quantity) || 0;
  const parsedRate = parseFloat(rate) || 0;
  const calculatedCost = Math.round(parsedQty * parsedRate * 100) / 100;

  const handleVehicleSelect = (reg: string) => {
    setSelectedVehicleReg(reg);
    const veh = vehicles.find((v) => v.registration_number === reg);
    if (veh) {
      setFuelType(veh.fuel_type);
      // Sensible rate based on fuel
      if (veh.fuel_type === 'CNG') {
        setRate('86.98');
        setFuelStation('IGL CNG Station Millennium Park');
      } else if (veh.fuel_type === 'Diesel') {
        setRate('89.62');
        setFuelStation('Indian Oil Petrol Pump Connaught Place');
      } else if (veh.fuel_type === 'Petrol') {
        setRate('96.72');
        setFuelStation('Indian Oil Petrol Pump Connaught Place');
      } else if (veh.fuel_type === 'Electric') {
        setRate('8.50');
        setFuelStation('Tata Power EV Supercharger');
      }
    }
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVehicleReg) {
      setFormMsg({ type: 'error', text: 'Please select a vehicle from the fleet.' });
      return;
    }
    if (parsedQty <= 0) {
      setFormMsg({ type: 'error', text: 'Please enter a valid fuel quantity.' });
      return;
    }
    if (parsedRate <= 0) {
      setFormMsg({ type: 'error', text: 'Please enter a valid fuel rate.' });
      return;
    }

    const veh = vehicles.find((v) => v.registration_number === selectedVehicleReg);
    const carType = veh?.vehicle_type || 'Commercial';

    const res = onAddFuelRecord({
      vehicle_id: veh?.id || 'veh-manual',
      registration_number: selectedVehicleReg,
      car_type: carType,
      date,
      fuel_type: fuelType,
      quantity: parsedQty,
      rate: parsedRate,
      total_amount: calculatedCost,
      odometer: odometer ? parseInt(odometer, 10) : undefined,
      payment_mode: paymentMode,
      payment_reference: paymentMode === 'GPay' ? upiRef : undefined,
      fuel_station: fuelStation || (fuelType === 'CNG' ? 'IGL CNG Station Millennium Park' : 'Indian Oil Petrol Pump Connaught Place'),
      igl_card_number: veh?.igl_card_number || undefined,
      source: 'Manual',
    });

    if (res.success) {
      setFormMsg({ type: 'success', text: `Saved fuel expense of ${formatINR(calculatedCost)} for ${selectedVehicleReg}` });
      setQuantity('');
      setOdometer('');
      setUpiRef('');
      setTimeout(() => setFormMsg(null), 4000);
    } else {
      setFormMsg({ type: 'error', text: res.message });
    }
  };

  // Excel / CSV File upload parser
  const handleFileUpload = (file: File) => {
    setImportStatus('Reading fuel expense file...');
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[firstSheetName];
        const json: any[] = XLSX.utils.sheet_to_json(sheet, { defval: '' });

        if (json.length === 0) {
          setImportStatus('File is empty or contains no valid rows.');
          return;
        }

        const parsedRows: Array<Omit<FuelRecord, 'id' | 'normalized_reg' | 'created_at'>> = [];
        let matchedByCard = 0;
        let matchedByReg = 0;

        // Build quick card-to-vehicle and reg-to-vehicle lookup
        const cardToVeh = new Map<string, Vehicle>();
        const regToVeh = new Map<string, Vehicle>();

        vehicles.forEach((v) => {
          regToVeh.set(v.normalized_reg, v);
          if (v.igl_card_number) {
            cardToVeh.set(v.igl_card_number.replace(/[\s\-_.]+/g, ''), v);
          }
          if (v.igl_smart_card_number) {
            cardToVeh.set(v.igl_smart_card_number.replace(/[\s\-_.]+/g, ''), v);
          }
        });

        // Also check fleetDb CNG cards
        const allCards = fleetDb.getCNGCards();
        allCards.forEach((c) => {
          const cleanCard = c.card_number.replace(/[\s\-_.]+/g, '');
          if (!cardToVeh.has(cleanCard) && c.linked_vehicle_reg) {
            const v = vehicles.find((veh) => veh.normalized_reg === c.normalized_reg || veh.registration_number === c.linked_vehicle_reg);
            if (v) cardToVeh.set(cleanCard, v);
          }
        });

        json.forEach((row) => {
          // Normalize column lookups (case-insensitive & trimmed)
          const keys = Object.keys(row);
          const getVal = (colNames: string[]) => {
            for (const col of colNames) {
              const matchedKey = keys.find((k) => k.trim().toLowerCase() === col.toLowerCase());
              if (matchedKey && row[matchedKey] !== undefined && row[matchedKey] !== '') {
                return row[matchedKey];
              }
            }
            return '';
          };

          const rawCard = getVal(['Card Number', 'Card No', 'Card #', 'CardNo', 'Smart Card No', 'SmartCardNo', 'IGL Card Number', 'IGL Card', 'Card', 'igl_card_number']);
          const cleanCard = rawCard ? String(rawCard).replace(/[\s\-_.]+/g, '') : '';

          let rawReg = getVal(['Vehicle No', 'Vehicle', 'Reg No', 'Vehicle Registration', 'Vehicle Reg No', 'registration_number', 'Car No', 'Vehicle #', 'VRN']);

          let veh: Vehicle | undefined;

          // 1. Resolve via Card Number first if card is present
          if (cleanCard && cardToVeh.has(cleanCard)) {
            veh = cardToVeh.get(cleanCard);
            matchedByCard++;
            if (!rawReg && veh) {
              rawReg = veh.registration_number;
            }
          }

          // 2. Resolve via Registration Number
          if (!veh && rawReg) {
            const normReg = String(rawReg).replace(/[\s\-_.]+/g, '').toUpperCase();
            veh = regToVeh.get(normReg);
            if (veh) matchedByReg++;
          }

          const qty = parseFloat(getVal(['Quantity', 'Qty', 'Volume', 'Litres', 'Kg', 'Volume (KG)', 'Volume (L)']) || '0');
          const pRate = parseFloat(getVal(['Price', 'Rate', 'rate', 'Unit Price']) || '0');
          const cost = parseFloat(getVal(['Value', 'Total Amount', 'Amount', 'Cost', 'Txn Amount', 'Net Amount']) || '0') || (qty * pRate);
          const fDate = getVal(['Transaction Date', 'Date', 'date', 'Txn Date', 'Txn Date & Time', 'Date Time']) || '2026-09-17';
          const fTypeRaw = getVal(['Fuel Type', 'Fuel', 'fuel_type']);
          const fType: FuelType = (fTypeRaw === 'Petrol' || fTypeRaw === 'Diesel' || fTypeRaw === 'Electric' || fTypeRaw === 'Petrol Hybrid') ? fTypeRaw : 'CNG';
          const odo = parseInt(getVal(['OD Meter', 'Odometer', 'KM', 'Odo Reading', 'KM Reading']) || '0', 10);
          const payMode = getVal(['Trans Mode', 'Payment', 'Payment Mode']) || 'IGL Smart Card';
          const station = getVal(['Station', 'Fuel Station', 'Pump', 'Merchant Name', 'Terminal', 'Location', 'RO Name']) || (fType === 'CNG' ? 'IGL CNG Station' : 'Fuel Pump');

          if ((rawReg || veh) && qty > 0) {
            const effectiveReg = veh?.registration_number || String(rawReg).trim().toUpperCase();
            const effectiveCard = cleanCard || veh?.igl_smart_card_number || veh?.igl_card_number;

            parsedRows.push({
              vehicle_id: veh?.id || 'veh-imp',
              registration_number: effectiveReg,
              car_type: veh?.vehicle_type || 'Fleet Car',
              date: String(fDate).slice(0, 10),
              fuel_type: fType,
              quantity: qty,
              rate: pRate || (qty > 0 ? Math.round((cost / qty) * 100) / 100 : 86.98),
              total_amount: cost,
              fuel_station: station,
              igl_card_number: effectiveCard || undefined,
              odometer: odo || undefined,
              payment_mode: (cleanCard || String(payMode).includes('Card')) ? 'IGL Smart Card' : (payMode as any),
              source: 'IGL Import',
            });
          }
        });

        if (parsedRows.length === 0) {
          setImportStatus('No valid fuel rows found with positive quantity and recognized card number or vehicle registration.');
          return;
        }

        const result = onBulkImportFuel(parsedRows);
        const skipped = result.skippedDuplicates || 0;

        if (result.inserted > 0 && skipped > 0) {
          setImportStatus(
            `Import complete: ${result.inserted} new fuel entries uploaded successfully! (${skipped} already existing records were recognized in the database and skipped to avoid duplicate entries).`
          );
        } else if (result.inserted > 0) {
          setImportStatus(
            `Successfully imported ${result.inserted} new fuel records (${matchedByCard} matched via IGL Smart Card, ${matchedByReg} matched via Vehicle Reg)!`
          );
        } else if (skipped > 0) {
          setImportStatus(
            `No new entries needed: All ${skipped} records in this file already exist in the fuel database. No duplicate data was uploaded.`
          );
        } else {
          setImportStatus('No valid fuel records found to import.');
        }
      } catch (err: any) {
        setImportStatus(`Failed to read file: ${err.message}`);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  // Filtered records
  const filtered = useMemo(() => {
    return records.filter((r) => {
      if (filterVehicle !== 'All' && r.registration_number !== filterVehicle) return false;
      if (filterFuel !== 'All' && r.fuel_type !== filterFuel) return false;
      if (filterPayment !== 'All' && r.payment_mode !== filterPayment) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          (r.registration_number || '').toLowerCase().includes(q) ||
          (r.car_type || '').toLowerCase().includes(q) ||
          (r.igl_card_number && r.igl_card_number.toLowerCase().includes(q)) ||
          (r.fuel_station && r.fuel_station.toLowerCase().includes(q)) ||
          (r.payment_reference && r.payment_reference.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [records, filterVehicle, filterFuel, filterPayment, searchQuery]);

  // Reset to page 1 whenever filters, search or page size changes to avoid empty view
  useEffect(() => {
    setCurrentPage(1);
  }, [filterVehicle, filterFuel, filterPayment, searchQuery, pageSize]);

  // Pagination calculations
  const totalPages = Math.max(1, Math.ceil(filtered.length / (pageSize || 1)));
  const paginatedRecords = useMemo(() => {
    if (pageSize >= 9999) return filtered;
    const start = (currentPage - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, currentPage, pageSize]);

  return (
    <div className="px-6 py-5 space-y-6">
      {/* Refueling Master Intelligence & Sync Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-cyan-950 text-white rounded-xl p-5 shadow-sm border border-slate-700/60">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 pb-4 border-b border-slate-700/60">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-cyan-500/20 border border-cyan-400/40 flex items-center justify-center text-cyan-300 shrink-0 mt-0.5">
              <Fuel className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-bold text-white tracking-tight">
                  Fleet Refueling & Fuel Expenses
                </h1>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  <CheckCircle className="w-2.5 h-2.5" />
                  Fuel Sheet Active
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                Refueling log containing {records.length.toLocaleString('en-IN')} transactions across {refuelMetrics.uniqueVehicles} commercial vehicles (01 Sep 2026 – 16 Sep 2026).
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            {onRefreshRefuelingData && (
              <button
                type="button"
                onClick={handleRefreshClick}
                disabled={isRefreshing}
                className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-white bg-cyan-600 hover:bg-cyan-500 active:bg-cyan-700 rounded-lg shadow-sm transition-all cursor-pointer disabled:opacity-50"
                title="Sync and refresh all 1,356 fuel transactions from the updated fleet sheet"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
                {isRefreshing ? 'Syncing...' : 'Refresh Refueling Data'}
              </button>
            )}

            <button
              type="button"
              onClick={() => exportFuelRecordsExcel(records)}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-200 bg-slate-800/80 hover:bg-slate-700 border border-slate-600/80 rounded-lg transition-colors cursor-pointer"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
              Export Master Excel
            </button>
          </div>
        </div>

        {refreshSuccessMsg && (
          <div className="mt-3 py-2 px-3.5 rounded-lg bg-emerald-950/80 border border-emerald-500/50 text-emerald-200 text-xs font-medium flex items-center gap-2 animate-fadeIn">
            <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{refreshSuccessMsg}</span>
          </div>
        )}

        {/* 4 Metric Counters */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 pt-1">
          <div className="bg-slate-800/60 border border-slate-700/50 rounded-lg p-3">
            <div className="text-[11px] font-medium text-slate-400">Total Transactions</div>
            <div className="text-lg font-bold text-white font-mono mt-0.5">
              {records.length.toLocaleString('en-IN')}
            </div>
            <div className="text-[10px] text-slate-400 mt-1 flex items-center gap-1">
              <Calendar className="w-3 h-3 text-cyan-400" />
              Sep 01 – Sep 16, 2026
            </div>
          </div>

          <div className="bg-slate-800/60 border border-slate-700/50 rounded-lg p-3">
            <div className="text-[11px] font-medium text-slate-400">Vehicles Refueled</div>
            <div className="text-lg font-bold text-cyan-300 font-mono mt-0.5">
              {refuelMetrics.uniqueVehicles}
            </div>
            <div className="text-[10px] text-slate-400 mt-1 flex items-center gap-1">
              <Car className="w-3 h-3 text-cyan-400" />
              Commercial Fleet Active
            </div>
          </div>

          <div className="bg-slate-800/60 border border-slate-700/50 rounded-lg p-3">
            <div className="text-[11px] font-medium text-slate-400">Total Volume</div>
            <div className="text-lg font-bold text-emerald-300 font-mono mt-0.5">
              {Math.round(refuelMetrics.totalQty).toLocaleString('en-IN')} <span className="text-xs font-normal text-slate-300">kg/L</span>
            </div>
            <div className="text-[10px] text-slate-400 mt-1 flex items-center gap-1">
              <TrendingUp className="w-3 h-3 text-emerald-400" />
              Avg ₹{refuelMetrics.avgRate.toFixed(2)}/unit
            </div>
          </div>

          <div className="bg-slate-800/60 border border-slate-700/50 rounded-lg p-3">
            <div className="text-[11px] font-medium text-slate-400">Total Fuel Expenditure</div>
            <div className="text-lg font-bold text-amber-300 font-mono mt-0.5">
              {formatINR(refuelMetrics.totalCost)}
            </div>
            <div className="text-[10px] text-slate-400 mt-1 flex items-center gap-1.5 truncate">
              <span>IGL: {refuelMetrics.iglCount}</span>
              <span>·</span>
              <span>GPay: {refuelMetrics.gpayCount}</span>
              <span>·</span>
              <span>Cash: {refuelMetrics.cashCount}</span>
            </div>
          </div>
        </div>
      </div>

      {/* 1. Manual Fuel Entry Card (Exact layout from Image 3) */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Plus className="w-4 h-4 text-cyan-600" />
            Manual Fuel Entry
          </h2>
          {formMsg && (
            <div
              className={`flex items-center gap-1.5 text-xs px-3 py-1 rounded-lg ${
                formMsg.type === 'success'
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : 'bg-rose-50 text-rose-700 border border-rose-200'
              }`}
            >
              {formMsg.type === 'success' ? <CheckCircle className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}
              <span>{formMsg.text}</span>
            </div>
          )}
        </div>

        <form onSubmit={handleManualSubmit} className="space-y-4">
          {/* Top Row Inputs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Search vehicle dropdown */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                Vehicle (GPS)
              </label>
              <select
                value={selectedVehicleReg}
                onChange={(e) => handleVehicleSelect(e.target.value)}
                className="w-full text-xs font-semibold bg-slate-50 border border-slate-300 rounded-lg p-2.5 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                required
              >
                <option value="">Search vehicle (GPS)...</option>
                {vehicles.map((v) => (
                  <option key={v.id} value={v.registration_number}>
                    {v.registration_number} — {v.vehicle_type} ({v.fuel_type}){v.igl_card_number ? ` · [IGL: ${v.igl_card_number}]` : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Date */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                Date
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full text-xs bg-slate-50 border border-slate-300 rounded-lg p-2.5 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                required
              >
              </input>
            </div>

            {/* Fuel Type */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                Fuel Type
              </label>
              <select
                value={fuelType}
                onChange={(e) => setFuelType(e.target.value as FuelType)}
                className="w-full text-xs bg-slate-50 border border-slate-300 rounded-lg p-2.5 focus:outline-none focus:ring-1 focus:ring-cyan-500"
              >
                <option value="CNG">CNG</option>
                <option value="Petrol">Petrol</option>
                <option value="Diesel">Diesel</option>
                <option value="Electric">Electric</option>
                <option value="Petrol Hybrid">Petrol Hybrid</option>
              </select>
            </div>

            {/* Quantity */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                Quantity ({fuelType === 'CNG' ? 'kg' : fuelType === 'Electric' ? 'kWh' : 'L'})
              </label>
              <input
                type="number"
                step="0.01"
                min="0.1"
                placeholder="Quantity"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className="w-full text-xs bg-white border border-slate-300 rounded-lg p-2.5 focus:outline-none focus:ring-1 focus:ring-cyan-500 font-semibold"
                required
              />
            </div>
          </div>

          {/* Second Row Inputs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Rate */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                Rate / Unit (₹)
              </label>
              <input
                type="number"
                step="0.01"
                min="1"
                placeholder="Rate"
                value={rate}
                onChange={(e) => setRate(e.target.value)}
                className="w-full text-xs bg-white border border-slate-300 rounded-lg p-2.5 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                required
              />
            </div>

            {/* Total Cost (Auto-calculated) */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                Total Amount (Auto)
              </label>
              <div className="w-full text-xs font-bold text-slate-900 bg-slate-100 border border-slate-200 rounded-lg p-2.5">
                {formatINR(calculatedCost)}
              </div>
            </div>

            {/* Odometer */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                Odometer (Optional)
              </label>
              <input
                type="number"
                placeholder="Current ODO"
                value={odometer}
                onChange={(e) => setOdometer(e.target.value)}
                className="w-full text-xs bg-white border border-slate-300 rounded-lg p-2.5 focus:outline-none focus:ring-1 focus:ring-cyan-500"
              />
            </div>

            {/* Fuel Station / Outlet */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                Fuel Station / Outlet
              </label>
              <input
                type="text"
                placeholder="Station / Pump Name"
                value={fuelStation}
                onChange={(e) => setFuelStation(e.target.value)}
                className="w-full text-xs bg-white border border-slate-300 rounded-lg p-2.5 focus:outline-none focus:ring-1 focus:ring-cyan-500"
              />
            </div>
          </div>

          {/* Third Row: Payment Mode & Actions */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pt-2">
            {/* Payment Mode Selector */}
            <div className="flex items-center gap-2">
              <div className="inline-flex rounded-lg p-1 bg-slate-100 border border-slate-200 text-xs font-medium">
                <button
                  type="button"
                  onClick={() => setPaymentMode('IGL Smart Card')}
                  className={`px-3 py-1.5 rounded-md cursor-pointer transition-all ${
                    paymentMode === 'IGL Smart Card' ? 'bg-white font-bold text-slate-900 shadow-2xs' : 'text-slate-600'
                  }`}
                >
                  IGL Smart Card
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentMode('Cash')}
                  className={`px-3 py-1.5 rounded-md cursor-pointer transition-all ${
                    paymentMode === 'Cash' ? 'bg-white font-bold text-slate-900 shadow-2xs' : 'text-slate-600'
                  }`}
                >
                  Cash / Card
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentMode('GPay')}
                  className={`px-3 py-1.5 rounded-md cursor-pointer transition-all ${
                    paymentMode === 'GPay' ? 'bg-white font-bold text-blue-700 shadow-2xs' : 'text-slate-600'
                  }`}
                >
                  Google Pay (UPI)
                </button>
              </div>

              {paymentMode === 'GPay' && (
                <input
                  type="text"
                  placeholder="UPI Reference (e.g. UPI67382294)"
                  value={upiRef}
                  onChange={(e) => setUpiRef(e.target.value)}
                  className="text-xs bg-white border border-blue-300 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500 w-48"
                />
              )}
            </div>

            {/* Action Buttons: Scan Receipt & Save Entry */}
            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={onOpenScanReceiptModal}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg transition-colors shadow-2xs cursor-pointer"
                title="Scan fuel pump receipt image with AI OCR"
              >
                <Camera className="w-4 h-4 text-cyan-600" />
                Scan Receipt
              </button>

              <button
                type="submit"
                disabled={!canEdit}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-cyan-600 hover:bg-cyan-700 rounded-lg transition-colors shadow-xs cursor-pointer disabled:opacity-50"
              >
                Save Entry
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* 2. Drag & Drop Fuel Expense Zone (Exact layout from Image 3) */}
      <div
        onClick={() => fileInputRef.current?.click()}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            handleFileUpload(e.dataTransfer.files[0]);
          }
        }}
        className="bg-white border-2 border-dashed border-slate-300 hover:border-cyan-500 rounded-xl p-6 text-center cursor-pointer transition-colors shadow-2xs group"
      >
        <input
          type="file"
          ref={fileInputRef}
          accept=".xlsx,.xls,.csv"
          onChange={(e) => {
            if (e.target.files && e.target.files[0]) {
              handleFileUpload(e.target.files[0]);
              e.target.value = ''; // Reset so the same file or modified file can be re-uploaded
            }
          }}
          className="hidden"
        />
        <div className="flex flex-col items-center justify-center space-y-2">
          <div className="w-11 h-11 rounded-full bg-slate-50 group-hover:bg-cyan-50 border border-slate-200 group-hover:border-cyan-200 flex items-center justify-center text-slate-500 group-hover:text-cyan-600 transition-colors">
            <UploadCloud className="w-6 h-6" />
          </div>
          <p className="text-xs font-semibold text-slate-800">
            Drag & drop fuel expense <span className="font-mono text-cyan-600">.xlsx / .csv</span> here, or{' '}
            <span className="text-cyan-600 underline">Choose files</span>
          </p>
          <p className="text-[11px] text-slate-400 max-w-xl">
            Supports IGL CNG Smart Card, BPCL Fuel Pump / E-Slip reports (Vehicle No, Fuel Type, Transaction Date, Quantity, Price, Value, OD Meter, Trans Mode), and generic fuel sheets.
          </p>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10.5px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle className="w-3 h-3 text-emerald-600 shrink-0" />
            Duplicate Protection Active: Skips already existing fuel entries automatically
          </div>
          {importStatus && (
            <div className="text-xs font-semibold text-cyan-700 bg-cyan-50 border border-cyan-200 px-3 py-1 rounded-lg mt-2">
              {importStatus}
            </div>
          )}
        </div>
      </div>

      {/* 3. Fuel Records Table (Exact layout from Image 3) */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        {/* Table Filter Controls */}
        <div className="p-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-slate-900 text-sm">
              Fuel Records <span className="text-slate-400 font-normal">({filtered.length})</span>
            </h3>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Search Input */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search vehicle no / name"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-cyan-500 w-52"
              />
            </div>

            {/* Filter All Vehicles */}
            <select
              value={filterVehicle}
              onChange={(e) => setFilterVehicle(e.target.value)}
              className="text-xs bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-cyan-500"
            >
              <option value="All">All vehicles</option>
              {vehicles.slice(0, 50).map((v) => (
                <option key={v.id} value={v.registration_number}>
                  {v.registration_number}
                </option>
              ))}
            </select>

            {/* Filter All Fuels */}
            <select
              value={filterFuel}
              onChange={(e) => setFilterFuel(e.target.value)}
              className="text-xs bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-cyan-500"
            >
              <option value="All">All fuels</option>
              <option value="CNG">CNG</option>
              <option value="Petrol">Petrol</option>
              <option value="Diesel">Diesel</option>
              <option value="Electric">Electric</option>
            </select>

            {/* Filter All Payments */}
            <select
              value={filterPayment}
              onChange={(e) => setFilterPayment(e.target.value)}
              className="text-xs bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-cyan-500"
            >
              <option value="All">All payments</option>
              <option value="GPay">GPay / UPI</option>
              <option value="IGL Smart Card">IGL Smart Card</option>
              <option value="Cash">Cash / Card</option>
            </select>

            {/* Export CSV */}
            <button
              onClick={() => exportFuelRecordsExcel(filtered)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors shadow-2xs cursor-pointer"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-slate-500" />
              Export CSV
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10.5px]">
                <th className="py-3 px-4">DATE</th>
                <th className="py-3 px-4">VEHICLE</th>
                <th className="py-3 px-4">CAR TYPE</th>
                <th className="py-3 px-4">FUEL</th>
                <th className="py-3 px-4 text-right">QTY</th>
                <th className="py-3 px-4 text-right">RATE</th>
                <th className="py-3 px-4 text-right">COST</th>
                <th className="py-3 px-4 text-right">ODO</th>
                <th className="py-3 px-4">PAYMENT</th>
                <th className="py-3 px-4 text-center">SOURCE</th>
                <th className="py-3 px-4 text-right">ACTION</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-800 font-medium">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={11} className="py-10 text-center text-slate-400">
                    No fuel transactions found.
                  </td>
                </tr>
              ) : (
                paginatedRecords.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3 px-4 font-mono text-slate-600">
                      {r.date}
                    </td>
                    <td className="py-3 px-4 font-bold text-slate-900">
                      <div className="flex flex-col">
                        <span>{r.registration_number}</span>
                        {r.igl_card_number && (
                          <span className="text-[10.5px] font-mono text-cyan-700 font-normal flex items-center gap-1 mt-0.5" title="Linked IGL Smart Card">
                            <CreditCard className="w-2.5 h-2.5 text-cyan-600 inline shrink-0" />
                            {r.igl_card_number}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-slate-700">
                      {r.car_type}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${
                        r.fuel_type === 'CNG' ? 'bg-emerald-500 text-white' :
                        r.fuel_type === 'Electric' ? 'bg-indigo-600 text-white' :
                        r.fuel_type === 'Diesel' ? 'bg-amber-600 text-white' : 'bg-sky-600 text-white'
                      }`}>
                        {r.fuel_type}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-semibold">
                      {r.quantity} {r.fuel_type === 'CNG' ? 'kg' : r.fuel_type === 'Electric' ? 'kWh' : 'L'}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-slate-600">
                      ₹{r.rate.toFixed(2)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                      {formatINR(r.total_amount)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-slate-500">
                      {r.odometer ? r.odometer.toLocaleString('en-IN') : '—'}
                    </td>
                    <td className="py-3 px-4">
                      {r.payment_mode === 'GPay' ? (
                        <span className="inline-flex items-center gap-1 text-blue-700 font-semibold">
                          <Smartphone className="w-3 h-3 text-blue-600" />
                          GPay · {r.payment_reference || 'UPI'}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-slate-700 font-medium">
                          <CreditCard className="w-3 h-3 text-slate-400" />
                          {r.payment_mode}
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-semibold">
                        {r.source}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      {canEdit ? (
                        <button
                          onClick={() => {
                            if (confirm(`Delete fuel entry for ${r.registration_number} on ${r.date}?`)) {
                              onDeleteFuelRecord(r.id);
                            }
                          }}
                          className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors cursor-pointer"
                          title="Delete Fuel Record"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      ) : (
                        <span className="text-slate-300 text-xs">—</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div className="p-4 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-slate-50/50">
          <div className="text-xs text-slate-500 font-medium">
            Showing <span className="font-semibold text-slate-800">{filtered.length === 0 ? 0 : (currentPage - 1) * pageSize + 1}</span> to{' '}
            <span className="font-semibold text-slate-800">{Math.min(currentPage * pageSize, filtered.length)}</span> of{' '}
            <span className="font-semibold text-slate-800">{filtered.length}</span> refueling entries
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 text-xs text-slate-600">
              <span>Per page:</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="bg-white border border-slate-300 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-cyan-500"
              >
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
                <option value={250}>250</option>
                <option value={99999}>All ({filtered.length})</option>
              </select>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage <= 1}
                className="p-1.5 rounded border border-slate-300 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                title="Previous Page"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-xs font-semibold text-slate-700 px-2 font-mono">
                {currentPage} / {totalPages}
              </span>
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage >= totalPages}
                className="p-1.5 rounded border border-slate-300 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                title="Next Page"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
