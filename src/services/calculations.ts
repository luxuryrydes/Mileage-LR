import {
  Vehicle,
  VehicleMileageStandard,
  GPSDailyKM,
  FuelRecord,
  MonthlyVehiclePerformance,
  MileageType,
} from '../types/fleet';

/**
 * Find the matching standard for a vehicle's car type and fuel type
 */
export function findVehicleStandard(
  carType: string,
  fuelType: string,
  standards: VehicleMileageStandard[]
): VehicleMileageStandard | undefined {
  const normType = (carType || '').trim().toLowerCase();
  const normFuel = (fuelType || '').trim().toLowerCase();

  // 1. Direct exact match
  let matched = standards.find(
    s => s.car_type.toLowerCase() === normType && s.fuel_type.toLowerCase() === normFuel
  );

  if (matched) return matched;

  // 2. Partial car type match
  matched = standards.find(
    s =>
      (normType.includes(s.car_type.toLowerCase()) || s.car_type.toLowerCase().includes(normType)) &&
      (normFuel.includes(s.fuel_type.toLowerCase()) || s.fuel_type.toLowerCase().includes(normFuel))
  );

  if (matched) return matched;

  // 3. Fallback by car type alone
  matched = standards.find(s => normType.includes(s.car_type.toLowerCase()));
  return matched;
}

/**
 * Calculates single vehicle monthly performance
 */
export function calculateVehicleMonthlyPerformance(
  vehicle: Vehicle,
  allGpsRecords: GPSDailyKM[],
  allFuelRecords: FuelRecord[],
  standards: VehicleMileageStandard[],
  selectedMonth: string // YYYY-MM
): MonthlyVehiclePerformance {
  const vehNorm = (vehicle.normalized_reg || (vehicle.registration_number || '').replace(/[\s\-_.]+/g, '')).toUpperCase();

  const vehicleGps = allGpsRecords.filter(
    g => {
      const gNorm = (g.normalized_reg || (g.registration_number || '').replace(/[\s\-_.]+/g, '')).toUpperCase();
      return gNorm === vehNorm && typeof g.date === 'string' && g.date.startsWith(selectedMonth);
    }
  );
  const vehicleFuel = allFuelRecords.filter(
    f => {
      const fNorm = (f.normalized_reg || (f.registration_number || '').replace(/[\s\-_.]+/g, '')).toUpperCase();
      return fNorm === vehNorm && typeof f.date === 'string' && f.date.startsWith(selectedMonth);
    }
  );

  // Total GPS KM
  const totalGpsKm = Math.round(
    vehicleGps.reduce((sum, r) => sum + (Number(r.daily_gps_km) || 0), 0) * 10
  ) / 10;

  // Total Fuel Quantity & Fuel Cost
  const totalFuelQty = Math.round(
    vehicleFuel.reduce((sum, r) => sum + (Number(r.quantity) || 0), 0) * 100
  ) / 100;
  const totalFuelCost = Math.round(
    vehicleFuel.reduce((sum, r) => sum + (Number(r.total_amount) || 0), 0)
  );

  // Date range label: e.g. "01 Sept — 16 Sept"
  let dateRangeLabel = 'No Activity';
  if (vehicleGps.length > 0) {
    const dates = vehicleGps
      .map(g => g.date)
      .filter((d): d is string => typeof d === 'string' && d.length >= 8)
      .sort();
    if (dates.length > 0) {
      const parseLocalDate = (dStr: string) => {
        const parts = dStr.split('-').map(Number);
        if (parts.length >= 3 && !isNaN(parts[0]) && !isNaN(parts[1]) && !isNaN(parts[2])) {
          return new Date(parts[0], parts[1] - 1, parts[2]);
        }
        return new Date(dStr);
      };
      const firstDate = parseLocalDate(dates[0]);
      const lastDate = parseLocalDate(dates[dates.length - 1]);
      if (!isNaN(firstDate.getTime()) && !isNaN(lastDate.getTime())) {
        const fDay = String(firstDate.getDate()).padStart(2, '0');
        const lDay = String(lastDate.getDate()).padStart(2, '0');
        const monthName = firstDate.toLocaleString('default', { month: 'short' });
        dateRangeLabel = `${fDay} ${monthName} — ${lDay} ${monthName}`;
      }
    }
  }

  // Determine standard
  const standard = findVehicleStandard(vehicle.vehicle_type, vehicle.fuel_type, standards);
  const mileageType: MileageType = standard ? standard.mileage_type : (vehicle.fuel_type === 'CNG' ? 'Cost per KM' : 'KM per Litre');
  const standardValue = standard ? standard.standard_value : (mileageType === 'Cost per KM' ? 5.7 : 14.0);
  const standardUnit = standard ? standard.unit : (mileageType === 'Cost per KM' ? '₹/km' : 'km/litre');

  // Physical mileage: GPS KM / Fuel Quantity
  const physicalMileage = totalFuelQty > 0 && totalGpsKm > 0
    ? Math.round((totalGpsKm / totalFuelQty) * 100) / 100
    : 0;

  // Actual Cost per KM: Fuel Cost / GPS KM
  const actualCostPerKm = totalGpsKm > 0 && totalFuelCost > 0
    ? Math.round((totalFuelCost / totalGpsKm) * 100) / 100
    : 0;

  // Fuel unit display (kg for CNG, L for petrol/diesel, kWh for electric)
  const fuelUnit = vehicle.fuel_type === 'CNG' ? 'kg' : (vehicle.fuel_type === 'Electric' ? 'kWh' : 'L');

  // Calculate Variance and Status according to Mileage Type
  let variancePct = 0;
  let status: MonthlyVehiclePerformance['status'] = 'No Data';

  if (totalGpsKm === 0 || (totalFuelQty === 0 && totalFuelCost === 0)) {
    status = 'No Data';
  } else if (mileageType === 'Cost per KM') {
    if (actualCostPerKm > 0 && standardValue > 0) {
      variancePct = Math.round(((actualCostPerKm - standardValue) / standardValue) * 1000) / 10;
      if (variancePct > 0.05) {
        status = 'Needs Attention'; // Cost exceeds budget
      } else {
        status = 'On Target'; // On or below standard cost
      }
    }
  } else {
    if (physicalMileage > 0 && standardValue > 0) {
      variancePct = Math.round(((physicalMileage - standardValue) / standardValue) * 1000) / 10;
      if (variancePct < -2.0) {
        status = 'Needs Attention'; // Mileage is under-performing
      } else {
        status = 'On Target';
      }
    }
  }

  return {
    vehicle_id: vehicle.id,
    registration_number: vehicle.registration_number,
    car_type: vehicle.vehicle_type,
    fuel_type: vehicle.fuel_type,
    distance_km: totalGpsKm,
    date_range_label: dateRangeLabel,
    fuel_quantity: totalFuelQty,
    fuel_unit: fuelUnit,
    fuel_cost: totalFuelCost,
    physical_mileage: physicalMileage,
    actual_cost_per_km: actualCostPerKm,
    mileage_type: mileageType,
    standard_value: standardValue,
    standard_unit: standardUnit,
    variance_pct: variancePct,
    status,
    is_below_average: status === 'Needs Attention',
    gps_records_count: vehicleGps.length,
    fuel_records_count: vehicleFuel.length,
  };
}

/**
 * Calculates monthly performance for single vehicle OR an array of vehicles
 */
export function calculateMonthlyPerformance(
  vehicleOrVehicles: Vehicle[],
  allGpsRecords: GPSDailyKM[],
  allFuelRecords: FuelRecord[],
  standards: VehicleMileageStandard[],
  selectedMonth: string
): MonthlyVehiclePerformance[];
export function calculateMonthlyPerformance(
  vehicleOrVehicles: Vehicle,
  allGpsRecords: GPSDailyKM[],
  allFuelRecords: FuelRecord[],
  standards: VehicleMileageStandard[],
  selectedMonth: string
): MonthlyVehiclePerformance;
export function calculateMonthlyPerformance(
  vehicleOrVehicles: Vehicle[] | Vehicle,
  allGpsRecords: GPSDailyKM[],
  allFuelRecords: FuelRecord[],
  standards: VehicleMileageStandard[],
  selectedMonth: string
): any {
  if (Array.isArray(vehicleOrVehicles)) {
    // User requirement: Only mileage of Petrol, Diesel, CNG, or CNG/Petrol vehicle types (excluding Electric)
    const combustionVehicles = vehicleOrVehicles.filter(v => v.fuel_type !== 'Electric');
    return combustionVehicles.map(v =>
      calculateVehicleMonthlyPerformance(v, allGpsRecords, allFuelRecords, standards, selectedMonth)
    );
  }
  return calculateVehicleMonthlyPerformance(
    vehicleOrVehicles,
    allGpsRecords,
    allFuelRecords,
    standards,
    selectedMonth
  );
}

/**
 * High-level fleet metrics for top bar
 */
export function calculateFleetSummaryMetrics(
  vehicles: Vehicle[],
  performanceList: MonthlyVehiclePerformance[],
  allFuelRecords: FuelRecord[],
  selectedMonth: string
) {
  const combustionVehicles = vehicles.filter(v => v.fuel_type !== 'Electric');
  const electricVehicles = vehicles.filter(v => v.fuel_type === 'Electric');
  const totalVehicles = combustionVehicles.length;
  const totalFleetCount = vehicles.length;
  const electricCount = electricVehicles.length;
  const monthlyGpsKm = Math.round(performanceList.reduce((sum, p) => sum + (p.distance_km || 0), 0) * 10) / 10;
  const totalFuelCost = Math.round(performanceList.reduce((sum, p) => sum + (p.fuel_cost || 0), 0));
  const activeMileageList = performanceList.filter(p => p.physical_mileage > 0);
  const fleetAvgMileage = activeMileageList.length > 0
    ? Math.round((activeMileageList.reduce((sum, p) => sum + p.physical_mileage, 0) / activeMileageList.length) * 10) / 10
    : 16.5;
  const gpayTxnCount = allFuelRecords.filter(
    f => typeof f.date === 'string' && f.date.startsWith(selectedMonth) && f.payment_mode === 'GPay'
  ).length;

  return {
    totalVehicles,
    totalFleetCount,
    electricCount,
    monthlyGpsKm,
    totalFuelCost,
    fleetAvgMileage,
    gpayTxnCount,
  };
}
