import { describe, it, expect } from 'vitest';
import { isOriginAllowed } from '../../server';

describe('CORS Origin Validation Security Standard', () => {
  it('allows same-origin or server-to-server requests with no origin header', () => {
    expect(isOriginAllowed(null)).toBe(true);
    expect(isOriginAllowed(undefined)).toBe(true);
    expect(isOriginAllowed('')).toBe(true);
  });

  it('allows Cloud Run regional subdomains (*.region.run.app)', () => {
    expect(isOriginAllowed('https://ais-dev-f3olx5xa545tp4gubhj3dg-887017124656.asia-southeast1.run.app')).toBe(true);
    expect(isOriginAllowed('https://ais-pre-f3olx5xa545tp4gubhj3dg-887017124656.asia-southeast1.run.app')).toBe(true);
    expect(isOriginAllowed('https://my-service-xyz.us-central1.run.app')).toBe(true);
  });

  it('allows localhost and loopback interfaces on any port', () => {
    expect(isOriginAllowed('http://localhost:3000')).toBe(true);
    expect(isOriginAllowed('http://127.0.0.1:3000')).toBe(true);
    expect(isOriginAllowed('http://localhost:5173')).toBe(true);
  });

  it('allows Google AI Studio, Google domains, and Firebase hosting domains', () => {
    expect(isOriginAllowed('https://aistudio.google.com')).toBe(true);
    expect(isOriginAllowed('https://my-preview.aistudio.google.com')).toBe(true);
    expect(isOriginAllowed('https://my-app.web.app')).toBe(true);
    expect(isOriginAllowed('https://my-app.firebaseapp.com')).toBe(true);
  });

  it('strictly rejects malicious or unauthorized origins', () => {
    expect(isOriginAllowed('https://malicious-site.com')).toBe(false);
    expect(isOriginAllowed('https://attacker-run.app.fake.com')).toBe(false);
    expect(isOriginAllowed('https://fake-aistudio-google.com')).toBe(false);
    expect(isOriginAllowed('not-a-valid-url')).toBe(false);
  });
});
