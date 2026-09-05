import { describe, it, expect } from 'vitest';
import { sanitizePayload } from '../../src/utils';

describe('sanitizePayload (Zero-Crash Payload Hygiene)', () => {
  it('SP-01: leaves clean objects with defined primitives untouched', () => {
    const input = {
      title: 'Mindful Morning',
      mood: 'energized',
      score: 95,
      isActive: true,
      tags: ['meditation', 'focus'],
    };
    const result = sanitizePayload(input);
    expect(result).toEqual(input);
  });

  it('SP-02: sanitizes undefined attributes to null for Firestore safety', () => {
    const input = {
      title: 'Evening Reflection',
      location: undefined,
      notes: undefined,
      tags: ['gratitude'],
    };
    const result = sanitizePayload(input);
    expect(result).toEqual({
      title: 'Evening Reflection',
      location: null,
      notes: null,
      tags: ['gratitude'],
    });
  });

  it('SP-03: deeply sanitizes nested objects and arrays with undefined values', () => {
    const input = {
      user: {
        profile: {
          bio: undefined,
          city: 'San Francisco',
        },
      },
      insights: [
        { key: 'clarity', score: 9, notes: undefined },
      ],
    };
    const result = sanitizePayload(input);
    expect(result).toEqual({
      user: {
        profile: {
          bio: null,
          city: 'San Francisco',
        },
      },
      insights: [
        { key: 'clarity', score: 9, notes: null },
      ],
    });
  });

  it('SP-04: gracefully handles null or undefined root input', () => {
    expect(sanitizePayload(null)).toBeNull();
    expect(sanitizePayload(undefined)).toBeNull();
  });
});
