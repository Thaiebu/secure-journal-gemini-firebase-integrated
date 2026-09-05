import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { app } from '../../server';
import { clearRateLimits, rateLimits } from '../../src/utils';

describe('Notifications & Email Digest Integration Tests', () => {
  let userToken = '';

  beforeAll(async () => {
    const res = await request(app)
      .post('/api/auth/signup')
      .send({
        email: `notif.tester.${Date.now()}@example.com`,
        password: 'Password123!',
        name: 'Notif Tester',
      });
    userToken = res.body.sessionToken;
  });

  it('NOTIF-01: GET /api/notifications/settings returns 401 without auth', async () => {
    const res = await request(app).get('/api/notifications/settings');
    expect(res.status).toBe(401);
  });

  it('NOTIF-02: POST /api/notifications/settings rejects invalid recipient email', async () => {
    const res = await request(app)
      .post('/api/notifications/settings')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ email: 'invalid-email-format' });
    expect(res.status).toBe(400);
    expect(res.body.detail).toMatch(/email/i);
  });

  it('NOTIF-03: POST /api/notifications/settings rejects SSRF webhook targeting metadata IP', async () => {
    const res = await request(app)
      .post('/api/notifications/settings')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        email: 'valid.user@example.com',
        webhookUrl: 'https://169.254.169.254/computeMetadata/v1/',
      });
    expect(res.status).toBe(400);
    expect(res.body.detail).toMatch(/Anti-SSRF|webhook/i);
  });

  it('NOTIF-04: POST /api/notifications/settings saves valid notification preferences', async () => {
    const res = await request(app)
      .post('/api/notifications/settings')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        email: 'digest.user@example.com',
        weeklyDigestEnabled: true,
        deliveryDay: 'friday',
        deliveryTime: '08:00',
        webhookUrl: 'https://hooks.slack.com/services/T00/B00/X123',
        webhookEnabled: true,
      });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('success');
    expect(res.body.settings.deliveryDay).toBe('friday');
    expect(res.body.settings.webhookEnabled).toBe(true);
  });

  it('NOTIF-05: POST /api/notifications/weekly-summary/send triggers rate limit after 5 calls', async () => {
    const meRes = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${userToken}`);
    const uid = meRes.body.user.uid;

    // Simulate 5 calls within current sliding window
    const now = Date.now();
    rateLimits.set(`${uid}:notification_send`, [now, now, now, now, now]);

    const res = await request(app)
      .post('/api/notifications/weekly-summary/send')
      .set('Authorization', `Bearer ${userToken}`);

    expect(res.status).toBe(429);
    expect(res.body.detail).toMatch(/rate limit exceeded/i);
    clearRateLimits();
  });
});
