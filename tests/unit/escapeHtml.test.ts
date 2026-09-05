import { describe, it, expect } from 'vitest';
import { escapeHtml } from '../../src/utils';

describe('escapeHtml (HTML Entity Sanitization)', () => {
  it('EH-01: escapes HTML control characters (<, >, &, ", \')', () => {
    const raw = '<script>alert("xss" & \'test\')</script>';
    const escaped = escapeHtml(raw);
    expect(escaped).toBe('&lt;script&gt;alert(&quot;xss&quot; &amp; &#039;test&#039;)&lt;/script&gt;');
  });

  it('EH-02: returns empty string for null, undefined, or empty string', () => {
    expect(escapeHtml('')).toBe('');
    expect(escapeHtml(null as any)).toBe('');
    expect(escapeHtml(undefined as any)).toBe('');
  });

  it('EH-03: returns normal text unchanged', () => {
    const normal = 'Mindful reflection on gratitude and growth.';
    expect(escapeHtml(normal)).toBe(normal);
  });
});
