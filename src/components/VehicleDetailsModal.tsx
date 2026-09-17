import React, { useMemo } from 'react';
import { X, Car, Fuel, Gauge, IndianRupee, Calendar, User, CreditCard, ShieldCheck } from 'lucide-react';
import { Vehicle, GPSDailyKM, FuelRecord, VehicleMileageStandard } from '../types/fleet';
import { formatINR, formatKM } from '../utils/normalize';
import { calculateMonthlyPerformance } from '../services/calculations';

interface VehicleDetailsModalProps {
  vehicleId: string;
  vehicles: Vehicle[];
  gpsRecords: GPSDailyKM[];
  fuelRecords: FuelRecord[];
  standards: VehicleMileageStandard[];
  selectedMonth: string;
  onClose: () => void;
}

export const VehicleDetailsModal: React.FC<VehicleDetailsModalProps> = ({
  vehicleId,
  vehicles,
  gpsRecords,
  fuelRecords,
  standards,
  selectedMonth,
  onClose,
}) => {
  const vehicle = vehicles.find((v) => v.id === vehicleId);

  const vehicleGps = useMemo(() => {
    if (!vehicle) return [];
    const vehNorm = (vehicle.normalized_reg || (vehicle.registration_number || '').replace(/[\s\-_.]+/g, '')).toUpperCase();
    return gpsRecords
      .filter((g) => {
        const gNorm = (g.normalized_reg || (g.registration_number || '').replace(/[\s\-_.]+/g, '')).toUpperCase();
        return gNorm === vehNorm && typeof g.date === 'string' && g.date.startsWith(selectedMonth);
      })
      .sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  }, [vehicle, gpsRecords, selectedMonth]);

  const vehicleFuel = useMemo(() => {
    if (!vehicle) return [];
    const vehNorm = (vehicle.normalized_reg || (vehicle.registration_number || '').replace(/[\s\-_.]+/g, '')).toUpperCase();
    return fuelRecords
      .filter((f) => {
        const fNorm = (f.normalized_reg || (f.registration_number || '').replace(/[\s\-_.]+/g, '')).toUpperCase();
        return fNorm === vehNorm && typeof f.date === 'string' && f.date.startsWith(selectedMonth);
      })
      .sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  }, [vehicle, fuelRecords, selectedMonth]);

  const performance = useMemo(() => {
    if (!vehicle) return null;
    return calculateMonthlyPerformance(vehicle, gpsRecords, fuelRecords, standards, selectedMonth);
  }, [vehicle, gpsRecords, fuelRecords, standards, selectedMonth]);

  if (!vehicle) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-100 text-cyan-700 flex items-center justify-center font-bold">
              <Car className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900">
                  {vehicle.registration_number}
                </h3>
                <span className={`text-[10.5px] px-2 py-0.5 rounded-md font-bold ${
                  vehicle.status === 'Active' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                }`}>
                  {vehicle.status}
                </span>
              </div>
              <p className="text-xs text-slate-500">
                {vehicle.make} {vehicle.model} · {vehicle.vehicle_type} ({vehicle.fuel_type})
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* Metadata Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50/80 p-4 rounded-xl border border-slate-200 text-xs">
            <div>
              <span className="text-[10.5px] text-slate-400 block uppercase">Ownership</span>
              <span className="font-semibold text-slate-800">{vehicle.owner_type}</span>
            </div>
            <div>
              <span className="text-[10.5px] text-slate-400 block uppercase">GPS Provider</span>
              <span className="font-semibold text-slate-800">Mosfet GPS</span>
            </div>
            <div>
              <span className="text-[10.5px] text-slate-400 block uppercase">GPS IMEI</span>
              <span className="font-mono text-slate-700">{vehicle.gps_device_imei}</span>
            </div>
            <div>
              <span className="text-[10.5px] text-slate-400 block uppercase">IGL Smart Card</span>
              <span className="font-mono text-slate-700">{vehicle.igl_smart_card_number || 'N/A'}</span>
            </div>
          </div>

          {/* Monthly Performance Highlights */}
          {performance && (
            <div>
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2.5">
                Performance Evaluation ({selectedMonth})
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {/* Distance */}
                <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
                  <span className="text-[10.5px] font-bold text-slate-400 uppercase">GPS Distance</span>
                  <div className="text-lg font-black text-slate-900 mt-0.5">
                    {formatKM(performance.distance_km, 1)} KM
                  </div>
                  <span className="text-[10px] text-slate-400">{performance.date_range_label}</span>
                </div>

                {/* Fuel Cost */}
                <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
                  <span className="text-[10.5px] font-bold text-slate-400 uppercase">Fuel Consumed</span>
                  <div className="text-lg font-black text-slate-900 mt-0.5">
                    {formatINR(performance.fuel_cost)}
                  </div>
                  <span className="text-[10px] text-slate-400">
                    {performance.fuel_quantity} {performance.fuel_unit}
                  </span>
                </div>

                {/* Physical Mileage */}
                <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
                  <span className="text-[10.5px] font-bold text-slate-400 uppercase">Physical Mileage</span>
                  <div className="text-lg font-black text-slate-900 mt-0.5">
                    {performance.physical_mileage.toFixed(2)}{' '}
                    <span className="text-xs font-normal text-slate-500">km/{performance.fuel_unit}</span>
                  </div>
                  <span className="text-[10px] text-slate-400">Tank-to-Tank</span>
                </div>

                {/* Cost per KM */}
                <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
                  <span className="text-[10.5px] font-bold text-slate-400 uppercase">Actual Cost / KM</span>
                  <div className="text-lg font-black text-slate-900 mt-0.5">
                    ₹{performance.actual_cost_per_km.toFixed(2)}
                  </div>
                  <div className="text-[10px] font-bold">
                    Std: {performance.standard_value} {performance.standard_unit} (
                    <span className={performance.status === 'Needs Attention' ? 'text-rose-600' : 'text-emerald-600'}>
                      {performance.variance_pct > 0 ? `+${performance.variance_pct}%` : `${performance.variance_pct}%`}
                    </span>
                    )
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Daily GPS Records for this vehicle */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Daily GPS KM History ({vehicleGps.length} days recorded)
              </h4>
            </div>
            <div className="border border-slate-200 rounded-xl overflow-hidden max-h-48 overflow-y-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-[10px] sticky top-0">
                  <tr>
                    <th className="py-2 px-3">Date</th>
                    <th className="py-2 px-3 text-right">Opening KM</th>
                    <th className="py-2 px-3 text-right">Closing KM</th>
                    <th className="py-2 px-3 text-right">Daily GPS KM</th>
                    <th className="py-2 px-3 text-center">Source</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {vehicleGps.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-4 text-center text-slate-400">No GPS data for this month.</td>
                    </tr>
                  ) : (
                    vehicleGps.map((g) => (
                      <tr key={g.id} className="hover:bg-slate-50/50">
                        <td className="py-2 px-3 font-mono text-slate-600">{g.date}</td>
                        <td className="py-2 px-3 text-right font-mono text-slate-500">{formatKM(g.opening_km)}</td>
                        <td className="py-2 px-3 text-right font-mono text-slate-500">{formatKM(g.closing_km)}</td>
                        <td className="py-2 px-3 text-right font-mono font-bold text-slate-900">{formatKM(g.daily_gps_km, 1)} KM</td>
                        <td className="py-2 px-3 text-center text-[10px] text-slate-500">{g.source}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Fuel Refills for this vehicle */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Fuel Refills & Expenses ({vehicleFuel.length} transactions)
              </h4>
            </div>
            <div className="border border-slate-200 rounded-xl overflow-hidden max-h-48 overflow-y-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-[10px] sticky top-0">
                  <tr>
                    <th className="py-2 px-3">Date</th>
                    <th className="py-2 px-3">Fuel Station</th>
                    <th className="py-2 px-3 text-right">Qty</th>
                    <th className="py-2 px-3 text-right">Rate</th>
                    <th className="py-2 px-3 text-right">Total (₹)</th>
                    <th className="py-2 px-3">Payment</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {vehicleFuel.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-4 text-center text-slate-400">No fuel entries for this month.</td>
                    </tr>
                  ) : (
                    vehicleFuel.map((f) => (
                      <tr key={f.id} className="hover:bg-slate-50/50">
                        <td className="py-2 px-3 font-mono text-slate-600">{f.date}</td>
                        <td className="py-2 px-3 text-slate-700">{f.fuel_station || 'IGL CNG Station'}</td>
                        <td className="py-2 px-3 text-right font-mono">{f.quantity} {f.fuel_type === 'CNG' ? 'kg' : 'L'}</td>
                        <td className="py-2 px-3 text-right font-mono text-slate-500">₹{f.rate}</td>
                        <td className="py-2 px-3 text-right font-mono font-bold text-slate-900">{formatINR(f.total_amount)}</td>
                        <td className="py-2 px-3 text-[11px] text-slate-600">{f.payment_mode}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
