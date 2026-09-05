import { getAuthHeaders } from './authService';
import { NotificationSettings, WeeklyDigestData, DeliveryRecord } from '../types';

export async function fetchNotificationSettings(): Promise<NotificationSettings> {
  const headers = await getAuthHeaders();
  const res = await fetch('/api/notifications/settings', { headers });
  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.detail || `HTTP ${res.status}: Failed to load notification settings.`);
  }
  const data = await res.json();
  return data.settings as NotificationSettings;
}

export async function updateNotificationSettings(
  payload: Partial<NotificationSettings>
): Promise<NotificationSettings> {
  const headers = await getAuthHeaders();
  const res = await fetch('/api/notifications/settings', {
    method: 'POST',
    headers: {
      ...headers,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.detail || `HTTP ${res.status}: Failed to save notification settings.`);
  }
  const data = await res.json();
  return data.settings as NotificationSettings;
}

export async function generateWeeklyDigestPreview(): Promise<WeeklyDigestData> {
  const headers = await getAuthHeaders();
  const res = await fetch('/api/notifications/weekly-summary/preview', {
    method: 'POST',
    headers: {
      ...headers,
      'Content-Type': 'application/json',
    },
  });
  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.detail || `HTTP ${res.status}: Failed to generate preview.`);
  }
  const data = await res.json();
  return data.digest as WeeklyDigestData;
}

export async function sendWeeklyDigestNow(): Promise<{
  message: string;
  deliveryRecord: DeliveryRecord;
  digest: WeeklyDigestData;
}> {
  const headers = await getAuthHeaders();
  const res = await fetch('/api/notifications/weekly-summary/send', {
    method: 'POST',
    headers: {
      ...headers,
      'Content-Type': 'application/json',
    },
  });
  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.detail || `HTTP ${res.status}: Failed to dispatch weekly digest.`);
  }
  const data = await res.json();
  return {
    message: data.message,
    deliveryRecord: data.deliveryRecord,
    digest: data.digest,
  };
}
