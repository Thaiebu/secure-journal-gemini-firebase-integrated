import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { app } from '../../server';

describe('RBAC & Admin Access Control Tests', () => {
  const ADMIN_SECRET = 'super-secret-admin-testing-token-32chars!';
  let standardUserToken = '';

  beforeAll(async () => {
    process.env.ADMIN_SECRET_TOKEN = ADMIN_SECRET;

    // Create a standard user to obtain a standard non-admin session token
    const signupRes = await request(app)
      .post('/api/auth/signup')
      .send({
        email: `standard.rbac.${Date.now()}@example.com`,
        password: 'Password123!',
        name: 'Regular User',
      });
    standardUserToken = signupRes.body.sessionToken;
  });

  it('RBAC-01: GET /api/admin/metrics returns 403 Forbidden for standard user', async () => {
    const res = await request(app)
      .get('/api/admin/metrics')
      .set('Authorization', `Bearer ${standardUserToken}`);
    expect(res.status).toBe(403);
    expect(res.body.code).toBe('FORBIDDEN');
  });

  it('RBAC-02: GET /api/admin/metrics returns 200 OK for verified admin token', async () => {
    const res = await request(app)
      .get('/api/admin/metrics')
      .set('Authorization', `Bearer ${ADMIN_SECRET}`);
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('success');
    expect(res.body.metrics).toBeDefined();
  });

  it('RBAC-03: POST /api/admin/users/:uid/promote returns 403 Forbidden for non-admin', async () => {
    const res = await request(app)
      .post('/api/admin/users/target_user_123/promote')
      .set('Authorization', `Bearer ${standardUserToken}`);
    expect(res.status).toBe(403);
    expect(res.body.code).toBe('FORBIDDEN');
  });

  it('RBAC-04: GET /api/admin/audit-log returns 403 Forbidden without authorization', async () => {
    const res = await request(app).get('/api/admin/audit-log');
    expect(res.status).toBe(403);
    expect(res.body.code).toBe('FORBIDDEN');
  });

  it('RBAC-05: GET /api/admin/users returns 200 OK for verified admin', async () => {
    const res = await request(app)
      .get('/api/admin/users')
      .set('Authorization', `Bearer ${ADMIN_SECRET}`);
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('success');
    expect(Array.isArray(res.body.users)).toBe(true);
  });
});
