import React, { useState } from 'react';
import { CreditCard, Plus, Search, CheckCircle, AlertCircle, Edit2, Trash2 } from 'lucide-react';
import { IGLSmartCard, Vehicle } from '../types/fleet';
import { formatINR } from '../utils/normalize';

interface CNGCardsViewProps {
  cards: IGLSmartCard[];
  vehicles: Vehicle[];
  onAddCard: (card: Omit<IGLSmartCard, 'id' | 'created_at' | 'updated_at'>) => boolean;
  onUpdateCard: (id: string, updates: Partial<IGLSmartCard>) => boolean;
  canEdit: boolean;
}

export const CNGCardsView: React.FC<CNGCardsViewProps> = ({
  cards,
  vehicles,
  onAddCard,
  onUpdateCard,
  canEdit,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [cardNo, setCardNo] = useState('');
  const [vehicleReg, setVehicleReg] = useState('');
  const [balance, setBalance] = useState<number>(5000);
  const [monthlyLimit, setMonthlyLimit] = useState<number>(30000);
  const [status, setStatus] = useState<'Active' | 'Blocked' | 'Expired'>('Active');

  const handleOpenAdd = () => {
    setEditingId(null);
    setCardNo(`70102110${Math.floor(10000000 + Math.random() * 90000000)}`);
    setVehicleReg(vehicles[0]?.registration_number || '');
    setBalance(5000);
    setMonthlyLimit(30000);
    setStatus('Active');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (c: IGLSmartCard) => {
    setEditingId(c.id);
    setCardNo(c.card_number);
    setVehicleReg(c.linked_vehicle_reg || c.vehicle_registration || '');
    setBalance(c.balance_amount || c.balance || 0);
    setMonthlyLimit(c.monthly_limit);
    setStatus(c.status);
    setIsModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingId) {
      onUpdateCard(editingId, {
        card_number: cardNo,
        linked_vehicle_reg: vehicleReg,
        balance_amount: balance,
        monthly_limit: monthlyLimit,
        status,
      });
    } else {
      onAddCard({
        card_number: cardNo,
        linked_vehicle_reg: vehicleReg,
        balance_amount: balance,
        monthly_limit: monthlyLimit,
        status,
      });
    }
    setIsModalOpen(false);
  };

  const filtered = cards.filter((c) => {
    const q = searchQuery.toLowerCase();
    const cardStr = (c.card_number || '').toLowerCase();
    const regStr = (c.linked_vehicle_reg || c.vehicle_registration || '').toLowerCase();
    return cardStr.includes(q) || regStr.includes(q);
  });

  return (
    <div className="px-6 py-5 space-y-4">
      {/* Top Header */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-slate-900">
              IGL CNG Smart Card Master
            </h2>
            <span className="text-xs px-2.5 py-0.5 font-bold bg-cyan-50 text-cyan-700 border border-cyan-200 rounded-md">
              Total Cards: {cards.length}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Prepaid card management for CNG fleet refueling, card limits, linked vehicles, and current balance status.
          </p>
        </div>

        {canEdit && (
          <button
            onClick={handleOpenAdd}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-cyan-600 hover:bg-cyan-700 rounded-lg transition-colors shadow-2xs cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Issue New Card
          </button>
        )}
      </div>

      {/* Filter / Search Bar */}
      <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs flex items-center justify-between gap-3">
        <div className="relative w-72">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search card number or vehicle registration..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-cyan-500"
          />
        </div>
        <span className="text-xs text-slate-400">
          Showing <b>{filtered.length}</b> cards
        </span>
      </div>

      {/* Cards Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50/90 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10.5px]">
                <th className="py-3 px-4">CARD NUMBER</th>
                <th className="py-3 px-4">LINKED VEHICLE</th>
                <th className="py-3 px-4">FUEL COMPLIANCE</th>
                <th className="py-3 px-4 text-right">BALANCE (₹)</th>
                <th className="py-3 px-4 text-right">MONTHLY LIMIT (₹)</th>
                <th className="py-3 px-4 text-center">STATUS</th>
                <th className="py-3 px-4 text-right">ACTIONS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-800 font-medium">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    No IGL cards found matching search.
                  </td>
                </tr>
              ) : (
                filtered.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-900 flex items-center gap-2">
                      <CreditCard className="w-4 h-4 text-cyan-600" />
                      {c.card_number}
                    </td>
                    <td className="py-3.5 px-4 font-bold text-cyan-700">
                      {c.linked_vehicle_reg}
                    </td>
                    <td className="py-3.5 px-4 text-slate-600">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        CNG Fuel Only
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono font-bold text-emerald-700">
                      {formatINR(c.balance_amount)}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono text-slate-600">
                      {formatINR(c.monthly_limit)}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        c.status === 'Active' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                        c.status === 'Blocked' ? 'bg-rose-50 text-rose-700 border border-rose-200' :
                        'bg-slate-100 text-slate-600'
                      }`}>
                        {c.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      {canEdit && (
                        <button
                          onClick={() => handleOpenEdit(c)}
                          className="p-1 text-slate-400 hover:text-cyan-600 hover:bg-cyan-50 rounded transition-colors cursor-pointer"
                          title="Edit Card Limits"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <h3 className="font-bold text-slate-900 text-sm">
                {editingId ? 'Edit IGL Smart Card' : 'Issue New IGL Smart Card'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Card Number
                </label>
                <input
                  type="text"
                  value={cardNo}
                  onChange={(e) => setCardNo(e.target.value)}
                  className="w-full text-xs font-mono font-bold bg-white border border-slate-300 rounded-lg p-2.5 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Linked Vehicle
                </label>
                <select
                  value={vehicleReg}
                  onChange={(e) => setVehicleReg(e.target.value)}
                  className="w-full text-xs font-semibold bg-slate-50 border border-slate-300 rounded-lg p-2.5 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                  required
                >
                  {vehicles.map((v) => (
                    <option key={v.id} value={v.registration_number}>
                      {v.registration_number} — {v.vehicle_type} ({v.fuel_type})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Balance (₹)
                  </label>
                  <input
                    type="number"
                    value={balance}
                    onChange={(e) => setBalance(parseFloat(e.target.value))}
                    className="w-full text-xs font-mono bg-white border border-slate-300 rounded-lg p-2.5 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Monthly Limit (₹)
                  </label>
                  <input
                    type="number"
                    value={monthlyLimit}
                    onChange={(e) => setMonthlyLimit(parseFloat(e.target.value))}
                    className="w-full text-xs font-mono bg-white border border-slate-300 rounded-lg p-2.5 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Card Status
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as any)}
                  className="w-full text-xs bg-slate-50 border border-slate-300 rounded-lg p-2.5 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                >
                  <option value="Active">Active</option>
                  <option value="Blocked">Blocked</option>
                  <option value="Expired">Expired</option>
                </select>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold text-white bg-cyan-600 hover:bg-cyan-700 rounded-lg shadow-xs cursor-pointer"
                >
                  Save Card
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
