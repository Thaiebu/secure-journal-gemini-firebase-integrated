import React from 'react';
import { UserProfile } from '../types';
import { ShieldCheck, Lock, Key, Database, Cpu, X, CheckCircle, ExternalLink } from 'lucide-react';

interface SecurityModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: UserProfile | null;
}

export const SecurityModal: React.FC<SecurityModalProps> = ({
  isOpen,
  onClose,
  user,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
      <div className="relative w-full max-w-2xl bg-[#141414] rounded-3xl border border-neutral-800 shadow-2xl p-6 sm:p-8 max-h-[90vh] overflow-y-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-neutral-800 pb-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center">
              <ShieldCheck className="w-6 h-6 text-emerald-400" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-neutral-100 font-serif-display">
                Security & Isolation Architecture
              </h3>
              <p className="text-xs text-neutral-400">
                Cloud Firestore Data Isolation & Secret Zero-Hardcoding Standard
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-neutral-400 hover:text-neutral-100 rounded-xl hover:bg-neutral-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Live Session Security Status */}
        <div className="p-4 rounded-2xl bg-emerald-950/20 border border-emerald-800/40 space-y-2 text-xs">
          <div className="flex items-center justify-between font-semibold text-emerald-300">
            <span className="flex items-center space-x-1.5">
              <CheckCircle className="w-4 h-4 text-emerald-400" />
              <span>Active Firestore Security Isolation</span>
            </span>
            <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-mono text-[11px] border border-emerald-500/30">
              STRICT_OWNER_BOUND
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 text-neutral-300">
            <div className="p-2.5 rounded-xl bg-[#1a1a1a] border border-neutral-800">
              <span className="font-semibold text-neutral-400 block text-[10px] uppercase">
                Current Firebase UID
              </span>
              <span className="font-mono text-[11px] truncate block text-neutral-100">
                {user?.uid || 'Unauthenticated'}
              </span>
            </div>

            <div className="p-2.5 rounded-xl bg-[#1a1a1a] border border-neutral-800">
              <span className="font-semibold text-neutral-400 block text-[10px] uppercase">
                Firestore Access Boundary
              </span>
              <span className="font-mono text-[11px] truncate block text-neutral-100">
                /users/{user?.uid ? user.uid.slice(0, 10) + '...' : '{uid}'}/journals
              </span>
            </div>
          </div>
        </div>

        {/* 4 Pillars Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="p-4 rounded-2xl bg-[#181818] border border-neutral-800 space-y-2">
            <div className="flex items-center space-x-2 text-neutral-100 font-semibold text-xs">
              <Lock className="w-4 h-4 text-amber-400" />
              <span>User-Isolated Firestore Rules</span>
            </div>
            <p className="text-[11px] text-neutral-400 leading-relaxed">
              Rules strictly enforce <code className="bg-neutral-800 px-1 py-0.5 rounded font-mono text-[10px] text-amber-300">request.auth.uid == userId</code>. No user can read or write documents belonging to another user.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-[#181818] border border-neutral-800 space-y-2">
            <div className="flex items-center space-x-2 text-neutral-100 font-semibold text-xs">
              <Key className="w-4 h-4 text-emerald-400" />
              <span>Zero-Hardcoded Secrets</span>
            </div>
            <p className="text-[11px] text-neutral-400 leading-relaxed">
              Gemini API keys are protected in Google Cloud Secret Manager / server-side env vars (<code className="bg-neutral-800 px-1 py-0.5 rounded font-mono text-[10px] text-emerald-300">process.env.GEMINI_API_KEY</code>) and never exposed to the client.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-[#181818] border border-neutral-800 space-y-2">
            <div className="flex items-center space-x-2 text-neutral-100 font-semibold text-xs">
              <ShieldCheck className="w-4 h-4 text-amber-400" />
              <span>Role-Based Access Control (RBAC)</span>
            </div>
            <p className="text-[11px] text-neutral-400 leading-relaxed">
              Elevated administrative endpoints (<code className="bg-neutral-800 px-1 py-0.5 rounded font-mono text-[10px] text-amber-300">/api/admin/*</code>) require verified <code className="bg-neutral-800 px-1 py-0.5 rounded font-mono text-[10px] text-amber-300">admin: true</code> custom claims, returning 403 Forbidden for unauthorized callers.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-[#181818] border border-neutral-800 space-y-2">
            <div className="flex items-center space-x-2 text-neutral-100 font-semibold text-xs">
              <Cpu className="w-4 h-4 text-blue-400" />
              <span>Resilient Model Fallback Ladder</span>
            </div>
            <p className="text-[11px] text-neutral-400 leading-relaxed">
              Server employs automated fallback across: <code className="text-blue-300 font-mono text-[10px]">gemini-3.6-flash</code> &rarr; <code className="text-blue-300 font-mono text-[10px]">gemini-3.1-flash-lite</code> &rarr; <code className="text-blue-300 font-mono text-[10px]">gemini-flash-latest</code> &rarr; <code className="text-blue-300 font-mono text-[10px]">gemini-3.7-flash</code>.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-[#181818] border border-neutral-800 space-y-2">
            <div className="flex items-center space-x-2 text-neutral-100 font-semibold text-xs">
              <Database className="w-4 h-4 text-purple-400" />
              <span>Zero-Crash Payload Hygiene</span>
            </div>
            <p className="text-[11px] text-neutral-400 leading-relaxed">
              All write payloads are sanitized to strip <code className="bg-neutral-800 px-1 py-0.5 rounded font-mono text-[10px] text-purple-300">undefined</code> values recursively before reaching Firestore.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-[#181818] border border-neutral-800 space-y-2 sm:col-span-2">
            <div className="flex items-center space-x-2 text-neutral-100 font-semibold text-xs">
              <ShieldCheck className="w-4 h-4 text-amber-400" />
              <span>Google Maps Platform & Location Privacy Standard</span>
            </div>
            <p className="text-[11px] text-neutral-400 leading-relaxed">
              Location data pinned to journal entries is strictly isolated within the user's private Firestore document (<code className="bg-neutral-800 px-1 py-0.5 rounded font-mono text-[10px] text-amber-300">/users/&#123;userId&#125;/journals</code>). Map API keys are managed via environment injection (<code className="bg-neutral-800 px-1 py-0.5 rounded font-mono text-[10px] text-amber-300">VITE_GOOGLE_MAPS_API_KEY</code>) or zero-cost Maps Demo Keys with HTTP Referrer restrictions.
            </p>
          </div>
        </div>

        {/* Footer info */}
        <div className="pt-3 border-t border-neutral-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 text-xs font-bold transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
