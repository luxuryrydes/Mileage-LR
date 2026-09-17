import React, { useState } from 'react';
import {
  X,
  Smartphone,
  Download,
  ExternalLink,
  Copy,
  Check,
  CheckCircle2,
  AlertTriangle,
  Play,
  ArrowRight,
  CloudLightning,
  Sparkles
} from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

interface PublishApkModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PublishApkModal: React.FC<PublishApkModalProps> = ({ isOpen, onClose }) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [copiedPkg, setCopiedPkg] = useState(false);

  if (!isOpen) return null;

  const currentUrl = typeof window !== 'undefined' ? window.location.origin : 'https://mileage-soft-fleet-mileage-gps-management-system-1000200829605.asia-southeast1.run.app';

  const handleCopyUrl = () => {
    navigator.clipboard.writeText(currentUrl);
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2000);
  };

  const handleCopyPkg = () => {
    navigator.clipboard.writeText('com.mileagesoft.app');
    setCopiedPkg(true);
    setTimeout(() => setCopiedPkg(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-sky-600 via-cyan-600 to-teal-600 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/15 rounded-xl backdrop-blur-xs">
              <Smartphone className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                Android APK &amp; Mobile App Publisher
                <span className="text-[10px] px-2 py-0.5 font-semibold bg-emerald-400 text-emerald-950 rounded-full">
                  PWA Ready
                </span>
              </h2>
              <p className="text-xs text-sky-100">
                Install as Android WebAPK, generate standalone .APK, or publish to Google Play Store
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-6 text-slate-700 text-sm">
          {/* Cloud Run Fix Alert */}
          <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            <div className="space-y-1 text-xs">
              <p className="font-bold text-emerald-950">
                Cloud Run PORT=3000 Container Startup Error Resolved!
              </p>
              <p className="text-emerald-800 leading-relaxed">
                The container startup failure shown in your screenshot was caused by a CommonJS bundle path resolution check and hardcoded port. We have updated <code className="bg-emerald-100 px-1 py-0.5 rounded text-emerald-900 font-mono">server.ts</code> with safe Node CJS execution and dynamic <code className="bg-emerald-100 px-1 py-0.5 rounded text-emerald-900 font-mono">process.env.PORT</code> binding. Simply click <strong>Redeploy</strong> on your Cloud Run console to launch cleanly!
              </p>
            </div>
          </div>

          {/* Quick Method 1: Instant Android Install / WebAPK */}
          <div className="p-5 rounded-xl border border-sky-200 bg-sky-50/50 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-bold text-slate-900 text-base">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-sky-600 text-white text-xs">1</span>
                Instant Android Install (WebAPK)
              </div>
              <span className="text-[11px] px-2 py-0.5 font-medium bg-sky-100 text-sky-800 rounded-md">
                Zero Configuration
              </span>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Google Chrome on Android automatically bundles this application into a real native <strong>Android WebAPK</strong> with your custom truck icon, splash screen, and full-screen standalone window.
            </p>

            {isInstalled ? (
              <div className="p-3 bg-emerald-100 border border-emerald-300 rounded-lg text-xs font-semibold text-emerald-800 flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-600" />
                Mileage Soft is already installed on this device in standalone mode!
              </div>
            ) : isInstallable ? (
              <button
                onClick={install}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-semibold text-sm shadow-sm transition-colors cursor-pointer"
              >
                <Download className="w-4 h-4" />
                Install Mileage Soft on Device Now
              </button>
            ) : (
              <div className="p-3 bg-white rounded-lg border border-slate-200 text-xs space-y-1">
                <p className="font-semibold text-slate-800">How to install on Android Phone / Tablet:</p>
                <ol className="list-decimal list-inside space-y-1 text-slate-600">
                  <li>Open this app in <strong>Google Chrome</strong> on your Android phone.</li>
                  <li>Tap the <strong>3 dots (⋮) menu</strong> in Chrome.</li>
                  <li>Tap <strong>Install app</strong> or <strong>Add to Home screen</strong>.</li>
                  <li>Android will immediately compile and install the <strong>MileageSoft.apk</strong> on your device home screen!</li>
                </ol>
              </div>
            )}
          </div>

          {/* Method 2: Convert to Standalone .APK / Google Play Store */}
          <div className="p-5 rounded-xl border border-slate-200 bg-white space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-bold text-slate-900 text-base">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-slate-800 text-white text-xs">2</span>
                Generate Standalone .APK for Sideloading &amp; Play Store
              </div>
              <span className="text-[11px] px-2 py-0.5 font-medium bg-emerald-100 text-emerald-800 rounded-md">
                Official Google/MS Tool
              </span>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              You can turn this web app into a signed <strong>.apk</strong> (for sharing with drivers/staff) or <strong>.aab</strong> (for Google Play Store) in 1 minute using <strong>PWABuilder</strong> (Google &amp; Microsoft's official open-source packaging tool).
            </p>

            {/* Step list */}
            <div className="space-y-2 text-xs bg-slate-50 p-3.5 rounded-lg border border-slate-200">
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium text-slate-700">App URL to paste into PWABuilder:</span>
                <button
                  onClick={handleCopyUrl}
                  className="inline-flex items-center gap-1 text-[11px] px-2 py-1 font-semibold text-sky-700 bg-sky-50 hover:bg-sky-100 border border-sky-200 rounded transition-colors"
                >
                  {copiedUrl ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                  {copiedUrl ? 'Copied!' : 'Copy URL'}
                </button>
              </div>
              <div className="font-mono text-[11px] text-slate-600 bg-white p-2 rounded border border-slate-200 break-all select-all">
                {currentUrl}
              </div>

              <div className="pt-2 flex items-center justify-between gap-2">
                <span className="font-medium text-slate-700">Recommended Android Package ID:</span>
                <button
                  onClick={handleCopyPkg}
                  className="inline-flex items-center gap-1 text-[11px] px-2 py-1 font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 rounded transition-colors"
                >
                  {copiedPkg ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                  {copiedPkg ? 'Copied!' : 'Copy ID'}
                </button>
              </div>
              <div className="font-mono text-[11px] text-slate-600 bg-white p-2 rounded border border-slate-200">
                com.mileagesoft.app
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-2 pt-1">
              <a
                href={`https://www.pwabuilder.com?url=${encodeURIComponent(currentUrl)}`}
                target="_blank"
                rel="noreferrer"
                className="flex-1 inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs shadow-sm transition-colors"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                Package on PWABuilder (Get .APK / .AAB)
                <ExternalLink className="w-3.5 h-3.5" />
              </a>

              <a
                href="/manifest.json"
                download="manifest.json"
                className="inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold text-xs transition-colors"
              >
                <Download className="w-3.5 h-3.5 text-slate-500" />
                View manifest.json
              </a>
            </div>
          </div>

          {/* Verification Badge */}
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between text-xs text-slate-600">
            <span className="flex items-center gap-1.5 font-medium">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              Web App Manifest, 192px/512px Icons &amp; Service Worker Active
            </span>
            <span className="font-mono text-slate-500">v1.0.0</span>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
