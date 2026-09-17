import React from 'react';
import { Users, Shield, Check, X, ShieldAlert, Key } from 'lucide-react';
import { UserAccount, UserRole } from '../types/fleet';

interface UsersViewProps {
  currentUser: UserAccount;
  onRoleChange: (role: UserRole) => void;
}

export const UsersView: React.FC<UsersViewProps> = ({ currentUser, onRoleChange }) => {
  const roles: {
    role: UserRole;
    name: string;
    description: string;
    permissions: { [key: string]: boolean };
  }[] = [
    {
      role: 'Admin',
      name: 'Super Administrator',
      description: 'Full unrestricted system access, master configuration, user roles & audit logs.',
      permissions: {
        'Manage Vehicles': true,
        'Edit Mileage Standards': true,
        'Correct GPS Daily KM': true,
        'Manage Fuel Refills': true,
        'Access Export & Reports': true,
        'Manage Roles & Security': true,
      },
    },
    {
      role: 'Operations',
      name: 'Fleet Operations Lead',
      description: 'Fleet vehicle registration, GPS synchronization, device pairing & trip corrections.',
      permissions: {
        'Manage Vehicles': true,
        'Edit Mileage Standards': false,
        'Correct GPS Daily KM': true,
        'Manage Fuel Refills': false,
        'Access Export & Reports': true,
        'Manage Roles & Security': false,
      },
    },
    {
      role: 'Accounts',
      name: 'Accounts & Billing Manager',
      description: 'Fuel expense reconciliation, IGL CNG Smart Card ledger and payment validation.',
      permissions: {
        'Manage Vehicles': false,
        'Edit Mileage Standards': false,
        'Correct GPS Daily KM': false,
        'Manage Fuel Refills': true,
        'Access Export & Reports': true,
        'Manage Roles & Security': false,
      },
    },
    {
      role: 'Management',
      name: 'Executive Management',
      description: 'High-level dashboard KPIs, performance benchmarking and compliance reports.',
      permissions: {
        'Manage Vehicles': false,
        'Edit Mileage Standards': false,
        'Correct GPS Daily KM': false,
        'Manage Fuel Refills': false,
        'Access Export & Reports': true,
        'Manage Roles & Security': false,
      },
    },
    {
      role: 'Viewer',
      name: 'Read-Only Auditor',
      description: 'Audit viewing access with strict write and correction locks.',
      permissions: {
        'Manage Vehicles': false,
        'Edit Mileage Standards': false,
        'Correct GPS Daily KM': false,
        'Manage Fuel Refills': false,
        'Access Export & Reports': false,
        'Manage Roles & Security': false,
      },
    },
  ];

  return (
    <div className="px-6 py-5 space-y-5">
      {/* Header */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Shield className="w-5 h-5 text-cyan-600" />
            Role-Based Access Control (RBAC)
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Enforces strict access controls across Operations, Accounts, Management, and Admins.
          </p>
        </div>

        <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200">
          <span className="text-xs text-slate-500">Current Active Session:</span>
          <span className="text-xs font-bold text-cyan-700 bg-cyan-50 border border-cyan-200 px-2 py-0.5 rounded">
            {currentUser.name} ({currentUser.role})
          </span>
        </div>
      </div>

      {/* Role Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {roles.map((r) => {
          const isCurrent = currentUser.role === r.role;
          return (
            <div
              key={r.role}
              className={`bg-white rounded-xl p-5 border transition-all flex flex-col justify-between shadow-2xs ${
                isCurrent ? 'border-cyan-500 ring-2 ring-cyan-100' : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-bold text-slate-900 text-sm">
                    {r.name}
                  </h3>
                  <span
                    className={`text-[10.5px] font-bold px-2 py-0.5 rounded-full ${
                      isCurrent
                        ? 'bg-cyan-100 text-cyan-800'
                        : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {r.role}
                  </span>
                </div>
                <p className="text-xs text-slate-500 leading-relaxed mb-4">
                  {r.description}
                </p>

                {/* Permissions checklist */}
                <div className="space-y-1.5 border-t border-slate-100 pt-3 text-xs">
                  {Object.entries(r.permissions).map(([perm, granted]) => (
                    <div key={perm} className="flex items-center justify-between text-[11.5px]">
                      <span className={granted ? 'text-slate-700 font-medium' : 'text-slate-400'}>
                        {perm}
                      </span>
                      {granted ? (
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                      ) : (
                        <X className="w-3.5 h-3.5 text-slate-300" />
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-4 mt-4 border-t border-slate-100">
                <button
                  onClick={() => onRoleChange(r.role)}
                  className={`w-full py-2 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                    isCurrent
                      ? 'bg-cyan-50 text-cyan-700 border border-cyan-300'
                      : 'bg-slate-900 text-white hover:bg-slate-800'
                  }`}
                >
                  {isCurrent ? 'Current Active Role' : `Switch to ${r.role}`}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
