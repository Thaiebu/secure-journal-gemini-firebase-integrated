import React, { useState, useEffect } from 'react';
import { UserProfile, AdminMetrics, AdminUserItem } from '../types';
import {
  fetchAdminMetrics,
  fetchAdminUsers,
  fetchAdminAuditLogs,
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
  FileText,
  Filter,
  Info,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

interface AdminDashboardProps {
  currentUser: UserProfile;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ currentUser }) => {
  const [metrics, setMetrics] = useState<AdminMetrics | null>(null);
  const [users, setUsers] = useState<AdminUserItem[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshingLogs, setIsRefreshingLogs] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [promoteInputUid, setPromoteInputUid] = useState<string>('');
  const [isPromoting, setIsPromoting] = useState<boolean>(false);
  const [demoteConfirmUid, setDemoteConfirmUid] = useState<string | null>(null);
  const [isDemoting, setIsDemoting] = useState<string | null>(null);
  const [showMultiAdminInfo, setShowMultiAdminInfo] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [auditSearchQuery, setAuditSearchQuery] = useState<string>('');
  const [auditFilterAction, setAuditFilterAction] = useState<string>('ALL');

  const loadDashboardData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [metricsData, usersData, auditLogsData] = await Promise.all([
        fetchAdminMetrics(),
        fetchAdminUsers(),
        fetchAdminAuditLogs().catch((err) => {
          console.warn('[Admin] Audit log fetch notice:', err);
          return [];
        }),
      ]);
      setMetrics(metricsData);
      setUsers(usersData);
      setAuditLogs(Array.isArray(auditLogsData) && auditLogsData.length > 0 ? auditLogsData : (metricsData?.auditLogPreview || []));
    } catch (err: any) {
      setError(err.message || 'Failed to load administrator metrics. Elevated permissions required.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefreshAuditLogs = async () => {
    setIsRefreshingLogs(true);
    try {
      const logs = await fetchAdminAuditLogs();
      setAuditLogs(logs);
    } catch (err: any) {
      console.warn('Failed to refresh audit logs:', err);
    } finally {
      setIsRefreshingLogs(false);
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

  const executeDemote = async (uidToDemote: string) => {
    setIsDemoting(uidToDemote);
    setActionMessage(null);
    try {
      const res = await demoteUserRole(uidToDemote);
      setActionMessage({ type: 'success', text: res.message });
      setDemoteConfirmUid(null);
      await loadDashboardData();
    } catch (err: any) {
      setActionMessage({ type: 'error', text: err.message || 'Demotion failed.' });
    } finally {
      setIsDemoting(null);
    }
  };

  const filteredUsers = users.filter(
    (u) =>
      u.uid.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const displayedLogs = auditLogs.filter((log) => {
    const query = auditSearchQuery.toLowerCase().trim();
    const matchesSearch =
      !query ||
      log.action?.toLowerCase().includes(query) ||
      log.actorEmail?.toLowerCase().includes(query) ||
      log.actorUid?.toLowerCase().includes(query) ||
      log.targetUid?.toLowerCase().includes(query) ||
      log.details?.toLowerCase().includes(query);

    if (!matchesSearch) return false;

    if (auditFilterAction === 'ALL') return true;
    if (auditFilterAction === 'ADMIN') {
      return log.action?.includes('ADMIN') || log.action?.includes('PROMOT') || log.action?.includes('DEMOT');
    }
    if (auditFilterAction === 'SECURITY') {
      return log.action?.includes('LIMIT') || log.action?.includes('INJECTION') || log.action?.includes('BLOCKED');
    }
    if (auditFilterAction === 'JOURNAL') {
      return log.action?.includes('JOURNAL');
    }
    return true;
  });

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

      {/* How Multiple Admins Work Informational Architecture Card */}
      <div
        className="p-5 rounded-2xl border transition-all shadow-2xs"
        style={{
          backgroundColor: 'var(--color-surface)',
          borderColor: 'var(--color-border)',
        }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <Info className="w-4 h-4 text-amber-500" />
            <h2 className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>
              How Multiple Administrators Work
            </h2>
            <span
              className="text-[10px] font-semibold px-2 py-0.5 rounded-full border border-amber-500/30 text-amber-800 dark:text-amber-200 bg-amber-500/10"
            >
              RBAC Architecture
            </span>
          </div>
          <button
            onClick={() => setShowMultiAdminInfo(!showMultiAdminInfo)}
            className="text-xs flex items-center space-x-1 font-medium transition cursor-pointer hover:opacity-80"
            style={{ color: 'var(--color-text-muted)' }}
          >
            <span>{showMultiAdminInfo ? 'Hide Guide' : 'Learn How It Works'}</span>
            {showMultiAdminInfo ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>

        {showMultiAdminInfo && (
          <div className="mt-4 pt-4 border-t space-y-3 text-xs leading-relaxed" style={{ borderColor: 'var(--color-border)' }}>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div
                className="p-3.5 rounded-xl border space-y-1.5"
                style={{ backgroundColor: 'var(--color-surface-elevated)', borderColor: 'var(--color-border)' }}
              >
                <div className="font-semibold flex items-center space-x-1.5 text-amber-700 dark:text-amber-300">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>1. Root Administrator</span>
                </div>
                <p style={{ color: 'var(--color-text-muted)' }}>
                  Assigned by the server via <code className="px-1 py-0.5 rounded text-[10px] font-mono font-semibold bg-stone-200 dark:bg-stone-800">ADMIN_EMAIL</code>. This account has master authority and is permanently protected from demotion.
                </p>
              </div>

              <div
                className="p-3.5 rounded-xl border space-y-1.5"
                style={{ backgroundColor: 'var(--color-surface-elevated)', borderColor: 'var(--color-border)' }}
              >
                <div className="font-semibold flex items-center space-x-1.5 text-amber-700 dark:text-amber-300">
                  <UserCheck className="w-3.5 h-3.5" />
                  <span>2. Delegated Admins</span>
                </div>
                <p style={{ color: 'var(--color-text-muted)' }}>
                  Any active administrator can promote any registered user. Delegated admins can view system telemetry, audit logs, and manage user roles.
                </p>
              </div>

              <div
                className="p-3.5 rounded-xl border space-y-1.5"
                style={{ backgroundColor: 'var(--color-surface-elevated)', borderColor: 'var(--color-border)' }}
              >
                <div className="font-semibold flex items-center space-x-1.5 text-amber-700 dark:text-amber-300">
                  <ShieldAlert className="w-3.5 h-3.5" />
                  <span>3. Safety &amp; Demotion Guards</span>
                </div>
                <p style={{ color: 'var(--color-text-muted)' }}>
                  Admins cannot demote themselves (to prevent accidental lockout) and root admins cannot be demoted. All role changes persist securely to storage and claims.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

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
                filteredUsers.map((user) => {
                  const isUserSelf = Boolean(
                    user.uid === currentUser.uid ||
                    (currentUser.email && user.email && user.email.toLowerCase() === currentUser.email.toLowerCase())
                  );
                  const isUserAdmin = Boolean(user.admin || user.role === 'admin' || user.isRootAdmin);

                  return (
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
                        {user.isRootAdmin ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border border-amber-500/40 text-amber-800 dark:text-amber-200 bg-amber-500/15">
                            <ShieldCheck className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                            Root Admin
                          </span>
                        ) : isUserAdmin ? (
                          <span
                            className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border"
                            style={{
                              backgroundColor: 'var(--color-accent-subtle)',
                              color: 'var(--color-accent-text)',
                              borderColor: 'var(--color-border)',
                            }}
                          >
                            Administrator
                          </span>
                        ) : (
                          <span
                            className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border"
                            style={{
                              backgroundColor: 'var(--color-surface-elevated)',
                              color: 'var(--color-text-muted)',
                              borderColor: 'var(--color-border)',
                            }}
                          >
                            Standard User
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3 font-mono font-medium" style={{ color: 'var(--color-text)' }}>
                        {user.journalCount}
                      </td>
                      <td className="py-3 px-3 font-mono font-medium" style={{ color: 'var(--color-text)' }}>
                        {user.interactionCount}
                      </td>
                      <td className="py-3 px-3 text-right">
                        {user.isRootAdmin ? (
                          <span
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-medium border border-amber-500/30 text-amber-800 dark:text-amber-200 bg-amber-500/10 cursor-default"
                            title="Root Administrator cannot be demoted"
                          >
                            <ShieldAlert className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                            Root Protected
                          </span>
                        ) : isUserSelf ? (
                          <span
                            className="inline-flex items-center px-2.5 py-1 rounded-lg text-[11px] font-medium border border-stone-300 dark:border-stone-700 text-stone-500 dark:text-stone-400 bg-stone-100 dark:bg-stone-800/60 cursor-default"
                            title="Current logged-in administrator account"
                          >
                            Current Session
                          </span>
                        ) : isUserAdmin ? (
                          demoteConfirmUid === user.uid ? (
                            <div className="inline-flex items-center gap-1.5 justify-end">
                              <button
                                id={`admin-btn-confirm-demote-${user.uid}`}
                                onClick={() => executeDemote(user.uid || user.email)}
                                disabled={isDemoting === (user.uid || user.email)}
                                className="px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer bg-rose-600 hover:bg-rose-700 text-white shadow-xs"
                              >
                                {isDemoting === (user.uid || user.email) ? 'Demoting...' : 'Confirm Demote?'}
                              </button>
                              <button
                                id={`admin-btn-cancel-demote-${user.uid}`}
                                onClick={() => setDemoteConfirmUid(null)}
                                className="px-2 py-1 rounded-lg text-[11px] font-medium transition-all cursor-pointer bg-stone-200 hover:bg-stone-300 dark:bg-stone-700 dark:hover:bg-stone-600 text-stone-700 dark:text-stone-200"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <button
                              id={`admin-btn-demote-${user.uid}`}
                              onClick={() => setDemoteConfirmUid(user.uid)}
                              className="px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all cursor-pointer border bg-rose-500/10 hover:bg-rose-500/20 text-rose-700 dark:text-rose-300 border-rose-500/30 active:scale-97 shadow-2xs"
                              title="Demote to Standard User"
                            >
                              <UserX className="w-3 h-3 inline mr-1 text-rose-600 dark:text-rose-400" />
                              Demote
                            </button>
                          )
                        ) : (
                          <button
                            id={`admin-btn-promote-${user.uid}`}
                            onClick={() => handlePromote(user.uid || user.email)}
                            className="px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all cursor-pointer border active:scale-97 shadow-2xs bg-amber-500/15 hover:bg-amber-500/25 text-amber-900 dark:text-amber-300 border-amber-500/40"
                            title="Promote to Administrator"
                          >
                            <UserCheck className="w-3 h-3 inline mr-1 text-amber-600 dark:text-amber-400" />
                            Promote
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Security Audit Log & Real-Time Trail */}
      <div
        className="p-6 rounded-2xl border space-y-5 shadow-2xs"
        style={{
          backgroundColor: 'var(--color-surface)',
          borderColor: 'var(--color-border)',
        }}
      >
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center space-x-2.5">
            <Terminal className="w-5 h-5 text-emerald-500" />
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>
                  Security &amp; RBAC Audit Trail
                </h2>
                <span
                  className="px-2 py-0.5 rounded-full text-[10px] font-semibold border font-mono"
                  style={{
                    backgroundColor: 'var(--color-surface-elevated)',
                    borderColor: 'var(--color-border)',
                    color: 'var(--color-text-muted)',
                  }}
                >
                  {auditLogs.length} events logged
                </span>
              </div>
              <p className="text-[11px]" style={{ color: 'var(--color-text-muted)' }}>
                Immutable event stream tracking authentication, privilege escalations, rate limits, and threat mitigations.
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              id="admin-btn-refresh-audit"
              onClick={handleRefreshAuditLogs}
              disabled={isRefreshingLogs}
              className="inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors cursor-pointer disabled:opacity-50"
              style={{
                backgroundColor: 'var(--color-surface-elevated)',
                borderColor: 'var(--color-border)',
                color: 'var(--color-text)',
              }}
              title="Refresh Audit Logs"
            >
              <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${isRefreshingLogs ? 'animate-spin' : ''}`} />
              {isRefreshingLogs ? 'Syncing...' : 'Refresh Logs'}
            </button>
          </div>
        </div>

        {/* Filter Controls & Search */}
        <div className="flex flex-col sm:flex-row gap-3 pt-1">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 w-3.5 h-3.5" style={{ color: 'var(--color-text-muted)' }} />
            <input
              id="admin-input-audit-search"
              type="text"
              value={auditSearchQuery}
              onChange={(e) => setAuditSearchQuery(e.target.value)}
              placeholder="Search audit trail by actor, UID, action, or details..."
              className="w-full pl-9 pr-3 py-1.5 rounded-lg text-xs border outline-none transition-colors"
              style={{
                backgroundColor: 'var(--color-surface-elevated)',
                borderColor: 'var(--color-border)',
                color: 'var(--color-text)',
              }}
            />
          </div>

          <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 sm:pb-0">
            {(['ALL', 'ADMIN', 'SECURITY', 'JOURNAL'] as const).map((filterType) => (
              <button
                key={filterType}
                id={`admin-filter-audit-${filterType.toLowerCase()}`}
                onClick={() => setAuditFilterAction(filterType)}
                className="px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors cursor-pointer border"
                style={{
                  backgroundColor:
                    auditFilterAction === filterType
                      ? 'var(--color-accent)'
                      : 'var(--color-surface-elevated)',
                  borderColor:
                    auditFilterAction === filterType
                      ? 'var(--color-accent)'
                      : 'var(--color-border)',
                  color:
                    auditFilterAction === filterType
                      ? 'var(--color-accent-contrast)'
                      : 'var(--color-text-muted)',
                }}
              >
                {filterType === 'ALL'
                  ? 'All Logs'
                  : filterType === 'ADMIN'
                  ? 'Admin & RBAC'
                  : filterType === 'SECURITY'
                  ? 'Threat & Rate Limits'
                  : 'Journals'}
              </button>
            ))}
          </div>
        </div>

        {/* Audit Log Table / Stream */}
        <div
          className="border rounded-xl font-mono text-[11px] max-h-80 overflow-y-auto divide-y"
          style={{
            backgroundColor: 'var(--color-surface-elevated)',
            borderColor: 'var(--color-border)',
          }}
        >
          {displayedLogs.length === 0 ? (
            <div className="py-8 text-center" style={{ color: 'var(--color-text-muted)' }}>
              No audit records match the selected filter.
            </div>
          ) : (
            displayedLogs.map((log) => {
              const isThreatOrLimit =
                log.action?.includes('LIMIT') ||
                log.action?.includes('INJECTION') ||
                log.action?.includes('BLOCKED');
              const isAdminAction =
                log.action?.includes('PROMOT') ||
                log.action?.includes('DEMOT') ||
                log.action?.includes('ADMIN');
              const isJournalAction = log.action?.includes('JOURNAL');

              let badgeBg = 'bg-sky-500/10 text-sky-700 dark:text-sky-300 border-sky-500/30';
              if (isThreatOrLimit) {
                badgeBg = 'bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30';
              } else if (isAdminAction) {
                badgeBg = 'bg-amber-500/15 text-amber-900 dark:text-amber-300 border-amber-500/30';
              } else if (isJournalAction) {
                badgeBg = 'bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 border-emerald-500/30';
              }

              return (
                <div
                  key={log.id}
                  className="p-3 hover:opacity-90 transition-colors flex flex-col md:flex-row md:items-center md:justify-between gap-2"
                  style={{ borderColor: 'var(--color-border)' }}
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${badgeBg}`}>
                      {log.action}
                    </span>
                    <span className="font-semibold" style={{ color: 'var(--color-text)' }}>
                      {log.actorEmail || log.actorUid}
                    </span>
                    {log.targetUid && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20">
                        Target: {log.targetUid}
                      </span>
                    )}
                    {log.details && (
                      <span className="text-[11px]" style={{ color: 'var(--color-text-muted)' }}>
                        — {log.details}
                      </span>
                    )}
                  </div>
                  <div className="text-[10px] shrink-0 font-sans" style={{ color: 'var(--color-text-muted)' }}>
                    {new Date(log.timestamp).toLocaleString()}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
