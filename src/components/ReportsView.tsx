import React, { useState, useMemo } from 'react';
import {
  FileText,
  Download,
  Calendar,
  Filter,
  FileSpreadsheet,
  CheckCircle,
  TrendingDown,
  AlertOctagon,
  Layers,
} from 'lucide-react';
import { Vehicle, GPSDailyKM, FuelRecord, VehicleMileageStandard } from '../types/fleet';
import { formatINR, formatKM } from '../utils/normalize';
import { calculateMonthlyPerformance } from '../services/calculations';
import {
  exportToExcel,
  exportMileagePerformanceExcel,
  exportMileagePerformancePDF,
  exportFuelRecordsExcel,
  exportGpsRecordsExcel,
} from '../services/export';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface ReportsViewProps {
  vehicles: Vehicle[];
  gpsRecords: GPSDailyKM[];
  fuelRecords: FuelRecord[];
  standards: VehicleMileageStandard[];
  selectedMonth: string;
}

type ReportType =
  | 'daily_gps'
  | 'monthly_mileage'
  | 'fuel_consumption'
  | 'cost_per_km'
  | 'poor_mileage'
  | 'gps_missing'
  | 'fleet_summary';

export const ReportsView: React.FC<ReportsViewProps> = ({
  vehicles,
  gpsRecords,
  fuelRecords,
  standards,
  selectedMonth,
}) => {
  const [activeReport, setActiveReport] = useState<ReportType>('monthly_mileage');

  // Performance calculations
  const performance = useMemo(() => {
    return calculateMonthlyPerformance(vehicles, gpsRecords, fuelRecords, standards, selectedMonth);
  }, [vehicles, gpsRecords, fuelRecords, standards, selectedMonth]);

  // Report list definitions
  const reportOptions = [
    { id: 'monthly_mileage', name: 'Monthly Mileage Report', desc: 'Tank-to-tank distance vs fuel consumed & standards' },
    { id: 'cost_per_km', name: 'Cost per KM Report', desc: 'Fuel expenditure vs full-month GPS running cost' },
    { id: 'poor_mileage', name: 'Poor Mileage & Variance Report', desc: 'Vehicles failing baseline standards (Needs Attention)' },
    { id: 'fuel_consumption', name: 'Fuel Consumption Report', desc: 'Detailed fuel slips, pump stations, payment modes & quantities' },
    { id: 'daily_gps', name: 'Daily GPS Report', desc: 'Day-by-day opening, closing & daily distance records' },
    { id: 'gps_missing', name: 'Missing GPS Activity Report', desc: 'Active vehicles with zero logged distance on workdays' },
    { id: 'fleet_summary', name: 'Executive Fleet Summary', desc: 'High-level aggregation by Car Type, Fuel Type & Ownership' },
  ];

  // Poor mileage filtered
  const poorMileageData = useMemo(() => {
    return performance.filter((p) => p.status === 'Needs Attention' || p.status === 'Below Standard');
  }, [performance]);

  // Missing GPS data
  const missingGpsData = useMemo(() => {
    const list: any[] = [];
    const activeVehicles = vehicles.filter((v) => v.status === 'Active');
    const vehicleRun = new Map<string, number>();

    gpsRecords.forEach((g) => {
      if (typeof g.date === 'string' && g.date.startsWith(selectedMonth)) {
        vehicleRun.set(g.registration_number, (vehicleRun.get(g.registration_number) || 0) + g.daily_gps_km);
      }
    });

    activeVehicles.forEach((v) => {
      const totalKm = vehicleRun.get(v.registration_number) || 0;
      if (totalKm === 0) {
        list.push({
          registration: v.registration_number,
          car_type: v.vehicle_type,
          fuel_type: v.fuel_type,
          imei: v.gps_device_imei,
          status: '0 KM Logged',
        });
      }
    });

    return list;
  }, [vehicles, gpsRecords, selectedMonth]);

  // Handle PDF Export for current report
  const handleExportPDF = () => {
    if (activeReport === 'monthly_mileage' || activeReport === 'poor_mileage') {
      exportMileagePerformancePDF(
        activeReport === 'poor_mileage' ? poorMileageData : performance,
        selectedMonth
      );
    } else {
      const doc = new jsPDF({ orientation: 'landscape' });
      doc.setFontSize(14);
      doc.text(`Fleet Report: ${activeReport.toUpperCase()} (${selectedMonth})`, 14, 15);
      doc.setFontSize(9);
      doc.text(`Generated on ${new Date().toLocaleString()}`, 14, 22);

      let head: string[][] = [];
      let body: any[][] = [];

      if (activeReport === 'cost_per_km') {
        head = [['Vehicle', 'Type', 'Fuel', 'GPS KM', 'Fuel Cost', 'Cost / KM', 'Standard', 'Variance']];
        body = performance.map((p) => [
          p.registration_number,
          p.car_type,
          p.fuel_type,
          formatKM(p.distance_km, 1),
          formatINR(p.fuel_cost),
          `₹${p.actual_cost_per_km.toFixed(2)}`,
          `${p.standard_value} ${p.standard_unit}`,
          `${p.variance_pct}%`,
        ]);
      } else if (activeReport === 'gps_missing') {
        head = [['Vehicle', 'Type', 'Fuel Type', 'GPS IMEI', 'Status']];
        body = missingGpsData.map((m) => [m.registration, m.car_type, m.fuel_type, m.imei, m.status]);
      } else if (activeReport === 'fuel_consumption') {
        head = [['Date', 'Vehicle', 'Fuel Type', 'Quantity', 'Rate', 'Total Cost', 'Payment Mode', 'Source']];
        body = fuelRecords.slice(0, 500).map((f) => [
          f.date,
          f.registration_number,
          f.fuel_type,
          `${f.quantity || 0} ${f.fuel_type === 'CNG' ? 'kg' : 'L'}`,
          `₹${(Number(f.rate) || 0).toFixed(2)}`,
          formatINR(Number(f.total_amount) || 0),
          f.payment_mode,
          f.source || 'IGL Import',
        ]);
      } else {
        head = [['Vehicle', 'Distance', 'Fuel', 'Mileage', 'Cost/KM']];
        body = performance.map((p) => [
          p.registration_number,
          `${p.distance_km} KM`,
          `${p.fuel_quantity} ${p.fuel_unit}`,
          `${p.physical_mileage.toFixed(2)}`,
          `₹${p.actual_cost_per_km}`,
        ]);
      }

      autoTable(doc, {
        startY: 26,
        head,
        body,
        theme: 'grid',
        headStyles: { fillColor: [15, 23, 42] },
      });

      doc.save(`${activeReport}_${selectedMonth}.pdf`);
    }
  };

  // Handle Excel Export
  const handleExportExcel = () => {
    if (activeReport === 'monthly_mileage') {
      exportMileagePerformanceExcel(performance, selectedMonth);
    } else if (activeReport === 'poor_mileage') {
      exportMileagePerformanceExcel(poorMileageData, selectedMonth);
    } else if (activeReport === 'fuel_consumption') {
      exportFuelRecordsExcel(fuelRecords);
    } else if (activeReport === 'daily_gps') {
      exportGpsRecordsExcel(gpsRecords);
    } else if (activeReport === 'gps_missing') {
      exportToExcel(missingGpsData, `GPS_Missing_${selectedMonth}`, 'Missing GPS');
    } else {
      exportMileagePerformanceExcel(performance, selectedMonth);
    }
  };

  return (
    <div className="px-6 py-5 space-y-4">
      {/* Top Header */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <FileText className="w-5 h-5 text-cyan-600" />
            Reports & Export Center
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Generate, filter and download executive compliance, consumption and cost audit reports in Excel (.xlsx) and PDF format.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={handleExportExcel}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors shadow-2xs cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            Download Excel
          </button>
          <button
            onClick={handleExportPDF}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-cyan-600 hover:bg-cyan-700 rounded-lg transition-colors shadow-2xs cursor-pointer"
          >
            <FileText className="w-3.5 h-3.5" />
            Download PDF
          </button>
        </div>
      </div>

      {/* Report Selector Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {reportOptions.map((opt) => (
          <button
            key={opt.id}
            onClick={() => setActiveReport(opt.id as ReportType)}
            className={`px-3.5 py-2 text-xs font-semibold rounded-lg whitespace-nowrap transition-all cursor-pointer ${
              activeReport === opt.id
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            {opt.name}
          </button>
        ))}
      </div>

      {/* Active Report Table Preview */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-slate-900 text-sm">
              {reportOptions.find((r) => r.id === activeReport)?.name}
            </h3>
            <p className="text-xs text-slate-500">
              {reportOptions.find((r) => r.id === activeReport)?.desc} · Period: {selectedMonth}
            </p>
          </div>
        </div>

        {/* Content depending on activeReport */}
        <div className="overflow-x-auto max-h-[500px]">
          {activeReport === 'poor_mileage' ? (
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-50/90 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10.5px]">
                <tr>
                  <th className="py-3 px-4">VEHICLE</th>
                  <th className="py-3 px-4">TYPE</th>
                  <th className="py-3 px-4">FUEL</th>
                  <th className="py-3 px-4 text-right">GPS KM</th>
                  <th className="py-3 px-4 text-right">MILEAGE</th>
                  <th className="py-3 px-4 text-right">COST/KM</th>
                  <th className="py-3 px-4 text-right">STANDARD</th>
                  <th className="py-3 px-4 text-right">VARIANCE</th>
                  <th className="py-3 px-4 text-center">STATUS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
                {poorMileageData.map((p) => (
                  <tr key={p.vehicle_id} className="hover:bg-slate-50/60">
                    <td className="py-3 px-4 font-bold text-rose-700">{p.registration_number}</td>
                    <td className="py-3 px-4">{p.car_type}</td>
                    <td className="py-3 px-4">{p.fuel_type}</td>
                    <td className="py-3 px-4 text-right font-mono">{formatKM(p.distance_km, 1)}</td>
                    <td className="py-3 px-4 text-right font-mono">{p.physical_mileage.toFixed(2)}</td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-rose-600">₹{p.actual_cost_per_km.toFixed(2)}</td>
                    <td className="py-3 px-4 text-right font-mono">{p.standard_value} {p.standard_unit}</td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-rose-600">+{p.variance_pct}%</td>
                    <td className="py-3 px-4 text-center">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                        Needs Attention
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : activeReport === 'gps_missing' ? (
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-50/90 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10.5px]">
                <tr>
                  <th className="py-3 px-4">VEHICLE</th>
                  <th className="py-3 px-4">TYPE</th>
                  <th className="py-3 px-4">FUEL</th>
                  <th className="py-3 px-4">GPS IMEI</th>
                  <th className="py-3 px-4 text-center">STATUS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
                {missingGpsData.map((m, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/60">
                    <td className="py-3 px-4 font-bold text-slate-900">{m.registration}</td>
                    <td className="py-3 px-4">{m.car_type}</td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700">
                        {m.fuel_type}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-500">{m.imei}</td>
                    <td className="py-3 px-4 text-center">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                        0 KM Logged
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : activeReport === 'fuel_consumption' ? (
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-50/90 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10.5px]">
                <tr>
                  <th className="py-3 px-4">DATE</th>
                  <th className="py-3 px-4">VEHICLE</th>
                  <th className="py-3 px-4">CAR TYPE</th>
                  <th className="py-3 px-4">FUEL</th>
                  <th className="py-3 px-4 text-right">QUANTITY</th>
                  <th className="py-3 px-4 text-right">RATE</th>
                  <th className="py-3 px-4 text-right">TOTAL COST</th>
                  <th className="py-3 px-4">PAYMENT MODE</th>
                  <th className="py-3 px-4 text-center">SOURCE</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
                {fuelRecords.slice(0, 150).map((f) => (
                  <tr key={f.id} className="hover:bg-slate-50/60">
                    <td className="py-3 px-4 font-mono text-slate-600">{f.date}</td>
                    <td className="py-3 px-4 font-bold text-slate-900">{f.registration_number}</td>
                    <td className="py-3 px-4">{f.car_type}</td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700">
                        {f.fuel_type}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-semibold">
                      {f.quantity} {f.fuel_type === 'CNG' ? 'kg' : 'L'}
                    </td>
                    <td className="py-3 px-4 text-right font-mono">₹{f.rate.toFixed(2)}</td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                      {formatINR(f.total_amount)}
                    </td>
                    <td className="py-3 px-4 text-slate-700">{f.payment_mode}</td>
                    <td className="py-3 px-4 text-center">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-600">
                        {f.source}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-50/90 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10.5px]">
                <tr>
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
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
                {performance.slice(0, 100).map((p) => (
                  <tr key={p.vehicle_id} className="hover:bg-slate-50/60">
                    <td className="py-3 px-4 font-bold text-slate-900">{p.registration_number}</td>
                    <td className="py-3 px-4">{p.car_type}</td>
                    <td className="py-3 px-4">{p.fuel_type}</td>
                    <td className="py-3 px-4 text-right font-mono">{formatKM(p.distance_km, 1)}</td>
                    <td className="py-3 px-4 text-right font-mono">{p.fuel_quantity} {p.fuel_unit}</td>
                    <td className="py-3 px-4 text-right font-mono font-bold">{p.physical_mileage.toFixed(2)}</td>
                    <td className="py-3 px-4 text-right font-mono">₹{p.actual_cost_per_km.toFixed(2)}</td>
                    <td className="py-3 px-4 text-right font-mono">{p.standard_value} {p.standard_unit}</td>
                    <td className="py-3 px-4 text-right font-mono font-bold">
                      <span className={p.status === 'Needs Attention' ? 'text-rose-600' : 'text-emerald-600'}>
                        {p.variance_pct > 0 ? `+${p.variance_pct}%` : `${p.variance_pct}%`}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        p.status === 'Needs Attention' ? 'bg-rose-50 text-rose-700' : 'bg-emerald-50 text-emerald-700'
                      }`}>
                        {p.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};
