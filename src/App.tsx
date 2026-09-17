import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Header } from './components/Header';
import { MetricsBar } from './components/MetricsBar';
import { NavigationTabs, TabKey } from './components/NavigationTabs';
import { MileageStandardsView } from './components/MileageStandardsView';
import { MileagePerformanceView } from './components/MileagePerformanceView';
import { FuelRecordsView } from './components/FuelRecordsView';
import { DailyGPSView } from './components/DailyGPSView';
import { VehiclesView } from './components/VehiclesView';
import { CNGCardsView } from './components/CNGCardsView';
import { AlertsView } from './components/AlertsView';
import { ReportsView } from './components/ReportsView';
import { DashboardView } from './components/DashboardView';
import { AuditLogsView } from './components/AuditLogsView';
import { UsersView } from './components/UsersView';
import { VehicleDetailsModal } from './components/VehicleDetailsModal';
import { ReceiptScanModal } from './components/ReceiptScanModal';
import { BackupModal } from './components/BackupModal';
import { SupabaseSyncModal } from './components/SupabaseSyncModal';
import { PublishApkModal } from './components/PublishApkModal';

import { fleetDb } from './services/db';
import { syncTablesToSupabase } from './services/supabase';
import { calculateMonthlyPerformance, calculateFleetSummaryMetrics } from './services/calculations';
import {
  Vehicle,
  GPSDailyKM,
  FuelRecord,
  VehicleMileageStandard,
  UserAccount,
  UserRole,
} from './types/fleet';

export default function App() {
  // Navigation & Month State
  const [activeTab, setActiveTab] = useState<TabKey>('mileage_performance');
  const [selectedMonth, setSelectedMonth] = useState<string>('2026-09');

  // Database Data States
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [gpsRecords, setGpsRecords] = useState<GPSDailyKM[]>([]);
  const [fuelRecords, setFuelRecords] = useState<FuelRecord[]>([]);
  const [standards, setStandards] = useState<VehicleMileageStandard[]>([]);
  const [cards, setCards] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [currentUser, setCurrentUser] = useState<UserAccount>({
    id: 'usr-admin-1',
    name: 'Administrator',
    email: 'admin@mileagesoft.internal',
    role: 'Admin',
  });

  // Modal States
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(null);
  const [isReceiptScanOpen, setIsReceiptScanOpen] = useState(false);
  const [isBackupOpen, setIsBackupOpen] = useState(false);
  const [isSupabaseSyncOpen, setIsSupabaseSyncOpen] = useState(false);
  const [isApkModalOpen, setIsApkModalOpen] = useState(false);
  const [isSyncingGps, setIsSyncingGps] = useState(false);

  // Load data from fleetDb
  const refreshData = useCallback(() => {
    setVehicles(fleetDb.getVehicles());
    setGpsRecords(fleetDb.getGPSDailyKM());
    setFuelRecords(fleetDb.getFuelRecords());
    setStandards(fleetDb.getMileageStandards());
    setCards(fleetDb.getCNGCards());
    setAuditLogs(fleetDb.getAuditLogs());
  }, []);

  useEffect(() => {
    refreshData();
  }, [refreshData]);

  // Compute monthly vehicle performance (single source of GPS truth consumed here)
  const monthlyPerformance = useMemo(() => {
    return calculateMonthlyPerformance(vehicles, gpsRecords, fuelRecords, standards, selectedMonth);
  }, [vehicles, gpsRecords, fuelRecords, standards, selectedMonth]);

  // Compute top banner metrics
  const summaryMetrics = useMemo(() => {
    return calculateFleetSummaryMetrics(vehicles, monthlyPerformance, fuelRecords, selectedMonth);
  }, [vehicles, monthlyPerformance, fuelRecords, selectedMonth]);

  // Count active alerts
  const alertsCount = useMemo(() => {
    const poor = monthlyPerformance.filter((p) => p.status === 'Needs Attention' || p.status === 'Below Standard').length;
    return poor;
  }, [monthlyPerformance]);

  // User permission flags
  const canEditStandards = currentUser.role === 'Admin';
  const canEditGps = currentUser.role === 'Admin' || currentUser.role === 'Operations';
  const canEditFuel = currentUser.role === 'Admin' || currentUser.role === 'Accounts';
  const canEditVehicles = currentUser.role === 'Admin' || currentUser.role === 'Operations';

  // Handlers for Standards
  const handleAddStandard = (std: Omit<VehicleMileageStandard, 'id' | 'created_at' | 'updated_at'>) => {
    const res = fleetDb.addMileageStandard(std);
    refreshData();
    return res;
  };

  const handleUpdateStandard = (id: string, updates: Partial<VehicleMileageStandard>) => {
    const res = fleetDb.updateMileageStandard(id, updates);
    refreshData();
    return res;
  };

  const handleDeleteStandard = (id: string) => {
    const res = fleetDb.deleteMileageStandard(id);
    refreshData();
    return res;
  };

  // Handlers for GPS
  const handleCorrectGps = (id: string, newKm: number, reason: string) => {
    const res = fleetDb.correctGPSDailyKM(id, newKm, reason, currentUser.name);
    refreshData();
    return res;
  };

  const handleBulkImportGps = (rows: any[]) => {
    const res = fleetDb.bulkImportGPS(rows, currentUser.name);
    refreshData();
    return res;
  };

  const handleSyncGps = async () => {
    setIsSyncingGps(true);
    try {
      const res = await fetch('/api/gps/pull', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: '2026-09-16' }),
      });
      const data = await res.json();
      if (data.records && data.records.length > 0) {
        fleetDb.bulkImportGPS(
          data.records.map((r: any) => ({
            regNo: r.registration_number,
            date: r.date,
            dailyKm: r.daily_gps_km,
            openingKm: r.opening_km,
            closingKm: r.closing_km,
            imei: r.gps_device_imei,
          })),
          'Track360 API'
        );
        refreshData();
      }
    } catch (err: any) {
      console.warn('Live API sync notice:', err.message);
    } finally {
      setIsSyncingGps(false);
    }
  };

  // Handlers for Fuel
  const handleAddFuelRecord = (record: Omit<FuelRecord, 'id' | 'normalized_reg' | 'created_at'>) => {
    const res = fleetDb.addFuelRecord(record);
    refreshData();
    return res;
  };

  const handleDeleteFuelRecord = (id: string) => {
    const res = fleetDb.deleteFuelRecord(id);
    refreshData();
    return res;
  };

  const handleBulkImportFuel = (records: Array<Omit<FuelRecord, 'id' | 'normalized_reg' | 'created_at'>>) => {
    const res = fleetDb.bulkImportFuelRecords(records);
    refreshData();
    return res;
  };

  // Handlers for Vehicles
  const handleAddVehicle = (veh: Omit<Vehicle, 'id' | 'normalized_reg' | 'created_at' | 'updated_at'>) => {
    const res = fleetDb.addVehicle(veh);
    refreshData();
    return res;
  };

  const handleUpdateVehicle = (id: string, updates: Partial<Vehicle>) => {
    const res = fleetDb.updateVehicle(id, updates);
    refreshData();
    return res;
  };

  const handleDeleteVehicle = (id: string) => {
    const res = fleetDb.deleteVehicle(id);
    refreshData();
    return res;
  };

  // Handlers for CNG Cards
  const handleAddCard = (card: any) => {
    const res = fleetDb.addCNGCard(card);
    refreshData();
    return !!res;
  };

  const handleUpdateCard = (id: string, updates: any) => {
    const res = fleetDb.updateCNGCard(id, updates);
    refreshData();
    return res;
  };

  const handleRefreshRefuelingData = () => {
    const stats = fleetDb.refreshRefuelingData();
    refreshData();
    return stats;
  };

  return (
    <div className="min-h-screen bg-slate-100/70 flex flex-col font-sans antialiased text-slate-800 selection:bg-cyan-500 selection:text-white">
      {/* 1. Top Global Navigation Header */}
      <Header
        selectedMonth={selectedMonth}
        onMonthChange={setSelectedMonth}
        onOpenGpsModule={() => setActiveTab('daily_gps')}
        onOpenBackupModal={() => setIsBackupOpen(true)}
        onOpenSupabaseSync={() => setIsSupabaseSyncOpen(true)}
        onOpenApkModal={() => setIsApkModalOpen(true)}
        currentUser={currentUser}
        onRoleChange={(role: UserRole) => setCurrentUser((prev) => ({ ...prev, role }))}
        onSyncGps={handleSyncGps}
        isSyncingGps={isSyncingGps}
      />

      {/* 2. Executive 5-Metric Highlights Bar (Matches Screenshot 1 & 3) */}
      <MetricsBar
        totalVehicles={summaryMetrics.totalVehicles}
        monthlyGpsKm={summaryMetrics.monthlyGpsKm}
        totalFuelCost={summaryMetrics.totalFuelCost}
        fleetAvgMileage={summaryMetrics.fleetAvgMileage}
        gpayTxnCount={summaryMetrics.gpayTxnCount}
      />

      {/* 3. Navigation Tabs */}
      <NavigationTabs
        activeTab={activeTab}
        onTabChange={setActiveTab}
        alertsCount={alertsCount}
      />

      {/* 4. Active Tab View Container */}
      <main className="flex-1 max-w-[1680px] w-full mx-auto pb-12">
        {activeTab === 'dashboard' && (
          <DashboardView
            vehicles={vehicles}
            gpsRecords={gpsRecords}
            fuelRecords={fuelRecords}
            standards={standards}
            selectedMonth={selectedMonth}
            onNavigateToTab={setActiveTab}
            onVehicleClick={setSelectedVehicleId}
          />
        )}

        {activeTab === 'mileage_performance' && (
          <MileagePerformanceView
            records={monthlyPerformance}
            selectedMonth={selectedMonth}
            onVehicleClick={setSelectedVehicleId}
            onEditVehicleOrStandard={() => setActiveTab('mileage_standards')}
          />
        )}

        {activeTab === 'mileage_standards' && (
          <MileageStandardsView
            standards={standards}
            onAddStandard={handleAddStandard}
            onUpdateStandard={handleUpdateStandard}
            onDeleteStandard={handleDeleteStandard}
            canEdit={canEditStandards}
          />
        )}

        {activeTab === 'fuel' && (
          <FuelRecordsView
            records={fuelRecords}
            vehicles={vehicles}
            onAddFuelRecord={handleAddFuelRecord}
            onDeleteFuelRecord={handleDeleteFuelRecord}
            onBulkImportFuel={handleBulkImportFuel}
            onOpenScanReceiptModal={() => setIsReceiptScanOpen(true)}
            onRefreshRefuelingData={handleRefreshRefuelingData}
            canEdit={canEditFuel}
          />
        )}

        {activeTab === 'daily_gps' && (
          <DailyGPSView
            gpsRecords={gpsRecords}
            vehicles={vehicles}
            onSyncGps={handleSyncGps}
            isSyncing={isSyncingGps}
            onCorrectGps={handleCorrectGps}
            onBulkImportGps={handleBulkImportGps}
            canEdit={canEditGps}
          />
        )}

        {activeTab === 'vehicles' && (
          <VehiclesView
            vehicles={vehicles}
            onAddVehicle={handleAddVehicle}
            onUpdateVehicle={handleUpdateVehicle}
            onDeleteVehicle={handleDeleteVehicle}
            onViewVehicle={setSelectedVehicleId}
            canEdit={canEditVehicles}
          />
        )}

        {activeTab === 'cng_cards' && (
          <CNGCardsView
            cards={cards}
            vehicles={vehicles}
            onAddCard={handleAddCard}
            onUpdateCard={handleUpdateCard}
            canEdit={currentUser.role === 'Admin' || currentUser.role === 'Accounts'}
          />
        )}

        {activeTab === 'alerts' && (
          <AlertsView
            vehicles={vehicles}
            gpsRecords={gpsRecords}
            fuelRecords={fuelRecords}
            standards={standards}
            selectedMonth={selectedMonth}
            onVehicleClick={setSelectedVehicleId}
          />
        )}

        {activeTab === 'reports' && (
          <ReportsView
            vehicles={vehicles}
            gpsRecords={gpsRecords}
            fuelRecords={fuelRecords}
            standards={standards}
            selectedMonth={selectedMonth}
          />
        )}

        {activeTab === 'audit_logs' && (
          <AuditLogsView logs={auditLogs} />
        )}

        {activeTab === 'users' && (
          <UsersView
            currentUser={currentUser}
            onRoleChange={(role: UserRole) => setCurrentUser((prev) => ({ ...prev, role }))}
          />
        )}
      </main>

      {/* Vehicle Profile Drilldown Modal */}
      {selectedVehicleId && (
        <VehicleDetailsModal
          vehicleId={selectedVehicleId}
          vehicles={vehicles}
          gpsRecords={gpsRecords}
          fuelRecords={fuelRecords}
          standards={standards}
          selectedMonth={selectedMonth}
          onClose={() => setSelectedVehicleId(null)}
        />
      )}

      {/* AI Receipt Scanner Modal */}
      <ReceiptScanModal
        isOpen={isReceiptScanOpen}
        onClose={() => setIsReceiptScanOpen(false)}
        onApplyScannedData={(data) => {
          if (data.vehicleNumber && data.quantity && data.totalAmount) {
            const v = vehicles.find(
              (veh) => veh.normalized_reg === data.vehicleNumber?.replace(/[\s\-_.]+/g, '').toUpperCase()
            );
            handleAddFuelRecord({
              vehicle_id: v?.id || 'veh-scanned',
              registration_number: data.vehicleNumber,
              car_type: v?.vehicle_type || 'Commercial Car',
              date: data.date || '2026-09-17',
              fuel_type: data.fuelType || 'CNG',
              quantity: data.quantity,
              rate: data.rate || 86.98,
              total_amount: data.totalAmount,
              fuel_station: data.fuelStation || 'IGL CNG Pump',
              payment_mode: data.paymentMode || 'IGL Smart Card',
              source: 'Manual',
            });
          }
        }}
      />

      {/* Database Backup & Restore Modal */}
      <BackupModal
        isOpen={isBackupOpen}
        onClose={() => setIsBackupOpen(false)}
        onDataRestored={refreshData}
        onOpenSupabaseSync={() => setIsSupabaseSyncOpen(true)}
      />

      {/* Supabase SQL Workspace Sync Modal */}
      <SupabaseSyncModal
        isOpen={isSupabaseSyncOpen}
        onClose={() => setIsSupabaseSyncOpen(false)}
        vehicles={vehicles}
        cards={cards}
        fuelRecords={fuelRecords}
        standards={standards}
      />

      {/* Android APK & Mobile App Publisher Modal */}
      <PublishApkModal
        isOpen={isApkModalOpen}
        onClose={() => setIsApkModalOpen(false)}
      />
    </div>
  );
}
