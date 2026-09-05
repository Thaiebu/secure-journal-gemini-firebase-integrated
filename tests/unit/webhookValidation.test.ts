import { describe, it, expect } from 'vitest';
import { validateWebhookUrl } from '../../src/utils';

describe('validateWebhookUrl (Anti-SSRF & Webhook Security)', () => {
  it('WV-01: permits valid public HTTPS webhooks', () => {
    expect(validateWebhookUrl('https://hooks.slack.com/services/T00/B00/XXXX')).toBe(true);
    expect(validateWebhookUrl('https://discord.com/api/webhooks/123/abc')).toBe(true);
    expect(validateWebhookUrl('https://api.example.com/incoming-webhook')).toBe(true);
  });

  it('WV-02: rejects non-HTTPS protocols (HTTP)', () => {
    expect(validateWebhookUrl('http://hooks.slack.com/services/123')).toBe(false);
  });

  it('WV-03: rejects localhost and loopback interfaces', () => {
    expect(validateWebhookUrl('https://localhost/webhook')).toBe(false);
    expect(validateWebhookUrl('https://127.0.0.1/webhook')).toBe(false);
    expect(validateWebhookUrl('https://0.0.0.0/webhook')).toBe(false);
  });

  it('WV-04: rejects RFC 1918 Class A private IP ranges (10.x.x.x)', () => {
    expect(validateWebhookUrl('https://10.0.0.1/secret')).toBe(false);
    expect(validateWebhookUrl('https://10.255.255.255/secret')).toBe(false);
  });

  it('WV-05: rejects RFC 1918 Class B private IP ranges (172.16.x.x)', () => {
    expect(validateWebhookUrl('https://172.16.0.1/admin')).toBe(false);
  });

  it('WV-06: rejects RFC 1918 Class C private IP ranges (192.168.x.x)', () => {
    expect(validateWebhookUrl('https://192.168.1.1/hook')).toBe(false);
  });

  it('WV-07: blocks Google Cloud metadata server IP (169.254.169.254)', () => {
    expect(validateWebhookUrl('https://169.254.169.254/computeMetadata/v1/')).toBe(false);
  });

  it('WV-08: blocks internal network domain patterns (.internal, .local)', () => {
    expect(validateWebhookUrl('https://metadata.google.internal/computeMetadata')).toBe(false);
    expect(validateWebhookUrl('https://my-service.local/webhook')).toBe(false);
  });

  it('WV-09: gracefully handles malformed URL strings', () => {
    expect(validateWebhookUrl('not-a-url')).toBe(false);
    expect(validateWebhookUrl('')).toBe(false);
    expect(validateWebhookUrl(null as any)).toBe(false);
  });
});
