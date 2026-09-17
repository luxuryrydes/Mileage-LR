import fs from 'fs';
import { REFRESHED_FUEL_RECORDS } from '../src/data/refreshedFuelRecords';
import { normalizeRegNo } from '../src/utils/normalize';

const existingSpecs = new Map<string, { reg: string; type: string; fuel: string; gpsKm: number }>();

function inferType(reg: string, fuel: string): string {
  const norm = reg.toUpperCase();
  if (norm.startsWith('HR55AU')) return 'Ashok Leyland 12M Coach';
  if (norm.startsWith('DL10DB6751') || norm.includes('EV')) return 'TATA NEXON EV';
  if (norm.startsWith('HR38AE')) return 'XL6';
  if (norm.startsWith('HR38AF7937') || norm.startsWith('UP16EX5858') || norm.startsWith('DL1CAH8501')) return 'Hycross';
  if (norm.startsWith('DL9CBF2174') || norm.startsWith('HR38AK0010') || norm.startsWith('PB01G4168')) return 'Invicto';
  if (norm.startsWith('HR55AV') || norm.startsWith('DL1CAJ6424')) return 'Fortuner';
  if (norm.startsWith('UP16EE1348')) return 'KIA CARENS';
  if (norm.startsWith('HR38AL1197') || norm.startsWith('HR38AL8569')) return 'Mahindra Bolero B6';
  if (norm.startsWith('HR38AH3106') || norm.startsWith('DL6CT3248')) return 'Honda City';
  if (fuel === 'Diesel') return 'Innova';
  if (norm.includes('RUMION') || norm.startsWith('HR51CW4167') || norm.startsWith('HR51CX3506') || norm.startsWith('HR51CY4080') || norm.startsWith('DL8CBL0438') || norm.startsWith('UP161FP6503') || norm.startsWith('DL1CAJ4123') || norm.startsWith('HR38AG0003')) {
    return 'Toyota Rumion';
  }
  if (norm.includes('ERTIGA') || norm.startsWith('DL8CBL0442') || norm.startsWith('HR67E7614')) return 'Ertiga';
  if (norm.includes('VERNA') || norm.startsWith('DL1CAK4402') || norm.startsWith('HR47H1209')) return 'Verna';
  if (norm.startsWith('HR51CX') || norm.startsWith('HR51CW')) return 'Ciaz';
  if (norm.startsWith('DL11CG') || norm.startsWith('DL1CAK') || norm.startsWith('DL1ZD') || norm.startsWith('HR38AJ') || norm.startsWith('HR73C')) {
    return 'Dzire';
  }
  return 'Ciaz';
}

// Initial explicit seed specs from screenshots
const RAW_INITIAL = [
  { reg: 'HR38AL4163', type: 'Ciaz', fuel: 'CNG', gpsKm: 1771.3 },
  { reg: 'HR38AJ2423', type: 'Dzire', fuel: 'CNG', gpsKm: 877.0 },
  { reg: 'HR51CP5076', type: 'Ciaz', fuel: 'CNG', gpsKm: 519.2 },
  { reg: 'HR58E5197', type: 'Ciaz', fuel: 'CNG', gpsKm: 726.8 },
  { reg: 'HR51CL7197', type: 'Toyota Rumion', fuel: 'CNG', gpsKm: 1186.0 },
  { reg: 'HR51CS9447', type: 'Ciaz', fuel: 'CNG', gpsKm: 317.3 },
  { reg: 'HR73C4255', type: 'Dzire', fuel: 'CNG', gpsKm: 1007.7 },
  { reg: 'DL10CR0142', type: 'Ciaz', fuel: 'CNG', gpsKm: 868.2 },
  { reg: 'DL10CR1220', type: 'Ciaz', fuel: 'CNG', gpsKm: 645.3 },
  { reg: 'DL10DA5037', type: 'Ciaz', fuel: 'CNG', gpsKm: 727.6 },
  { reg: 'DL10DA5039', type: 'Ciaz', fuel: 'CNG', gpsKm: 1083.6 },
  { reg: 'DL10DA5085', type: 'Ciaz', fuel: 'CNG', gpsKm: 914.7 },
  { reg: 'DL10DA5097', type: 'Ciaz', fuel: 'CNG', gpsKm: 323.4 },
  { reg: 'DL10DA5227', type: 'Ciaz', fuel: 'CNG', gpsKm: 463.8 },
  { reg: 'DL10DA5513', type: 'Ciaz', fuel: 'CNG', gpsKm: 432.8 },
  { reg: 'DL10DA5539', type: 'Ciaz', fuel: 'CNG', gpsKm: 834.7 },
  { reg: 'DL10DA5541', type: 'Ciaz', fuel: 'CNG', gpsKm: 534.3 },
  { reg: 'DL10DA5574', type: 'Ciaz', fuel: 'CNG', gpsKm: 687.5 },
  { reg: 'DL10DA5613', type: 'Ciaz', fuel: 'CNG', gpsKm: 1534.8 },
  { reg: 'DL10DB2420', type: 'Ciaz', fuel: 'CNG', gpsKm: 1281.0 },
  { reg: 'DL10DB2436', type: 'Ciaz', fuel: 'CNG', gpsKm: 1322.9 },
  { reg: 'DL10DB2488', type: 'Ciaz', fuel: 'CNG', gpsKm: 1705.3 },
  { reg: 'DL10DB3034', type: 'Ciaz', fuel: 'CNG', gpsKm: 900.3 },
  { reg: 'DL10DB3042', type: 'Ciaz', fuel: 'CNG', gpsKm: 715.1 },
  { reg: 'DL10DB6751', type: 'MG ZS EV', fuel: 'Electric', gpsKm: 828.6 },
  { reg: 'DL11CG4515', type: 'Dzire', fuel: 'CNG/Petrol', gpsKm: 1050.6 },
  { reg: 'DL11CG4541', type: 'Dzire', fuel: 'CNG/Petrol', gpsKm: 1568.8 },
  { reg: 'DL11CG4544', type: 'Dzire', fuel: 'CNG/Petrol', gpsKm: 1711.8 },
  { reg: 'DL11CG4550', type: 'Dzire', fuel: 'CNG/Petrol', gpsKm: 1005.6 },
  { reg: 'DL11CG4562', type: 'Dzire', fuel: 'CNG/Petrol', gpsKm: 804.8 },
  { reg: 'DL1CAG7325', type: 'Dzire', fuel: 'CNG', gpsKm: 507.7 },
  { reg: 'DL1CAG8490', type: 'Ciaz', fuel: 'Petrol', gpsKm: 1167.8 },
  { reg: 'DL1CAH7243', type: 'Dzire', fuel: 'CNG/Petrol', gpsKm: 315.4 },
  { reg: 'DL1CAH8121', type: 'Innova', fuel: 'Petrol', gpsKm: 957.5 },
  { reg: 'DL1CAH8164', type: 'Innova', fuel: 'Petrol', gpsKm: 1627.5 },
  { reg: 'DL1CAH8501', type: 'Hycross', fuel: 'Petrol Hybrid', gpsKm: 1937.0 },
  { reg: 'DL1CAH9314', type: 'Dzire', fuel: 'CNG', gpsKm: 1176.1 },
  { reg: 'DL1CAH9384', type: 'Dzire', fuel: 'CNG', gpsKm: 774.9 },
  { reg: 'DL1CAJ4123', type: 'Toyota Rumion', fuel: 'CNG', gpsKm: 1046.1 },
  { reg: 'DL1CAJ6424', type: 'Innova', fuel: 'Diesel', gpsKm: 1940.5 },
  { reg: 'DL1CAK0625', type: 'Dzire', fuel: 'CNG', gpsKm: 1005.8 },
  { reg: 'DL1CAK0699', type: 'Dzire', fuel: 'CNG', gpsKm: 1263.2 },
  { reg: 'DL1CAK3632', type: 'Dzire', fuel: 'CNG', gpsKm: 1628.0 },
  { reg: 'DL1CAK3904', type: 'Dzire', fuel: 'CNG', gpsKm: 961.1 },
  { reg: 'DL1CAK4402', type: 'Verna', fuel: 'CNG/Petrol', gpsKm: 505.3 },
  { reg: 'DL1ZD2644', type: 'Dzire', fuel: 'CNG', gpsKm: 683.1 },
  { reg: 'DL1ZD3861', type: 'Dzire', fuel: 'CNG', gpsKm: 2376.0 },
  { reg: 'DL3EV1739', type: 'TATA NEXON EV', fuel: 'Electric', gpsKm: 595.5 },
  { reg: 'DL3EV1744', type: 'TATA NEXON EV', fuel: 'Electric', gpsKm: 688.5 },
  { reg: 'DL52GD0247', type: 'TATA TIGOR EV', fuel: 'Electric', gpsKm: 306.9 },
  { reg: 'DL52GD4016', type: 'TATA TIGOR EV', fuel: 'Electric', gpsKm: 1348.5 },
  { reg: 'DL52GD5252', type: 'TATA TIGOR EV', fuel: 'Electric', gpsKm: 2433.6 },
  { reg: 'DL6CT3248', type: 'Honda City', fuel: 'Petrol', gpsKm: 734.1 },
  { reg: 'DL8CBL0438', type: 'Toyota Rumion', fuel: 'CNG', gpsKm: 2696.2 },
  { reg: 'DL8CBL0442', type: 'Ertiga', fuel: 'CNG', gpsKm: 1075.6 },
  { reg: 'DL9CBF2174', type: 'Invicto', fuel: 'Petrol Hybrid', gpsKm: 3445.4 },
  { reg: 'DL9CBF3173', type: 'Ciaz', fuel: 'CNG', gpsKm: 1018.3 },
  { reg: 'DL9CBG9969', type: 'Ciaz', fuel: 'CNG', gpsKm: 1397.3 },
  { reg: 'DL9CBK4237', type: 'Ciaz', fuel: 'CNG', gpsKm: 1206.3 },
  { reg: 'DL9CBK4272', type: 'Ciaz', fuel: 'CNG', gpsKm: 1231.7 },
  { reg: 'HR29AY0502', type: 'Ciaz', fuel: 'CNG', gpsKm: 745.6 },
  { reg: 'HR29BA3806', type: 'Ciaz', fuel: 'CNG', gpsKm: 1313.9 },
  { reg: 'HR29BA4017', type: 'Ciaz', fuel: 'CNG', gpsKm: 1219.7 },
  { reg: 'HR29BA6777', type: 'Ciaz', fuel: 'CNG', gpsKm: 1303.4 },
  { reg: 'HR29BA9896', type: 'Ciaz', fuel: 'CNG', gpsKm: 1266.2 },
  { reg: 'HR38AE6518', type: 'XL6', fuel: 'CNG', gpsKm: 1217.6 },
  { reg: 'HR38AF7937', type: 'Hycross', fuel: 'Petrol', gpsKm: 1791.4 },
  { reg: 'HR38AG0003', type: 'Toyota Rumion', fuel: 'CNG', gpsKm: 1022.1 },
  { reg: 'HR38AH3106', type: 'Honda City', fuel: 'Petrol', gpsKm: 1562.0 },
  { reg: 'HR38AJ3560', type: 'Dzire', fuel: 'CNG', gpsKm: 1286.0 },
  { reg: 'HR38AK0007', type: 'Hycross', fuel: 'Petrol Hybrid', gpsKm: 1849.0 },
  { reg: 'HR38AK0010', type: 'Invicto', fuel: 'Petrol Hybrid', gpsKm: 1674.1 },
  { reg: 'HR38AL0005', type: 'Ciaz', fuel: 'CNG', gpsKm: 1427.7 },
  { reg: 'HR38AL0009', type: 'Ciaz', fuel: 'CNG', gpsKm: 1637.0 },
  { reg: 'HR38AL0172', type: 'Dzire', fuel: 'CNG', gpsKm: 2017.5 },
  { reg: 'HR38AL1197', type: 'Mahindra Bolero B6', fuel: 'Diesel', gpsKm: 1513.6 },
  { reg: 'HR38AL3812', type: 'Dzire', fuel: 'CNG', gpsKm: 2407.6 },
  { reg: 'HR38AL4027', type: 'Ciaz', fuel: 'CNG', gpsKm: 1263.9 },
  { reg: 'HR38AL5180', type: 'Dzire', fuel: 'CNG', gpsKm: 2726.5 },
  { reg: 'HR38AL7204', type: 'Dzire', fuel: 'CNG', gpsKm: 2846.4 },
  { reg: 'HR38AL8569', type: 'Mahindra Bolero B6', fuel: 'Diesel', gpsKm: 1449.7 },
  { reg: 'HR47G6634', type: 'Ciaz', fuel: 'CNG', gpsKm: 1091.4 },
  { reg: 'HR47G7249', type: 'Ciaz', fuel: 'CNG', gpsKm: 1676.1 },
  { reg: 'HR47H1209', type: 'Verna', fuel: 'CNG/Petrol', gpsKm: 1392.1 },
  { reg: 'HR51CA7081', type: 'Ciaz', fuel: 'CNG', gpsKm: 1464.7 },
  { reg: 'HR51CC5914', type: 'Ciaz', fuel: 'CNG', gpsKm: 1347.9 },
  { reg: 'HR51CD6202', type: 'Ciaz', fuel: 'CNG', gpsKm: 1280.9 },
  { reg: 'HR51CE0690', type: 'Ciaz', fuel: 'CNG', gpsKm: 1186.3 },
  { reg: 'HR51CG2858', type: 'Ciaz', fuel: 'CNG', gpsKm: 1175.1 },
  { reg: 'HR51CN5473', type: 'Innova', fuel: 'Diesel', gpsKm: 1474.5 },
  { reg: 'HR51CP3263', type: 'Innova', fuel: 'Diesel', gpsKm: 2322.4 },
  { reg: 'HR51CT3710', type: 'Ciaz', fuel: 'CNG', gpsKm: 1567.3 },
  { reg: 'HR51CW4167', type: 'Toyota Rumion', fuel: 'CNG', gpsKm: 1504.0 },
  { reg: 'HR51CW7199', type: 'Ciaz', fuel: 'CNG', gpsKm: 1965.9 },
  { reg: 'HR51CX1827', type: 'Hyryder', fuel: 'CNG', gpsKm: 1285.2 },
  { reg: 'HR51CX2243', type: 'Hyryder', fuel: 'CNG', gpsKm: 1345.0 },
  { reg: 'HR51CX3506', type: 'Toyota Rumion', fuel: 'CNG', gpsKm: 1357.0 },
  { reg: 'HR51CX6709', type: 'Ciaz', fuel: 'CNG', gpsKm: 1469.3 },
  { reg: 'HR51CX6753', type: 'Hyryder', fuel: 'CNG', gpsKm: 1134.9 },
  { reg: 'HR51CX8395', type: 'Ciaz', fuel: 'CNG', gpsKm: 1304.2 },
  { reg: 'HR51CX8506', type: 'Toyota Rumion', fuel: 'CNG', gpsKm: 1051.1 },
  { reg: 'HR51CY4080', type: 'Toyota Rumion', fuel: 'CNG', gpsKm: 1025.0 },
  { reg: 'HR55AV0009', type: 'Fortuner', fuel: 'Diesel', gpsKm: 146.3 },
  { reg: 'HR5C5879', type: 'Toyota Rumion', fuel: 'CNG', gpsKm: 2665.3 },
  { reg: 'HR67E7614', type: 'Ertiga', fuel: 'CNG', gpsKm: 1224.8 },
  { reg: 'HR73C9318', type: 'Dzire', fuel: 'CNG', gpsKm: 1100.1 },
  { reg: 'PB01G4163', type: 'Innova', fuel: 'Petrol', gpsKm: 1291.0 },
  { reg: 'PB01G4168', type: 'Invicto', fuel: 'Petrol Hybrid', gpsKm: 1277.6 },
  { reg: 'PB01N1435', type: 'Dzire', fuel: 'CNG', gpsKm: 1006.4 },
  { reg: 'UP161FP6503', type: 'Toyota Rumion', fuel: 'CNG', gpsKm: 1235.3 },
  { reg: 'UP16EE1348', type: 'KIA CARENS', fuel: 'Diesel', gpsKm: 1363.5 },
  { reg: 'UP16EM0508', type: 'Innova', fuel: 'Diesel', gpsKm: 2036.1 },
  { reg: 'UP16EW0020', type: 'Innova', fuel: 'Petrol', gpsKm: 1261.3 },
  { reg: 'UP16EX5858', type: 'Hycross', fuel: 'Petrol Hybrid', gpsKm: 2350.7 },
  { reg: 'UP16FC4668', type: 'Ciaz', fuel: 'CNG', gpsKm: 1510.0 },
];

RAW_INITIAL.forEach(s => {
  existingSpecs.set(normalizeRegNo(s.reg), s);
});

// Aggregate sheet fuel per vehicle to assign realistic GPS distance
const fuelAggPerVeh = new Map<string, { totalQty: number; totalCost: number; count: number }>();
REFRESHED_FUEL_RECORDS.forEach(r => {
  const norm = normalizeRegNo(r.registration_number);
  if (!fuelAggPerVeh.has(norm)) {
    fuelAggPerVeh.set(norm, { totalQty: 0, totalCost: 0, count: 0 });
  }
  const agg = fuelAggPerVeh.get(norm)!;
  agg.totalQty += r.quantity;
  agg.totalCost += r.total_amount;
  agg.count++;

  if (!existingSpecs.has(norm)) {
    const vType = inferType(r.registration_number, r.fuel_type);
    // 16.5 km/kg or standard travel distance calculation
    const calcKm = Math.max(350, Math.round((r.quantity * 16.2 + 250) * 10) / 10);
    existingSpecs.set(norm, {
      reg: r.registration_number,
      type: vType,
      fuel: r.fuel_type,
      gpsKm: calcKm
    });
  }
});

// Update gpsKm for vehicles in sheet that might have had dummy 0
REFRESHED_FUEL_RECORDS.forEach(r => {
  const norm = normalizeRegNo(r.registration_number);
  const spec = existingSpecs.get(norm);
  const agg = fuelAggPerVeh.get(norm);
  if (spec && agg && spec.gpsKm <= 10) {
    spec.gpsKm = Math.max(400, Math.round(agg.totalQty * 16.2 * 10) / 10);
  }
});

const allSpecsArray = Array.from(existingSpecs.values());

const code = `import { Vehicle, VehicleMileageStandard, GPSDailyKM, FuelRecord, IGLCard, UserAccount, FleetAlert, AuditLog, FuelType } from '../types/fleet';
import { normalizeRegNo } from '../utils/normalize';
import { REFRESHED_FUEL_RECORDS } from './refreshedFuelRecords';

export const INITIAL_MILEAGE_STANDARDS: VehicleMileageStandard[] = [
  { id: 'std-1', car_type: 'Ciaz', fuel_type: 'Petrol', standard_value: 14, mileage_type: 'KM per Litre', unit: 'km/litre', created_at: '2026-01-01', updated_at: '2026-01-01' },
  { id: 'std-2', car_type: 'Ciaz', fuel_type: 'CNG', standard_value: 5.7, mileage_type: 'Cost per KM', unit: '₹ per km', created_at: '2026-01-01', updated_at: '2026-01-01' },
  { id: 'std-3', car_type: 'Dzire', fuel_type: 'CNG', standard_value: 4.7, mileage_type: 'Cost per KM', unit: '₹ per km', created_at: '2026-01-01', updated_at: '2026-01-01' },
  { id: 'std-4', car_type: 'Fortuner', fuel_type: 'Diesel', standard_value: 12, mileage_type: 'KM per Litre', unit: 'km/litre', created_at: '2026-01-01', updated_at: '2026-01-01' },
  { id: 'std-5', car_type: 'Hycross', fuel_type: 'Petrol Hybrid', standard_value: 15, mileage_type: 'KM per Litre', unit: 'km/litre', created_at: '2026-01-01', updated_at: '2026-01-01' },
  { id: 'std-6', car_type: 'Verna', fuel_type: 'CNG', standard_value: 4.7, mileage_type: 'Cost per KM', unit: '₹ per km', created_at: '2026-01-01', updated_at: '2026-01-01' },
  { id: 'std-7', car_type: 'Ashok Leyland 12M Coach', fuel_type: 'CNG/Petrol', standard_value: 4.5, mileage_type: 'Cost per KM', unit: '₹ per km', created_at: '2026-01-01', updated_at: '2026-01-01' },
  { id: 'std-8', car_type: 'Bolero Camper', fuel_type: 'CNG', standard_value: 13, mileage_type: 'KM per Litre', unit: 'km/litre', created_at: '2026-01-01', updated_at: '2026-01-01' },
  { id: 'std-9', car_type: 'Corolla Altis', fuel_type: 'Petrol', standard_value: 8, mileage_type: 'KM per Litre', unit: 'km/litre', created_at: '2026-01-01', updated_at: '2026-01-01' },
  { id: 'std-10', car_type: 'Ertiga', fuel_type: 'CNG', standard_value: 5.7, mileage_type: 'Cost per KM', unit: '₹ per km', created_at: '2026-01-01', updated_at: '2026-01-01' },
  { id: 'std-11', car_type: 'Glanza', fuel_type: 'Petrol', standard_value: 18, mileage_type: 'KM per Litre', unit: 'km/litre', created_at: '2026-01-01', updated_at: '2026-01-01' },
  { id: 'std-12', car_type: 'Honda City', fuel_type: 'Petrol', standard_value: 18, mileage_type: 'KM per Litre', unit: 'km/litre', created_at: '2026-01-01', updated_at: '2026-01-01' },
  { id: 'std-13', car_type: 'Hycross', fuel_type: 'Petrol', standard_value: 10, mileage_type: 'KM per Litre', unit: 'km/litre', created_at: '2026-01-01', updated_at: '2026-01-01' },
  { id: 'std-14', car_type: 'Hyryder', fuel_type: 'CNG', standard_value: 5.7, mileage_type: 'Cost per KM', unit: '₹ per km', created_at: '2026-01-01', updated_at: '2026-01-01' },
  { id: 'std-15', car_type: 'Innova', fuel_type: 'Diesel', standard_value: 12, mileage_type: 'KM per Litre', unit: 'km/litre', created_at: '2026-01-01', updated_at: '2026-01-01' },
  { id: 'std-16', car_type: 'Innova', fuel_type: 'Petrol', standard_value: 10, mileage_type: 'KM per Litre', unit: 'km/litre', created_at: '2026-01-01', updated_at: '2026-01-01' },
  { id: 'std-17', car_type: 'Invicto', fuel_type: 'Petrol Hybrid', standard_value: 15, mileage_type: 'KM per Litre', unit: 'km/litre', created_at: '2026-01-01', updated_at: '2026-01-01' },
  { id: 'std-18', car_type: 'KIA CARENS', fuel_type: 'Diesel', standard_value: 17, mileage_type: 'KM per Litre', unit: 'km/litre', created_at: '2026-01-01', updated_at: '2026-01-01' },
  { id: 'std-19', car_type: 'KIA SELTOS', fuel_type: 'Petrol', standard_value: 16, mileage_type: 'KM per Litre', unit: 'km/litre', created_at: '2026-01-01', updated_at: '2026-01-01' },
  { id: 'std-20', car_type: 'Mahindra Bolero B6', fuel_type: 'Diesel', standard_value: 17, mileage_type: 'KM per Litre', unit: 'km/litre', created_at: '2026-01-01', updated_at: '2026-01-01' },
  { id: 'std-21', car_type: 'Maruti Ciaz', fuel_type: 'CNG/Petrol', standard_value: 5.7, mileage_type: 'KM per Litre', unit: 'km/litre', created_at: '2026-01-01', updated_at: '2026-01-01' },
  { id: 'std-22', car_type: 'Toyota Rumion', fuel_type: 'CNG', standard_value: 5.7, mileage_type: 'Cost per KM', unit: '₹ per km', created_at: '2026-01-01', updated_at: '2026-01-01' },
  { id: 'std-23', car_type: 'TOYOTA RUMION', fuel_type: 'CNG', standard_value: 5.7, mileage_type: 'Cost per KM', unit: '₹ per km', created_at: '2026-01-01', updated_at: '2026-01-01' },
  { id: 'std-24', car_type: 'XL6', fuel_type: 'CNG', standard_value: 5.7, mileage_type: 'Cost per KM', unit: '₹ per km', created_at: '2026-01-01', updated_at: '2026-01-01' },
  { id: 'std-25', car_type: 'TATA NEXON EV', fuel_type: 'Electric', standard_value: 7.5, mileage_type: 'KM per Litre', unit: 'km/kWh', created_at: '2026-01-01', updated_at: '2026-01-01' },
  { id: 'std-26', car_type: 'TATA TIGOR EV', fuel_type: 'Electric', standard_value: 8.0, mileage_type: 'KM per Litre', unit: 'km/kWh', created_at: '2026-01-01', updated_at: '2026-01-01' },
  { id: 'std-27', car_type: 'MG ZS EV', fuel_type: 'Electric', standard_value: 7.0, mileage_type: 'KM per Litre', unit: 'km/kWh', created_at: '2026-01-01', updated_at: '2026-01-01' },
];

export const INITIAL_USERS: UserAccount[] = [
  { id: 'usr-1', name: 'Fleet Director', email: 'lrtaxiservice@gmail.com', role: 'Admin' },
  { id: 'usr-2', name: 'Rajesh Sharma', email: 'operations@lrtaxi.in', role: 'Operations' },
  { id: 'usr-3', name: 'Sunita Verma', email: 'accounts@lrtaxi.in', role: 'Accounts' },
  { id: 'usr-4', name: 'Vikram Mehta', email: 'mgmt@lrtaxi.in', role: 'Management' },
  { id: 'usr-5', name: 'Anil Kumar', email: 'viewer@lrtaxi.in', role: 'Viewer' },
];

export interface SeedCarSpec {
  reg: string;
  type: string;
  fuel: 'CNG' | 'Petrol' | 'Diesel' | 'Electric' | 'CNG/Petrol' | 'Petrol Hybrid';
  gpsKm: number;
}

export const RAW_SEED_SPECS: SeedCarSpec[] = ${JSON.stringify(allSpecsArray, null, 2)};

export function generateInitialFleet(): {
  vehicles: Vehicle[];
  gpsRecords: GPSDailyKM[];
  fuelRecords: FuelRecord[];
  iglCards: IGLCard[];
  alerts: FleetAlert[];
  auditLogs: AuditLog[];
} {
  const vehicles: Vehicle[] = [];
  const gpsRecords: GPSDailyKM[] = [];
  const iglCards: IGLCard[] = [];
  const alerts: FleetAlert[] = [];
  const auditLogs: AuditLog[] = [];

  const driversList = [
    'Ramesh Kumar', 'Suresh Yadav', 'Dharmendra Singh', 'Manoj Sharma',
    'Mukesh Verma', 'Satish Chand', 'Pappu Yadav', 'Balwan Singh',
    'Kuldeep Rawat', 'Ajay Kumar', 'Sunil Kumar', 'Sonu Khan',
    'Vikram Pal', 'Devendra Singh', 'Joginder', 'Deepak Chauhan',
    'Rakesh Verma', 'Anil Sharma', 'Mahesh Gurjar', 'Harish Chandra',
    'Amit Bhati', 'Pawan Pandey', 'Vinod Rawat', 'Naresh Kumar'
  ];

  const vendorsList = ['LR Taxi Fleet A', 'LR Transport Prime', 'Shree Ram Logistics', 'Apex Mobility', 'LR Royal Fleet'];

  const carTypeDefaults: Record<string, { make: string; model: string; tankCap: number; fuel: FuelType }> = {
    'Ciaz': { make: 'Maruti Suzuki', model: 'Ciaz Alpha', tankCap: 45, fuel: 'CNG' },
    'Dzire': { make: 'Maruti Suzuki', model: 'Dzire Tour S', tankCap: 42, fuel: 'CNG' },
    'Toyota Rumion': { make: 'Toyota', model: 'Rumion V', tankCap: 45, fuel: 'CNG' },
    'Ertiga': { make: 'Maruti Suzuki', model: 'Ertiga VXI', tankCap: 45, fuel: 'CNG' },
    'Innova': { make: 'Toyota', model: 'Innova Crysta 2.4', tankCap: 55, fuel: 'Diesel' },
    'Hycross': { make: 'Toyota', model: 'Innova Hycross Hybrid', tankCap: 52, fuel: 'Petrol Hybrid' },
    'Invicto': { make: 'Maruti Suzuki', model: 'Invicto Alpha+', tankCap: 52, fuel: 'Petrol Hybrid' },
    'Fortuner': { make: 'Toyota', model: 'Fortuner 4x2 AT', tankCap: 80, fuel: 'Diesel' },
    'Mahindra Bolero B6': { make: 'Mahindra', model: 'Bolero B6 Opt', tankCap: 60, fuel: 'Diesel' },
    'Verna': { make: 'Hyundai', model: 'Verna SX', tankCap: 45, fuel: 'CNG' },
    'Honda City': { make: 'Honda', model: 'City ZX', tankCap: 40, fuel: 'Petrol' },
    'TATA NEXON EV': { make: 'Tata', model: 'Nexon EV Prime', tankCap: 40.5, fuel: 'Electric' },
    'TATA TIGOR EV': { make: 'Tata', model: 'Tigor EV XZ+', tankCap: 26, fuel: 'Electric' },
    'MG ZS EV': { make: 'MG', model: 'ZS EV Excite', tankCap: 50.3, fuel: 'Electric' },
    'XL6': { make: 'Maruti Suzuki', model: 'XL6 Zeta', tankCap: 45, fuel: 'CNG' },
    'Bolero Camper': { make: 'Mahindra', model: 'Bolero Camper 4WD', tankCap: 57, fuel: 'CNG' },
    'Ashok Leyland 12M Coach': { make: 'Ashok Leyland', model: 'Viking 12M CNG', tankCap: 150, fuel: 'CNG/Petrol' },
  };

  const processedRegs = new Set<string>();

  // 1. Vehicles from user sheet & known fleet
  RAW_SEED_SPECS.forEach((spec, idx) => {
    const norm = normalizeRegNo(spec.reg);
    processedRegs.add(norm);
    const defaults = carTypeDefaults[spec.type] || { make: 'Commercial', model: spec.type, tankCap: 45, fuel: spec.fuel as FuelType };
    const driver = driversList[idx % driversList.length];
    const vendor = vendorsList[idx % vendorsList.length];

    vehicles.push({
      id: 'veh-' + (idx + 1),
      registration_number: spec.reg,
      normalized_reg: norm,
      vehicle_type: spec.type,
      make: defaults.make,
      model: defaults.model,
      fuel_type: spec.fuel as FuelType,
      manufacturing_year: 2022 + (idx % 4),
      purchase_date: '202' + (2 + (idx % 3)) + '-0' + ((idx % 8) + 1) + '-15',
      owner_type: idx % 4 === 0 ? 'Attached' : 'Owned',
      vendor,
      driver,
      driver_phone: '+91 9811' + String(100000 + idx).slice(-6),
      gps_device_id: 'GPS-' + (1000 + idx),
      gps_imei: '86043405' + String(10000000 + idx).slice(-7),
      igl_card_number: (spec.fuel === 'CNG' || spec.fuel === 'CNG/Petrol') ? 'IGL-8840-' + String(2000 + idx) : undefined,
      fuel_tank_capacity: defaults.tankCap,
      monthly_target_km: 2500,
      status: 'Active',
      created_at: '2026-01-01',
      updated_at: '2026-09-17',
    });
  });

  // 2. Pad up to 440 vehicles to match exact fleet target
  const remainingCount = 440 - vehicles.length;
  const typesPool = ['Ciaz', 'Dzire', 'Toyota Rumion', 'Ertiga', 'Innova', 'Hycross', 'TATA TIGOR EV', 'Mahindra Bolero B6', 'Honda City'];

  for (let i = 0; i < remainingCount; i++) {
    const carType = typesPool[i % typesPool.length];
    const defaults = carTypeDefaults[carType] || { make: 'Maruti', model: carType, tankCap: 45, fuel: 'CNG' as FuelType };
    const series = i % 2 === 0 ? 'HR51' : (i % 3 === 0 ? 'DL10' : 'HR38');
    const letters = ['DA', 'DB', 'CW', 'CX', 'AL', 'AJ', 'CG'][i % 7];
    const num = String(1000 + i).slice(-4);
    const reg = series + letters + num;
    const norm = normalizeRegNo(reg);

    vehicles.push({
      id: 'veh-pad-' + (i + 1),
      registration_number: reg,
      normalized_reg: norm,
      vehicle_type: carType,
      make: defaults.make,
      model: defaults.model,
      fuel_type: defaults.fuel,
      manufacturing_year: 2023,
      purchase_date: '2023-04-10',
      owner_type: 'Owned',
      vendor: vendorsList[i % vendorsList.length],
      driver: driversList[i % driversList.length],
      driver_phone: '+91 9910' + String(200000 + i).slice(-6),
      gps_device_id: 'GPS-' + (3000 + i),
      gps_imei: '86043406' + String(20000000 + i).slice(-7),
      igl_card_number: (defaults.fuel === 'CNG' || defaults.fuel === 'CNG/Petrol') ? 'IGL-9920-' + String(4000 + i) : undefined,
      fuel_tank_capacity: defaults.tankCap,
      monthly_target_km: 2500,
      status: i > remainingCount - 12 ? 'Under Maintenance' : 'Active',
      created_at: '2026-01-01',
      updated_at: '2026-09-17',
    });
  }

  const vehMap = new Map<string, Vehicle>();
  vehicles.forEach(v => vehMap.set(v.normalized_reg, v));

  // 3. Generate daily GPS records for September 2026 (01 Sept - 16 Sept)
  vehicles.forEach((veh, vIdx) => {
    const seedSpec = RAW_SEED_SPECS.find(s => normalizeRegNo(s.reg) === veh.normalized_reg);
    const targetKm = seedSpec ? seedSpec.gpsKm : (650 + (vIdx * 17) % 1100);

    let currentOdo = 50000 + vIdx * 1200;
    const daysCount = 16;
    const baseDaily = targetKm / daysCount;

    for (let day = 1; day <= daysCount; day++) {
      const dateStr = '2026-09-' + (day < 10 ? '0' + day : day);
      const dayFactor = (day % 4 === 0) ? 0.3 : (day % 3 === 0 ? 1.4 : 1.0);
      let dayKm = Math.round((baseDaily * dayFactor) * 10) / 10;
      if (day === 16 && targetKm === 0) dayKm = 0;

      const opening = currentOdo;
      const closing = currentOdo + dayKm;
      currentOdo = closing;

      gpsRecords.push({
        id: 'gps-' + veh.id + '-' + day,
        vehicle_id: veh.id,
        registration_number: veh.registration_number,
        normalized_reg: veh.normalized_reg,
        date: dateStr,
        gps_device_imei: veh.gps_imei || '860434051000001',
        opening_km: opening,
        closing_km: closing,
        daily_gps_km: dayKm,
        source: 'API',
        created_at: dateStr + 'T23:59:00Z',
        updated_at: dateStr + 'T23:59:00Z',
      });
    }
  });

  // 4. Link Refreshed Fuel Records (1,356 records from user sheet)
  const fuelRecords: FuelRecord[] = REFRESHED_FUEL_RECORDS.map(rec => {
    const matchedVeh = vehMap.get(rec.normalized_reg);
    return {
      ...rec,
      vehicle_id: matchedVeh ? matchedVeh.id : rec.vehicle_id,
      registration_number: matchedVeh ? matchedVeh.registration_number : rec.registration_number,
      car_type: matchedVeh ? matchedVeh.vehicle_type : rec.car_type,
      driver: matchedVeh?.driver || rec.driver,
      igl_card_number: matchedVeh?.igl_card_number || rec.igl_card_number,
    };
  });

  // 5. IGL CNG Cards for fleet
  vehicles.filter(v => v.fuel_type === 'CNG' || v.fuel_type === 'CNG/Petrol').slice(0, 240).forEach((v, idx) => {
    iglCards.push({
      id: 'igl-' + (idx + 1),
      card_number: v.igl_card_number || ('IGL-8840-' + (2000 + idx)),
      vehicle_registration: v.registration_number,
      normalized_reg: v.normalized_reg,
      assigned_driver: v.driver || 'Assigned Driver',
      balance: 4500 - (idx * 25) % 3000,
      monthly_limit: 25000,
      status: 'Active',
      last_used_date: '2026-09-16',
    });
  });

  // 6. Realistic Alerts & Exceptions
  alerts.push(
    { id: 'alt-1', vehicle_registration: 'HR38AL4163', type: 'Mileage', severity: 'Warning', message: 'Operating cost ₹5.72/km exceeds target standard ₹5.70/km (+0.4% variance)', date: '2026-09-16', resolved: false, metric_value: '₹5.72/km' },
    { id: 'alt-2', vehicle_registration: 'HR38AJ2423', type: 'Mileage', severity: 'Warning', message: 'Operating cost ₹4.72/km exceeds standard ₹4.70/km (+0.3% variance)', date: '2026-09-16', resolved: false, metric_value: '₹4.72/km' },
    { id: 'alt-3', vehicle_registration: 'HR51CP5076', type: 'Mileage', severity: 'Warning', message: 'Operating cost ₹5.72/km exceeds standard ₹5.70/km (+0.3% variance)', date: '2026-09-16', resolved: false, metric_value: '₹5.72/km' },
    { id: 'alt-4', vehicle_registration: 'DL10DB6751', type: 'Fuel', severity: 'Info', message: 'EV charging logged without fast-charger tariff invoice tag', date: '2026-09-15', resolved: false, metric_value: '828.6 KM' },
    { id: 'alt-5', vehicle_registration: 'CH249463', type: 'GPS', severity: 'Critical', message: 'Zero GPS KM logged consecutively for 7 days', date: '2026-09-16', resolved: false, metric_value: '0 KM' },
    { id: 'alt-6', vehicle_registration: 'DL1ZD3861', type: 'GPS', severity: 'Warning', message: 'Abnormally high daily GPS travel: 2,376 KM logged this month', date: '2026-09-14', resolved: false, metric_value: '2376 KM' }
  );

  // 7. Audit Log Seed
  auditLogs.push(
    { id: 'log-1', user: 'Sunita Verma (Accounts)', action: 'Fuel Excel Import', entity_type: 'Fuel', entity_id: 'refuel-sep-batch', old_value: '', new_value: '1,356 Fuel Expenses Refreshed from Sheet (Sep 01 - Sep 16, 2026)', reason: 'Refreshed refueling sheet upload', timestamp: '2026-09-16 18:30:00' },
    { id: 'log-2', user: 'Rajesh Sharma (Operations)', action: 'GPS Daily Sync', entity_type: 'GPS', entity_id: 'mosfet-batch-901', old_value: '', new_value: '440 vehicle daily records pulled from Track360 API', reason: 'Automated morning GPS pull', timestamp: '2026-09-16 08:30:12' },
    { id: 'log-3', user: 'Fleet Director (Admin)', action: 'Mileage Standard Update', entity_type: 'Standard', entity_id: 'std-2', old_value: '5.80 ₹/km', new_value: '5.70 ₹/km (Cost per KM)', reason: 'CNG price revision adjustment', timestamp: '2026-09-15 16:20:44' },
    { id: 'log-4', user: 'Rajesh Sharma (Operations)', action: 'Manual Correction', entity_type: 'GPS', entity_id: 'gps-veh-1-12', old_value: '42.0 KM', new_value: '124.5 KM', reason: 'Device rebooted during trip between Gurugram and Noida', timestamp: '2026-09-14 17:10:05' }
  );

  return {
    vehicles,
    gpsRecords,
    fuelRecords,
    iglCards,
    alerts,
    auditLogs,
  };
}
`;

fs.writeFileSync('./src/data/seedFleetData.ts', code);
console.log('Successfully updated src/data/seedFleetData.ts!');
