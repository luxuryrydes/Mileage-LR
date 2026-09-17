import React, { useState, useMemo } from 'react';
import { AlertTriangle, ShieldAlert, CheckCircle2, Search, Filter, Fuel, Gauge, Car } from 'lucide-react';
import { Vehicle, GPSDailyKM, FuelRecord, VehicleMileageStandard, FleetAlert, MonthlyVehiclePerformance } from '../types/fleet';
import { formatINR, formatKM } from '../utils/normalize';
import { calculateMonthlyPerformance } from '../services/calculations';

interface AlertsViewProps {
  vehicles: Vehicle[];
  gpsRecords: GPSDailyKM[];
  fuelRecords: FuelRecord[];
  standards: VehicleMileageStandard[];
  selectedMonth: string;
  onVehicleClick: (id: string) => void;
}

export const AlertsView: React.FC<AlertsViewProps> = ({
  vehicles,
  gpsRecords,
  fuelRecords,
  standards,
  selectedMonth,
  onVehicleClick,
}) => {
  const [filterSeverity, setFilterSeverity] = useState<string>('All');
  const [filterType, setFilterType] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Dynamically compute active fleet alerts
  const alerts: FleetAlert[] = useMemo(() => {
    const list: FleetAlert[] = [];
    const performances = calculateMonthlyPerformance(vehicles, gpsRecords, fuelRecords, standards, selectedMonth) as MonthlyVehiclePerformance[];

    // 1. Poor Mileage Alerts
    performances.forEach((p) => {
      if (p.status === 'Needs Attention' || p.status === 'Below Standard') {
        const isCost = p.mileage_type === 'Cost per KM';
        list.push({
          id: `alert-perf-${p.vehicle_id}`,
          type: 'POOR_MILEAGE',
          severity: Math.abs(p.variance_pct) > 20 ? 'CRITICAL' : 'HIGH',
          vehicle_id: p.vehicle_id,
          registration_number: p.registration_number,
          car_type: p.car_type,
          title: `Poor Mileage: ${p.variance_pct > 0 ? '+' : ''}${p.variance_pct}% Variance`,
          description: isCost
            ? `Actual cost is ₹${p.actual_cost_per_km}/km vs standard ₹${p.standard_value}/km (+${p.variance_pct}% higher cost).`
            : `Physical mileage is ${p.physical_mileage.toFixed(2)} km/L vs standard ${p.standard_value} km/L (${p.variance_pct}% below benchmark).`,
          date: '2026-09-16',
          status: 'OPEN',
        });
      }
    });

    // 2. High KM Single Day Alerts (> 500 KM in one day)
    gpsRecords.forEach((g) => {
      if (typeof g.date === 'string' && g.date.startsWith(selectedMonth) && g.daily_gps_km > 500) {
        list.push({
          id: `alert-gps-high-${g.id}`,
          type: 'HIGH_KM_SPIKE',
          severity: 'HIGH',
          vehicle_id: g.vehicle_id,
          registration_number: g.registration_number,
          title: `Abnormal High Daily Run: ${formatKM(g.daily_gps_km, 1)} KM`,
          description: `Vehicle traveled ${g.daily_gps_km} KM on ${g.date}. Possible outstation trip or GPS odometer leap.`,
          date: g.date,
          status: 'OPEN',
        });
      }
    });

    // 3. Fuel with Zero/Missing GPS (Suspected Fuel Theft)
    const gpsMap = new Map<string, number>();
    gpsRecords.forEach((g) => {
      if (typeof g.date === 'string' && g.date.startsWith(selectedMonth)) {
        const key = `${g.registration_number}_${g.date}`;
        gpsMap.set(key, (gpsMap.get(key) || 0) + g.daily_gps_km);
      }
    });

    fuelRecords.forEach((f) => {
      if (typeof f.date === 'string' && f.date.startsWith(selectedMonth)) {
        const key = `${f.registration_number}_${f.date}`;
        const kmOnDate = gpsMap.get(key);
        if (kmOnDate === 0 || kmOnDate === undefined) {
          list.push({
            id: `alert-fuel-theft-${f.id}`,
            type: 'FUEL_WITHOUT_GPS',
            severity: 'CRITICAL',
            vehicle_id: f.vehicle_id,
            registration_number: f.registration_number,
            car_type: f.car_type,
            title: `Fuel Refill Without GPS Movement`,
            description: `Filled ${f.quantity} ${f.fuel_type === 'CNG' ? 'kg' : 'L'} (${formatINR(f.total_amount)}) on ${f.date}, but vehicle recorded 0 GPS KM.`,
            date: f.date,
            status: 'OPEN',
          });
        }
      }
    });

    // 4. Overfill Tank Capacity Alerts
    fuelRecords.forEach((f) => {
      if (f.date.startsWith(selectedMonth)) {
        const v = vehicles.find((veh) => veh.registration_number === f.registration_number);
        if (v && v.fuel_tank_capacity_l && f.quantity > v.fuel_tank_capacity_l) {
          list.push({
            id: `alert-overfill-${f.id}`,
            type: 'OVERFILL',
            severity: 'CRITICAL',
            vehicle_id: f.vehicle_id,
            registration_number: f.registration_number,
            car_type: f.car_type,
            title: `Fuel Refill Exceeds Tank Capacity`,
            description: `Billed ${f.quantity} units, exceeding maximum tank capacity of ${v.fuel_tank_capacity_l} units.`,
            date: f.date,
            status: 'OPEN',
          });
        }
      }
    });

    return list;
  }, [vehicles, gpsRecords, fuelRecords, standards, selectedMonth]);

  const filtered = alerts.filter((a) => {
    if (filterSeverity !== 'All' && a.severity !== filterSeverity) return false;
    if (filterType !== 'All' && a.type !== filterType) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        (a.registration_number || '').toLowerCase().includes(q) ||
        (a.title || '').toLowerCase().includes(q) ||
        (a.description || '').toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="px-6 py-5 space-y-4">
      {/* Top Header */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-rose-600" />
              Alerts & Exceptions Dashboard
            </h2>
            <span className="text-xs px-2.5 py-0.5 font-bold bg-rose-50 text-rose-700 border border-rose-200 rounded-md">
              {alerts.length} Active Flags
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Automated compliance engine detecting poor mileage variance, fuel theft (fill without GPS movement), single-day high KM leaps, and overfills.
          </p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs flex flex-wrap items-center justify-between gap-3">
        <div className="relative w-72">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search vehicle or alert text..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-cyan-500"
          />
        </div>

        <div className="flex items-center gap-2.5">
          <select
            value={filterSeverity}
            onChange={(e) => setFilterSeverity(e.target.value)}
            className="text-xs bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-cyan-500"
          >
            <option value="All">All Severities</option>
            <option value="CRITICAL">Critical</option>
            <option value="HIGH">High</option>
            <option value="MEDIUM">Medium</option>
          </select>

          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="text-xs bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-cyan-500"
          >
            <option value="All">All Categories</option>
            <option value="POOR_MILEAGE">Poor Mileage</option>
            <option value="FUEL_WITHOUT_GPS">Fuel Without GPS (Theft)</option>
            <option value="HIGH_KM_SPIKE">High KM Spike</option>
            <option value="OVERFILL">Tank Overfill</option>
          </select>
        </div>
      </div>

      {/* Alerts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
        {filtered.length === 0 ? (
          <div className="col-span-2 bg-white p-12 text-center rounded-xl border border-slate-200">
            <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
            <p className="text-sm font-bold text-slate-800">No active alerts</p>
            <p className="text-xs text-slate-400">All vehicles operating within nominal benchmarks.</p>
          </div>
        ) : (
          filtered.map((alert) => (
            <div
              key={alert.id}
              onClick={() => alert.vehicle_id && onVehicleClick(alert.vehicle_id)}
              className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs hover:shadow-xs transition-shadow cursor-pointer flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900 text-sm hover:text-cyan-700">
                      {alert.registration_number}
                    </span>
                    {alert.car_type && (
                      <span className="text-[11px] text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                        {alert.car_type}
                      </span>
                    )}
                  </div>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      alert.severity === 'CRITICAL'
                        ? 'bg-rose-100 text-rose-800'
                        : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    {alert.severity}
                  </span>
                </div>

                <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5 mb-1">
                  <AlertTriangle
                    className={`w-3.5 h-3.5 ${
                      alert.severity === 'CRITICAL' ? 'text-rose-600' : 'text-amber-500'
                    }`}
                  />
                  {alert.title}
                </h4>
                <p className="text-xs text-slate-600 leading-relaxed">
                  {alert.description}
                </p>
              </div>

              <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400 font-mono">
                <span>Date: {alert.date}</span>
                <span className="text-cyan-600 font-sans font-semibold hover:underline">
                  View Vehicle Profile →
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
