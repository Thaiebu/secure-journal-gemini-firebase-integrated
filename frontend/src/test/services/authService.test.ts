import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  getAuthHeaders,
  signUpWithEmailPassword,
  signInWithEmailPassword,
} from '../../services/authService';

describe('authService (Frontend Auth Utilities)', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('FE-AUTH-01: getAuthHeaders returns Content-Type only when no token is present', async () => {
    const headers = await getAuthHeaders();
    expect(headers['Content-Type']).toBe('application/json');
    expect(headers['Authorization']).toBeUndefined();
  });

  it('FE-AUTH-02: getAuthHeaders includes Authorization header when token exists in storage', async () => {
    localStorage.setItem('mindreflect_auth_token', 'sess_test_token_abc');
    const headers = await getAuthHeaders();
    expect(headers['Authorization']).toBe('Bearer sess_test_token_abc');
  });

  it('FE-AUTH-03: signUpWithEmailPassword fails fast on empty name', async () => {
    const result = await signUpWithEmailPassword('', 'user@example.com', 'Pass123!');
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/full name/i);
  });

  it('FE-AUTH-04: signUpWithEmailPassword fails fast on invalid email', async () => {
    const result = await signUpWithEmailPassword('Jane Doe', 'invalid-email', 'Pass123!');
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/valid email/i);
  });

  it('FE-AUTH-05: signInWithEmailPassword fails fast on empty email or short password', async () => {
    const res1 = await signInWithEmailPassword('', 'Pass123!');
    expect(res1.success).toBe(false);

    const res2 = await signInWithEmailPassword('user@example.com', '123');
    expect(res2.success).toBe(false);
  });
});
