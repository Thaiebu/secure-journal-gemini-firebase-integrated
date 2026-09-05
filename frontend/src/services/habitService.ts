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
import { db } from '../lib/firebase';
import { Habit } from '../types';
import { sanitizePayload } from '../lib/utils';
import { getAuthHeaders } from './authService';

const CACHE_PREFIX = 'mindreflect_user_habits_';

/**
 * Reads locally cached habits for instant offline/login restoration.
 */
export function getCachedHabits(userId: string): Habit[] {
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
    console.warn('[Habit Cache Read Notice]', e);
  }
  return [];
}

/**
 * Updates local cache for the specified user.
 */
export function setCachedHabits(userId: string, habits: Habit[]): void {
  if (!userId) return;
  try {
    localStorage.setItem(`${CACHE_PREFIX}${userId}`, JSON.stringify(habits));
  } catch (e) {
    console.warn('[Habit Cache Write Notice]', e);
  }
}

/**
 * Fetches habits directly via the zero-trust backend API.
 */
export async function fetchHabitsFromBackend(userId: string): Promise<Habit[]> {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch('/api/habits', {
      method: 'GET',
      headers,
    });
    if (response.ok) {
      const data = await response.json();
      if (Array.isArray(data.habits)) {
        const mapped: Habit[] = data.habits.map((item: any) => ({
          id: item.id,
          userId: item.userId || userId,
          title: item.title || 'Untitled Habit',
          emoji: item.emoji || '🎯',
          currentStreak: Number(item.currentStreak) || 0,
          bestStreak: Number(item.bestStreak) || 0,
          totalPoints: Number(item.totalPoints) || 0,
          createdAt: typeof item.createdAt === 'string' ? new Date(item.createdAt).getTime() : (item.createdAt || Date.now()),
          updatedAt: typeof item.updatedAt === 'string' ? new Date(item.updatedAt).getTime() : (item.updatedAt || Date.now()),
          completionHistory: item.completionHistory && typeof item.completionHistory === 'object' ? item.completionHistory : {},
        }));
        if (mapped.length > 0) {
          setCachedHabits(userId, mapped);
        }
        return mapped;
      }
    }
  } catch (err) {
    console.warn('[Backend Habits Sync Notice]', err);
  }
  return [];
}

/**
 * Subscribes to real-time updates of the user's isolated habits collection.
 * Seamlessly falls back to backend sync and instant local cache.
 */
export function subscribeUserHabits(
  userId: string,
  onUpdate: (habits: Habit[]) => void,
  onError: (error: Error) => void
): Unsubscribe {
  if (!userId) {
    onUpdate([]);
    return () => {};
  }

  // 1. Instantly surface cached habits
  const cached = getCachedHabits(userId);
  if (cached.length > 0) {
    onUpdate(cached);
  }

  // 2. Query Firestore if available
  let unsubscribeFirestore: Unsubscribe | null = null;
  let hasReceivedFirestoreData = false;

  if (db) {
    try {
      const habitsCol = collection(db, 'users', userId, 'habits');
      const q = query(habitsCol, orderBy('createdAt', 'desc'));

      unsubscribeFirestore = onSnapshot(
        q,
        (snapshot) => {
          hasReceivedFirestoreData = true;
          const habits: Habit[] = snapshot.docs.map((docSnap) => {
            const data = docSnap.data();
            return {
              id: docSnap.id,
              userId: data.userId || userId,
              title: data.title || 'Untitled Habit',
              emoji: data.emoji || '🎯',
              currentStreak: Number(data.currentStreak) || 0,
              bestStreak: Number(data.bestStreak) || 0,
              totalPoints: Number(data.totalPoints) || 0,
              createdAt: typeof data.createdAt === 'string' ? new Date(data.createdAt).getTime() : (data.createdAt || Date.now()),
              updatedAt: typeof data.updatedAt === 'string' ? new Date(data.updatedAt).getTime() : (data.updatedAt || Date.now()),
              completionHistory: data.completionHistory && typeof data.completionHistory === 'object' ? data.completionHistory : {},
            };
          });

          setCachedHabits(userId, habits);
          onUpdate(habits);
        },
        (error) => {
          console.warn('[Firestore Habits Subscription Fallback]', error.message);
          // Fall back to backend sync
          fetchHabitsFromBackend(userId)
            .then((backendHabits) => {
              if (backendHabits.length > 0) {
                onUpdate(backendHabits);
              }
            })
            .catch(onError);
        }
      );
    } catch (err: any) {
      console.warn('[Firestore Setup Error]', err);
    }
  }

  // 3. Fallback background fetch to ensure sync if firestore doesn't fire immediately
  fetchHabitsFromBackend(userId)
    .then((backendHabits) => {
      if (!hasReceivedFirestoreData && backendHabits.length > 0) {
        onUpdate(backendHabits);
      }
    })
    .catch((err) => {
      if (!hasReceivedFirestoreData) {
        onError(err);
      }
    });

  // 4. Polling fallback interval (every 15 seconds)
  const pollInterval = setInterval(async () => {
    try {
      const fresh = await fetchHabitsFromBackend(userId);
      if (fresh.length > 0) {
        onUpdate(fresh);
      }
    } catch {
      // Background poll silence
    }
  }, 15000);

  return () => {
    if (unsubscribeFirestore) {
      unsubscribeFirestore();
    }
    clearInterval(pollInterval);
  };
}

/**
 * Creates a new habit via dual-write (backend API + client Firestore).
 */
export async function createHabit(title: string, emoji: string = '🎯'): Promise<Habit> {
  const headers = await getAuthHeaders();
  const response = await fetch('/api/habits', {
    method: 'POST',
    headers,
    body: JSON.stringify({ title, emoji }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || 'Failed to create habit');
  }

  const data = await response.json();
  const newHabit = data.habit as Habit;

  // Dual-write to client Firestore if available
  if (db && newHabit && newHabit.userId) {
    try {
      const docRef = doc(db, 'users', newHabit.userId, 'habits', newHabit.id);
      await setDoc(docRef, sanitizePayload(newHabit), { merge: true });
    } catch (fsErr) {
      console.warn('[Client Firestore Habit Dual-Write]', fsErr);
    }
  }

  return newHabit;
}

/**
 * Toggles a habit completion for a specific date (defaults to today).
 */
export async function toggleHabit(habitId: string, date?: string): Promise<{ habit: Habit; isCompleted: boolean; earnedPointsDelta: number }> {
  const headers = await getAuthHeaders();
  const response = await fetch(`/api/habits/${encodeURIComponent(habitId)}/toggle`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ date }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || 'Failed to toggle habit');
  }

  const data = await response.json();
  const updatedHabit = data.habit as Habit;

  // Dual-write to client Firestore if available
  if (db && updatedHabit && updatedHabit.userId) {
    try {
      const docRef = doc(db, 'users', updatedHabit.userId, 'habits', updatedHabit.id);
      await setDoc(docRef, sanitizePayload(updatedHabit), { merge: true });
    } catch (fsErr) {
      console.warn('[Client Firestore Habit Dual-Write]', fsErr);
    }
  }

  return {
    habit: updatedHabit,
    isCompleted: Boolean(data.isCompleted),
    earnedPointsDelta: Number(data.earnedPointsDelta) || 0,
  };
}

/**
 * Deletes a habit.
 */
export async function deleteHabit(habitId: string, userId?: string): Promise<void> {
  const headers = await getAuthHeaders();
  const response = await fetch(`/api/habits/${encodeURIComponent(habitId)}`, {
    method: 'DELETE',
    headers,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || 'Failed to delete habit');
  }

  // Client Firestore delete
  if (db && userId) {
    try {
      const docRef = doc(db, 'users', userId, 'habits', habitId);
      await deleteDoc(docRef);
    } catch (fsErr) {
      console.warn('[Client Firestore Habit Delete]', fsErr);
    }
  }
}

/**
 * Detects habits mentioned in journal reflection text using Gemini fallback ladder.
 */
export async function detectHabitsInJournal(text: string): Promise<string[]> {
  if (!text || text.trim().length < 5) return [];

  try {
    const headers = await getAuthHeaders();
    const response = await fetch('/api/habits/detect', {
      method: 'POST',
      headers,
      body: JSON.stringify({ text }),
    });

    if (response.ok) {
      const data = await response.json();
      if (Array.isArray(data.detectedHabits)) {
        return data.detectedHabits;
      }
    }
  } catch (err) {
    console.warn('[Detect Habits Notice]', err);
  }

  return [];
}
