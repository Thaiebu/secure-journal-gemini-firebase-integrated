import { describe, it, expect, beforeEach } from 'vitest';
import {
  fetchNotificationSettings,
  updateNotificationSettings,
  sendWeeklyDigestNow,
} from '../../services/notificationService';
import { server } from '../mocks/server';
import { http, HttpResponse } from 'msw';

describe('notificationService (Frontend Notifications & Digest)', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('FE-NOTIF-01: fetchNotificationSettings retrieves configuration object', async () => {
    const settings = await fetchNotificationSettings();
    expect(settings).toBeDefined();
    expect(settings.email).toBe('frontend.test@example.com');
    expect(settings.weeklyDigestEnabled).toBe(true);
    expect(settings.deliveryDay).toBe('sunday');
  });

  it('FE-NOTIF-02: fetchNotificationSettings throws when backend returns 401', async () => {
    server.use(
      http.get('/api/notifications/settings', () => {
        return HttpResponse.json({ detail: 'Unauthorized' }, { status: 401 });
      })
    );

    await expect(fetchNotificationSettings()).rejects.toThrow(/Unauthorized/i);
  });

  it('FE-NOTIF-03: sendWeeklyDigestNow sends dispatch request and returns receipt', async () => {
    const result = await sendWeeklyDigestNow();
    expect(result.message).toMatch(/dispatched successfully/i);
    expect(result.deliveryRecord.status).toBe('delivered');
    expect(result.digest.summary.habitScore).toBe(92);
  });
});
