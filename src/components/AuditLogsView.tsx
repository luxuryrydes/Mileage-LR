import React, { useState } from 'react';
import { History, Search, Filter, Clock, User, Shield } from 'lucide-react';
import { AuditLog } from '../types/fleet';

interface AuditLogsViewProps {
  logs: AuditLog[];
}

export const AuditLogsView: React.FC<AuditLogsViewProps> = ({ logs }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterEntity, setFilterEntity] = useState('All');

  const filtered = logs.filter((log) => {
    if (filterEntity !== 'All' && log.entity_type !== filterEntity) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        log.user_name.toLowerCase().includes(q) ||
        log.action.toLowerCase().includes(q) ||
        log.entity_id.toLowerCase().includes(q) ||
        log.details.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="px-6 py-5 space-y-4">
      {/* Top Header */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <History className="w-5 h-5 text-cyan-600" />
            System Audit Trail & Change Logs
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Immutable log tracking all GPS kilometre manual corrections, fuel modifications, standard benchmark alterations, and vehicle additions.
          </p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs flex items-center justify-between gap-3">
        <div className="relative w-72">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search action, user, vehicle..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-cyan-500"
          />
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500">Filter Entity:</span>
          <select
            value={filterEntity}
            onChange={(e) => setFilterEntity(e.target.value)}
            className="text-xs bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-cyan-500"
          >
            <option value="All">All Entities</option>
            <option value="GPS_KM">GPS KM</option>
            <option value="FUEL_RECORD">Fuel Record</option>
            <option value="MILEAGE_STANDARD">Mileage Standard</option>
            <option value="VEHICLE">Vehicle Master</option>
          </select>
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50/90 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10.5px]">
                <th className="py-3 px-4">TIMESTAMP</th>
                <th className="py-3 px-4">USER</th>
                <th className="py-3 px-4">ROLE</th>
                <th className="py-3 px-4">ACTION</th>
                <th className="py-3 px-4">ENTITY</th>
                <th className="py-3 px-4">AUDIT DETAILS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-800 font-medium">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    No audit records matching query.
                  </td>
                </tr>
              ) : (
                filtered.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3 px-4 font-mono text-slate-500 text-[11px] whitespace-nowrap">
                      {new Date(log.timestamp).toLocaleString('en-IN')}
                    </td>
                    <td className="py-3 px-4 font-bold text-slate-900">
                      {log.user_name}
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                        {log.role}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-semibold text-cyan-700">
                        {log.action}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-600 text-[11px]">
                      {log.entity_type}
                    </td>
                    <td className="py-3 px-4 text-slate-700 max-w-md">
                      {log.details}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
