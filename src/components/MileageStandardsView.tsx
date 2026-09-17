import React, { useState } from 'react';
import { Plus, Edit2, Trash2, Search, SlidersHorizontal, Check, X } from 'lucide-react';
import { VehicleMileageStandard, MileageType, FuelType } from '../types/fleet';

interface MileageStandardsViewProps {
  standards: VehicleMileageStandard[];
  onAddStandard: (std: Omit<VehicleMileageStandard, 'id' | 'created_at' | 'updated_at'>) => { success: boolean; message: string };
  onUpdateStandard: (id: string, updates: Partial<VehicleMileageStandard>) => boolean;
  onDeleteStandard: (id: string) => boolean;
  canEdit: boolean;
}

const CAR_TYPE_PRESETS = [
  'Ciaz', 'Dzire', 'Toyota Rumion', 'Ertiga', 'Innova', 'Hycross', 'Invicto',
  'Fortuner', 'Mahindra Bolero B6', 'Bolero Camper', 'Verna', 'Honda City',
  'Glanza', 'Corolla Altis', 'XL6', 'Ashok Leyland 12M Coach',
  'TATA NEXON EV', 'TATA TIGOR EV', 'MG ZS EV', 'KIA CARENS', 'KIA SELTOS'
];

const FUEL_TYPES: FuelType[] = ['CNG', 'Petrol', 'Diesel', 'Electric', 'CNG/Petrol', 'Petrol Hybrid'];

export const MileageStandardsView: React.FC<MileageStandardsViewProps> = ({
  standards,
  onAddStandard,
  onUpdateStandard,
  onDeleteStandard,
  canEdit,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form states
  const [carType, setCarType] = useState('Ciaz');
  const [customCarType, setCustomCarType] = useState('');
  const [fuelType, setFuelType] = useState<FuelType>('CNG');
  const [mileageType, setMileageType] = useState<MileageType>('Cost per KM');
  const [standardValue, setStandardValue] = useState<number>(5.7);
  const [errorMsg, setErrorMsg] = useState('');

  // Automatically select unit based on mileageType
  const computedUnit = mileageType === 'KM per Litre' ? 'km per litre' : '₹ per km';

  const handleOpenAdd = () => {
    setEditingId(null);
    setCarType('Ciaz');
    setCustomCarType('');
    setFuelType('CNG');
    setMileageType('Cost per KM');
    setStandardValue(5.7);
    setErrorMsg('');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (std: VehicleMileageStandard) => {
    setEditingId(std.id);
    if (CAR_TYPE_PRESETS.includes(std.car_type)) {
      setCarType(std.car_type);
      setCustomCarType('');
    } else {
      setCarType('Custom');
      setCustomCarType(std.car_type);
    }
    setFuelType(std.fuel_type);
    setMileageType(std.mileage_type);
    setStandardValue(std.standard_value);
    setErrorMsg('');
    setIsModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const finalCarType = carType === 'Custom' ? customCarType.trim() : carType;

    if (!finalCarType) {
      setErrorMsg('Please specify a valid car type.');
      return;
    }

    if (isNaN(standardValue) || standardValue <= 0) {
      setErrorMsg('Please enter a positive numeric standard value.');
      return;
    }

    if (editingId) {
      onUpdateStandard(editingId, {
        car_type: finalCarType,
        fuel_type: fuelType,
        standard_value: standardValue,
        mileage_type: mileageType,
        unit: computedUnit as any,
      });
      setIsModalOpen(false);
    } else {
      const res = onAddStandard({
        car_type: finalCarType,
        fuel_type: fuelType,
        standard_value: standardValue,
        mileage_type: mileageType,
        unit: computedUnit as any,
      });

      if (res.success) {
        setIsModalOpen(false);
      } else {
        setErrorMsg(res.message);
      }
    }
  };

  // Filter standards
  const filtered = standards.filter((s) => {
    const q = searchQuery.toLowerCase();
    return (
      (s.car_type || '').toLowerCase().includes(q) ||
      (s.fuel_type || '').toLowerCase().includes(q) ||
      (s.mileage_type || '').toLowerCase().includes(q) ||
      (s.unit || '').toLowerCase().includes(q)
    );
  });

  return (
    <div className="px-6 py-5 space-y-4">
      {/* Top Header & Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <SlidersHorizontal className="w-5 h-5 text-cyan-600" />
            Mileage Standard Master
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Configure vehicle-wise baseline mileage benchmarks. Supports <b>KM per Litre</b> (km/litre) and <b>Cost per KM</b> (₹/km).
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search car or fuel type..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-cyan-500 w-64"
            />
          </div>

          {canEdit && (
            <button
              onClick={handleOpenAdd}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-cyan-600 hover:bg-cyan-700 rounded-lg transition-colors shadow-2xs cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Add Standard
            </button>
          )}
        </div>
      </div>

      {/* Standards Table (Matches Image 2 exactly) */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-semibold tracking-wide uppercase text-[11px]">
                <th className="py-3 px-4">Car Type</th>
                <th className="py-3 px-4">Fuel Type</th>
                <th className="py-3 px-4">Standard</th>
                <th className="py-3 px-4">Mileage Type</th>
                <th className="py-3 px-4">Unit</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-800">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    No mileage standards found matching "{searchQuery}".
                  </td>
                </tr>
              ) : (
                filtered.map((std) => (
                  <tr key={std.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3.5 px-4 font-semibold text-slate-900">
                      {std.car_type}
                    </td>
                    <td className="py-3.5 px-4 text-slate-600">
                      {std.fuel_type}
                    </td>
                    <td className="py-3.5 px-4 font-bold text-slate-900">
                      {std.standard_value}
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold ${
                          std.mileage_type === 'Cost per KM'
                            ? 'bg-amber-50 text-amber-800 border border-amber-200/60'
                            : 'bg-emerald-50 text-emerald-800 border border-emerald-200/60'
                        }`}
                      >
                        {std.mileage_type}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-600 font-mono text-[11px]">
                      {std.unit}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      {canEdit ? (
                        <div className="inline-flex items-center gap-2 justify-end">
                          <button
                            onClick={() => handleOpenEdit(std)}
                            className="p-1 text-slate-400 hover:text-cyan-600 hover:bg-cyan-50 rounded transition-colors cursor-pointer"
                            title="Edit Standard"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              if (confirm(`Delete standard for ${std.car_type} (${std.fuel_type})?`)) {
                                onDeleteStandard(std.id);
                              }
                            }}
                            className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors cursor-pointer"
                            title="Delete Standard"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <span className="text-slate-400 text-xs">Read Only</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Standard Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4 text-cyan-600" />
                {editingId ? 'Edit Mileage Standard' : 'Add Mileage Standard'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-md cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-4">
              {errorMsg && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg">
                  {errorMsg}
                </div>
              )}

              {/* Car Type */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Car Type
                </label>
                <select
                  value={carType}
                  onChange={(e) => setCarType(e.target.value)}
                  className="w-full text-xs font-medium bg-slate-50 border border-slate-300 rounded-lg p-2.5 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                >
                  {CAR_TYPE_PRESETS.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                  <option value="Custom">+ Custom Car Type...</option>
                </select>

                {carType === 'Custom' && (
                  <input
                    type="text"
                    placeholder="Enter custom vehicle make/model"
                    value={customCarType}
                    onChange={(e) => setCustomCarType(e.target.value)}
                    className="mt-2 w-full text-xs bg-white border border-slate-300 rounded-lg p-2.5 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                    required
                  />
                )}
              </div>

              {/* Fuel Type */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Fuel Type
                </label>
                <select
                  value={fuelType}
                  onChange={(e) => setFuelType(e.target.value as FuelType)}
                  className="w-full text-xs font-medium bg-slate-50 border border-slate-300 rounded-lg p-2.5 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                >
                  {FUEL_TYPES.map((f) => (
                    <option key={f} value={f}>
                      {f}
                    </option>
                  ))}
                </select>
              </div>

              {/* Mileage Type Selector */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Mileage Type
                </label>
                <select
                  value={mileageType}
                  onChange={(e) => {
                    const newType = e.target.value as MileageType;
                    setMileageType(newType);
                    // Update sensible default if switching
                    if (newType === 'Cost per KM' && standardValue > 10) {
                      setStandardValue(5.7);
                    } else if (newType === 'KM per Litre' && standardValue < 6) {
                      setStandardValue(14.0);
                    }
                  }}
                  className="w-full text-xs font-semibold bg-slate-50 border border-slate-300 rounded-lg p-2.5 focus:outline-none focus:ring-1 focus:ring-cyan-500 cursor-pointer"
                >
                  <option value="KM per Litre">KM per Litre (Fuel Consumption)</option>
                  <option value="Cost per KM">Cost per KM (₹ per KM benchmark)</option>
                </select>
                <p className="text-[11px] text-slate-400 mt-1">
                  {mileageType === 'KM per Litre'
                    ? 'Formula: Actual Mileage = GPS KM ÷ Fuel Quantity'
                    : 'Formula: Actual Cost/KM = Fuel Cost ÷ GPS KM'}
                </p>
              </div>

              {/* Standard Value */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Standard Value
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0.1"
                  value={standardValue}
                  onChange={(e) => setStandardValue(parseFloat(e.target.value))}
                  placeholder="e.g. 14 or 5.7"
                  className="w-full text-xs font-bold bg-white border border-slate-300 rounded-lg p-2.5 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                  required
                />
              </div>

              {/* Unit (Automatically selected based on Mileage Type - NOT manually editable!) */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Unit (Auto-determined)
                </label>
                <input
                  type="text"
                  value={computedUnit}
                  disabled
                  readOnly
                  className="w-full text-xs font-mono font-semibold bg-slate-100 border border-slate-200 text-slate-500 rounded-lg p-2.5 cursor-not-allowed"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  Automatically set based on chosen Mileage Type.
                </p>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-cyan-600 hover:bg-cyan-700 rounded-lg transition-colors shadow-xs cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  Save Standard
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
