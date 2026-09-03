import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
  Unsubscribe,
} from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { JournalEntry, ChatMessage, AIInsight } from '../types';
import { sanitizePayload } from '../lib/utils';
import { getAuthHeaders } from './authService';

const CACHE_PREFIX = 'mindreflect_user_journals_';

/**
 * Reads locally cached journal entries for instant offline/login restoration.
 */
export function getCachedJournals(userId: string): JournalEntry[] {
  if (!userId) return [];
  try {
    const raw = localStorage.getItem(`${CACHE_PREFIX}${userId}`);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    }
  } catch (e) {
    console.warn('[Cache Read Notice]', e);
  }
  return [];
}

/**
 * Updates local cache for the specified user.
 */
export function setCachedJournals(userId: string, entries: JournalEntry[]): void {
  if (!userId) return;
  try {
    localStorage.setItem(`${CACHE_PREFIX}${userId}`, JSON.stringify(entries));
  } catch (e) {
    console.warn('[Cache Write Notice]', e);
  }
}

/**
 * Fetches journals directly via the zero-trust backend API using Admin SDK.
 */
export async function fetchJournalsFromBackend(userId: string): Promise<JournalEntry[]> {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`/api/journals?userId=${encodeURIComponent(userId)}`, {
      method: 'GET',
      headers,
    });
    if (response.ok) {
      const data = await response.json();
      if (Array.isArray(data.entries)) {
        const mapped = data.entries.map((entry: any) => ({
          id: entry.id,
          userId: entry.userId || userId,
          title: entry.title || 'Untitled Reflection',
          content: entry.content || '',
          mood: entry.mood || 'Reflective',
          tags: Array.isArray(entry.tags) ? entry.tags : [],
          createdAt: typeof entry.createdAt === 'string' ? new Date(entry.createdAt).getTime() : (entry.createdAt || Date.now()),
          updatedAt: typeof entry.updatedAt === 'string' ? new Date(entry.updatedAt).getTime() : (entry.updatedAt || Date.now()),
          conversation: Array.isArray(entry.conversation) ? entry.conversation : [],
          insights: entry.insights || null,
          location: entry.location || null,
          pinned: !!entry.pinned,
        }));
        if (mapped.length > 0) {
          setCachedJournals(userId, mapped);
        }
        return mapped;
      }
    }
  } catch (err) {
    console.warn('[Backend Journals Sync Notice]', err);
  }
  return [];
}

/**
 * Subscribes to real-time updates of the user's isolated journal documents.
 * Seamlessly falls back to backend Admin SDK sync and instant local cache.
 */
export function subscribeUserJournals(
  userId: string,
  onUpdate: (entries: JournalEntry[]) => void,
  onError: (error: Error) => void
): Unsubscribe {
  if (!userId) {
    onUpdate([]);
    return () => {};
  }

  let isSubscribed = true;
  let pollInterval: NodeJS.Timeout | null = null;

  // 1. Instant Cache Restoration on Sign-In / App Launch
  const cached = getCachedJournals(userId);
  if (cached.length > 0) {
    onUpdate(cached);
  }

  const runBackendSync = async () => {
    const entries = await fetchJournalsFromBackend(userId);
    if (isSubscribed && entries.length >= 0) {
      if (entries.length > 0) {
        setCachedJournals(userId, entries);
        onUpdate(entries);
      } else if (cached.length > 0) {
        onUpdate(cached);
      }
    }
  };

  // 2. Real-Time Client-Side Firestore Listener
  if (auth.currentUser && auth.currentUser.uid === userId) {
    try {
      const journalsRef = collection(db, 'users', userId, 'journals');
      const q = query(journalsRef, orderBy('updatedAt', 'desc'));

      const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          if (!isSubscribed) return;
          const entries: JournalEntry[] = snapshot.docs.map((docSnap) => {
            const data = docSnap.data();
            return {
              id: docSnap.id,
              userId: data.userId || userId,
              title: data.title || 'Untitled Reflection',
              content: data.content || '',
              mood: data.mood || 'Reflective',
              tags: Array.isArray(data.tags) ? data.tags : [],
              createdAt: typeof data.createdAt === 'string' ? new Date(data.createdAt).getTime() : (data.createdAt || Date.now()),
              updatedAt: typeof data.updatedAt === 'string' ? new Date(data.updatedAt).getTime() : (data.updatedAt || Date.now()),
              conversation: Array.isArray(data.conversation) ? data.conversation : [],
              insights: data.insights || null,
              location: data.location || null,
              pinned: !!data.pinned,
            };
          });

          if (entries.length > 0) {
            setCachedJournals(userId, entries);
            onUpdate(entries);
          } else {
            // If empty, verify against backend admin before clearing
            runBackendSync();
          }
        },
        (err) => {
          console.warn('[Firestore Notice] Switching to backend Admin synchronization:', err.message);
          runBackendSync();
          if (!pollInterval) {
            pollInterval = setInterval(runBackendSync, 12000);
          }
        }
      );

      return () => {
        isSubscribed = false;
        if (pollInterval) clearInterval(pollInterval);
        unsubscribe();
      };
    } catch (err: any) {
      console.warn('[Firestore Setup Notice]', err);
    }
  }

  // 3. Fallback to Backend Admin Sync
  runBackendSync();
  pollInterval = setInterval(runBackendSync, 12000);

  return () => {
    isSubscribed = false;
    if (pollInterval) clearInterval(pollInterval);
  };
}

/**
 * Persists or updates a journal entry in the user's isolated collection.
 * Synchronizes immediately to local cache, client Firestore, and backend API.
 */
export async function persistJournalEntry(entry: JournalEntry): Promise<void> {
  if (!entry.userId) {
    throw new Error('Cannot persist journal entry: User is not authenticated.');
  }

  const rawPayload = {
    ...entry,
    updatedAt: Date.now(),
  };
  const cleanPayload = sanitizePayload(rawPayload);

  // Optimistically update local cache
  const currentCached = getCachedJournals(entry.userId);
  const existingIdx = currentCached.findIndex((e) => e.id === entry.id);
  let updatedList: JournalEntry[];
  if (existingIdx >= 0) {
    updatedList = currentCached.map((e) => (e.id === entry.id ? { ...e, ...cleanPayload } : e));
  } else {
    updatedList = [cleanPayload, ...currentCached];
  }
  setCachedJournals(entry.userId, updatedList);

  // Attempt client Firestore write if signed in
  if (auth.currentUser && auth.currentUser.uid === entry.userId) {
    try {
      const docRef = doc(db, 'users', entry.userId, 'journals', entry.id);
      await setDoc(docRef, cleanPayload, { merge: true });
    } catch (clientErr) {
      console.warn('[Firestore Client Write Notice] Falling back to zero-trust backend API:', clientErr);
    }
  }

  // Also persist to Backend API for guaranteed multi-system Cloud Firestore synchronization
  try {
    const headers = await getAuthHeaders();
    await fetch('/api/save-session', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        journalId: entry.id,
        title: entry.title,
        content: entry.content,
        mood: entry.mood,
        tags: entry.tags,
        conversation: entry.conversation,
        insights: entry.insights || null,
        location: entry.location || null,
        generateInsights: false,
      }),
    });
  } catch (backendErr) {
    console.warn('[Backend Save Session Notice]', backendErr);
  }
}

/**
 * Saves a multi-turn interaction log isolated to the user's path.
 */
export async function persistInteractionLog(
  userId: string,
  journalId: string,
  interactionId: string,
  data: {
    prompt: string;
    response: string;
    mode: string;
    modelUsed?: string;
  }
): Promise<void> {
  if (!userId) return;

  const cleanPayload = sanitizePayload({
    id: interactionId,
    userId,
    journalId,
    prompt: data.prompt,
    response: data.response,
    mode: data.mode,
    modelUsed: data.modelUsed || 'gemini-3.6-flash',
    timestamp: Date.now(),
  });

  if (auth.currentUser && auth.currentUser.uid === userId) {
    try {
      const docRef = doc(db, 'users', userId, 'interactions', interactionId);
      await setDoc(docRef, cleanPayload, { merge: true });
    } catch (e) {
      console.warn('[Interaction Log Notice]', e);
    }
  }
}

/**
 * Deletes a journal entry from Firestore and local cache.
 */
export async function removeJournalEntry(userId: string, journalId: string): Promise<void> {
  if (!userId || !journalId) return;

  // Update local cache
  const currentCached = getCachedJournals(userId);
  const updatedList = currentCached.filter((e) => e.id !== journalId);
  setCachedJournals(userId, updatedList);

  if (auth.currentUser && auth.currentUser.uid === userId) {
    try {
      const docRef = doc(db, 'users', userId, 'journals', journalId);
      await deleteDoc(docRef);
    } catch (e) {
      console.warn('[Client Delete Notice] Falling back to backend API:', e);
    }
  }

  try {
    const headers = await getAuthHeaders();
    await fetch(`/api/journals/${encodeURIComponent(journalId)}?userId=${encodeURIComponent(userId)}`, {
      method: 'DELETE',
      headers,
    });
  } catch (err) {
    console.error('[Delete Journal Error]', err);
    throw err;
  }
}

