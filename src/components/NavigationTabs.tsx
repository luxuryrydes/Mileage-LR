import React from 'react';
import {
  LayoutDashboard,
  Car,
  Fuel,
  CreditCard,
  CalendarDays,
  Gauge,
  SlidersHorizontal,
  Bell,
  FileBarChart,
  Users,
  History,
} from 'lucide-react';

export type TabKey =
  | 'dashboard'
  | 'vehicles'
  | 'fuel'
  | 'cng_cards'
  | 'daily_gps'
  | 'mileage_performance'
  | 'mileage_standards'
  | 'alerts'
  | 'reports'
  | 'users'
  | 'audit_logs';

interface NavigationTabsProps {
  activeTab: TabKey;
  onTabChange: (tab: TabKey) => void;
  alertsCount: number;
}

export const NavigationTabs: React.FC<NavigationTabsProps> = ({
  activeTab,
  onTabChange,
  alertsCount,
}) => {
  const tabs = [
    { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { key: 'vehicles', label: 'Vehicles', icon: Car },
    { key: 'fuel', label: 'Fuel Records', icon: Fuel },
    { key: 'cng_cards', label: 'CNG Cards', icon: CreditCard },
    { key: 'daily_gps', label: 'Daily View', icon: CalendarDays },
    { key: 'mileage_performance', label: 'Mileage Performance', icon: Gauge },
    { key: 'mileage_standards', label: 'Mileage Standards', icon: SlidersHorizontal },
    { key: 'alerts', label: 'Alerts', icon: Bell, badge: alertsCount > 0 ? alertsCount : undefined },
    { key: 'reports', label: 'Reports', icon: FileBarChart },
    { key: 'users', label: 'Users', icon: Users },
    { key: 'audit_logs', label: 'Audit Logs', icon: History },
  ];

  return (
    <nav className="px-6 py-2 border-b border-slate-200 bg-white">
      <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pb-0.5">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => onTabChange(tab.key as TabKey)}
              className={`inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg whitespace-nowrap transition-all cursor-pointer ${
                isActive
                  ? 'bg-cyan-500 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-500'}`} />
              <span>{tab.label}</span>
              {tab.badge && (
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                    isActive ? 'bg-white text-cyan-700' : 'bg-rose-100 text-rose-700'
                  }`}
                >
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};
