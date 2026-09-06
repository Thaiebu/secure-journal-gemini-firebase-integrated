import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { app } from '../../server';

describe('Auth & Session Integration Tests', () => {
  let userSessionToken = '';
  const testUserEmail = `test.user.${Date.now()}@example.com`;
  const testUserPassword = 'SecurePassword123!';

  it('AUTH-01: GET /api/health returns 200 without authentication', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.rbac).toBe('active');
  });

  it('AUTH-02: GET /api/auth/me returns 401 when no token is provided', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
    expect(res.body.code).toBe('UNAUTHORIZED');
  });

  it('AUTH-03: GET /api/auth/me returns 401 for forged or malformed tokens', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', 'Bearer forged-invalid-token-xyz');
    expect(res.status).toBe(401);
    expect(res.body.code).toBe('UNAUTHORIZED');
  });

  it('AUTH-04: POST /api/auth/signup rejects request missing required fields', async () => {
    const res = await request(app)
      .post('/api/auth/signup')
      .send({ email: 'incomplete@example.com' });
    expect(res.status).toBe(400);
  });

  it('AUTH-05: POST /api/auth/signup succeeds with valid credentials', async () => {
    const res = await request(app)
      .post('/api/auth/signup')
      .send({
        email: testUserEmail,
        password: testUserPassword,
        name: 'TDD Test User',
      });
    expect(res.status).toBe(201);
    expect(res.body.status).toBe('success');
    expect(res.body.sessionToken).toBeDefined();
    expect(res.body.email).toBe(testUserEmail);
    userSessionToken = res.body.sessionToken;
  });

  it('AUTH-06: GET /api/auth/me succeeds with valid verified session token', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${userSessionToken}`);
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('success');
    expect(res.body.user.email).toBe(testUserEmail);
  });

  it('AUTH-07: POST /api/auth/signin rejects invalid credentials', async () => {
    const res = await request(app)
      .post('/api/auth/signin')
      .send({
        email: testUserEmail,
        password: 'WrongPassword999!',
      });
    expect([400, 401]).toContain(res.status);
    expect(res.body.status).toBe('error');
  });

  it('AUTH-08: POST /api/auth/signin succeeds with valid credentials', async () => {
    const res = await request(app)
      .post('/api/auth/signin')
      .send({
        email: testUserEmail,
        password: testUserPassword,
      });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('success');
    expect(res.body.sessionToken).toBeDefined();
    expect(res.body.email).toBe(testUserEmail);
  });

  it('AUTH-09: POST /api/auth/reset-password updates credentials and signs in', async () => {
    const updatedPassword = 'NewSecurePassword456!';
    const resetRes = await request(app)
      .post('/api/auth/reset-password')
      .send({
        email: testUserEmail,
        newPassword: updatedPassword,
      });
    expect(resetRes.status).toBe(200);
    expect(resetRes.body.status).toBe('success');
    expect(resetRes.body.sessionToken).toBeDefined();

    // Verify sign in with the new password works immediately
    const signinRes = await request(app)
      .post('/api/auth/signin')
      .send({
        email: testUserEmail,
        password: updatedPassword,
      });
    expect(signinRes.status).toBe(200);
    expect(signinRes.body.status).toBe('success');
  });

  it('AUTH-10: POST /api/auth/signup permits claiming seeded accounts', async () => {
    const seededClaimRes = await request(app)
      .post('/api/auth/signup')
      .send({
        email: 'thaiebu785@gmail.com',
        password: 'MyChosenPassword785!',
        name: 'Thaiebu Custom',
      });
    expect([200, 201]).toContain(seededClaimRes.status);
    expect(seededClaimRes.body.sessionToken).toBeDefined();

    // Verify newly claimed password works for sign in
    const verifyLogin = await request(app)
      .post('/api/auth/signin')
      .send({
        email: 'thaiebu785@gmail.com',
        password: 'MyChosenPassword785!',
      });
    expect(verifyLogin.status).toBe(200);
    expect(verifyLogin.body.status).toBe('success');
  });
});
