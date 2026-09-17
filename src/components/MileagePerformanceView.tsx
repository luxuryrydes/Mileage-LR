import React, { useState, useMemo } from 'react';
import { Search, Download, FileText, Filter, Edit3, ChevronRight } from 'lucide-react';
import { MonthlyVehiclePerformance } from '../types/fleet';
import { formatINR, formatKM } from '../utils/normalize';
import { exportMileagePerformanceExcel, exportMileagePerformancePDF } from '../services/export';

interface MileagePerformanceViewProps {
  records: MonthlyVehiclePerformance[];
  selectedMonth: string;
  onVehicleClick: (vehicleId: string) => void;
  onEditVehicleOrStandard: (regNo: string) => void;
}

export const MileagePerformanceView: React.FC<MileagePerformanceViewProps> = ({
  records,
  selectedMonth,
  onVehicleClick,
  onEditVehicleOrStandard,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterFuel, setFilterFuel] = useState<string>('All');
  const [filterCarType, setFilterCarType] = useState<string>('All');
  const [belowAverageOnly, setBelowAverageOnly] = useState<boolean>(false);

  // Extract unique car types and fuels for filter dropdowns
  const carTypes = useMemo(() => {
    const set = new Set<string>();
    records.forEach(r => { if (r.car_type) set.add(r.car_type); });
    return Array.from(set).sort();
  }, [records]);

  const fuelTypes = useMemo(() => {
    const set = new Set<string>();
    records.forEach(r => { if (r.fuel_type) set.add(r.fuel_type); });
    return Array.from(set).sort();
  }, [records]);

  // Filter & Sort: worst performers shown first (Needs Attention first)
  const filteredRecords = useMemo(() => {
    return records
      .filter((r) => {
        if (belowAverageOnly && r.status !== 'Needs Attention' && r.status !== 'Below Standard') {
          return false;
        }
        if (filterFuel !== 'All' && r.fuel_type !== filterFuel) {
          return false;
        }
        if (filterCarType !== 'All' && r.car_type !== filterCarType) {
          return false;
        }
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          return (
            r.registration_number.toLowerCase().includes(q) ||
            r.car_type.toLowerCase().includes(q) ||
            r.fuel_type.toLowerCase().includes(q)
          );
        }
        return true;
      })
      .sort((a, b) => {
        // Needs Attention first
        if (a.status === 'Needs Attention' && b.status !== 'Needs Attention') return -1;
        if (b.status === 'Needs Attention' && a.status !== 'Needs Attention') return 1;
        // Then sort by descending variance
        return b.variance_pct - a.variance_pct;
      });
  }, [records, belowAverageOnly, filterFuel, filterCarType, searchQuery]);

  return (
    <div className="px-6 py-5 space-y-4">
      {/* Header Info Banner matching Image 1 */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
        <div>
          <div className="flex flex-wrap items-center gap-2.5">
            <h2 className="text-xl font-bold tracking-tight text-slate-900">
              Monthly Mileage Performance — {selectedMonth}
            </h2>
            <span className="text-[11px] px-2.5 py-0.5 font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-md">
              CNG, Petrol & Diesel Fleet Only (Electric Excluded)
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1 max-w-4xl leading-relaxed">
            Tank-to-tank mileage for every combustion vehicle · Mileage = Mosfet GPS distance ÷ fuel consumed · Cost/KM uses full-month GPS distance · Evaluated per fuel type. Worst performers shown first.
          </p>
        </div>

        {/* Action Controls matching Screenshot 1 */}
        <div className="flex items-center gap-3 shrink-0">
          <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={belowAverageOnly}
              onChange={(e) => setBelowAverageOnly(e.target.checked)}
              className="rounded text-cyan-600 focus:ring-cyan-500 w-4 h-4 cursor-pointer"
            />
            <span>Below Average only</span>
          </label>

          <button
            onClick={() => exportMileagePerformanceExcel(filteredRecords, selectedMonth)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors shadow-2xs cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            Excel
          </button>

          <button
            onClick={() => exportMileagePerformancePDF(filteredRecords, selectedMonth)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors shadow-2xs cursor-pointer"
          >
            <FileText className="w-3.5 h-3.5 text-slate-500" />
            PDF
          </button>
        </div>
      </div>

      {/* Filter / Search Bar */}
      <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs flex flex-wrap items-center justify-between gap-3">
        <div className="relative flex-1 min-w-[240px] max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search vehicle no / name"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-cyan-500 text-slate-900"
          />
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-slate-500 font-medium">Car Type:</span>
            <select
              value={filterCarType}
              onChange={(e) => setFilterCarType(e.target.value)}
              className="text-xs bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-cyan-500"
            >
              <option value="All">All Car Types</option>
              {carTypes.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-xs text-slate-500 font-medium">Fuel:</span>
            <select
              value={filterFuel}
              onChange={(e) => setFilterFuel(e.target.value)}
              className="text-xs bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-cyan-500"
            >
              <option value="All">All Fuels</option>
              {fuelTypes.map(f => (
                <option key={f} value={f}>{f}</option>
              ))}
            </select>
          </div>

          <span className="text-xs text-slate-400 pl-2">
            Showing <b>{filteredRecords.length}</b> vehicles
          </span>
        </div>
      </div>

      {/* Main Table (Exact Match to Screenshot 1) */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50/90 border-b border-slate-200 text-slate-500 font-bold tracking-wider uppercase text-[10.5px]">
                <th className="py-3 px-4">VEHICLE</th>
                <th className="py-3 px-4">CAR TYPE</th>
                <th className="py-3 px-4">FUEL</th>
                <th className="py-3 px-4 text-right">DISTANCE (KM)</th>
                <th className="py-3 px-4 text-right">FUEL / COST</th>
                <th className="py-3 px-4 text-right">PHYSICAL MILEAGE</th>
                <th className="py-3 px-4 text-right">COST / KM</th>
                <th className="py-3 px-4 text-right">STANDARD</th>
                <th className="py-3 px-4 text-right">VARIANCE</th>
                <th className="py-3 px-4 text-center">STATUS</th>
                <th className="py-3 px-4 text-center">ACTIONS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-800 font-medium">
              {filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={11} className="py-12 text-center text-slate-400">
                    No vehicles found matching current criteria.
                  </td>
                </tr>
              ) : (
                filteredRecords.map((r) => {
                  const isNegativeCostGood = r.mileage_type === 'Cost per KM';
                  const isAttention = r.status === 'Needs Attention' || r.status === 'Below Standard';
                  
                  return (
                    <tr
                      key={r.vehicle_id}
                      className="hover:bg-slate-50/70 transition-colors group cursor-pointer"
                      onClick={() => onVehicleClick(r.vehicle_id)}
                    >
                      {/* VEHICLE */}
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-cyan-600 hover:text-cyan-700 hover:underline">
                          {r.registration_number}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          {r.registration_number}
                        </div>
                      </td>

                      {/* CAR TYPE */}
                      <td className="py-3.5 px-4 text-slate-700 font-semibold">
                        {r.car_type}
                      </td>

                      {/* FUEL */}
                      <td className="py-3.5 px-4">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10.5px] font-bold ${
                          r.fuel_type === 'CNG' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                          r.fuel_type === 'Electric' ? 'bg-indigo-50 text-indigo-700 border border-indigo-200' :
                          r.fuel_type === 'Diesel' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                          'bg-sky-50 text-sky-700 border border-sky-200'
                        }`}>
                          {r.fuel_type}
                        </span>
                      </td>

                      {/* DISTANCE (KM) */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="font-bold text-slate-900 font-mono">
                          {formatKM(r.distance_km, 1)}
                        </div>
                        <div className="text-[10.5px] text-slate-400">
                          {r.date_range_label}
                        </div>
                      </td>

                      {/* FUEL / COST */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="font-semibold text-slate-800">
                          {r.fuel_quantity > 0 ? `${r.fuel_quantity} ${r.fuel_unit}` : '—'}
                        </div>
                        <div className="text-[10.5px] text-slate-400">
                          {r.fuel_cost > 0 ? formatINR(r.fuel_cost) : '—'}
                        </div>
                      </td>

                      {/* PHYSICAL MILEAGE */}
                      <td className="py-3.5 px-4 text-right font-mono">
                        {r.physical_mileage > 0 ? (
                          <span className="font-bold text-slate-900">
                            {r.physical_mileage.toFixed(2)}{' '}
                            <span className="text-[10.5px] font-normal text-slate-500">
                              km/{r.fuel_unit}
                            </span>
                          </span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>

                      {/* COST / KM */}
                      <td className="py-3.5 px-4 text-right font-mono">
                        {r.actual_cost_per_km > 0 ? (
                          <span className={`font-bold ${
                            isAttention ? 'text-rose-600' : 'text-emerald-600'
                          }`}>
                            ₹{r.actual_cost_per_km.toFixed(2)}
                          </span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>

                      {/* STANDARD */}
                      <td className="py-3.5 px-4 text-right font-mono text-slate-600">
                        {r.standard_value} {r.standard_unit}
                      </td>

                      {/* VARIANCE */}
                      <td className="py-3.5 px-4 text-right font-mono font-bold">
                        {r.status === 'No Data' ? (
                          <span className="text-slate-400">—</span>
                        ) : (
                          <span className={isAttention ? 'text-rose-600' : 'text-emerald-600'}>
                            {r.variance_pct > 0 ? `+${r.variance_pct}%` : `${r.variance_pct}%`}
                          </span>
                        )}
                      </td>

                      {/* STATUS */}
                      <td className="py-3.5 px-4 text-center">
                        {r.status === 'Needs Attention' || r.status === 'Below Standard' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10.5px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                            Needs Attention
                          </span>
                        ) : r.status === 'On Target' || r.status === 'Above Standard' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10.5px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                            On Target
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10.5px] font-medium bg-slate-100 text-slate-500">
                            No Data
                          </span>
                        )}
                      </td>

                      {/* ACTIONS */}
                      <td className="py-3.5 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => onEditVehicleOrStandard(r.registration_number)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-cyan-700 bg-cyan-50 hover:bg-cyan-100 border border-cyan-200 rounded-lg transition-colors cursor-pointer"
                        >
                          <Edit3 className="w-3 h-3" />
                          Edit
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
