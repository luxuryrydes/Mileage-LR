import React, { useState } from 'react';
import { Download, Smartphone } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

interface PWAInstallButtonProps {
  onOpenApkModal: () => void;
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({ onOpenApkModal }) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();

  // If already installed as PWA or in standalone mode, still show the APK / App modal trigger so they can share or package
  if (isInstalled) {
    return (
      <button
        onClick={onOpenApkModal}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors border border-slate-300"
        title="App Installed - View APK & Mobile details"
      >
        <Smartphone className="w-3.5 h-3.5 text-sky-600" />
        <span className="hidden sm:inline">Mobile App / APK</span>
      </button>
    );
  }

  return (
    <div className="flex items-center gap-1.5">
      {isInstallable && (
        <button
          onClick={install}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition-colors cursor-pointer"
          title="Install Mileage Soft on this device"
        >
          <Download className="w-3.5 h-3.5 animate-bounce" />
          <span className="hidden sm:inline">Install App</span>
        </button>
      )}

      <button
        onClick={onOpenApkModal}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-sky-50 hover:bg-sky-100 text-sky-700 border border-sky-200 transition-colors cursor-pointer"
        title="Download APK / Mobile App instructions"
      >
        <Smartphone className="w-3.5 h-3.5 text-sky-600" />
        <span>APK / Install</span>
      </button>
    </div>
  );
};
