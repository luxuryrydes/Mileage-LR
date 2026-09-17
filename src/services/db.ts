import {
  Vehicle,
  VehicleMileageStandard,
  GPSDailyKM,
  FuelRecord,
  IGLCard,
  FleetAlert,
  AuditLog,
  UserAccount,
  UserRole,
} from '../types/fleet';
import { normalizeRegNo } from '../utils/normalize';
import {
  INITIAL_MILEAGE_STANDARDS,
  INITIAL_USERS,
  generateInitialFleet,
} from '../data/seedFleetData';

const STORAGE_KEYS = {
  VEHICLES: 'mileage_soft_vehicles_v4',
  GPS: 'mileage_soft_gps_v4',
  FUEL: 'mileage_soft_fuel_v4',
  STANDARDS: 'mileage_soft_standards_v4',
  IGL_CARDS: 'mileage_soft_igl_v4',
  ALERTS: 'mileage_soft_alerts_v4',
  AUDIT_LOGS: 'mileage_soft_audit_v4',
  USERS: 'mileage_soft_users_v4',
  ACTIVE_USER: 'mileage_soft_active_user_v4',
};

class FleetDatabase {
  private vehicles: Vehicle[] = [];
  private gpsRecords: GPSDailyKM[] = [];
  private fuelRecords: FuelRecord[] = [];
  private standards: VehicleMileageStandard[] = [];
  private iglCards: IGLCard[] = [];
  private alerts: FleetAlert[] = [];
  private auditLogs: AuditLog[] = [];
  private users: UserAccount[] = [];
  private currentUser: UserAccount = INITIAL_USERS[0];
  private isInitialized = false;

  constructor() {
    this.init();
  }

  private init() {
    try {
      if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
        const storedVehicles = localStorage.getItem(STORAGE_KEYS.VEHICLES);
        if (storedVehicles) {
          this.vehicles = JSON.parse(storedVehicles);
          this.gpsRecords = JSON.parse(localStorage.getItem(STORAGE_KEYS.GPS) || '[]');
          this.fuelRecords = JSON.parse(localStorage.getItem(STORAGE_KEYS.FUEL) || '[]');
          this.standards = JSON.parse(localStorage.getItem(STORAGE_KEYS.STANDARDS) || JSON.stringify(INITIAL_MILEAGE_STANDARDS));
          this.iglCards = JSON.parse(localStorage.getItem(STORAGE_KEYS.IGL_CARDS) || '[]');
          this.alerts = JSON.parse(localStorage.getItem(STORAGE_KEYS.ALERTS) || '[]');
          this.auditLogs = JSON.parse(localStorage.getItem(STORAGE_KEYS.AUDIT_LOGS) || '[]');
          this.users = JSON.parse(localStorage.getItem(STORAGE_KEYS.USERS) || JSON.stringify(INITIAL_USERS));
          const activeUser = localStorage.getItem(STORAGE_KEYS.ACTIVE_USER);
          if (activeUser) {
            this.currentUser = JSON.parse(activeUser);
          }

          // Auto-upgrade if records are fewer than user provided sheet (1,356 records) or vehicle count != 422 or drivers present or missing 16-digit IGL cards
          const hasDrivers = this.vehicles.some(v => !!(v as any).driver);
          const has16DigitCards = this.iglCards.some(c => c.card_number && c.card_number.startsWith('701021'));
          if (this.fuelRecords.length < 1000 || this.vehicles.length < 420 || hasDrivers || !has16DigitCards) {
            this.seedInitialData();
          }
        } else {
          this.seedInitialData();
        }
      } else {
        this.seedInitialData();
      }
    } catch (e) {
      console.error('Error loading fleet database, resetting to seeds:', e);
      this.seedInitialData();
    }
    this.isInitialized = true;
  }

  public seedInitialData() {
    const seed = generateInitialFleet();
    this.vehicles = seed.vehicles;
    this.gpsRecords = seed.gpsRecords;
    this.fuelRecords = seed.fuelRecords;
    this.standards = [...INITIAL_MILEAGE_STANDARDS];
    this.iglCards = seed.iglCards;
    this.alerts = seed.alerts;
    this.auditLogs = seed.auditLogs;
    this.users = [...INITIAL_USERS];
    this.currentUser = this.users[0];
    this.persistAll();
  }

  private persistAll() {
    if (typeof window === 'undefined' || typeof localStorage === 'undefined') return;
    try {
      localStorage.setItem(STORAGE_KEYS.VEHICLES, JSON.stringify(this.vehicles));
      localStorage.setItem(STORAGE_KEYS.GPS, JSON.stringify(this.gpsRecords));
      localStorage.setItem(STORAGE_KEYS.FUEL, JSON.stringify(this.fuelRecords));
      localStorage.setItem(STORAGE_KEYS.STANDARDS, JSON.stringify(this.standards));
      localStorage.setItem(STORAGE_KEYS.IGL_CARDS, JSON.stringify(this.iglCards));
      localStorage.setItem(STORAGE_KEYS.ALERTS, JSON.stringify(this.alerts));
      localStorage.setItem(STORAGE_KEYS.AUDIT_LOGS, JSON.stringify(this.auditLogs));
      localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(this.users));
      localStorage.setItem(STORAGE_KEYS.ACTIVE_USER, JSON.stringify(this.currentUser));
    } catch (e) {
      console.warn('Storage quota reached in localStorage, maintaining state in-memory:', e);
    }
  }

  // --- Users & Roles ---
  public getCurrentUser(): UserAccount {
    return this.currentUser;
  }

  public setCurrentUser(user: UserAccount) {
    this.currentUser = user;
    localStorage.setItem(STORAGE_KEYS.ACTIVE_USER, JSON.stringify(user));
  }

  public getUsers(): UserAccount[] {
    return [...this.users];
  }

  public updateUserRole(userId: string, role: UserRole) {
    const u = this.users.find(x => x.id === userId);
    if (u) {
      u.role = role;
      if (this.currentUser.id === userId) this.currentUser.role = role;
      this.persistAll();
    }
  }

  // --- Vehicles ---
  public getVehicles(): Vehicle[] {
    return [...this.vehicles];
  }

  public getVehicleByReg(regNo: string): Vehicle | undefined {
    const norm = normalizeRegNo(regNo);
    return this.vehicles.find(v => v.normalized_reg === norm);
  }

  public addVehicle(data: Omit<Vehicle, 'id' | 'normalized_reg' | 'created_at' | 'updated_at'>): { success: boolean; message: string; vehicle?: Vehicle } {
    const norm = normalizeRegNo(data.registration_number);
    if (!norm) return { success: false, message: 'Invalid registration number' };

    if (this.vehicles.some(v => v.normalized_reg === norm)) {
      return { success: false, message: `Vehicle ${data.registration_number} already exists (Normalized: ${norm})` };
    }

    const newVehicle: Vehicle = {
      ...data,
      id: `veh-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      normalized_reg: norm,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    this.vehicles.unshift(newVehicle);
    this.addAuditLog({
      user: this.currentUser.name,
      action: 'Create Vehicle',
      entity_type: 'Vehicle',
      entity_id: newVehicle.id,
      new_value: `${newVehicle.registration_number} (${newVehicle.vehicle_type} ${newVehicle.fuel_type})`,
      reason: 'Vehicle Master onboarding',
    });
    this.persistAll();
    return { success: true, message: 'Vehicle added successfully', vehicle: newVehicle };
  }

  public updateVehicle(id: string, updates: Partial<Vehicle>): boolean {
    const idx = this.vehicles.findIndex(v => v.id === id);
    if (idx === -1) return false;

    const old = { ...this.vehicles[idx] };
    const norm = updates.registration_number ? normalizeRegNo(updates.registration_number) : old.normalized_reg;

    this.vehicles[idx] = {
      ...old,
      ...updates,
      normalized_reg: norm,
      updated_at: new Date().toISOString(),
    };

    this.addAuditLog({
      user: this.currentUser.name,
      action: 'Update Vehicle',
      entity_type: 'Vehicle',
      entity_id: id,
      old_value: JSON.stringify(old),
      new_value: JSON.stringify(this.vehicles[idx]),
      reason: 'Vehicle Master details update',
    });
    this.persistAll();
    return true;
  }

  public deleteVehicle(id: string): boolean {
    const idx = this.vehicles.findIndex(v => v.id === id);
    if (idx === -1) return false;
    const removed = this.vehicles.splice(idx, 1)[0];

    this.addAuditLog({
      user: this.currentUser.name,
      action: 'Delete Vehicle',
      entity_type: 'Vehicle',
      entity_id: id,
      old_value: removed.registration_number,
      reason: 'Removed from fleet database',
    });
    this.persistAll();
    return true;
  }

  // --- GPS Daily KM (Advance Form / GPS Module: Single source of GPS truth) ---
  public getGpsRecords(): GPSDailyKM[] {
    return [...this.gpsRecords];
  }

  public addGpsRecord(record: Omit<GPSDailyKM, 'id' | 'created_at' | 'updated_at'>): { success: boolean; message: string } {
    const norm = normalizeRegNo(record.registration_number);
    const existingIndex = this.gpsRecords.findIndex(
      g => g.normalized_reg === norm && g.date === record.date
    );

    if (existingIndex >= 0) {
      return { success: false, message: `GPS record already exists for ${record.registration_number} on ${record.date}` };
    }

    const newRecord: GPSDailyKM = {
      ...record,
      id: `gps-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      normalized_reg: norm,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    this.gpsRecords.unshift(newRecord);
    this.persistAll();
    return { success: true, message: 'GPS KM logged successfully' };
  }

  public correctGpsRecord(
    id: string,
    newKm: number,
    reason: string
  ): { success: boolean; message: string } {
    const record = this.gpsRecords.find(g => g.id === id);
    if (!record) return { success: false, message: 'GPS record not found' };

    const prevValue = record.daily_gps_km;
    const correction = {
      id: `corr-${Date.now()}`,
      previous_value: prevValue,
      new_value: newKm,
      user: this.currentUser.name,
      timestamp: new Date().toISOString(),
      reason,
    };

    record.daily_gps_km = newKm;
    record.closing_km = record.opening_km + newKm;
    record.source = 'Manual Correction';
    record.updated_at = new Date().toISOString();
    if (!record.correction_history) record.correction_history = [];
    record.correction_history.push(correction);

    this.addAuditLog({
      user: this.currentUser.name,
      action: 'Manual GPS Correction',
      entity_type: 'GPS',
      entity_id: id,
      old_value: `${prevValue} KM`,
      new_value: `${newKm} KM`,
      reason: `${reason} (Vehicle: ${record.registration_number}, Date: ${record.date})`,
    });

    this.persistAll();
    return { success: true, message: 'GPS KM corrected successfully with audit log' };
  }

  public bulkImportGps(
    rows: Array<{
      regNo: string;
      date: string;
      dailyKm: number;
      openingKm?: number;
      closingKm?: number;
      imei?: string;
    }>
  ): {
    totalUploaded: number;
    inserted: number;
    updated: number;
    duplicates: number;
    unknownVehicles: number;
    invalidRecords: number;
    errors: string[];
    rejectedRows: any[];
  } {
    let inserted = 0;
    let updated = 0;
    let duplicates = 0;
    let unknownVehicles = 0;
    let invalidRecords = 0;
    const errors: string[] = [];
    const rejectedRows: any[] = [];

    const nowStr = new Date().toISOString();

    for (const row of rows) {
      const norm = normalizeRegNo(row.regNo);
      if (!norm || isNaN(row.dailyKm) || !row.date) {
        invalidRecords++;
        errors.push(`Row with empty vehicle or invalid KM on ${row.date || 'unknown date'}`);
        rejectedRows.push({ ...row, reason: 'Invalid or missing fields' });
        continue;
      }

      if (row.dailyKm < 0) {
        invalidRecords++;
        errors.push(`${row.regNo} — Negative KM detected: ${row.dailyKm}`);
        rejectedRows.push({ ...row, reason: 'Negative KM' });
        continue;
      }

      if (row.dailyKm > 800) {
        // High KM warning/abnormal check
        this.alerts.unshift({
          id: `alt-${Date.now()}-${Math.random()}`,
          vehicle_registration: row.regNo,
          type: 'GPS',
          severity: 'Warning',
          message: `Unusually high GPS KM (${row.dailyKm} KM) imported on ${row.date}`,
          date: row.date,
          resolved: false,
          metric_value: `${row.dailyKm} KM`,
        });
      }

      // Check if vehicle exists in master
      const matchedVeh = this.vehicles.find(v => v.normalized_reg === norm);
      if (!matchedVeh) {
        unknownVehicles++;
        errors.push(`${row.regNo} — Vehicle not found in Vehicle Master`);
        rejectedRows.push({ ...row, reason: 'Unknown vehicle (not in master)' });
        continue;
      }

      // Check for existing record
      const existingIdx = this.gpsRecords.findIndex(
        g => g.normalized_reg === norm && g.date === row.date
      );

      if (existingIdx >= 0) {
        // Update existing record
        const oldRec = this.gpsRecords[existingIdx];
        if (oldRec.daily_gps_km === row.dailyKm) {
          duplicates++;
          errors.push(`${row.regNo} — Duplicate record for ${row.date} (${row.dailyKm} KM already recorded)`);
        } else {
          updated++;
          this.gpsRecords[existingIdx].daily_gps_km = row.dailyKm;
          this.gpsRecords[existingIdx].closing_km = (oldRec.opening_km || 0) + row.dailyKm;
          this.gpsRecords[existingIdx].source = 'Manual Upload';
          this.gpsRecords[existingIdx].updated_at = nowStr;
        }
      } else {
        // Insert new record
        inserted++;
        const opening = row.openingKm ?? 50000;
        const closing = row.closingKm ?? opening + row.dailyKm;
        this.gpsRecords.push({
          id: `gps-imp-${Date.now()}-${Math.floor(Math.random() * 100000)}`,
          vehicle_id: matchedVeh.id,
          registration_number: matchedVeh.registration_number,
          normalized_reg: norm,
          date: row.date,
          gps_device_imei: row.imei || matchedVeh.gps_imei || '860434051000001',
          opening_km: opening,
          closing_km: closing,
          daily_gps_km: row.dailyKm,
          source: 'Manual Upload',
          created_at: nowStr,
          updated_at: nowStr,
        });
      }
    }

    this.addAuditLog({
      user: this.currentUser.name,
      action: 'GPS Excel/CSV Import',
      entity_type: 'Import',
      entity_id: `batch-${Date.now()}`,
      new_value: `Processed ${rows.length} rows: ${inserted} inserted, ${updated} updated, ${duplicates} duplicates, ${unknownVehicles} unknown`,
      reason: 'Advance Form / GPS Module bulk upload',
    });

    this.persistAll();

    return {
      totalUploaded: rows.length,
      inserted,
      updated,
      duplicates,
      unknownVehicles,
      invalidRecords,
      errors,
      rejectedRows,
    };
  }

  // --- Fuel Records ---
  public getFuelRecords(): FuelRecord[] {
    return [...this.fuelRecords];
  }

  /**
   * Check if a candidate fuel transaction already exists in the fleet records.
   * Prevents re-uploading or duplicating existing fuel entries.
   */
  public isDuplicateFuelRecord(
    candidate: {
      registration_number: string;
      normalized_reg?: string;
      date: string;
      quantity: number;
      rate?: number;
      total_amount?: number;
      receipt_number?: string;
      payment_reference?: string;
      igl_card_number?: string;
    },
    pool: FuelRecord[] = this.fuelRecords
  ): { isDuplicate: boolean; matchedRecord?: FuelRecord; reason?: string } {
    const norm = candidate.normalized_reg || normalizeRegNo(candidate.registration_number);
    const candDate = candidate.date ? String(candidate.date).slice(0, 10) : '';
    const candCard = candidate.igl_card_number ? candidate.igl_card_number.replace(/[\s\-_.]+/g, '') : '';
    const candAmount = candidate.total_amount ?? (candidate.quantity && candidate.rate ? Math.round(candidate.quantity * candidate.rate * 100) / 100 : undefined);
    const candReceipt = candidate.receipt_number?.trim();
    const candRef = candidate.payment_reference?.trim();

    for (const ex of pool) {
      const exDate = ex.date ? String(ex.date).slice(0, 10) : '';
      const exNorm = ex.normalized_reg;
      const exCard = ex.igl_card_number ? ex.igl_card_number.replace(/[\s\-_.]+/g, '') : '';

      // 1. Direct Receipt Number or Payment Reference collision
      if (candReceipt && ex.receipt_number && candReceipt.toLowerCase() === ex.receipt_number.trim().toLowerCase()) {
        return { isDuplicate: true, matchedRecord: ex, reason: `Matching invoice/receipt #${candReceipt}` };
      }
      if (candRef && ex.payment_reference && candRef.toLowerCase() === ex.payment_reference.trim().toLowerCase()) {
        return { isDuplicate: true, matchedRecord: ex, reason: `Matching payment ref ${candRef}` };
      }

      // 2. Vehicle match (by normalized registration or 16-digit card number)
      const vehicleMatches = (norm && exNorm === norm) || (candCard && exCard && candCard === exCard);
      if (!vehicleMatches) continue;

      // 3. Date match
      if (candDate && exDate && candDate !== exDate) continue;

      // 4. Quantity match (within 0.05 tolerance) or Total Amount match (within ₹2 tolerance)
      const qtyDiff = Math.abs(ex.quantity - candidate.quantity);
      const isQtyMatch = qtyDiff < 0.05;

      let isAmountMatch = false;
      if (candAmount !== undefined && ex.total_amount !== undefined) {
        isAmountMatch = Math.abs(ex.total_amount - candAmount) < 2.0;
      }

      if (isQtyMatch || isAmountMatch) {
        return {
          isDuplicate: true,
          matchedRecord: ex,
          reason: `Existing entry on ${exDate} for ${ex.registration_number} (${ex.quantity} kg/L, ₹${ex.total_amount})`,
        };
      }
    }

    return { isDuplicate: false };
  }

  public addFuelRecord(data: Omit<FuelRecord, 'id' | 'normalized_reg' | 'created_at'>): { success: boolean; message: string; record?: FuelRecord; isDuplicate?: boolean } {
    const norm = normalizeRegNo(data.registration_number);
    if (!norm) return { success: false, message: 'Invalid registration number' };

    const totalAmount = Math.round((data.quantity * data.rate) * 100) / 100;

    // Check against existence data to prevent duplicate entry
    const dup = this.isDuplicateFuelRecord({ ...data, normalized_reg: norm, total_amount: totalAmount });
    if (dup.isDuplicate) {
      return {
        success: false,
        isDuplicate: true,
        message: `Duplicate prevented: A fuel expense record already exists for ${data.registration_number} on ${data.date} (${dup.reason})`,
      };
    }

    const newRecord: FuelRecord = {
      ...data,
      id: `fuel-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      normalized_reg: norm,
      total_amount: totalAmount,
      created_at: new Date().toISOString(),
    };

    this.fuelRecords.unshift(newRecord);

    this.addAuditLog({
      user: this.currentUser.name,
      action: 'Create Fuel Record',
      entity_type: 'Fuel',
      entity_id: newRecord.id,
      new_value: `${newRecord.registration_number} - ${newRecord.quantity} ${newRecord.fuel_type === 'CNG' ? 'kg' : 'L'} @ ₹${newRecord.rate} = ₹${newRecord.total_amount}`,
      reason: 'Manual fuel entry',
    });

    this.persistAll();
    return { success: true, message: 'Fuel record saved successfully', record: newRecord };
  }

  public deleteFuelRecord(id: string): boolean {
    const idx = this.fuelRecords.findIndex(f => f.id === id);
    if (idx === -1) return false;
    const removed = this.fuelRecords.splice(idx, 1)[0];

    this.addAuditLog({
      user: this.currentUser.name,
      action: 'Delete Fuel Record',
      entity_type: 'Fuel',
      entity_id: id,
      old_value: `${removed.registration_number} on ${removed.date} (₹${removed.total_amount})`,
      reason: 'Removed fuel transaction',
    });

    this.persistAll();
    return true;
  }

  public bulkImportFuel(records: Array<Omit<FuelRecord, 'id' | 'normalized_reg' | 'created_at'>>): {
    totalUploaded: number;
    inserted: number;
    skippedDuplicates: number;
    errors: string[];
    duplicateReasons: string[];
  } {
    let inserted = 0;
    let skippedDuplicates = 0;
    const errors: string[] = [];
    const duplicateReasons: string[] = [];

    // Fast indexed lookups of existing fuel records
    const regDateIndex = new Map<string, FuelRecord[]>();
    const cardDateIndex = new Map<string, FuelRecord[]>();
    const receiptSet = new Set<string>();
    const refSet = new Set<string>();

    const indexRecord = (rec: FuelRecord) => {
      const d = rec.date ? String(rec.date).slice(0, 10) : '';
      if (rec.normalized_reg && d) {
        const key = `${rec.normalized_reg}|${d}`;
        if (!regDateIndex.has(key)) regDateIndex.set(key, []);
        regDateIndex.get(key)!.push(rec);
      }
      if (rec.igl_card_number && d) {
        const cleanCard = rec.igl_card_number.replace(/[\s\-_.]+/g, '');
        if (cleanCard) {
          const key = `${cleanCard}|${d}`;
          if (!cardDateIndex.has(key)) cardDateIndex.set(key, []);
          cardDateIndex.get(key)!.push(rec);
        }
      }
      if (rec.receipt_number?.trim()) {
        receiptSet.add(rec.receipt_number.trim().toLowerCase());
      }
      if (rec.payment_reference?.trim()) {
        refSet.add(rec.payment_reference.trim().toLowerCase());
      }
    };

    // Index all existing records from the database
    this.fuelRecords.forEach(indexRecord);

    records.forEach(r => {
      const norm = normalizeRegNo(r.registration_number);
      if (!norm || !r.quantity || !r.rate) {
        errors.push(`Skipped row: Invalid fuel data for ${r.registration_number || 'Unknown'}`);
        return;
      }

      const candDate = r.date ? String(r.date).slice(0, 10) : '';
      const cleanCard = r.igl_card_number ? r.igl_card_number.replace(/[\s\-_.]+/g, '') : '';
      const totalAmount = Math.round(r.quantity * r.rate * 100) / 100;
      const receipt = r.receipt_number?.trim().toLowerCase();
      const ref = r.payment_reference?.trim().toLowerCase();

      // Check receipt or reference collisions against existing data
      if (receipt && receiptSet.has(receipt)) {
        skippedDuplicates++;
        if (duplicateReasons.length < 8) {
          duplicateReasons.push(`${r.registration_number} (${candDate}): Receipt #${r.receipt_number} already exists`);
        }
        return;
      }
      if (ref && refSet.has(ref)) {
        skippedDuplicates++;
        if (duplicateReasons.length < 8) {
          duplicateReasons.push(`${r.registration_number} (${candDate}): Payment ref ${r.payment_reference} already exists`);
        }
        return;
      }

      // Check vehicle/card + date + quantity/amount candidates
      const candidatesFromReg = regDateIndex.get(`${norm}|${candDate}`) || [];
      const candidatesFromCard = cleanCard ? (cardDateIndex.get(`${cleanCard}|${candDate}`) || []) : [];
      const existingCandidates = [...candidatesFromReg, ...candidatesFromCard];

      let isDuplicate = false;
      let dupMatch: FuelRecord | undefined;
      for (const ex of existingCandidates) {
        const qtyDiff = Math.abs(ex.quantity - r.quantity);
        const amtDiff = Math.abs(ex.total_amount - totalAmount);
        if (qtyDiff < 0.05 || amtDiff < 2.0) {
          isDuplicate = true;
          dupMatch = ex;
          break;
        }
      }

      if (isDuplicate) {
        skippedDuplicates++;
        if (duplicateReasons.length < 8) {
          duplicateReasons.push(
            `${r.registration_number} (${candDate}): ${r.quantity} ${r.fuel_type} @ ₹${totalAmount} already exists in database`
          );
        }
        return;
      }

      // New entry not in existing database: insert cleanly!
      const newRec: FuelRecord = {
        ...r,
        id: `fuel-imp-${Date.now()}-${Math.floor(Math.random() * 100000)}`,
        normalized_reg: norm,
        total_amount: totalAmount,
        created_at: new Date().toISOString(),
      };

      this.fuelRecords.unshift(newRec);
      indexRecord(newRec); // Add to local index so internal duplicate rows in the same sheet are also caught
      inserted++;
    });

    if (inserted > 0 || skippedDuplicates > 0) {
      this.addAuditLog({
        user: this.currentUser.name,
        action: 'Fuel Excel Import',
        entity_type: 'Fuel',
        entity_id: `batch-${Date.now()}`,
        new_value: `Processed ${records.length} records: ${inserted} new entries added, ${skippedDuplicates} existing entries skipped (duplicates prevented).`,
        reason: 'Bulk fuel spreadsheet upload deduplication check',
      });
      this.persistAll();
    }

    return {
      totalUploaded: records.length,
      inserted,
      skippedDuplicates,
      errors,
      duplicateReasons,
    };
  }

  // --- Mileage Standard Master ---
  public getMileageStandards(): VehicleMileageStandard[] {
    return [...this.standards];
  }

  public addMileageStandard(standard: Omit<VehicleMileageStandard, 'id' | 'created_at' | 'updated_at'>): { success: boolean; message: string; standard?: VehicleMileageStandard } {
    // Check if combo already exists
    const existing = this.standards.find(
      s => s.car_type.toLowerCase() === standard.car_type.toLowerCase() && s.fuel_type.toLowerCase() === standard.fuel_type.toLowerCase()
    );

    if (existing) {
      return { success: false, message: `Standard already configured for ${standard.car_type} (${standard.fuel_type})` };
    }

    const newStd: VehicleMileageStandard = {
      ...standard,
      id: `std-${Date.now()}`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    this.standards.push(newStd);

    this.addAuditLog({
      user: this.currentUser.name,
      action: 'Add Mileage Standard',
      entity_type: 'Standard',
      entity_id: newStd.id,
      new_value: `${newStd.car_type} + ${newStd.fuel_type} → ${newStd.standard_value} ${newStd.unit} (${newStd.mileage_type})`,
      reason: 'Mileage standard configuration',
    });

    this.persistAll();
    return { success: true, message: 'Mileage standard saved successfully', standard: newStd };
  }

  public updateMileageStandard(id: string, updates: Partial<VehicleMileageStandard>): boolean {
    const idx = this.standards.findIndex(s => s.id === id);
    if (idx === -1) return false;

    const old = { ...this.standards[idx] };
    this.standards[idx] = {
      ...old,
      ...updates,
      updated_at: new Date().toISOString(),
    };

    this.addAuditLog({
      user: this.currentUser.name,
      action: 'Update Mileage Standard',
      entity_type: 'Standard',
      entity_id: id,
      old_value: `${old.car_type} (${old.fuel_type}): ${old.standard_value} ${old.unit}`,
      new_value: `${this.standards[idx].car_type} (${this.standards[idx].fuel_type}): ${this.standards[idx].standard_value} ${this.standards[idx].unit}`,
      reason: 'Standard parameter revised',
    });

    this.persistAll();
    return true;
  }

  public deleteMileageStandard(id: string): boolean {
    const idx = this.standards.findIndex(s => s.id === id);
    if (idx === -1) return false;
    const removed = this.standards.splice(idx, 1)[0];

    this.addAuditLog({
      user: this.currentUser.name,
      action: 'Delete Mileage Standard',
      entity_type: 'Standard',
      entity_id: id,
      old_value: `${removed.car_type} (${removed.fuel_type}): ${removed.standard_value} ${removed.unit}`,
      reason: 'Removed standard definition',
    });

    this.persistAll();
    return true;
  }

  // --- IGL Cards ---
  public getIglCards(): IGLCard[] {
    return [...this.iglCards];
  }

  public addIglCard(card: any): IGLCard {
    const newCard: IGLCard = {
      ...card,
      id: `card-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      normalized_reg: normalizeRegNo(card.vehicle_registration || card.linked_vehicle_reg || ''),
    };
    this.iglCards.unshift(newCard);
    this.persistAll();
    return newCard;
  }

  public updateIglCard(id: string, updates: Partial<IGLCard>) {
    const idx = this.iglCards.findIndex(c => c.id === id);
    if (idx >= 0) {
      this.iglCards[idx] = { ...this.iglCards[idx], ...updates };
      this.persistAll();
    }
  }

  // --- Alerts ---
  public getAlerts(): FleetAlert[] {
    return [...this.alerts];
  }

  public resolveAlert(id: string) {
    const a = this.alerts.find(x => x.id === id);
    if (a) {
      a.resolved = true;
      this.persistAll();
    }
  }

  // --- Audit Trail ---
  public getAuditLogs(): AuditLog[] {
    return [...this.auditLogs].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }

  public addAuditLog(log: Omit<AuditLog, 'id' | 'timestamp'>) {
    const fullLog: AuditLog = {
      ...log,
      id: `log-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19),
    };
    this.auditLogs.unshift(fullLog);
    if (this.auditLogs.length > 500) this.auditLogs.pop();
  }

  // --- Database backup / export ---
  public exportFullBackup(): string {
    return JSON.stringify(
      {
        version: '1.0',
        exportedAt: new Date().toISOString(),
        vehicles: this.vehicles,
        gpsRecords: this.gpsRecords,
        fuelRecords: this.fuelRecords,
        standards: this.standards,
        iglCards: this.iglCards,
        alerts: this.alerts,
        auditLogs: this.auditLogs,
      },
      null,
      2
    );
  }

  public importFullBackup(jsonString: string): boolean {
    try {
      const data = JSON.parse(jsonString);
      if (Array.isArray(data.vehicles)) this.vehicles = data.vehicles;
      if (Array.isArray(data.gpsRecords)) this.gpsRecords = data.gpsRecords;
      if (Array.isArray(data.fuelRecords)) this.fuelRecords = data.fuelRecords;
      if (Array.isArray(data.standards)) this.standards = data.standards;
      if (Array.isArray(data.iglCards)) this.iglCards = data.iglCards;
      if (Array.isArray(data.alerts)) this.alerts = data.alerts;
      if (Array.isArray(data.auditLogs)) this.auditLogs = data.auditLogs;
      this.persistAll();
      return true;
    } catch (e) {
      console.error('Failed to import backup:', e);
      return false;
    }
  }
  public exportDatabaseJSON(): string {
    return this.exportFullBackup();
  }

  public importDatabaseJSON(jsonString: string): boolean {
    return this.importFullBackup(jsonString);
  }

  public resetToDefaults() {
    localStorage.removeItem(STORAGE_KEYS.VEHICLES);
    localStorage.removeItem(STORAGE_KEYS.GPS);
    localStorage.removeItem(STORAGE_KEYS.FUEL);
    localStorage.removeItem(STORAGE_KEYS.STANDARDS);
    localStorage.removeItem(STORAGE_KEYS.IGL_CARDS);
    localStorage.removeItem(STORAGE_KEYS.ALERTS);
    localStorage.removeItem(STORAGE_KEYS.AUDIT_LOGS);
    localStorage.removeItem(STORAGE_KEYS.USERS);
    localStorage.removeItem(STORAGE_KEYS.ACTIVE_USER);
    this.vehicles = [];
    this.gpsRecords = [];
    this.fuelRecords = [];
    this.standards = [];
    this.iglCards = [];
    this.alerts = [];
    this.auditLogs = [];
    this.init();
  }

  // Aliases for compatibility
  public getGPSDailyKM(): GPSDailyKM[] {
    return this.getGpsRecords();
  }

  public correctGPSDailyKM(id: string, newKm: number, reason: string, user?: string) {
    return this.correctGpsRecord(id, newKm, reason);
  }

  public bulkImportGPS(rows: any[], user?: string) {
    return this.bulkImportGps(rows);
  }

  public bulkImportFuelRecords(records: any[]) {
    return this.bulkImportFuel(records);
  }

  public getCNGCards(): IGLCard[] {
    return this.getIglCards();
  }

  public addCNGCard(card: any) {
    return this.addIglCard(card);
  }

  public updateCNGCard(id: string, updates: any) {
    this.updateIglCard(id, updates);
    return true;
  }

  public refreshRefuelingData(): { count: number; totalAmount: number; totalQuantity: number; uniqueVehicles: number } {
    const seed = generateInitialFleet();
    this.fuelRecords = seed.fuelRecords;
    this.vehicles = seed.vehicles;
    this.gpsRecords = seed.gpsRecords;
    this.iglCards = seed.iglCards;
    this.addAuditLog({
      user: this.currentUser.name,
      action: 'Fuel Sheet Refresh',
      entity_type: 'Fuel',
      entity_id: `refresh-${Date.now()}`,
      new_value: `Refreshed ${seed.fuelRecords.length} refueling records across 289 vehicles (Sep 01 - Sep 16, 2026)`,
      reason: 'User requested refueling data sync',
    });
    this.persistAll();
    const totalAmount = this.fuelRecords.reduce((acc, r) => acc + r.total_amount, 0);
    const totalQuantity = this.fuelRecords.reduce((acc, r) => acc + r.quantity, 0);
    const uniqueVehicles = new Set(this.fuelRecords.map(r => r.normalized_reg)).size;
    return {
      count: this.fuelRecords.length,
      totalAmount: Math.round(totalAmount * 100) / 100,
      totalQuantity: Math.round(totalQuantity * 100) / 100,
      uniqueVehicles,
    };
  }
}

export const db = new FleetDatabase();
export const fleetDb = db;

