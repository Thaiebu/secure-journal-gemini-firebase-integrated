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
      <div className="bg-gradient-to-r from-neutral-900 via-neutral-900 to-[#181512] border border-amber-500/20 rounded-2xl p-6 sm:p-8 shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 -mr-16 -mt-16 w-64 h-64 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center space-x-3">
              <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight flex items-center gap-2">
                  Admin Command Center
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    RBAC Enforced
                  </span>
                </h1>
                <p className="text-xs sm:text-sm text-neutral-400">
                  Role-Based Access Control, Gemini Telemetry &amp; System Security Audit
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <div className="hidden sm:flex flex-col items-end text-xs text-neutral-400">
              <span className="text-neutral-200 font-medium">{currentUser.email || currentUser.displayName}</span>
              <span className="text-amber-400 font-mono text-[10px]">Claims: &#123;admin: true&#125;</span>
            </div>
            <button
              id="admin-btn-refresh"
              onClick={loadDashboardData}
              disabled={isLoading}
              className="flex items-center space-x-2 px-3.5 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-medium border border-neutral-700 transition cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-amber-400' : ''}`} />
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {/* Action feedback message */}
        {actionMessage && (
          <div
            className={`mt-4 p-3 rounded-xl text-xs flex items-center space-x-2 border ${
              actionMessage.type === 'success'
                ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-300'
                : 'bg-red-950/40 border-red-500/30 text-red-300'
            }`}
          >
            {actionMessage.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 shrink-0" />
            )}
            <span>{actionMessage.text}</span>
          </div>
        )}
      </div>

      {/* Error state if not admin */}
      {error && (
        <div className="p-6 rounded-2xl bg-red-950/30 border border-red-500/30 text-red-200 space-y-3">
          <div className="flex items-center space-x-3">
            <ShieldAlert className="w-6 h-6 text-red-400 shrink-0" />
            <div>
              <h3 className="font-semibold text-sm text-red-300">HTTP 403 Forbidden: Elevated Permissions Required</h3>
              <p className="text-xs text-red-400/90 mt-0.5">{error}</p>
            </div>
          </div>
          <div className="p-3.5 rounded-xl bg-red-950/60 border border-red-500/20 font-mono text-[11px] text-red-300 space-y-1">
            <div className="font-semibold text-amber-300">RBAC Threat Countermeasure Active:</div>
            <div>• Backend middleware (require_admin) validates cryptographically signed Firebase ID token.</div>
            <div>• Injected client flags (e.g. state tampering or payload spoofing) are rejected at the server boundary.</div>
          </div>
        </div>
      )}

      {/* Main Metrics Bento Grid */}
      {metrics && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-5 rounded-2xl bg-[#141414] border border-neutral-800 space-y-3">
            <div className="flex items-center justify-between text-neutral-400">
              <span className="text-xs font-medium uppercase tracking-wider">Registered Tenants</span>
              <Users className="w-4 h-4 text-amber-400" />
            </div>
            <div className="flex items-baseline space-x-2">
              <span className="text-2xl font-bold text-white">{metrics.totalRegisteredUsers}</span>
              <span className="text-xs text-neutral-400 font-mono">({metrics.activeSessions} active)</span>
            </div>
            <p className="text-[11px] text-neutral-400">
              Tenant isolation via <code className="text-amber-300 font-mono">/users/&#123;uid&#125;</code>
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-[#141414] border border-neutral-800 space-y-3">
            <div className="flex items-center justify-between text-neutral-400">
              <span className="text-xs font-medium uppercase tracking-wider">Total Interactions</span>
              <Activity className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="flex items-baseline space-x-2">
              <span className="text-2xl font-bold text-white">{metrics.totalInteractions}</span>
              <span className="text-xs text-neutral-400 font-mono">({metrics.totalJournals} journals)</span>
            </div>
            <p className="text-[11px] text-neutral-400">Committed with zero-loss fallback</p>
          </div>

          <div className="p-5 rounded-2xl bg-[#141414] border border-neutral-800 space-y-3">
            <div className="flex items-center justify-between text-neutral-400">
              <span className="text-xs font-medium uppercase tracking-wider">Pinned Places</span>
              <MapPin className="w-4 h-4 text-purple-400" />
            </div>
            <div className="flex items-baseline space-x-2">
              <span className="text-2xl font-bold text-white">{metrics.totalPinnedLocations}</span>
              <span className="text-xs text-purple-400/80 font-mono">Geo Spots</span>
            </div>
            <p className="text-[11px] text-neutral-400">Google Maps Platform Adv Markers</p>
          </div>

          <div className="p-5 rounded-2xl bg-[#141414] border border-neutral-800 space-y-3">
            <div className="flex items-center justify-between text-neutral-400">
              <span className="text-xs font-medium uppercase tracking-wider">System Uptime</span>
              <Server className="w-4 h-4 text-blue-400" />
            </div>
            <div className="flex items-baseline space-x-2">
              <span className="text-2xl font-bold text-white font-mono">{metrics.uptimeSeconds}s</span>
              <span className="text-xs text-emerald-400 font-mono">Healthy</span>
            </div>
            <p className="text-[11px] text-neutral-400">{metrics.totalRequests} API calls processed</p>
          </div>
        </div>
      )}

      {/* Model Resilience & Fallback Telemetry */}
      {metrics && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 p-6 rounded-2xl bg-[#141414] border border-neutral-800 space-y-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <Zap className="w-4 h-4 text-amber-400" />
                <h2 className="text-sm font-semibold text-neutral-200">Gemini Model Fallback Ladder Status</h2>
              </div>
              <span className="text-[11px] text-neutral-400 font-mono">Auto-Recovery Active</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {metrics.modelLadderHealth.map((tier, idx) => (
                <div key={tier.model} className="p-3.5 rounded-xl bg-[#181818] border border-neutral-800/80 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                      <span className="font-mono text-xs font-semibold text-neutral-200">{tier.model}</span>
                    </div>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-neutral-800 text-neutral-400 font-mono">
                      Tier {idx + 1}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-neutral-400">
                    <span>{tier.role}</span>
                    <span className="font-mono text-emerald-400">{tier.latencyMs}ms</span>
                  </div>
                  <div className="text-[10px] text-neutral-400 font-mono">
                    Usage Count: <strong className="text-neutral-300">{metrics.modelFallbackDistribution[tier.model] || 0}</strong>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Promote User Quick Tool */}
          <div className="p-6 rounded-2xl bg-[#141414] border border-neutral-800 space-y-4">
            <div className="flex items-center space-x-2.5">
              <Lock className="w-4 h-4 text-amber-400" />
              <h2 className="text-sm font-semibold text-neutral-200">Grant Elevated Admin Claim</h2>
            </div>
            <p className="text-xs text-neutral-400 leading-relaxed">
              Elevates user permissions via <code className="bg-neutral-800 px-1 py-0.5 rounded text-[10px] text-amber-300 font-mono">auth.setCustomUserClaims(uid, &#123;admin: true&#125;)</code>
            </p>

            <div className="space-y-2">
              <label htmlFor="admin-input-uid" className="block text-[11px] text-neutral-400 font-medium">User UID or Email</label>
              <input
                id="admin-input-uid"
                type="text"
                placeholder="e.g. email_user123 or user@domain.com"
                value={promoteInputUid}
                onChange={(e) => setPromoteInputUid(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-[#1c1c1c] border border-neutral-700 text-xs text-white placeholder-neutral-500 focus:outline-hidden focus:border-amber-500 font-mono"
              />
            </div>

            <button
              id="admin-btn-promote"
              onClick={() => handlePromote(promoteInputUid)}
              disabled={isPromoting || !promoteInputUid.trim()}
              className="w-full py-2.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 font-semibold text-xs transition flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-50"
            >
              <UserCheck className="w-4 h-4" />
              <span>{isPromoting ? 'Setting Custom Claims...' : 'Promote to Administrator'}</span>
            </button>
          </div>
        </div>
      )}

      {/* User Registry & RBAC Roles Table */}
      <div className="p-6 rounded-2xl bg-[#141414] border border-neutral-800 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center space-x-2.5">
            <Users className="w-4 h-4 text-amber-400" />
            <h2 className="text-sm font-semibold text-neutral-200">User Identity &amp; Role Registry</h2>
            <span className="text-xs text-neutral-400">({users.length} total)</span>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 text-neutral-500 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search users..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-[#1c1c1c] border border-neutral-700 text-xs text-white placeholder-neutral-500 focus:outline-hidden focus:border-amber-500"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-neutral-800 text-neutral-400 text-[11px] font-medium uppercase tracking-wider">
                <th className="py-2.5 px-3">User</th>
                <th className="py-2.5 px-3">UID</th>
                <th className="py-2.5 px-3">Role</th>
                <th className="py-2.5 px-3">Journals</th>
                <th className="py-2.5 px-3">Interactions</th>
                <th className="py-2.5 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-800/60">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-6 text-center text-neutral-400">
                    No users matching criteria.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => (
                  <tr key={user.uid} className="hover:bg-neutral-800/30 transition">
                    <td className="py-3 px-3">
                      <div className="font-medium text-neutral-200">{user.name}</div>
                      <div className="text-[11px] text-neutral-400">{user.email}</div>
                    </td>
                    <td className="py-3 px-3 font-mono text-[11px] text-neutral-400">
                      {user.uid.slice(0, 16)}...
                    </td>
                    <td className="py-3 px-3">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                          user.admin || user.role === 'admin'
                            ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                            : 'bg-neutral-800 text-neutral-400 border-neutral-700'
                        }`}
                      >
                        {user.admin || user.role === 'admin' ? 'Administrator' : 'Standard User'}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-neutral-300 font-mono">{user.journalCount}</td>
                    <td className="py-3 px-3 text-neutral-300 font-mono">{user.interactionCount}</td>
                    <td className="py-3 px-3 text-right">
                      {user.admin || user.role === 'admin' ? (
                        <button
                          onClick={() => handleDemote(user.uid)}
                          disabled={user.email === 'thaiebu785@gmail.com'}
                          className="px-2.5 py-1 rounded-lg bg-red-950/30 hover:bg-red-900/40 text-red-300 border border-red-500/20 text-[11px] transition cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                          title="Demote to Standard User"
                        >
                          <UserX className="w-3 h-3 inline mr-1" />
                          Demote
                        </button>
                      ) : (
                        <button
                          onClick={() => handlePromote(user.uid)}
                          className="px-2.5 py-1 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[11px] transition cursor-pointer"
                          title="Promote to Administrator"
                        >
                          <UserCheck className="w-3 h-3 inline mr-1" />
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
        <div className="p-6 rounded-2xl bg-[#141414] border border-neutral-800 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2.5">
              <Terminal className="w-4 h-4 text-emerald-400" />
              <h2 className="text-sm font-semibold text-neutral-200">Security &amp; RBAC Audit Trail</h2>
            </div>
            <span className="text-[11px] font-mono text-neutral-400">Live Log</span>
          </div>

          <div className="bg-[#0c0c0c] border border-neutral-800/80 rounded-xl p-4 font-mono text-[11px] space-y-2 max-h-64 overflow-y-auto">
            {metrics.auditLogPreview.length === 0 ? (
              <div className="text-neutral-400">No audit events recorded yet.</div>
            ) : (
              metrics.auditLogPreview.map((log) => (
                <div key={log.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between py-1 border-b border-neutral-900 last:border-0 text-neutral-300 gap-1">
                  <div className="flex items-center space-x-2">
                    <span className="text-amber-400 font-semibold">[{log.action}]</span>
                    <span className="text-neutral-400">{log.actorEmail || log.actorUid}</span>
                    {log.details && <span className="text-neutral-400">- {log.details}</span>}
                  </div>
                  <span className="text-neutral-400 text-[10px] shrink-0">
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
