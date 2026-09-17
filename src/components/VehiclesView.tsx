import React, { useState } from 'react';
import { Plus, Search, Filter, Edit2, Trash2, Eye, ShieldCheck, Car, CreditCard } from 'lucide-react';
import { Vehicle, VehicleType, FuelType, OwnerType, VehicleStatus } from '../types/fleet';
import { normalizeRegNo, formatRegNo } from '../utils/normalize';

interface VehiclesViewProps {
  vehicles: Vehicle[];
  onAddVehicle: (veh: Omit<Vehicle, 'id' | 'normalized_reg' | 'created_at' | 'updated_at'>) => { success: boolean; message: string };
  onUpdateVehicle: (id: string, updates: Partial<Vehicle>) => boolean;
  onDeleteVehicle: (id: string) => boolean;
  onViewVehicle: (vehicleId: string) => void;
  canEdit: boolean;
}

const VEHICLE_TYPES: VehicleType[] = [
  'Ciaz', 'Dzire', 'Toyota Rumion', 'Ertiga', 'Innova', 'Hycross', 'Invicto',
  'Fortuner', 'Mahindra Bolero B6', 'Bolero Camper', 'Verna', 'Honda City',
  'Glanza', 'Corolla Altis', 'XL6', 'Ashok Leyland 12M Coach', 'TATA NEXON EV'
];

export const VehiclesView: React.FC<VehiclesViewProps> = ({
  vehicles,
  onAddVehicle,
  onUpdateVehicle,
  onDeleteVehicle,
  onViewVehicle,
  canEdit,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('All');
  const [filterFuel, setFilterFuel] = useState('All');
  const [filterStatus, setFilterStatus] = useState('All');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form states
  const [regNo, setRegNo] = useState('');
  const [vehicleType, setVehicleType] = useState<VehicleType>('Ciaz');
  const [make, setMake] = useState('Maruti Suzuki');
  const [model, setModel] = useState('Ciaz Smart Hybrid');
  const [fuelType, setFuelType] = useState<FuelType>('CNG');
  const [ownerType, setOwnerType] = useState<OwnerType>('Company Owned');
  const [vendorName, setVendorName] = useState('');
  const [gpsImei, setGpsImei] = useState('');
  const [iglCard, setIglCard] = useState('');
  const [tankCapacity, setTankCapacity] = useState<number>(60);
  const [status, setStatus] = useState<VehicleStatus>('Active');
  const [errorMsg, setErrorMsg] = useState('');

  const handleOpenAdd = () => {
    setEditingId(null);
    setRegNo('');
    setVehicleType('Ciaz');
    setMake('Maruti Suzuki');
    setModel('Ciaz 1.5L');
    setFuelType('CNG');
    setOwnerType('Company Owned');
    setVendorName('');
    setGpsImei(`8692010${Math.floor(10000000 + Math.random() * 90000000)}`);
    setIglCard(`70102110${Math.floor(10000000 + Math.random() * 90000000)}`);
    setTankCapacity(60);
    setStatus('Active');
    setErrorMsg('');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (v: Vehicle) => {
    setEditingId(v.id);
    setRegNo(v.registration_number);
    setVehicleType(v.vehicle_type);
    setMake(v.make);
    setModel(v.model);
    setFuelType(v.fuel_type);
    setOwnerType(v.owner_type);
    setVendorName(v.vendor_name || v.vendor || '');
    setGpsImei(v.gps_device_imei || v.gps_device_id || v.gps_imei || '');
    setIglCard(v.igl_smart_card_number || v.igl_card_number || '');
    setTankCapacity(v.fuel_tank_capacity_l || v.fuel_tank_capacity || 60);
    setStatus(v.status);
    setErrorMsg('');
    setIsModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanReg = regNo.trim().toUpperCase();
    if (!cleanReg) {
      setErrorMsg('Please enter a vehicle registration number.');
      return;
    }

    if (editingId) {
      onUpdateVehicle(editingId, {
        registration_number: cleanReg,
        vehicle_type: vehicleType,
        make,
        model,
        fuel_type: fuelType,
        owner_type: ownerType,
        vendor_name: vendorName || undefined,
        gps_device_imei: gpsImei,
        igl_smart_card_number: iglCard || undefined,
        fuel_tank_capacity_l: tankCapacity,
        status,
      });
      setIsModalOpen(false);
    } else {
      const res = onAddVehicle({
        registration_number: cleanReg,
        vehicle_type: vehicleType,
        make,
        model,
        fuel_type: fuelType,
        owner_type: ownerType,
        vendor_name: vendorName || undefined,
        gps_device_imei: gpsImei || `8692010${Math.floor(10000000 + Math.random() * 90000000)}`,
        igl_smart_card_number: iglCard || undefined,
        fuel_tank_capacity_l: tankCapacity,
        status,
      });

      if (res.success) {
        setIsModalOpen(false);
      } else {
        setErrorMsg(res.message);
      }
    }
  };

  const filtered = vehicles.filter((v) => {
    if (filterType !== 'All' && v.vehicle_type !== filterType) return false;
    if (filterFuel !== 'All' && v.fuel_type !== filterFuel) return false;
    if (filterStatus !== 'All' && v.status !== filterStatus) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        (v.registration_number || '').toLowerCase().includes(q) ||
        (v.vehicle_type || '').toLowerCase().includes(q) ||
        (v.gps_device_imei || v.gps_imei || '').toLowerCase().includes(q) ||
        (v.igl_smart_card_number || '').toLowerCase().includes(q) ||
        (v.igl_card_number || '').toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="px-6 py-5 space-y-4">
      {/* Top Header */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-slate-900">
              Vehicle Master
            </h2>
            <span className="text-xs px-2.5 py-0.5 font-bold bg-cyan-50 text-cyan-700 border border-cyan-200 rounded-md">
              Fleet Size: {vehicles.length}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Registered commercial vehicles, Mosfet GPS tracking devices & IGL CNG Smart Card linkages.
          </p>
        </div>

        {canEdit && (
          <button
            onClick={handleOpenAdd}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-cyan-600 hover:bg-cyan-700 rounded-lg transition-colors shadow-2xs cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Add Vehicle
          </button>
        )}
      </div>

      {/* Filter Row */}
      <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs flex flex-wrap items-center justify-between gap-3">
        <div className="relative flex-1 min-w-[240px] max-w-md">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search registration, vehicle type, IMEI, card..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-cyan-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Filter Vehicle Type */}
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="text-xs bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-cyan-500"
          >
            <option value="All">All Vehicle Types</option>
            {VEHICLE_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>

          {/* Filter Fuel */}
          <select
            value={filterFuel}
            onChange={(e) => setFilterFuel(e.target.value)}
            className="text-xs bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-cyan-500"
          >
            <option value="All">All Fuels</option>
            <option value="CNG">CNG</option>
            <option value="Petrol">Petrol</option>
            <option value="Diesel">Diesel</option>
            <option value="Electric">Electric</option>
          </select>

          {/* Filter Status */}
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="text-xs bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-cyan-500"
          >
            <option value="All">All Statuses</option>
            <option value="Active">Active</option>
            <option value="In Shop">In Shop / Maintenance</option>
            <option value="Inactive">Inactive</option>
          </select>

          <span className="text-xs text-slate-400">
            Showing <b>{filtered.length}</b> vehicles
          </span>
        </div>
      </div>

      {/* Vehicles Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50/90 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10.5px]">
                <th className="py-3 px-4">VEHICLE NO</th>
                <th className="py-3 px-4">TYPE & MODEL</th>
                <th className="py-3 px-4">FUEL</th>
                <th className="py-3 px-4">OWNERSHIP</th>
                <th className="py-3 px-4">GPS PROVIDER</th>
                <th className="py-3 px-4">GPS IMEI</th>
                <th className="py-3 px-4">IGL CARD</th>
                <th className="py-3 px-4 text-center">STATUS</th>
                <th className="py-3 px-4 text-right">ACTIONS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-800 font-medium">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-10 text-center text-slate-400">
                    No vehicles found matching criteria.
                  </td>
                </tr>
              ) : (
                filtered.slice(0, 100).map((v) => (
                  <tr key={v.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3 px-4">
                      <button
                        onClick={() => onViewVehicle(v.id)}
                        className="font-bold text-cyan-600 hover:text-cyan-800 hover:underline cursor-pointer"
                      >
                        {v.registration_number}
                      </button>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-900">{v.vehicle_type}</div>
                      <div className="text-[10.5px] text-slate-400">{v.make} · {v.model}</div>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${
                        v.fuel_type === 'CNG' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                        v.fuel_type === 'Electric' ? 'bg-indigo-50 text-indigo-700 border border-indigo-200' :
                        v.fuel_type === 'Diesel' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                        'bg-sky-50 text-sky-700 border border-sky-200'
                      }`}>
                        {v.fuel_type}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-600 text-xs">
                      <div>{v.owner_type}</div>
                      {v.vendor_name && (
                        <div className="text-[10px] text-slate-400">{v.vendor_name}</div>
                      )}
                    </td>
                    <td className="py-3 px-4 text-slate-700">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                        Mosfet GPS
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono text-[11px] text-slate-500">
                      {v.gps_device_imei}
                    </td>
                    <td className="py-3 px-4 font-mono text-[11px] text-slate-600">
                      {v.igl_smart_card_number || '—'}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                        v.status === 'Active' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                        v.status === 'In Shop' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                        'bg-slate-100 text-slate-600'
                      }`}>
                        {v.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="inline-flex items-center gap-1.5 justify-end">
                        <button
                          onClick={() => onViewVehicle(v.id)}
                          className="p-1 text-slate-400 hover:text-cyan-600 hover:bg-cyan-50 rounded transition-colors cursor-pointer"
                          title="View Vehicle Profile"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        {canEdit && (
                          <>
                            <button
                              onClick={() => handleOpenEdit(v)}
                              className="p-1 text-slate-400 hover:text-cyan-600 hover:bg-cyan-50 rounded transition-colors cursor-pointer"
                              title="Edit Vehicle"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => {
                                if (confirm(`Remove vehicle ${v.registration_number} from fleet?`)) {
                                  onDeleteVehicle(v.id);
                                }
                              }}
                              className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors cursor-pointer"
                              title="Delete Vehicle"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Vehicle Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <Car className="w-4 h-4 text-cyan-600" />
                {editingId ? 'Edit Vehicle Master' : 'Add New Fleet Vehicle'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-3.5 max-h-[80vh] overflow-y-auto">
              {errorMsg && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg">
                  {errorMsg}
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                {/* Registration */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Registration No *
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. HR38AL4163"
                    value={regNo}
                    onChange={(e) => setRegNo(e.target.value.toUpperCase())}
                    className="w-full text-xs font-mono font-bold bg-white border border-slate-300 rounded-lg p-2.5 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                    required
                  />
                </div>

                {/* Vehicle Type */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Car Type *
                  </label>
                  <select
                    value={vehicleType}
                    onChange={(e) => setVehicleType(e.target.value as VehicleType)}
                    className="w-full text-xs font-medium bg-slate-50 border border-slate-300 rounded-lg p-2.5 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                  >
                    {VEHICLE_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {/* Fuel Type */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Fuel Type *
                  </label>
                  <select
                    value={fuelType}
                    onChange={(e) => setFuelType(e.target.value as FuelType)}
                    className="w-full text-xs bg-slate-50 border border-slate-300 rounded-lg p-2.5 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                  >
                    <option value="CNG">CNG</option>
                    <option value="Petrol">Petrol</option>
                    <option value="Diesel">Diesel</option>
                    <option value="Electric">Electric</option>
                    <option value="CNG/Petrol">CNG/Petrol</option>
                    <option value="Petrol Hybrid">Petrol Hybrid</option>
                  </select>
                </div>

                {/* Ownership Type */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Ownership Type
                  </label>
                  <select
                    value={ownerType}
                    onChange={(e) => setOwnerType(e.target.value as OwnerType)}
                    className="w-full text-xs bg-slate-50 border border-slate-300 rounded-lg p-2.5 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                  >
                    <option value="Company Owned">Company Owned</option>
                    <option value="Vendor Attached">Vendor Attached</option>
                    <option value="Leased">Leased</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {/* Make */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Manufacturer / Make
                  </label>
                  <input
                    type="text"
                    value={make}
                    onChange={(e) => setMake(e.target.value)}
                    className="w-full text-xs bg-white border border-slate-300 rounded-lg p-2.5 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                  />
                </div>

                {/* Model */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Model Variant
                  </label>
                  <input
                    type="text"
                    value={model}
                    onChange={(e) => setModel(e.target.value)}
                    className="w-full text-xs bg-white border border-slate-300 rounded-lg p-2.5 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {/* GPS IMEI */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    GPS Device / IMEI *
                  </label>
                  <input
                    type="text"
                    value={gpsImei}
                    onChange={(e) => setGpsImei(e.target.value)}
                    placeholder="15-digit IMEI"
                    className="w-full text-xs font-mono bg-white border border-slate-300 rounded-lg p-2.5 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                    required
                  />
                </div>

                {/* IGL CNG Smart Card */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    IGL Smart Card No
                  </label>
                  <input
                    type="text"
                    value={iglCard}
                    onChange={(e) => setIglCard(e.target.value)}
                    placeholder="e.g. 6081-4400-XXXX"
                    className="w-full text-xs font-mono bg-white border border-slate-300 rounded-lg p-2.5 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {/* GPS Vendor */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    GPS Provider
                  </label>
                  <input
                    type="text"
                    value="Mosfet GPS"
                    disabled
                    className="w-full text-xs bg-slate-100 border border-slate-200 text-slate-600 rounded-lg p-2.5 cursor-not-allowed font-medium"
                  />
                </div>

                {/* Status */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Status
                  </label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as VehicleStatus)}
                    className="w-full text-xs bg-slate-50 border border-slate-300 rounded-lg p-2.5 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                  >
                    <option value="Active">Active</option>
                    <option value="In Shop">In Shop / Maintenance</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>
              </div>

              <div className="pt-3 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold text-white bg-cyan-600 hover:bg-cyan-700 rounded-lg transition-colors shadow-xs cursor-pointer"
                >
                  Save Vehicle
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
