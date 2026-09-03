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
      <div
        className="relative w-full max-w-2xl rounded-3xl border shadow-2xl p-6 sm:p-8 max-h-[90vh] overflow-y-auto space-y-6"
        style={{
          backgroundColor: 'var(--color-surface)',
          borderColor: 'var(--color-border)',
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b pb-4" style={{ borderColor: 'var(--color-border)' }}>
          <div className="flex items-center space-x-3">
            <div
              className="w-10 h-10 rounded-2xl border flex items-center justify-center"
              style={{
                backgroundColor: 'rgba(16, 185, 129, 0.1)',
                borderColor: 'rgba(16, 185, 129, 0.3)',
                color: '#10b981',
              }}
            >
              <ShieldCheck className="w-6 h-6 text-emerald-500" />
            </div>
            <div>
              <h3 className="text-lg font-bold font-serif-display" style={{ color: 'var(--color-text)' }}>
                Security & Isolation Architecture
              </h3>
              <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                Cloud Firestore Data Isolation & Secret Zero-Hardcoding Standard
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl transition-colors cursor-pointer"
            style={{ color: 'var(--color-text-muted)' }}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Live Session Security Status */}
        <div
          className="p-4 rounded-2xl border space-y-2 text-xs"
          style={{
            backgroundColor: 'rgba(16, 185, 129, 0.08)',
            borderColor: 'rgba(16, 185, 129, 0.25)',
          }}
        >
          <div className="flex items-center justify-between font-semibold text-emerald-600 dark:text-emerald-400">
            <span className="flex items-center space-x-1.5">
              <CheckCircle className="w-4 h-4 text-emerald-500" />
              <span>Active Firestore Security Isolation</span>
            </span>
            <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 font-mono text-[11px] border border-emerald-500/30">
              STRICT_OWNER_BOUND
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2">
            <div
              className="p-2.5 rounded-xl border"
              style={{
                backgroundColor: 'var(--color-surface-elevated)',
                borderColor: 'var(--color-border)',
              }}
            >
              <span className="font-semibold block text-[10px] uppercase" style={{ color: 'var(--color-text-muted)' }}>
                Current Firebase UID
              </span>
              <span className="font-mono text-[11px] truncate block" style={{ color: 'var(--color-text)' }}>
                {user?.uid || 'Unauthenticated'}
              </span>
            </div>

            <div
              className="p-2.5 rounded-xl border"
              style={{
                backgroundColor: 'var(--color-surface-elevated)',
                borderColor: 'var(--color-border)',
              }}
            >
              <span className="font-semibold block text-[10px] uppercase" style={{ color: 'var(--color-text-muted)' }}>
                Firestore Access Boundary
              </span>
              <span className="font-mono text-[11px] truncate block" style={{ color: 'var(--color-text)' }}>
                /users/{user?.uid ? user.uid.slice(0, 10) + '...' : '{uid}'}/journals
              </span>
            </div>
          </div>
        </div>

        {/* 4 Pillars Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div
            className="p-4 rounded-2xl border space-y-2"
            style={{
              backgroundColor: 'var(--color-surface-elevated)',
              borderColor: 'var(--color-border)',
            }}
          >
            <div className="flex items-center space-x-2 font-semibold text-xs" style={{ color: 'var(--color-text)' }}>
              <Lock className="w-4 h-4" style={{ color: 'var(--color-accent)' }} />
              <span>User-Isolated Firestore Rules</span>
            </div>
            <p className="text-[11px] leading-relaxed" style={{ color: 'var(--color-text-muted)' }}>
              Rules strictly enforce <code className="px-1 py-0.5 rounded font-mono text-[10px] border" style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)', color: 'var(--color-accent-text)' }}>request.auth.uid == userId</code>. No user can read or write documents belonging to another user.
            </p>
          </div>

          <div
            className="p-4 rounded-2xl border space-y-2"
            style={{
              backgroundColor: 'var(--color-surface-elevated)',
              borderColor: 'var(--color-border)',
            }}
          >
            <div className="flex items-center space-x-2 font-semibold text-xs" style={{ color: 'var(--color-text)' }}>
              <Key className="w-4 h-4 text-emerald-500" />
              <span>Zero-Hardcoded Secrets</span>
            </div>
            <p className="text-[11px] leading-relaxed" style={{ color: 'var(--color-text-muted)' }}>
              Gemini API keys are protected in Google Cloud Secret Manager / server-side env vars (<code className="px-1 py-0.5 rounded font-mono text-[10px] border" style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)', color: 'var(--color-accent-text)' }}>process.env.GEMINI_API_KEY</code>) and never exposed to the client.
            </p>
          </div>

          <div
            className="p-4 rounded-2xl border space-y-2"
            style={{
              backgroundColor: 'var(--color-surface-elevated)',
              borderColor: 'var(--color-border)',
            }}
          >
            <div className="flex items-center space-x-2 font-semibold text-xs" style={{ color: 'var(--color-text)' }}>
              <ShieldCheck className="w-4 h-4" style={{ color: 'var(--color-accent)' }} />
              <span>Role-Based Access Control (RBAC)</span>
            </div>
            <p className="text-[11px] leading-relaxed" style={{ color: 'var(--color-text-muted)' }}>
              Elevated administrative endpoints (<code className="px-1 py-0.5 rounded font-mono text-[10px] border" style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)', color: 'var(--color-accent-text)' }}>/api/admin/*</code>) require verified <code className="px-1 py-0.5 rounded font-mono text-[10px] border" style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)', color: 'var(--color-accent-text)' }}>admin: true</code> custom claims, returning 403 Forbidden for unauthorized callers.
            </p>
          </div>

          <div
            className="p-4 rounded-2xl border space-y-2"
            style={{
              backgroundColor: 'var(--color-surface-elevated)',
              borderColor: 'var(--color-border)',
            }}
          >
            <div className="flex items-center space-x-2 font-semibold text-xs" style={{ color: 'var(--color-text)' }}>
              <Cpu className="w-4 h-4 text-blue-500" />
              <span>Resilient Model Fallback Ladder</span>
            </div>
            <p className="text-[11px] leading-relaxed" style={{ color: 'var(--color-text-muted)' }}>
              Server employs automated fallback across: <code className="font-mono text-[10px] font-semibold" style={{ color: 'var(--color-accent-text)' }}>gemini-3.6-flash</code> &rarr; <code className="font-mono text-[10px] font-semibold" style={{ color: 'var(--color-accent-text)' }}>gemini-3.1-flash-lite</code> &rarr; <code className="font-mono text-[10px] font-semibold" style={{ color: 'var(--color-accent-text)' }}>gemini-flash-latest</code> &rarr; <code className="font-mono text-[10px] font-semibold" style={{ color: 'var(--color-accent-text)' }}>gemini-3.7-flash</code>.
            </p>
          </div>

          <div
            className="p-4 rounded-2xl border space-y-2"
            style={{
              backgroundColor: 'var(--color-surface-elevated)',
              borderColor: 'var(--color-border)',
            }}
          >
            <div className="flex items-center space-x-2 font-semibold text-xs" style={{ color: 'var(--color-text)' }}>
              <Database className="w-4 h-4 text-purple-500" />
              <span>Zero-Crash Payload Hygiene</span>
            </div>
            <p className="text-[11px] leading-relaxed" style={{ color: 'var(--color-text-muted)' }}>
              All write payloads are sanitized to strip <code className="px-1 py-0.5 rounded font-mono text-[10px] border" style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)', color: 'var(--color-accent-text)' }}>undefined</code> values recursively before reaching Firestore.
            </p>
          </div>

          <div
            className="p-4 rounded-2xl border space-y-2 sm:col-span-2"
            style={{
              backgroundColor: 'var(--color-surface-elevated)',
              borderColor: 'var(--color-border)',
            }}
          >
            <div className="flex items-center space-x-2 font-semibold text-xs" style={{ color: 'var(--color-text)' }}>
              <ShieldCheck className="w-4 h-4" style={{ color: 'var(--color-accent)' }} />
              <span>Google Maps Platform & Location Privacy Standard</span>
            </div>
            <p className="text-[11px] leading-relaxed" style={{ color: 'var(--color-text-muted)' }}>
              Location data pinned to journal entries is strictly isolated within the user's private Firestore document (<code className="px-1 py-0.5 rounded font-mono text-[10px] border" style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)', color: 'var(--color-accent-text)' }}>/users/&#123;userId&#125;/journals</code>). Map API keys are managed via environment injection (<code className="px-1 py-0.5 rounded font-mono text-[10px] border" style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)', color: 'var(--color-accent-text)' }}>VITE_GOOGLE_MAPS_API_KEY</code>) or zero-cost Maps Demo Keys with HTTP Referrer restrictions.
            </p>
          </div>
        </div>

        {/* Footer info */}
        <div className="pt-3 border-t flex justify-end" style={{ borderColor: 'var(--color-border)' }}>
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
