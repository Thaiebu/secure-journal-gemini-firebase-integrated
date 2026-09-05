// Pure Utility Functions for MindReflect AI Journal
// Extracted for high-assurance unit testing and zero side-effects

export function sanitizePayload<T>(obj: T): T {
  if (obj === null || obj === undefined) {
    return null as unknown as T;
  }
  return JSON.parse(JSON.stringify(obj, (_key, value) => (value === undefined ? null : value)));
}

export const rateLimits = new Map<string, number[]>();

export function clearRateLimits(): void {
  rateLimits.clear();
}

export function checkRateLimit(
  uid: string,
  endpoint: string,
  maxCalls: number,
  windowSeconds: number = 60
): void {
  const key = `${uid}:${endpoint}`;
  const now = Date.now();
  const windowMs = windowSeconds * 1000;
  const calls = (rateLimits.get(key) || []).filter((t) => now - t < windowMs);

  if (calls.length >= maxCalls) {
    const err: any = new Error(`Rate limit exceeded. Maximum ${maxCalls} requests per ${windowSeconds}s.`);
    err.statusCode = 429;
    err.code = 'RATE_LIMIT_EXCEEDED';
    throw err;
  }

  calls.push(now);
  rateLimits.set(key, calls);
}

export const INJECTION_PATTERNS = [
  'ignore your instructions',
  'system prompt',
  'ignore previous',
  'act as',
  'jailbreak',
];

export function checkPromptInjection(text: string): void {
  if (!text || typeof text !== 'string') return;
  const lowered = text.toLowerCase();
  if (INJECTION_PATTERNS.some((p) => lowered.includes(p))) {
    const err: any = new Error('Content violates AI usage policy.');
    err.statusCode = 400;
    err.code = 'PROMPT_INJECTION_DETECTED';
    throw err;
  }
}

export const RFC5322_EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

export function isValidEmail(email: string): boolean {
  if (typeof email !== 'string') return false;
  const trimmed = email.trim();
  return RFC5322_EMAIL_REGEX.test(trimmed) && trimmed.length <= 100;
}

export function validateWebhookUrl(urlStr: string): boolean {
  try {
    const parsed = new URL(urlStr);
    if (parsed.protocol !== 'https:') return false;
    const hostname = parsed.hostname.toLowerCase();
    if (
      hostname === 'localhost' ||
      hostname === '127.0.0.1' ||
      hostname === '0.0.0.0' ||
      hostname.startsWith('10.') ||
      hostname.startsWith('192.168.') ||
      hostname.startsWith('172.16.') ||
      hostname === '169.254.169.254' ||
      hostname.endsWith('.internal') ||
      hostname.endsWith('.local')
    ) {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

export function escapeHtml(str: string): string {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
