import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { MonthlyVehiclePerformance, GPSDailyKM, FuelRecord } from '../types/fleet';
import { formatINR, formatKM } from '../utils/normalize';

/**
 * Generic Excel exporter
 */
export function exportToExcel(data: any[], fileName: string, sheetName: string = 'Sheet1') {
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  XLSX.writeFile(wb, `${fileName}.xlsx`);
}

/**
 * Export Monthly Mileage Performance table to Excel
 */
export function exportMileagePerformanceExcel(records: MonthlyVehiclePerformance[], month: string) {
  const exportData = records.map(r => ({
    'Vehicle Registration': r.registration_number,
    'Car Type': r.car_type,
    'Fuel Type': r.fuel_type,
    'Distance (KM)': r.distance_km,
    'Date Range': r.date_range_label,
    'Fuel Consumed': `${r.fuel_quantity} ${r.fuel_unit}`,
    'Fuel Cost (₹)': r.fuel_cost,
    'Physical Mileage': `${r.physical_mileage} km/${r.fuel_unit}`,
    'Cost / KM (₹)': r.actual_cost_per_km,
    'Standard': `${r.standard_value} ${r.standard_unit}`,
    'Mileage Type': r.mileage_type,
    'Variance (%)': `${r.variance_pct > 0 ? '+' : ''}${r.variance_pct}%`,
    'Status': r.status,
  }));

  exportToExcel(exportData, `Mileage_Performance_${month}`, 'Mileage Performance');
}

/**
 * Export Monthly Mileage Performance to professional PDF
 */
export function exportMileagePerformancePDF(records: MonthlyVehiclePerformance[], month: string) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

  // Title & Header
  doc.setFontSize(16);
  doc.setTextColor(14, 116, 144); // Cyan-700
  doc.text('Mileage Soft — Monthly Vehicle Mileage Performance', 14, 15);

  doc.setFontSize(10);
  doc.setTextColor(100, 116, 139); // Slate-500
  doc.text(`Report Period: ${month} | Total Vehicles Evaluated: ${records.length}`, 14, 22);
  doc.text(`Generated on: ${new Date().toLocaleString('en-IN')}`, 200, 22);

  // Table
  const tableData = records.map(r => [
    r.registration_number,
    r.car_type,
    r.fuel_type,
    formatKM(r.distance_km),
    `${r.fuel_quantity} ${r.fuel_unit}`,
    formatINR(r.fuel_cost),
    `${r.physical_mileage} km/${r.fuel_unit}`,
    `₹${r.actual_cost_per_km}`,
    `${r.standard_value} ${r.standard_unit}`,
    `${r.variance_pct > 0 ? '+' : ''}${r.variance_pct}%`,
    r.status,
  ]);

  autoTable(doc, {
    startY: 26,
    head: [[
      'Vehicle',
      'Car Type',
      'Fuel',
      'GPS KM',
      'Fuel Qty',
      'Fuel Cost',
      'Physical Mileage',
      'Cost / KM',
      'Standard',
      'Variance',
      'Status',
    ]],
    body: tableData,
    theme: 'grid',
    headStyles: {
      fillColor: [15, 23, 42],
      textColor: [255, 255, 255],
      fontSize: 8,
      fontStyle: 'bold',
    },
    styles: {
      fontSize: 7.5,
      cellPadding: 2,
    },
    didParseCell: (data) => {
      // Color status
      if (data.column.index === 10) {
        const text = String(data.cell.raw);
        if (text === 'Needs Attention' || text === 'Below Standard') {
          data.cell.styles.textColor = [220, 38, 38];
          data.cell.styles.fontStyle = 'bold';
        } else if (text === 'On Target' || text === 'Above Standard') {
          data.cell.styles.textColor = [16, 185, 129];
          data.cell.styles.fontStyle = 'bold';
        }
      }
    },
  });

  doc.save(`Mileage_Performance_${month}.pdf`);
}

/**
 * Export Fuel Records
 */
export function exportFuelRecordsExcel(records: FuelRecord[]) {
  const data = records.map(r => ({
    'Date': r.date,
    'Vehicle': r.registration_number,
    'Car Type': r.car_type,
    'Fuel Type': r.fuel_type,
    'Quantity': r.quantity,
    'Rate (₹)': r.rate,
    'Total Amount (₹)': r.total_amount,
    'Odometer': r.odometer || '',
    'Payment Mode': r.payment_mode,
    'Payment Ref': r.payment_reference || '',
    'Fuel Station': r.fuel_station || '',
    'Source': r.source,
  }));
  exportToExcel(data, `Fuel_Records_${new Date().toISOString().slice(0, 10)}`, 'Fuel Expenses');
}

/**
 * Export GPS Daily Records
 */
export function exportGpsRecordsExcel(records: GPSDailyKM[]) {
  const data = records.map(r => ({
    'Date': r.date,
    'Vehicle': r.registration_number,
    'Opening KM': r.opening_km,
    'Closing KM': r.closing_km,
    'Daily GPS KM': r.daily_gps_km,
    'GPS Device/IMEI': r.gps_device_imei,
    'Source': r.source,
  }));
  exportToExcel(data, `GPS_Daily_KM_${new Date().toISOString().slice(0, 10)}`, 'GPS Daily KM');
}
