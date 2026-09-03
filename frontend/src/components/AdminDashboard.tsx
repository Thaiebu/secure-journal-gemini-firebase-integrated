import React, { useState, useEffect } from 'react';
import { UserProfile, AdminMetrics, AdminUserItem } from '../types';
import {
  fetchAdminMetrics,
  fetchAdminUsers,
  promoteUserToAdmin,
  demoteUserRole,
} from '../services/adminService';
import {
  ShieldAlert,
  ShieldCheck,
  Users,
  Activity,
  Zap,
  MapPin,
  RefreshCw,
  UserCheck,
  UserX,
  Lock,
  Search,
  Server,
  Terminal,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';

interface AdminDashboardProps {
  currentUser: UserProfile;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ currentUser }) => {
  const [metrics, setMetrics] = useState<AdminMetrics | null>(null);
  const [users, setUsers] = useState<AdminUserItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [promoteInputUid, setPromoteInputUid] = useState<string>('');
  const [isPromoting, setIsPromoting] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');

  const loadDashboardData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [metricsData, usersData] = await Promise.all([
        fetchAdminMetrics(),
        fetchAdminUsers(),
      ]);
      setMetrics(metricsData);
      setUsers(usersData);
    } catch (err: any) {
      setError(err.message || 'Failed to load administrator metrics. Elevated permissions required.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  const handlePromote = async (uidToPromote: string) => {
    if (!uidToPromote.trim()) return;
    setIsPromoting(true);
    setActionMessage(null);
    try {
      const res = await promoteUserToAdmin(uidToPromote.trim());
      setActionMessage({ type: 'success', text: res.message });
      setPromoteInputUid('');
      await loadDashboardData();
    } catch (err: any) {
      setActionMessage({ type: 'error', text: err.message || 'Promotion failed.' });
    } finally {
      setIsPromoting(false);
    }
  };

  const handleDemote = async (uidToDemote: string) => {
    if (!confirm(`Are you sure you want to demote user ${uidToDemote}?`)) return;
    setActionMessage(null);
    try {
      const res = await demoteUserRole(uidToDemote);
      setActionMessage({ type: 'success', text: res.message });
      await loadDashboardData();
    } catch (err: any) {
      setActionMessage({ type: 'error', text: err.message || 'Demotion failed.' });
    }
  };

  const filteredUsers = users.filter(
    (u) =>
      u.uid.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header Banner */}
      <div
        className="border rounded-2xl p-6 sm:p-8 shadow-xs relative overflow-hidden transition-colors"
        style={{
          backgroundColor: 'var(--color-surface)',
          borderColor: 'var(--color-border)',
        }}
      >
        <div className="absolute right-0 top-0 -mr-16 -mt-16 w-64 h-64 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center space-x-3">
              <div
                className="p-2.5 rounded-xl border flex items-center justify-center shadow-2xs"
                style={{
                  backgroundColor: 'var(--color-accent-subtle)',
                  borderColor: 'var(--color-border)',
                  color: 'var(--color-accent-text)',
                }}
              >
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <h1
                  className="font-serif-display text-xl sm:text-2xl font-bold tracking-tight flex items-center gap-2"
                  style={{ color: 'var(--color-text)' }}
                >
                  Admin Command Center
                  <span
                    className="px-2.5 py-0.5 rounded-full text-xs font-semibold border"
                    style={{
                      backgroundColor: 'var(--color-accent-subtle)',
                      borderColor: 'var(--color-border)',
                      color: 'var(--color-accent-text)',
                    }}
                  >
                    RBAC Enforced
                  </span>
                </h1>
                <p className="text-xs sm:text-sm font-normal mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
                  Role-Based Access Control, Gemini Telemetry &amp; System Security Audit
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <div className="hidden sm:flex flex-col items-end text-xs">
              <span className="font-semibold" style={{ color: 'var(--color-text)' }}>
                {currentUser.email || currentUser.displayName}
              </span>
              <span className="font-mono text-[10px] font-medium" style={{ color: 'var(--color-accent-text)' }}>
                Claims: &#123;admin: true&#125;
              </span>
            </div>
            <button
              id="admin-btn-refresh"
              onClick={loadDashboardData}
              disabled={isLoading}
              className="flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-medium border transition cursor-pointer disabled:opacity-50 shadow-2xs"
              style={{
                backgroundColor: 'var(--color-surface-elevated)',
                borderColor: 'var(--color-border)',
                color: 'var(--color-text)',
              }}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-amber-500' : ''}`} />
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {/* Action feedback message */}
        {actionMessage && (
          <div
            className={`mt-4 p-3 rounded-xl text-xs flex items-center space-x-2 border font-medium ${
              actionMessage.type === 'success'
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-800 dark:text-emerald-300'
                : 'bg-rose-500/10 border-rose-500/30 text-rose-800 dark:text-rose-300'
            }`}
          >
            {actionMessage.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
            ) : (
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600 dark:text-rose-400" />
            )}
            <span>{actionMessage.text}</span>
          </div>
        )}
      </div>

      {/* Error state if not admin */}
      {error && (
        <div className="p-6 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-900 dark:text-rose-200 space-y-3">
          <div className="flex items-center space-x-3">
            <ShieldAlert className="w-6 h-6 text-rose-600 dark:text-rose-400 shrink-0" />
            <div>
              <h3 className="font-semibold text-sm text-rose-800 dark:text-rose-300">HTTP 403 Forbidden: Elevated Permissions Required</h3>
              <p className="text-xs text-rose-700 dark:text-rose-400/90 mt-0.5">{error}</p>
            </div>
          </div>
          <div
            className="p-3.5 rounded-xl border font-mono text-[11px] space-y-1"
            style={{
              backgroundColor: 'var(--color-surface-elevated)',
              borderColor: 'var(--color-border)',
              color: 'var(--color-text)',
            }}
          >
            <div className="font-semibold" style={{ color: 'var(--color-accent-text)' }}>RBAC Threat Countermeasure Active:</div>
            <div style={{ color: 'var(--color-text-muted)' }}>• Backend middleware (require_admin) validates cryptographically signed Firebase ID token.</div>
            <div style={{ color: 'var(--color-text-muted)' }}>• Injected client flags (e.g. state tampering or payload spoofing) are rejected at the server boundary.</div>
          </div>
        </div>
      )}

      {/* Main Metrics Bento Grid */}
      {metrics && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div
            className="p-5 rounded-2xl border space-y-3 shadow-2xs"
            style={{
              backgroundColor: 'var(--color-surface)',
              borderColor: 'var(--color-border)',
            }}
          >
            <div className="flex items-center justify-between" style={{ color: 'var(--color-text-muted)' }}>
              <span className="text-xs font-semibold uppercase tracking-wider">Registered Tenants</span>
              <Users className="w-4 h-4 text-amber-500" />
            </div>
            <div className="flex items-baseline space-x-2">
              <span className="text-2xl font-bold" style={{ color: 'var(--color-text)' }}>{metrics.totalRegisteredUsers}</span>
              <span className="text-xs font-mono" style={{ color: 'var(--color-text-muted)' }}>({metrics.activeSessions} active)</span>
            </div>
            <p className="text-[11px]" style={{ color: 'var(--color-text-muted)' }}>
              Tenant isolation via <code className="font-mono font-semibold" style={{ color: 'var(--color-accent-text)' }}>/users/&#123;uid&#125;</code>
            </p>
          </div>

          <div
            className="p-5 rounded-2xl border space-y-3 shadow-2xs"
            style={{
              backgroundColor: 'var(--color-surface)',
              borderColor: 'var(--color-border)',
            }}
          >
            <div className="flex items-center justify-between" style={{ color: 'var(--color-text-muted)' }}>
              <span className="text-xs font-semibold uppercase tracking-wider">Total Interactions</span>
              <Activity className="w-4 h-4 text-emerald-500" />
            </div>
            <div className="flex items-baseline space-x-2">
              <span className="text-2xl font-bold" style={{ color: 'var(--color-text)' }}>{metrics.totalInteractions}</span>
              <span className="text-xs font-mono" style={{ color: 'var(--color-text-muted)' }}>({metrics.totalJournals} journals)</span>
            </div>
            <p className="text-[11px]" style={{ color: 'var(--color-text-muted)' }}>Committed with zero-loss fallback</p>
          </div>

          <div
            className="p-5 rounded-2xl border space-y-3 shadow-2xs"
            style={{
              backgroundColor: 'var(--color-surface)',
              borderColor: 'var(--color-border)',
            }}
          >
            <div className="flex items-center justify-between" style={{ color: 'var(--color-text-muted)' }}>
              <span className="text-xs font-semibold uppercase tracking-wider">Pinned Places</span>
              <MapPin className="w-4 h-4 text-purple-500" />
            </div>
            <div className="flex items-baseline space-x-2">
              <span className="text-2xl font-bold" style={{ color: 'var(--color-text)' }}>{metrics.totalPinnedLocations}</span>
              <span className="text-xs text-purple-600 dark:text-purple-400 font-mono font-medium">Geo Spots</span>
            </div>
            <p className="text-[11px]" style={{ color: 'var(--color-text-muted)' }}>Google Maps Platform Adv Markers</p>
          </div>

          <div
            className="p-5 rounded-2xl border space-y-3 shadow-2xs"
            style={{
              backgroundColor: 'var(--color-surface)',
              borderColor: 'var(--color-border)',
            }}
          >
            <div className="flex items-center justify-between" style={{ color: 'var(--color-text-muted)' }}>
              <span className="text-xs font-semibold uppercase tracking-wider">System Uptime</span>
              <Server className="w-4 h-4 text-blue-500" />
            </div>
            <div className="flex items-baseline space-x-2">
              <span className="text-2xl font-bold font-mono" style={{ color: 'var(--color-text)' }}>{metrics.uptimeSeconds}s</span>
              <span className="text-xs text-emerald-600 dark:text-emerald-400 font-mono font-semibold">Healthy</span>
            </div>
            <p className="text-[11px]" style={{ color: 'var(--color-text-muted)' }}>{metrics.totalRequests} API calls processed</p>
          </div>
        </div>
      )}

      {/* Model Resilience & Fallback Telemetry */}
      {metrics && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div
            className="lg:col-span-2 p-6 rounded-2xl border space-y-5 shadow-2xs"
            style={{
              backgroundColor: 'var(--color-surface)',
              borderColor: 'var(--color-border)',
            }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <Zap className="w-4 h-4 text-amber-500" />
                <h2 className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>Gemini Model Fallback Ladder Status</h2>
              </div>
              <span className="text-[11px] font-mono" style={{ color: 'var(--color-text-muted)' }}>Auto-Recovery Active</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {metrics.modelLadderHealth.map((tier, idx) => (
                <div
                  key={tier.model}
                  className="p-3.5 rounded-xl border space-y-2"
                  style={{
                    backgroundColor: 'var(--color-surface-elevated)',
                    borderColor: 'var(--color-border)',
                  }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      <span className="font-mono text-xs font-semibold" style={{ color: 'var(--color-text)' }}>{tier.model}</span>
                    </div>
                    <span
                      className="text-[10px] px-1.5 py-0.5 rounded font-mono border"
                      style={{
                        backgroundColor: 'var(--color-surface)',
                        borderColor: 'var(--color-border)',
                        color: 'var(--color-text-muted)',
                      }}
                    >
                      Tier {idx + 1}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px]" style={{ color: 'var(--color-text-muted)' }}>
                    <span>{tier.role}</span>
                    <span className="font-mono font-semibold text-emerald-600 dark:text-emerald-400">{tier.latencyMs}ms</span>
                  </div>
                  <div className="text-[10px] font-mono" style={{ color: 'var(--color-text-muted)' }}>
                    Usage Count: <strong style={{ color: 'var(--color-text)' }}>{metrics.modelFallbackDistribution[tier.model] || 0}</strong>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Promote User Quick Tool */}
          <div
            className="p-6 rounded-2xl border space-y-4 shadow-2xs"
            style={{
              backgroundColor: 'var(--color-surface)',
              borderColor: 'var(--color-border)',
            }}
          >
            <div className="flex items-center space-x-2.5">
              <Lock className="w-4 h-4 text-amber-500" />
              <h2 className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>Grant Elevated Admin Claim</h2>
            </div>
            <p className="text-xs leading-relaxed" style={{ color: 'var(--color-text-muted)' }}>
              Elevates user permissions via <code className="px-1 py-0.5 rounded text-[10px] font-mono font-semibold" style={{ backgroundColor: 'var(--color-surface-elevated)', color: 'var(--color-accent-text)' }}>auth.setCustomUserClaims(uid, &#123;admin: true&#125;)</code>
            </p>

            <div className="space-y-2">
              <label htmlFor="admin-input-uid" className="block text-[11px] font-semibold" style={{ color: 'var(--color-text-muted)' }}>
                User UID or Email
              </label>
              <input
                id="admin-input-uid"
                type="text"
                placeholder="e.g. email_user123 or user@domain.com"
                value={promoteInputUid}
                onChange={(e) => setPromoteInputUid(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border text-xs placeholder:opacity-50 focus:outline-hidden font-mono"
                style={{
                  backgroundColor: 'var(--color-surface-elevated)',
                  borderColor: 'var(--color-border)',
                  color: 'var(--color-text)',
                }}
              />
            </div>

            <button
              id="admin-btn-promote"
              onClick={() => handlePromote(promoteInputUid)}
              disabled={isPromoting || !promoteInputUid.trim()}
              className="w-full py-2.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 font-semibold text-xs transition flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-50 shadow-xs active:scale-98"
            >
              <UserCheck className="w-4 h-4" />
              <span>{isPromoting ? 'Setting Custom Claims...' : 'Promote to Administrator'}</span>
            </button>
          </div>
        </div>
      )}

      {/* User Registry & RBAC Roles Table */}
      <div
        className="p-6 rounded-2xl border space-y-4 shadow-2xs"
        style={{
          backgroundColor: 'var(--color-surface)',
          borderColor: 'var(--color-border)',
        }}
      >
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center space-x-2.5">
            <Users className="w-4 h-4 text-amber-500" />
            <h2 className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>User Identity &amp; Role Registry</h2>
            <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>({users.length} total)</span>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5" style={{ color: 'var(--color-text-muted)' }} />
            <input
              type="text"
              placeholder="Search users..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 rounded-xl border text-xs placeholder:opacity-50 focus:outline-hidden"
              style={{
                backgroundColor: 'var(--color-surface-elevated)',
                borderColor: 'var(--color-border)',
                color: 'var(--color-text)',
              }}
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr
                className="border-b text-[11px] font-semibold uppercase tracking-wider"
                style={{
                  borderColor: 'var(--color-border)',
                  color: 'var(--color-text-muted)',
                }}
              >
                <th className="py-2.5 px-3">User</th>
                <th className="py-2.5 px-3">UID</th>
                <th className="py-2.5 px-3">Role</th>
                <th className="py-2.5 px-3">Journals</th>
                <th className="py-2.5 px-3">Interactions</th>
                <th className="py-2.5 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y" style={{ borderColor: 'var(--color-border)' }}>
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-6 text-center" style={{ color: 'var(--color-text-muted)' }}>
                    No users matching criteria.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => (
                  <tr
                    key={user.uid}
                    className="hover:opacity-90 transition-colors"
                    style={{ borderColor: 'var(--color-border)' }}
                  >
                    <td className="py-3 px-3">
                      <div className="font-semibold" style={{ color: 'var(--color-text)' }}>{user.name}</div>
                      <div className="text-[11px]" style={{ color: 'var(--color-text-muted)' }}>{user.email}</div>
                    </td>
                    <td className="py-3 px-3 font-mono text-[11px]" style={{ color: 'var(--color-text-muted)' }}>
                      {user.uid.slice(0, 16)}...
                    </td>
                    <td className="py-3 px-3">
                      <span
                        className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border"
                        style={{
                          backgroundColor:
                            user.admin || user.role === 'admin'
                              ? 'var(--color-accent-subtle)'
                              : 'var(--color-surface-elevated)',
                          color:
                            user.admin || user.role === 'admin'
                              ? 'var(--color-accent-text)'
                              : 'var(--color-text-muted)',
                          borderColor: 'var(--color-border)',
                        }}
                      >
                        {user.admin || user.role === 'admin' ? 'Administrator' : 'Standard User'}
                      </span>
                    </td>
                    <td className="py-3 px-3 font-mono font-medium" style={{ color: 'var(--color-text)' }}>
                      {user.journalCount}
                    </td>
                    <td className="py-3 px-3 font-mono font-medium" style={{ color: 'var(--color-text)' }}>
                      {user.interactionCount}
                    </td>
                    <td className="py-3 px-3 text-right">
                      {user.admin || user.role === 'admin' ? (
                        <button
                          id={`admin-btn-demote-${user.uid}`}
                          onClick={() => handleDemote(user.uid)}
                          disabled={user.email === 'thaiebu785@gmail.com'}
                          className="px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all cursor-pointer border disabled:opacity-30 disabled:cursor-not-allowed bg-rose-500/10 hover:bg-rose-500/20 text-rose-700 dark:text-rose-300 border-rose-500/30 active:scale-97 shadow-2xs"
                          title="Demote to Standard User"
                        >
                          <UserX className="w-3 h-3 inline mr-1 text-rose-600 dark:text-rose-400" />
                          Demote
                        </button>
                      ) : (
                        <button
                          id={`admin-btn-promote-${user.uid}`}
                          onClick={() => handlePromote(user.uid)}
                          className="px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all cursor-pointer border active:scale-97 shadow-2xs bg-amber-500/15 hover:bg-amber-500/25 text-amber-900 dark:text-amber-300 border-amber-500/40"
                          title="Promote to Administrator"
                        >
                          <UserCheck className="w-3 h-3 inline mr-1 text-amber-600 dark:text-amber-400" />
                          Promote
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

      {/* Security Audit Log Preview */}
      {metrics && metrics.auditLogPreview && (
        <div
          className="p-6 rounded-2xl border space-y-4 shadow-2xs"
          style={{
            backgroundColor: 'var(--color-surface)',
            borderColor: 'var(--color-border)',
          }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2.5">
              <Terminal className="w-4 h-4 text-emerald-500" />
              <h2 className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>Security &amp; RBAC Audit Trail</h2>
            </div>
            <span className="text-[11px] font-mono" style={{ color: 'var(--color-text-muted)' }}>Live Log</span>
          </div>

          <div
            className="border rounded-xl p-4 font-mono text-[11px] space-y-2 max-h-64 overflow-y-auto"
            style={{
              backgroundColor: 'var(--color-surface-elevated)',
              borderColor: 'var(--color-border)',
            }}
          >
            {metrics.auditLogPreview.length === 0 ? (
              <div style={{ color: 'var(--color-text-muted)' }}>No audit events recorded yet.</div>
            ) : (
              metrics.auditLogPreview.map((log) => (
                <div
                  key={log.id}
                  className="flex flex-col sm:flex-row sm:items-center sm:justify-between py-1 border-b last:border-0 gap-1"
                  style={{ borderColor: 'var(--color-border)' }}
                >
                  <div className="flex items-center space-x-2">
                    <span className="font-semibold" style={{ color: 'var(--color-accent-text)' }}>[{log.action}]</span>
                    <span style={{ color: 'var(--color-text-muted)' }}>{log.actorEmail || log.actorUid}</span>
                    {log.details && <span style={{ color: 'var(--color-text)' }}>- {log.details}</span>}
                  </div>
                  <span className="text-[10px] shrink-0" style={{ color: 'var(--color-text-muted)' }}>
                    {new Date(log.timestamp).toLocaleTimeString()}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
