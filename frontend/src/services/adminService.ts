import { getAuthHeaders } from './authService';
import { AdminMetrics, AdminUserItem, UserProfile } from '../types';

/**
 * Fetches current authenticated user profile including RBAC status.
 */
export async function fetchCurrentUserRole(): Promise<UserProfile | null> {
  try {
    const headers = await getAuthHeaders();
    const res = await fetch('/api/auth/me', { headers });
    if (res.ok) {
      const data = await res.json();
      if (data.user && !data.user.uid?.startsWith('guest_')) {
        return data.user as UserProfile;
      }
    }
  } catch (err) {
    console.warn('[RBAC] Could not fetch current user role:', err);
  }
  return null;
}

/**
 * Fetches admin system metrics (Protected by require_admin dependency).
 */
export async function fetchAdminMetrics(): Promise<AdminMetrics> {
  const headers = await getAuthHeaders();
  const res = await fetch('/api/admin/metrics', { headers });
  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.detail || `Access forbidden: HTTP ${res.status}`);
  }
  const data = await res.json();
  return data.metrics as AdminMetrics;
}

/**
 * Fetches user registry for admin inspection (Protected by require_admin).
 */
export async function fetchAdminUsers(): Promise<AdminUserItem[]> {
  const headers = await getAuthHeaders();
  const res = await fetch('/api/admin/users', { headers });
  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.detail || `Access forbidden: HTTP ${res.status}`);
  }
  const data = await res.json();
  return data.users as AdminUserItem[];
}

/**
 * Promotes a target user with custom claim {"admin": true}.
 */
export async function promoteUserToAdmin(uid: string): Promise<{ message: string; claims: any }> {
  const headers = await getAuthHeaders();
  const res = await fetch(`/api/admin/users/${encodeURIComponent(uid)}/promote`, {
    method: 'POST',
    headers,
  });
  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.detail || `Promotion failed: HTTP ${res.status}`);
  }
  return await res.json();
}

/**
 * Demotes a target user to standard journaler.
 */
export async function demoteUserRole(uid: string): Promise<{ message: string }> {
  const headers = await getAuthHeaders();
  const res = await fetch(`/api/admin/users/${encodeURIComponent(uid)}/demote`, {
    method: 'POST',
    headers,
  });
  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.detail || `Demotion failed: HTTP ${res.status}`);
  }
  return await res.json();
}
