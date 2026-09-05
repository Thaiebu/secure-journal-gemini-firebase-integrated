import { describe, it, expect } from 'vitest';
import { isValidEmail } from '../../src/utils';

describe('isValidEmail (RFC 5322 Email Validation)', () => {
  it('EV-01: validates standard email addresses', () => {
    expect(isValidEmail('user@example.com')).toBe(true);
    expect(isValidEmail('alice.smith+filter@sub.domain.org')).toBe(true);
    expect(isValidEmail('admin_123@mindreflect.ai')).toBe(true);
  });

  it('EV-02: rejects strings missing @ or domain', () => {
    expect(isValidEmail('not-an-email')).toBe(false);
    expect(isValidEmail('user@')).toBe(false);
    expect(isValidEmail('@example.com')).toBe(false);
  });

  it('EV-03: rejects empty or whitespace-only strings', () => {
    expect(isValidEmail('')).toBe(false);
    expect(isValidEmail('   ')).toBe(false);
  });

  it('EV-04: rejects TLDs shorter than 2 characters', () => {
    expect(isValidEmail('user@domain.c')).toBe(false);
  });

  it('EV-05: rejects emails longer than 100 characters', () => {
    const longLocal = 'a'.repeat(95);
    expect(isValidEmail(`${longLocal}@example.com`)).toBe(false);
  });

  it('EV-06: rejects non-string inputs safely', () => {
    expect(isValidEmail(null as any)).toBe(false);
    expect(isValidEmail(undefined as any)).toBe(false);
    expect(isValidEmail(12345 as any)).toBe(false);
  });
});
