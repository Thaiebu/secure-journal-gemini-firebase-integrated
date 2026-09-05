import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  getCachedJournals,
  setCachedJournals,
  fetchJournalsFromBackend,
} from '../../services/journalService';
import { JournalEntry } from '../../types';
import { http, HttpResponse } from 'msw';
import { server } from '../mocks/server';

describe('journalService (Frontend Cache & Fetch)', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('FE-JNL-01: getCachedJournals returns empty array when cache is empty', () => {
    const result = getCachedJournals('user_abc');
    expect(result).toEqual([]);
  });

  it('FE-JNL-02: setCachedJournals writes entries that getCachedJournals restores', () => {
    const mockEntries: JournalEntry[] = [
      {
        id: 'entry_1',
        userId: 'user_abc',
        title: 'Gratitude Reflection',
        content: 'Grateful for peaceful morning walk.',
        mood: 'calm',
        tags: ['gratitude', 'nature'],
        createdAt: 1718000000000,
        updatedAt: 1718000000000,
        conversation: [],
        insights: null,
        location: null,
        pinned: false,
      },
    ];

    setCachedJournals('user_abc', mockEntries);
    const restored = getCachedJournals('user_abc');
    expect(restored).toHaveLength(1);
    expect(restored[0].title).toBe('Gratitude Reflection');
  });

  it('FE-JNL-03: fetchJournalsFromBackend returns mapped entries from backend API', async () => {
    const entries = await fetchJournalsFromBackend('user_123');
    expect(Array.isArray(entries)).toBe(true);
    expect(entries.length).toBeGreaterThan(0);
    expect(entries[0].title).toBe('Morning Meditation');
    expect(entries[0].id).toBe('journal_1');
  });

  it('FE-JNL-04: fetchJournalsFromBackend returns empty array on HTTP error without crashing', async () => {
    server.use(
      http.get('/api/journals', () => {
        return HttpResponse.json({ status: 'error' }, { status: 500 });
      })
    );

    const result = await fetchJournalsFromBackend('user_err');
    expect(result).toEqual([]);
  });

  it('FE-JNL-05: fetchJournalsFromBackend returns empty array on network failure', async () => {
    server.use(
      http.get('/api/journals', () => {
        return HttpResponse.error();
      })
    );

    const result = await fetchJournalsFromBackend('user_net_err');
    expect(result).toEqual([]);
  });
});
