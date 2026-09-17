import React, { useMemo } from 'react';
import {
  Car,
  Gauge,
  IndianRupee,
  TrendingUp,
  AlertTriangle,
  Award,
  CheckCircle2,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import { Vehicle, GPSDailyKM, FuelRecord, VehicleMileageStandard } from '../types/fleet';
import { formatINR, formatKM } from '../utils/normalize';
import { calculateMonthlyPerformance } from '../services/calculations';

interface DashboardViewProps {
  vehicles: Vehicle[];
  gpsRecords: GPSDailyKM[];
  fuelRecords: FuelRecord[];
  standards: VehicleMileageStandard[];
  selectedMonth: string;
  onNavigateToTab: (tab: any) => void;
  onVehicleClick: (id: string) => void;
}

const COLORS = ['#06b6d4', '#10b981', '#f59e0b', '#6366f1', '#ec4899'];

export const DashboardView: React.FC<DashboardViewProps> = ({
  vehicles,
  gpsRecords,
  fuelRecords,
  standards,
  selectedMonth,
  onNavigateToTab,
  onVehicleClick,
}) => {
  const performance = useMemo(() => {
    return calculateMonthlyPerformance(vehicles, gpsRecords, fuelRecords, standards, selectedMonth);
  }, [vehicles, gpsRecords, fuelRecords, standards, selectedMonth]);

  // Fuel breakdown by type
  const fuelBreakdown = useMemo(() => {
    const map = new Map<string, { count: number; cost: number }>();
    fuelRecords.forEach((f) => {
      if (typeof f.date === 'string' && f.date.startsWith(selectedMonth)) {
        const curr = map.get(f.fuel_type) || { count: 0, cost: 0 };
        map.set(f.fuel_type, {
          count: curr.count + f.quantity,
          cost: curr.cost + f.total_amount,
        });
      }
    });

    return Array.from(map.entries()).map(([fuel, val]) => ({
      name: fuel,
      cost: Math.round(val.cost),
      quantity: Math.round(val.count),
    }));
  }, [fuelRecords, selectedMonth]);

  // Top 5 efficient vehicles
  const topVehicles = useMemo(() => {
    return [...performance]
      .filter((p) => p.physical_mileage > 0)
      .sort((a, b) => b.physical_mileage - a.physical_mileage)
      .slice(0, 5);
  }, [performance]);

  // Bottom 5 vehicles (Worst variance / highest cost)
  const bottomVehicles = useMemo(() => {
    return [...performance]
      .filter((p) => p.status === 'Needs Attention' || p.variance_pct > 0)
      .sort((a, b) => b.variance_pct - a.variance_pct)
      .slice(0, 5);
  }, [performance]);

  // Car type performance summary for BarChart
  const carTypeChartData = useMemo(() => {
    const map = new Map<string, { totalKm: number; totalCost: number; count: number }>();
    performance.forEach((p) => {
      const curr = map.get(p.car_type) || { totalKm: 0, totalCost: 0, count: 0 };
      map.set(p.car_type, {
        totalKm: curr.totalKm + p.distance_km,
        totalCost: curr.totalCost + p.fuel_cost,
        count: curr.count + 1,
      });
    });

    return Array.from(map.entries())
      .slice(0, 7)
      .map(([carType, val]) => ({
        carType,
        avgCostPerKm: val.totalKm > 0 ? parseFloat((val.totalCost / val.totalKm).toFixed(2)) : 0,
        totalKm: Math.round(val.totalKm),
      }));
  }, [performance]);

  return (
    <div className="px-6 py-5 space-y-6">
      {/* Visual Analytics Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Cost / KM by Car Type Bar Chart */}
        <div className="lg:col-span-2 bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-slate-900 text-sm">
                Average Cost / KM by Vehicle Model
              </h3>
              <p className="text-[11px] text-slate-400">
                Full-month fuel spend divided by GPS distance (₹/KM)
              </p>
            </div>
            <button
              onClick={() => onNavigateToTab('mileage_performance')}
              className="text-xs font-semibold text-cyan-600 hover:underline cursor-pointer"
            >
              View Detailed Table →
            </button>
          </div>

          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={carTypeChartData}>
                <XAxis dataKey="carType" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} unit="₹" />
                <Tooltip
                  formatter={(val: any) => [`₹${val}/km`, 'Avg Cost/KM']}
                  contentStyle={{ backgroundColor: '#0f172a', borderRadius: '8px', color: '#fff', fontSize: '12px' }}
                />
                <Bar dataKey="avgCostPerKm" fill="#0891b2" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Fuel Expense Share Pie Chart */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs flex flex-col justify-between">
          <div>
            <h3 className="font-bold text-slate-900 text-sm">
              Fuel Spend Distribution
            </h3>
            <p className="text-[11px] text-slate-400">
              Share of fleet expenditure by fuel category
            </p>
          </div>

          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={fuelBreakdown}
                  dataKey="cost"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={75}
                  innerRadius={45}
                  paddingAngle={3}
                >
                  {fuelBreakdown.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(val: any) => [formatINR(val), 'Spend']}
                  contentStyle={{ backgroundColor: '#0f172a', borderRadius: '8px', color: '#fff', fontSize: '12px' }}
                />
                <Legend iconSize={10} wrapperStyle={{ fontSize: '11px' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Top & Bottom Performers Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Top 5 Performers */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between mb-3.5">
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <Award className="w-4 h-4 text-emerald-600" />
              Top 5 Benchmark Leaders
            </h3>
            <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
              High Efficiency
            </span>
          </div>

          <div className="divide-y divide-slate-100">
            {topVehicles.map((v, i) => (
              <div
                key={v.vehicle_id}
                onClick={() => onVehicleClick(v.vehicle_id)}
                className="py-2.5 flex items-center justify-between hover:bg-slate-50/70 px-2 rounded-lg cursor-pointer transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-700 text-[10.5px] font-bold flex items-center justify-center">
                    {i + 1}
                  </span>
                  <div>
                    <span className="font-bold text-slate-900 text-xs hover:text-cyan-600">
                      {v.registration_number}
                    </span>
                    <span className="text-[10.5px] text-slate-400 block">
                      {v.car_type} · {v.fuel_type}
                    </span>
                  </div>
                </div>

                <div className="text-right">
                  <div className="font-mono font-bold text-emerald-700 text-xs">
                    {(Number(v.physical_mileage) || 0).toFixed(2)} km/{v.fuel_unit}
                  </div>
                  <div className="text-[10px] text-slate-400 font-mono">
                    ₹{v.actual_cost_per_km}/km
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom 5 Needing Attention */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between mb-3.5">
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-600" />
              Highest Cost & Attention Required
            </h3>
            <span className="text-[11px] font-semibold text-rose-700 bg-rose-50 px-2 py-0.5 rounded">
              Exceeding Standard
            </span>
          </div>

          <div className="divide-y divide-slate-100">
            {bottomVehicles.map((v, i) => (
              <div
                key={v.vehicle_id}
                onClick={() => onVehicleClick(v.vehicle_id)}
                className="py-2.5 flex items-center justify-between hover:bg-slate-50/70 px-2 rounded-lg cursor-pointer transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-rose-50 text-rose-700 text-[10.5px] font-bold flex items-center justify-center">
                    {i + 1}
                  </span>
                  <div>
                    <span className="font-bold text-slate-900 text-xs hover:text-rose-600">
                      {v.registration_number}
                    </span>
                    <span className="text-[10.5px] text-slate-400 block">
                      {v.car_type} · {v.fuel_type}
                    </span>
                  </div>
                </div>

                <div className="text-right">
                  <div className="font-mono font-bold text-rose-600 text-xs">
                    ₹{v.actual_cost_per_km}/km
                  </div>
                  <div className="text-[10px] text-rose-700 font-semibold">
                    +{v.variance_pct}% vs Std ({v.standard_value})
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
