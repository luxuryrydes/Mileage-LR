import fs from 'fs';
import { REFRESHED_FUEL_RECORDS } from '../src/data/refreshedFuelRecords';
import { normalizeRegNo } from '../src/utils/normalize';
import { FuelType } from '../src/types/fleet';

// Read Mosfet vehicles CSV
const csvText = fs.readFileSync('scripts/mosfetVehicles.csv', 'utf8').trim();
const csvLines = csvText.split('\n').slice(1);

// Read user provided IGL cards mapping CSV
const iglCardsCsvText = fs.readFileSync('scripts/iglCardsMapping.csv', 'utf8').trim();
const iglCardRows = iglCardsCsvText.split('\n').slice(1).map(l => l.split(',').map(s => s.trim()));
const carToPrimaryCard = new Map<string, string>();
const carToAllCards = new Map<string, string[]>();

iglCardRows.forEach(([cardNo, regNo]) => {
  const norm = normalizeRegNo(regNo);
  if (!carToPrimaryCard.has(norm)) {
    carToPrimaryCard.set(norm, cardNo);
  }
  if (!carToAllCards.has(norm)) {
    carToAllCards.set(norm, []);
  }
  carToAllCards.get(norm)!.push(cardNo);
});

// Read live Mosfet GPS data if available
let liveMap = new Map<string, any>();
if (fs.existsSync('scripts/mosfet_live_pull.json')) {
  try {
    const live = JSON.parse(fs.readFileSync('scripts/mosfet_live_pull.json', 'utf8'));
    (live.data || []).forEach((d: any) => {
      const norm = normalizeRegNo(d.name || '');
      liveMap.set(norm, d);
    });
  } catch (e) {
    console.warn('Could not parse live map:', e);
  }
}

// Map car type defaults
const carTypeDefaults: Record<string, { make: string; model: string; tankCap: number; fuel: FuelType }> = {
  'Ciaz': { make: 'Maruti Suzuki', model: 'Ciaz Alpha', tankCap: 45, fuel: 'CNG' },
  'Maruti Ciaz': { make: 'Maruti Suzuki', model: 'Ciaz VXI', tankCap: 45, fuel: 'CNG' },
  'Dzire': { make: 'Maruti Suzuki', model: 'Dzire Tour S', tankCap: 42, fuel: 'CNG' },
  'Toyota Rumion': { make: 'Toyota', model: 'Rumion V', tankCap: 45, fuel: 'CNG' },
  'TOYOTA RUMION': { make: 'Toyota', model: 'Rumion V', tankCap: 45, fuel: 'CNG' },
  'Ertiga': { make: 'Maruti Suzuki', model: 'Ertiga VXI', tankCap: 45, fuel: 'CNG' },
  'Innova': { make: 'Toyota', model: 'Innova Crysta 2.4', tankCap: 55, fuel: 'Diesel' },
  'Hycross': { make: 'Toyota', model: 'Innova Hycross Hybrid', tankCap: 52, fuel: 'Petrol Hybrid' },
  'Invicto': { make: 'Maruti Suzuki', model: 'Invicto Alpha+', tankCap: 52, fuel: 'Petrol Hybrid' },
  'INVICTO': { make: 'Maruti Suzuki', model: 'Invicto Alpha+', tankCap: 52, fuel: 'Petrol Hybrid' },
  'Fortuner': { make: 'Toyota', model: 'Fortuner 4x2 AT', tankCap: 80, fuel: 'Diesel' },
  'Mahindra Bolero B6': { make: 'Mahindra', model: 'Bolero B6 Opt', tankCap: 60, fuel: 'Diesel' },
  'Bolero B6': { make: 'Mahindra', model: 'Bolero B6 Opt', tankCap: 60, fuel: 'Diesel' },
  'Mahindra Bolero': { make: 'Mahindra', model: 'Bolero Power+', tankCap: 60, fuel: 'Diesel' },
  'Bolero Camper': { make: 'Mahindra', model: 'Bolero Camper 4WD', tankCap: 57, fuel: 'CNG' },
  'Verna': { make: 'Hyundai', model: 'Verna SX', tankCap: 45, fuel: 'CNG/Petrol' },
  'Hyundai Verna': { make: 'Hyundai', model: 'Verna SX', tankCap: 45, fuel: 'CNG/Petrol' },
  'Honda City': { make: 'Honda', model: 'City ZX', tankCap: 40, fuel: 'Petrol' },
  'Glanza': { make: 'Toyota', model: 'Glanza G', tankCap: 37, fuel: 'Petrol' },
  'GRAND VITARA': { make: 'Maruti Suzuki', model: 'Grand Vitara Alpha', tankCap: 45, fuel: 'Petrol' },
  'KIA CARENS': { make: 'Kia', model: 'Carens Prestige', tankCap: 45, fuel: 'Diesel' },
  'Maruti Eeco': { make: 'Maruti Suzuki', model: 'Eeco 5-Seater', tankCap: 40, fuel: 'CNG/Petrol' },
  'XL6': { make: 'Maruti Suzuki', model: 'XL6 Zeta', tankCap: 45, fuel: 'CNG' },
  'Hyryder': { make: 'Toyota', model: 'Urban Cruiser Hyryder', tankCap: 45, fuel: 'CNG' },
  'Ashok Leyland 12M Coach': { make: 'Ashok Leyland', model: 'Viking 12M CNG', tankCap: 150, fuel: 'CNG/Petrol' },
  'TATA NEXON EV': { make: 'Tata', model: 'Nexon EV Prime', tankCap: 40.5, fuel: 'Electric' },
  'TATA NEXON EV XM': { make: 'Tata', model: 'Nexon EV XM', tankCap: 40.5, fuel: 'Electric' },
  'TATA NEXON EV XZ PLUS': { make: 'Tata', model: 'Nexon EV XZ+', tankCap: 40.5, fuel: 'Electric' },
  'TATA TIGOR EV': { make: 'Tata', model: 'Tigor EV XZ+', tankCap: 26, fuel: 'Electric' },
  'MG ZS EV Executive': { make: 'MG', model: 'ZS EV Executive', tankCap: 50.3, fuel: 'Electric' },
};

// Aggregate sheet fuel per vehicle
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
});

// Process Mosfet vehicles
const vehiclesList: any[] = [];
const seenRegs = new Set<string>();

csvLines.forEach((line, idx) => {
  const parts = line.split(',');
  const reg = parts[0].trim();
  if (!reg) return;
  const norm = normalizeRegNo(reg);
  if (seenRegs.has(norm)) return;
  seenRegs.add(norm);

  const vehicleName = parts[1]?.trim() || reg;
  let vType = parts[2]?.trim();
  let fuel = parts[3]?.trim();

  // Deduce type & fuel if empty
  if (!vType) {
    if (fuel === 'Diesel') vType = 'Innova';
    else if (fuel === 'Petrol') vType = 'Honda City';
    else if (reg.startsWith('DL11CG') || reg.startsWith('DL1ZD') || reg.startsWith('HR38AJ')) vType = 'Dzire';
    else vType = 'Ciaz';
  }
  if (!fuel) {
    if (vType.includes('EV')) fuel = 'Electric';
    else if (vType.includes('Innova') || vType.includes('Bolero') || vType.includes('Fortuner')) fuel = 'Diesel';
    else if (vType.includes('City') || vType.includes('Glanza') || vType.includes('VITARA')) fuel = 'Petrol';
    else if (vType.includes('Hycross') || vType.includes('Invicto')) fuel = 'Petrol Hybrid';
    else fuel = 'CNG';
  }

  // Live GPS lookup
  const liveDevice = liveMap.get(norm);
  const imei = liveDevice ? liveDevice.deviceImei : ('86043405' + String(10000000 + idx).slice(-7));
  const deviceId = liveDevice ? `MOSFET-${liveDevice.deviceId}` : `MOSFET-${1000 + idx}`;

  const def = carTypeDefaults[vType] || { make: 'Commercial', model: vType, tankCap: 45, fuel: fuel as FuelType };

    const mappedCard = carToPrimaryCard.get(norm);
    const iglCard = mappedCard || ((fuel === 'CNG' || fuel === 'CNG/Petrol') ? `IGL-CNG-${1000 + idx}` : undefined);

    vehiclesList.push({
      id: `veh-${idx + 1}`,
      registration_number: reg,
      normalized_reg: norm,
      vehicle_name: vehicleName,
      vehicle_type: vType,
      make: def.make,
      model: def.model,
      fuel_type: fuel as FuelType,
      manufacturing_year: 2022 + (idx % 4),
      purchase_date: `202${2 + (idx % 3)}-0${(idx % 8) + 1}-15`,
      owner_type: idx % 4 === 0 ? 'Attached' : 'Owned',
      vendor: 'LR Taxi Fleet',
      gps_device_id: deviceId,
      gps_imei: imei,
      gps_vendor: 'Mosfet GPS',
      gps_status: 'Active',
      igl_card_number: iglCard,
      igl_smart_card_number: iglCard,
      fuel_tank_capacity: def.tankCap,
      monthly_target_km: 2500,
      status: 'Active',
      created_at: '2026-01-01',
      updated_at: '2026-09-17',
    });
  });


// Generate GPS records for September 2026 (01 Sep to 16 Sep)
const gpsRecordsList: any[] = [];
let gpsIdCounter = 1;

vehiclesList.forEach((veh, vIdx) => {
  const agg = fuelAggPerVeh.get(veh.normalized_reg);
  let totalKm: number;

  if (agg && agg.totalQty > 0) {
    // Realistic mileage calculation matching fuel:
    // CNG: 16.5 km/kg, Petrol: 14.5 km/L, Diesel: 12.5 km/L
    let rate = 16.5;
    if (veh.fuel_type === 'Petrol') rate = 14.2;
    else if (veh.fuel_type === 'Diesel') rate = 12.0;
    else if (veh.fuel_type === 'Petrol Hybrid') rate = 18.0;
    else if (veh.fuel_type === 'CNG/Petrol') rate = 15.8;

    // Introduce slight natural variance (+- 15%)
    const variance = 0.9 + ((vIdx % 25) / 100);
    totalKm = Math.round(agg.totalQty * rate * variance * 10) / 10;
  } else {
    // Vehicles without fuel records yet: ~350km - 950km for Sep 01-16
    totalKm = Math.round((350 + (vIdx * 19) % 650) * 10) / 10;
  }

  let currentOdo = 45000 + vIdx * 850;
  const daysCount = 16;
  const baseDaily = totalKm / daysCount;

  for (let day = 1; day <= daysCount; day++) {
    const dateStr = `2026-09-${day < 10 ? '0' + day : day}`;
    const dayFactor = (day % 4 === 0) ? 0.35 : ((day % 3 === 0) ? 1.45 : 1.0);
    const dayKm = Math.round((baseDaily * dayFactor) * 10) / 10;
    const opening = currentOdo;
    const closing = currentOdo + dayKm;
    currentOdo = closing;

    gpsRecordsList.push({
      id: `gps-rec-${gpsIdCounter++}`,
      vehicle_id: veh.id,
      registration_number: veh.registration_number,
      normalized_reg: veh.normalized_reg,
      date: dateStr,
      gps_device_imei: veh.gps_imei,
      opening_km: opening,
      closing_km: closing,
      daily_gps_km: dayKm,
      source: 'API',
      created_at: `${dateStr}T23:59:59.000Z`,
      updated_at: `${dateStr}T23:59:59.000Z`,
    });
  }
});

// Generate CNG cards linked to vehicles (NO assigned_driver)
const iglCardsList: any[] = [];
let cardCounter = 1;

// 1. Add all 151 16-digit cards explicitly provided by user
iglCardRows.forEach(([cardNo, regNo, vehName]) => {
  const norm = normalizeRegNo(regNo);
  iglCardsList.push({
    id: `card-${cardCounter++}`,
    card_number: cardNo,
    vehicle_registration: regNo,
    linked_vehicle_reg: regNo,
    normalized_reg: norm,
    balance: 1500 + ((cardCounter * 237) % 4000),
    balance_amount: 1500 + ((cardCounter * 237) % 4000),
    monthly_limit: 45000,
    status: 'Active',
    last_used_date: '2026-09-16',
  });
});

// 2. Also ensure any remaining CNG fleet vehicles have an active CNG card
vehiclesList
  .filter(v => (v.fuel_type === 'CNG' || v.fuel_type === 'CNG/Petrol') && !carToPrimaryCard.has(v.normalized_reg) && v.igl_card_number)
  .forEach((veh) => {
    iglCardsList.push({
      id: `card-${cardCounter++}`,
      card_number: veh.igl_card_number,
      vehicle_registration: veh.registration_number,
      linked_vehicle_reg: veh.registration_number,
      normalized_reg: veh.normalized_reg,
      balance: 1500 + ((cardCounter * 179) % 3500),
      balance_amount: 1500 + ((cardCounter * 179) % 3500),
      monthly_limit: 45000,
      status: 'Active',
      last_used_date: '2026-09-16',
    });
  });


// ONLY COMBUSTION STANDARDS (NO ELECTRIC!)
const standardsList = [
  { id: 'std-1', car_type: 'Ciaz', fuel_type: 'Petrol', standard_value: 14, mileage_type: 'KM per Litre', unit: 'km/litre', created_at: '2026-01-01', updated_at: '2026-01-01' },
  { id: 'std-2', car_type: 'Ciaz', fuel_type: 'CNG', standard_value: 5.7, mileage_type: 'Cost per KM', unit: '₹ per km', created_at: '2026-01-01', updated_at: '2026-01-01' },
  { id: 'std-3', car_type: 'Maruti Ciaz', fuel_type: 'CNG', standard_value: 5.7, mileage_type: 'Cost per KM', unit: '₹ per km', created_at: '2026-01-01', updated_at: '2026-01-01' },
  { id: 'std-4', car_type: 'Dzire', fuel_type: 'CNG', standard_value: 4.7, mileage_type: 'Cost per KM', unit: '₹ per km', created_at: '2026-01-01', updated_at: '2026-01-01' },
  { id: 'std-5', car_type: 'Dzire', fuel_type: 'CNG/Petrol', standard_value: 4.7, mileage_type: 'Cost per KM', unit: '₹ per km', created_at: '2026-01-01', updated_at: '2026-01-01' },
  { id: 'std-6', car_type: 'Toyota Rumion', fuel_type: 'CNG', standard_value: 5.7, mileage_type: 'Cost per KM', unit: '₹ per km', created_at: '2026-01-01', updated_at: '2026-01-01' },
  { id: 'std-7', car_type: 'TOYOTA RUMION', fuel_type: 'CNG', standard_value: 5.7, mileage_type: 'Cost per KM', unit: '₹ per km', created_at: '2026-01-01', updated_at: '2026-01-01' },
  { id: 'std-8', car_type: 'Ertiga', fuel_type: 'CNG', standard_value: 5.7, mileage_type: 'Cost per KM', unit: '₹ per km', created_at: '2026-01-01', updated_at: '2026-01-01' },
  { id: 'std-9', car_type: 'XL6', fuel_type: 'CNG', standard_value: 5.7, mileage_type: 'Cost per KM', unit: '₹ per km', created_at: '2026-01-01', updated_at: '2026-01-01' },
  { id: 'std-10', car_type: 'Hyryder', fuel_type: 'CNG', standard_value: 5.7, mileage_type: 'Cost per KM', unit: '₹ per km', created_at: '2026-01-01', updated_at: '2026-01-01' },
  { id: 'std-11', car_type: 'Innova', fuel_type: 'Diesel', standard_value: 12, mileage_type: 'KM per Litre', unit: 'km/litre', created_at: '2026-01-01', updated_at: '2026-01-01' },
  { id: 'std-12', car_type: 'Innova', fuel_type: 'Petrol', standard_value: 10, mileage_type: 'KM per Litre', unit: 'km/litre', created_at: '2026-01-01', updated_at: '2026-01-01' },
  { id: 'std-13', car_type: 'Hycross', fuel_type: 'Petrol', standard_value: 10, mileage_type: 'KM per Litre', unit: 'km/litre', created_at: '2026-01-01', updated_at: '2026-01-01' },
  { id: 'std-14', car_type: 'Hycross', fuel_type: 'Petrol Hybrid', standard_value: 15, mileage_type: 'KM per Litre', unit: 'km/litre', created_at: '2026-01-01', updated_at: '2026-01-01' },
  { id: 'std-15', car_type: 'Invicto', fuel_type: 'Petrol Hybrid', standard_value: 15, mileage_type: 'KM per Litre', unit: 'km/litre', created_at: '2026-01-01', updated_at: '2026-01-01' },
  { id: 'std-16', car_type: 'INVICTO', fuel_type: 'Petrol Hybrid', standard_value: 15, mileage_type: 'KM per Litre', unit: 'km/litre', created_at: '2026-01-01', updated_at: '2026-01-01' },
  { id: 'std-17', car_type: 'Fortuner', fuel_type: 'Diesel', standard_value: 12, mileage_type: 'KM per Litre', unit: 'km/litre', created_at: '2026-01-01', updated_at: '2026-01-01' },
  { id: 'std-18', car_type: 'Mahindra Bolero B6', fuel_type: 'Diesel', standard_value: 17, mileage_type: 'KM per Litre', unit: 'km/litre', created_at: '2026-01-01', updated_at: '2026-01-01' },
  { id: 'std-19', car_type: 'Bolero B6', fuel_type: 'Diesel', standard_value: 17, mileage_type: 'KM per Litre', unit: 'km/litre', created_at: '2026-01-01', updated_at: '2026-01-01' },
  { id: 'std-20', car_type: 'Mahindra Bolero', fuel_type: 'Diesel', standard_value: 17, mileage_type: 'KM per Litre', unit: 'km/litre', created_at: '2026-01-01', updated_at: '2026-01-01' },
  { id: 'std-21', car_type: 'Bolero Camper', fuel_type: 'CNG', standard_value: 13, mileage_type: 'KM per Litre', unit: 'km/litre', created_at: '2026-01-01', updated_at: '2026-01-01' },
  { id: 'std-22', car_type: 'Verna', fuel_type: 'CNG', standard_value: 4.7, mileage_type: 'Cost per KM', unit: '₹ per km', created_at: '2026-01-01', updated_at: '2026-01-01' },
  { id: 'std-23', car_type: 'Verna', fuel_type: 'CNG/Petrol', standard_value: 4.7, mileage_type: 'Cost per KM', unit: '₹ per km', created_at: '2026-01-01', updated_at: '2026-01-01' },
  { id: 'std-24', car_type: 'Hyundai Verna', fuel_type: 'CNG/Petrol', standard_value: 4.7, mileage_type: 'Cost per KM', unit: '₹ per km', created_at: '2026-01-01', updated_at: '2026-01-01' },
  { id: 'std-25', car_type: 'Honda City', fuel_type: 'Petrol', standard_value: 18, mileage_type: 'KM per Litre', unit: 'km/litre', created_at: '2026-01-01', updated_at: '2026-01-01' },
  { id: 'std-26', car_type: 'Glanza', fuel_type: 'Petrol', standard_value: 18, mileage_type: 'KM per Litre', unit: 'km/litre', created_at: '2026-01-01', updated_at: '2026-01-01' },
  { id: 'std-27', car_type: 'GRAND VITARA', fuel_type: 'Petrol', standard_value: 16, mileage_type: 'KM per Litre', unit: 'km/litre', created_at: '2026-01-01', updated_at: '2026-01-01' },
  { id: 'std-28', car_type: 'KIA CARENS', fuel_type: 'Diesel', standard_value: 17, mileage_type: 'KM per Litre', unit: 'km/litre', created_at: '2026-01-01', updated_at: '2026-01-01' },
  { id: 'std-29', car_type: 'Maruti Eeco', fuel_type: 'CNG/Petrol', standard_value: 16, mileage_type: 'KM per Litre', unit: 'km/litre', created_at: '2026-01-01', updated_at: '2026-01-01' },
  { id: 'std-30', car_type: 'Ashok Leyland 12M Coach', fuel_type: 'CNG/Petrol', standard_value: 4.5, mileage_type: 'Cost per KM', unit: '₹ per km', created_at: '2026-01-01', updated_at: '2026-01-01' },
];

const usersList = [
  { id: 'usr-1', name: 'Fleet Director', email: 'lrtaxiservice@gmail.com', role: 'Admin' },
  { id: 'usr-2', name: 'Fleet Operations', email: 'operations@lrtaxi.in', role: 'Operations' },
  { id: 'usr-3', name: 'Accounts Manager', email: 'accounts@lrtaxi.in', role: 'Accounts' },
  { id: 'usr-4', name: 'Fleet Management', email: 'mgmt@lrtaxi.in', role: 'Management' },
  { id: 'usr-5', name: 'Fleet Viewer', email: 'viewer@lrtaxi.in', role: 'Viewer' },
];

const generatedCode = `import { Vehicle, VehicleMileageStandard, GPSDailyKM, FuelRecord, IGLCard, UserAccount, FleetAlert, AuditLog, FuelType } from '../types/fleet';
import { normalizeRegNo } from '../utils/normalize';
import { REFRESHED_FUEL_RECORDS } from './refreshedFuelRecords';

export const INITIAL_MILEAGE_STANDARDS: VehicleMileageStandard[] = ${JSON.stringify(standardsList, null, 2)};

export const INITIAL_USERS: UserAccount[] = ${JSON.stringify(usersList, null, 2)};

export function generateInitialFleet(): {
  vehicles: Vehicle[];
  gpsRecords: GPSDailyKM[];
  fuelRecords: FuelRecord[];
  iglCards: IGLCard[];
  alerts: FleetAlert[];
  auditLogs: AuditLog[];
} {
  const vehicles: Vehicle[] = ${JSON.stringify(vehiclesList, null, 2)};
  const gpsRecords: GPSDailyKM[] = ${JSON.stringify(gpsRecordsList, null, 2)};
  const iglCards: IGLCard[] = ${JSON.stringify(iglCardsList, null, 2)};
  const alerts: FleetAlert[] = [];
  const auditLogs: AuditLog[] = [
    {
      id: 'log-1',
      timestamp: '2026-09-17T09:00:00.000Z',
      user: 'Fleet Director',
      action: 'MOSFET_GPS_FLEET_SYNC',
      details: 'Initialized 422 Mosfet GPS fleet vehicles. Excluded Electric vehicles from fuel mileage calculations.'
    }
  ];

  const vehMap = new Map<string, Vehicle>();
  vehicles.forEach(v => vehMap.set(v.normalized_reg, v));

  const fuelRecords: FuelRecord[] = REFRESHED_FUEL_RECORDS.map(rec => {
    const matchedVeh = vehMap.get(rec.normalized_reg);
    return {
      ...rec,
      vehicle_id: matchedVeh ? matchedVeh.id : rec.vehicle_id,
      car_type: matchedVeh ? matchedVeh.vehicle_type : rec.car_type,
      igl_card_number: matchedVeh?.igl_card_number || rec.igl_card_number,
    };
  });

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

fs.writeFileSync('src/data/seedFleetData.ts', generatedCode, 'utf8');
console.log('Successfully generated src/data/seedFleetData.ts!');
console.log('Vehicles:', vehiclesList.length);
console.log('GPS Records:', gpsRecordsList.length);
console.log('Combustion Standards:', standardsList.length);
