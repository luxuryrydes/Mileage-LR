export type FuelType = 'CNG' | 'Petrol' | 'Diesel' | 'Electric' | 'CNG/Petrol' | 'Petrol Hybrid';

export type VehicleStatus = 'Active' | 'Inactive' | 'Sold' | 'Under Maintenance';

export type MileageType = 'KM per Litre' | 'Cost per KM';

export type VehicleType = string;

export type OwnerType = 'Owned' | 'Attached' | 'Leased' | 'Company Owned' | 'Dedicated';

export interface Vehicle {
  id: string;
  registration_number: string;
  normalized_reg: string;
  vehicle_name?: string;
  gps_vendor?: string;
  vehicle_type: string; // e.g., Ciaz, Dzire, Innova, Bolero B6, Hycross, MG ZS EV
  make: string;
  model: string;
  variant?: string;
  fuel_type: FuelType;
  manufacturing_year: number;
  purchase_date?: string;
  owner_type: OwnerType;
  vendor?: string;
  vendor_name?: string;
  driver?: string;
  driver_phone?: string;
  gps_device_id?: string;
  gps_imei?: string;
  gps_device_imei?: string;
  gps_status?: string;
  igl_card_number?: string;
  igl_smart_card_number?: string;
  fuel_tank_capacity?: number; // Litres or Kg or kWh
  fuel_tank_capacity_l?: number;
  standard_mileage?: number;
  monthly_target_km?: number;
  status: VehicleStatus;
  created_at: string;
  updated_at: string;
}

export interface VehicleMileageStandard {
  id: string;
  car_type: string;
  fuel_type: FuelType;
  standard_value: number;
  mileage_type: MileageType;
  unit: 'km/litre' | '₹ per km' | '₹/km' | 'km/kg' | 'km/kWh';
  created_at: string;
  updated_at: string;
}

export interface GPSCorrection {
  id: string;
  previous_value: number;
  new_value: number;
  user: string;
  timestamp: string;
  reason: string;
}

export interface GPSDailyKM {
  id: string;
  vehicle_id: string;
  registration_number: string;
  normalized_reg: string;
  date: string; // YYYY-MM-DD
  gps_device_imei: string;
  opening_km: number;
  closing_km: number;
  daily_gps_km: number;
  source: 'API' | 'Manual Upload' | 'Manual Correction';
  created_at: string;
  updated_at: string;
  correction_history?: GPSCorrection[];
}

export interface FuelRecord {
  id: string;
  vehicle_id: string;
  registration_number: string;
  normalized_reg: string;
  car_type: string;
  date: string; // YYYY-MM-DD
  fuel_type: FuelType;
  quantity: number; // Litres or Kg or kWh
  rate: number; // Price per unit
  total_amount: number; // Qty * Rate
  fuel_station?: string;
  receipt_number?: string;
  igl_card_number?: string;
  driver?: string;
  odometer?: number;
  payment_mode: 'Cash' | 'Card' | 'GPay' | 'IGL Smart Card' | 'BPCL Fleet' | 'Credit';
  payment_reference?: string;
  source: 'Manual' | 'IGL Import' | 'BPCL' | 'OCR Scan' | 'Smart Card Sheet' | 'GPay Upload';
  remarks?: string;
  created_at: string;
}

export interface IGLCard {
  id: string;
  card_number: string;
  vehicle_registration?: string;
  linked_vehicle_reg?: string;
  normalized_reg?: string;
  assigned_driver?: string;
  balance?: number;
  balance_amount?: number;
  monthly_limit: number;
  status: 'Active' | 'Blocked' | 'Expired';
  last_used_date?: string;
}

export type IGLSmartCard = IGLCard;

export interface AuditLog {
  id: string;
  user: string;
  user_name?: string;
  role?: string;
  action: string;
  entity_type?: string;
  entity_id?: string;
  old_value?: string;
  new_value?: string;
  reason?: string;
  details?: string;
  timestamp: string;
}

export interface FleetAlert {
  id: string;
  vehicle_id?: string;
  vehicle_registration?: string;
  registration_number?: string;
  car_type?: string;
  title?: string;
  description?: string;
  type: string;
  severity: 'Warning' | 'Critical' | 'Info' | 'CRITICAL' | 'HIGH' | 'MEDIUM';
  message?: string;
  date: string;
  status?: string;
  resolved?: boolean;
  metric_value?: string;
}

export type UserRole = 'Admin' | 'Operations' | 'Accounts' | 'Management' | 'Viewer';

export interface UserAccount {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar?: string;
}

export interface MonthlyVehiclePerformance {
  vehicle_id: string;
  registration_number: string;
  car_type: string;
  fuel_type: FuelType;
  distance_km: number;
  date_range_label: string; // e.g. "01 Sept — 16 Sept"
  fuel_quantity: number;
  fuel_unit: string; // kg, L, kWh
  fuel_cost: number;
  physical_mileage: number; // km/kg, km/L, km/kWh
  actual_cost_per_km: number; // ₹/km
  mileage_type: MileageType;
  standard_value: number;
  standard_unit: string;
  variance_pct: number;
  status: 'On Target' | 'Needs Attention' | 'Above Standard' | 'Below Standard' | 'No Data';
  is_below_average: boolean;
  gps_records_count: number;
  fuel_records_count: number;
}
