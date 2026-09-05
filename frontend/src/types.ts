export type ReflectionMode = 'reflective' | 'summary' | 'brainstorm' | 'actionable';

export interface UserProfile {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  admin?: boolean;
  role?: 'admin' | 'user';
  customClaims?: Record<string, any>;
}

export interface AdminMetrics {
  uptimeSeconds: number;
  totalRegisteredUsers: number;
  activeSessions: number;
  totalJournals: number;
  totalInteractions: number;
  totalPinnedLocations: number;
  totalRequests: number;
  modelFallbackDistribution: Record<string, number>;
  modelLadderHealth: Array<{
    model: string;
    role: string;
    status: string;
    latencyMs: number;
  }>;
  rbacStats: {
    adminUsersCount: number;
    adminUids: string[];
    enforcedRules: string;
  };
  auditLogPreview: Array<{
    id: string;
    timestamp: number;
    action: string;
    actorUid: string;
    actorEmail: string;
    targetUid?: string;
    details?: string;
  }>;
}

export interface AdminUserItem {
  uid: string;
  email: string;
  name: string;
  role: 'admin' | 'user';
  admin: boolean;
  isRootAdmin?: boolean;
  journalCount: number;
  interactionCount: number;
}


export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

export interface AIInsight {
  summary: string;
  keyThemes: string[];
  emotionalTone: string;
  takeaways: string[];
  followUpQuestions: string[];
  encouragement: string;
}

export interface EntryLocation {
  name: string;
  address?: string;
  lat: number;
  lng: number;
  placeId?: string;
  formattedAddress?: string;
}

export interface JournalEntry {
  id: string;
  userId: string;
  title: string;
  content: string;
  mood: string;
  tags: string[];
  createdAt: number;
  updatedAt: number;
  conversation: ChatMessage[];
  insights?: AIInsight | null;
  location?: EntryLocation | null;
  pinned?: boolean;
}

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

export interface Habit {
  id: string;
  userId: string;
  title: string;
  emoji: string;
  currentStreak: number;
  bestStreak: number;
  totalPoints: number;
  createdAt: number;
  updatedAt: number;
  completionHistory: Record<string, boolean>;
}

