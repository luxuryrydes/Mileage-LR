import React from 'react';
import { Car, Gauge, IndianRupee, TrendingUp, Smartphone } from 'lucide-react';
import { formatINR, formatKM } from '../utils/normalize';

interface MetricsBarProps {
  totalVehicles: number;
  monthlyGpsKm: number;
  totalFuelCost: number;
  fleetAvgMileage: number;
  gpayTxnCount: number;
}

export const MetricsBar: React.FC<MetricsBarProps> = ({
  totalVehicles,
  monthlyGpsKm,
  totalFuelCost,
  fleetAvgMileage,
  gpayTxnCount,
}) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5 px-6 pt-5 pb-2">
      {/* 1. Fleet Vehicles */}
      <div className="bg-white border border-slate-200/80 rounded-xl p-4 flex items-center justify-between shadow-2xs hover:shadow-xs transition-shadow">
        <div>
          <p className="text-[11px] font-bold tracking-wider text-slate-500 uppercase">
            FLEET VEHICLES
          </p>
          <p className="text-2xl font-black text-slate-900 mt-1">
            {totalVehicles}
          </p>
        </div>
        <div className="w-10 h-10 rounded-full bg-cyan-500 flex items-center justify-center text-white shadow-xs">
          <Car className="w-5 h-5" />
        </div>
      </div>

      {/* 2. Monthly KM (GPS) */}
      <div className="bg-white border border-slate-200/80 rounded-xl p-4 flex items-center justify-between shadow-2xs hover:shadow-xs transition-shadow">
        <div>
          <p className="text-[11px] font-bold tracking-wider text-slate-500 uppercase">
            MONTHLY KM (GPS)
          </p>
          <p className="text-2xl font-black text-slate-900 mt-1">
            {formatKM(monthlyGpsKm, 1)}
          </p>
        </div>
        <div className="w-10 h-10 rounded-full bg-purple-600 flex items-center justify-center text-white shadow-xs">
          <Gauge className="w-5 h-5" />
        </div>
      </div>

      {/* 3. Fuel Cost */}
      <div className="bg-white border border-slate-200/80 rounded-xl p-4 flex items-center justify-between shadow-2xs hover:shadow-xs transition-shadow">
        <div>
          <p className="text-[11px] font-bold tracking-wider text-slate-500 uppercase">
            FUEL COST
          </p>
          <p className="text-2xl font-black text-slate-900 mt-1">
            {formatINR(totalFuelCost)}
          </p>
        </div>
        <div className="w-10 h-10 rounded-full bg-emerald-500 flex items-center justify-center text-white shadow-xs">
          <IndianRupee className="w-5 h-5" />
        </div>
      </div>

      {/* 4. Fleet Avg Mileage */}
      <div className="bg-white border border-slate-200/80 rounded-xl p-4 flex items-center justify-between shadow-2xs hover:shadow-xs transition-shadow">
        <div>
          <p className="text-[11px] font-bold tracking-wider text-slate-500 uppercase">
            FLEET AVG MILEAGE
          </p>
          <p className="text-2xl font-black text-slate-900 mt-1">
            {fleetAvgMileage.toFixed(2)}
          </p>
        </div>
        <div className="w-10 h-10 rounded-full bg-amber-500 flex items-center justify-center text-white shadow-xs">
          <TrendingUp className="w-5 h-5" />
        </div>
      </div>

      {/* 5. GPay Txns */}
      <div className="bg-white border border-slate-200/80 rounded-xl p-4 flex items-center justify-between shadow-2xs hover:shadow-xs transition-shadow">
        <div>
          <p className="text-[11px] font-bold tracking-wider text-slate-500 uppercase">
            GPAY TXNS
          </p>
          <p className="text-2xl font-black text-slate-900 mt-1">
            {gpayTxnCount}
          </p>
        </div>
        <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white shadow-xs">
          <Smartphone className="w-5 h-5" />
        </div>
      </div>
    </div>
  );
};
