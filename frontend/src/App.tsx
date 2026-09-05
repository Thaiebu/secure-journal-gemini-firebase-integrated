import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  User,
} from 'firebase/auth';
import { auth, googleProvider } from './lib/firebase';
import { UserProfile, JournalEntry, ChatMessage, ReflectionMode, SaveStatus, AIInsight } from './types';
import { Navbar } from './components/Navbar';
import { AuthLanding } from './components/AuthLanding';
import { JournalEditor } from './components/JournalEditor';
import { JournalHistory } from './components/JournalHistory';
import { JournalMapView } from './components/JournalMapView';
import { HabitTracker } from './components/HabitTracker';
import { AdminDashboard } from './components/AdminDashboard';
import { SecurityModal } from './components/SecurityModal';
import { subscribeUserJournals, persistJournalEntry, removeJournalEntry, persistInteractionLog } from './services/journalService';
import { detectHabitsInJournal } from './services/habitService';
import { getAuthHeaders } from './services/authService';
import { fetchCurrentUserRole } from './services/adminService';
import { getFriendlyAuthErrorMessage } from './lib/utils';
import { ShieldAlert, ArrowLeft } from 'lucide-react';
import { ThemeProvider } from './context/ThemeContext';

function createNewEntry(userId: string): JournalEntry {
  return {
    id: `entry_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    userId,
    title: '',
    content: '',
    mood: 'Reflective',
    tags: ['Mindfulness'],
    createdAt: Date.now(),
    updatedAt: Date.now(),
    conversation: [],
    insights: null,
  };
}

export default function App() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState<boolean>(true);
  const [authError, setAuthError] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<'editor' | 'history' | 'habits' | 'map' | 'admin'>('editor');
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [currentEntry, setCurrentEntry] = useState<JournalEntry | null>(null);
  const [detectedHabits, setDetectedHabits] = useState<string[]>([]);

  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [saveError, setSaveError] = useState<string | null>(null);

  const [isGeneratingChat, setIsGeneratingChat] = useState<boolean>(false);
  const [isGeneratingInsights, setIsGeneratingInsights] = useState<boolean>(false);
  const [reflectionMode, setReflectionMode] = useState<ReflectionMode>('reflective');

  const [isSecurityModalOpen, setIsSecurityModalOpen] = useState<boolean>(false);

  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const chatAbortControllerRef = useRef<AbortController | null>(null);
  const insightsAbortControllerRef = useRef<AbortController | null>(null);

  // Monitor Firebase Auth State & Sync RBAC Roles
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser: User | null) => {
      if (firebaseUser) {
        const tokenResult = await firebaseUser.getIdTokenResult().catch(() => null);
        const isAdmin = Boolean(tokenResult?.claims?.admin || tokenResult?.claims?.role === 'admin');
        
        const userProfile: UserProfile = {
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          displayName: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'Reflective Writer',
          photoURL: firebaseUser.photoURL,
          admin: isAdmin,
          role: isAdmin ? 'admin' : 'user',
          customClaims: tokenResult?.claims || {},
        };
        setUser(userProfile);
        setCurrentEntry(createNewEntry(firebaseUser.uid));
        localStorage.setItem('mindreflect_user_profile', JSON.stringify(userProfile));
      } else {
        // Fallback check: Verify if an authenticated server session exists in localStorage
        const storedProfileStr = localStorage.getItem('mindreflect_user_profile');
        const storedToken = localStorage.getItem('mindreflect_auth_token');
        if (storedProfileStr && storedToken) {
          try {
            const parsed = JSON.parse(storedProfileStr);
            if (parsed && parsed.uid) {
              setUser(parsed);
              setCurrentEntry(createNewEntry(parsed.uid));

              // Verify session in background with server
              fetchCurrentUserRole().then((serverUser) => {
                if (serverUser) {
                  setUser((prev) => (prev ? { ...prev, ...serverUser } : prev));
                } else {
                  localStorage.removeItem('mindreflect_user_profile');
                  localStorage.removeItem('mindreflect_auth_token');
                  setUser(null);
                  setCurrentEntry(null);
                  setEntries([]);
                }
              }).catch(() => {
                // Keep local session if temporarily offline
              });
              setIsAuthLoading(false);
              return;
            }
          } catch {
            localStorage.removeItem('mindreflect_user_profile');
          }
        }
        setUser(null);
        setCurrentEntry(null);
        setEntries([]);
      }
      setIsAuthLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Sync backend RBAC profile
  useEffect(() => {
    if (!user?.uid) return;
    fetchCurrentUserRole().then((serverUser) => {
      if (serverUser && (serverUser.admin !== user.admin || serverUser.role !== user.role)) {
        setUser((prev) => prev ? { ...prev, admin: serverUser.admin, role: serverUser.role } : prev);
      }
    });
  }, [user?.uid, activeTab]);

  // Real-time subscribe to user's isolated Firestore collection
  useEffect(() => {
    if (!user?.uid) return;

    const unsubscribe = subscribeUserJournals(
      user.uid,
      (fetchedEntries) => {
        setEntries(fetchedEntries);
      },
      (error) => {
        console.error('[Firestore Subscribe Error]', error);
        setSaveError('Failed to synchronize Firestore entries. Please check connection.');
      }
    );

    return () => unsubscribe();
  }, [user?.uid]);

  // Google Sign-In Handler
  const handleGoogleSignIn = async () => {
    setIsAuthLoading(true);
    setAuthError(null);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err: any) {
      console.error('[Google Auth Error]', err);
      const friendlyMessage = getFriendlyAuthErrorMessage(err);
      setAuthError(friendlyMessage);
    } finally {
      setIsAuthLoading(false);
    }
  };

  // Verified User Access Handler
  const handleVerifiedAccess = (verifiedUser: UserProfile) => {
    setUser(verifiedUser);
    localStorage.setItem('mindreflect_user_profile', JSON.stringify(verifiedUser));
    setCurrentEntry(createNewEntry(verifiedUser.uid));
    setActiveTab('editor');
    setAuthError(null);
  };

  // Sign Out Handler
  const handleSignOut = async () => {
    try {
      localStorage.removeItem('mindreflect_user_profile');
      localStorage.removeItem('mindreflect_auth_token');
      await signOut(auth).catch(() => null);
      setUser(null);
      setCurrentEntry(null);
      setEntries([]);
      setActiveTab('editor');
    } catch (err: any) {
      console.error('[Sign Out Error]', err);
    }
  };


  // Save current entry to Firestore with guaranteed verification
  const handleSaveEntry = async (entryToSave?: JournalEntry) => {
    const target = entryToSave || currentEntry;
    if (!target || !user?.uid) return;

    // Do not save completely blank draft unless it has conversation or title
    if (!target.content.trim() && !target.title.trim() && target.conversation.length === 0) {
      return;
    }

    setSaveStatus('saving');
    setSaveError(null);

    try {
      const updated: JournalEntry = {
        ...target,
        userId: user.uid,
        title: target.title.trim() || 'Untitled Reflection',
        updatedAt: Date.now(),
      };

      await persistJournalEntry(updated);
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 3000);
    } catch (err: any) {
      console.error('[Firestore Save Error]', err);
      setSaveStatus('error');
      setSaveError(err?.message || 'Database write failed. Click Retry Save.');
    }
  };

  // Handle Field Changes in Active Entry
  const handleChangeField = (field: keyof JournalEntry, value: any) => {
    if (!currentEntry) return;
    const updated = {
      ...currentEntry,
      [field]: value,
    };
    setCurrentEntry(updated);
    setSaveStatus('idle');

    // Debounced background auto-save if content exists
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }
    autoSaveTimerRef.current = setTimeout(() => {
      if (updated.content.trim().length > 15) {
        handleSaveEntry(updated);
      }
    }, 2500);
  };

  // Create fresh reflection
  const handleResetNew = () => {
    if (!user?.uid) return;
    if (currentEntry && (currentEntry.content.trim() || currentEntry.title.trim())) {
      handleSaveEntry(currentEntry);
    }
    const fresh = createNewEntry(user.uid);
    setCurrentEntry(fresh);
    setActiveTab('editor');
    setSaveStatus('idle');
    setSaveError(null);
  };

  // Multi-Turn Chat Message Handler with Server-Side Fallback, Abort Controller & Firestore Isolation
  const handleSendMessage = async (content: string, mode: ReflectionMode) => {
    if (!currentEntry || !user?.uid || !content.trim()) return;

    const userMessage: ChatMessage = {
      id: `msg_user_${Date.now()}`,
      role: 'user',
      content: content.trim(),
      timestamp: Date.now(),
    };

    const updatedConversation = [...(currentEntry.conversation || []), userMessage];
    const updatedEntry: JournalEntry = {
      ...currentEntry,
      conversation: updatedConversation,
      updatedAt: Date.now(),
    };

    setCurrentEntry(updatedEntry);
    setIsGeneratingChat(true);

    const controller = new AbortController();
    chatAbortControllerRef.current = controller;

    try {
      // Call Server-Side Gemini API Proxy with Fallback Ladder & Zero-Trust Auth
      const headers = await getAuthHeaders(user);
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers,
        signal: controller.signal,
        body: JSON.stringify({
          messages: updatedConversation.map((m) => ({
            role: m.role,
            content: m.content,
          })),
          mode,
          journalContext: updatedEntry.content,
        }),
      });

      if (!response.ok) {
        const errJson = await response.json().catch(() => ({}));
        throw new Error(errJson.error || errJson.detail || `Server responded with status ${response.status}`);
      }

      const data = await response.json();
      const aiReplyText = data.reply || data.response || data.text || 'I am here to reflect with you on your thoughts.';
      const assistantMessage: ChatMessage = {
        id: `msg_ai_${Date.now()}`,
        role: 'assistant',
        content: aiReplyText,
        timestamp: Date.now(),
      };

      const finalConversation = [...updatedConversation, assistantMessage];
      const finalEntry: JournalEntry = {
        ...updatedEntry,
        conversation: finalConversation,
        updatedAt: Date.now(),
      };

      setCurrentEntry(finalEntry);

      // Guaranteed Transaction Verification: Persist entry & interaction log
      await handleSaveEntry(finalEntry);
      await persistInteractionLog(
        user.uid,
        finalEntry.id,
        assistantMessage.id,
        {
          prompt: content.trim(),
          response: assistantMessage.content,
          mode,
          modelUsed: data.modelUsed,
        }
      );
    } catch (err: any) {
      if (err?.name === 'AbortError' || err?.message?.includes('aborted')) {
        console.log('[Chat Generation] Request cancelled by user.');
        const stoppedMessage: ChatMessage = {
          id: `msg_stopped_${Date.now()}`,
          role: 'assistant',
          content: '_Generation stopped by user._',
          timestamp: Date.now(),
        };
        const entryWithStoppedMsg: JournalEntry = {
          ...updatedEntry,
          conversation: [...updatedConversation, stoppedMessage],
          updatedAt: Date.now(),
        };
        setCurrentEntry(entryWithStoppedMsg);
        await handleSaveEntry(entryWithStoppedMsg);
      } else {
        console.error('[Chat Generation Error]', err);
        const errorMessage: ChatMessage = {
          id: `msg_err_${Date.now()}`,
          role: 'assistant',
          content: `I encountered an issue generating a response (${err?.message || 'Connection error'}). Please try again.`,
          timestamp: Date.now(),
        };
        const finalEntryWithErr = {
          ...updatedEntry,
          conversation: [...updatedConversation, errorMessage],
        };
        setCurrentEntry(finalEntryWithErr);
      }
    } finally {
      setIsGeneratingChat(false);
      chatAbortControllerRef.current = null;
    }
  };

  // Stop active chat generation
  const handleStopGeneratingChat = () => {
    if (chatAbortControllerRef.current) {
      chatAbortControllerRef.current.abort();
      chatAbortControllerRef.current = null;
    }
    setIsGeneratingChat(false);
  };

  // Generate Structured AI Insights and Synthesis
  const handleGenerateInsights = async () => {
    if (!user) {
      setSaveError('Authentication required to generate AI insights. Please sign in.');
      return;
    }
    if (!currentEntry || !currentEntry.content.trim()) return;

    setIsGeneratingInsights(true);
    setSaveError(null);

    const controller = new AbortController();
    insightsAbortControllerRef.current = controller;

    try {
      const headers = await getAuthHeaders(user);
      const response = await fetch('/api/insights', {
        method: 'POST',
        headers,
        signal: controller.signal,
        body: JSON.stringify({
          title: currentEntry.title || 'Career & Reflection',
          content: currentEntry.content,
          mood: currentEntry.mood || 'Reflective',
        }),
      });

      if (!response.ok) {
        const errJson = await response.json().catch(() => ({}));
        throw new Error(errJson.error || errJson.detail || `Server error: ${response.status}`);
      }

      const data = await response.json();
      const raw = data.insights || data;

      const parsedInsight: AIInsight = {
        summary:
          raw.summary ||
          raw.moodAnalysis ||
          'A reflective synthesis highlighting your goals, cognitive patterns, and actionable steps forward.',
        keyThemes: Array.isArray(raw.keyThemes) && raw.keyThemes.length > 0
          ? raw.keyThemes
          : ['Personal Growth', 'Coding Mastery', 'Career Aspirations'],
        emotionalTone: raw.emotionalTone || raw.emotionalEnergy || 'Motivated & Grounded',
        takeaways: Array.isArray(raw.takeaways) && raw.takeaways.length > 0
          ? raw.takeaways
          : Array.isArray(raw.actionSteps) && raw.actionSteps.length > 0
          ? raw.actionSteps
          : ['Focus on deliberate daily coding practice', 'Balance current role appreciation with future ambition'],
        followUpQuestions: Array.isArray(raw.followUpQuestions) && raw.followUpQuestions.length > 0
          ? raw.followUpQuestions
          : ['What is the single most impactful coding concept you want to master this week?'],
        encouragement:
          raw.encouragement ||
          (Array.isArray(raw.cognitiveReframes) ? raw.cognitiveReframes[0] : null) ||
          'Your drive to continuously elevate your engineering skills is the foundation of great achievement.',
      };

      // Generate and apply evocative reflection title when summary is generated
      const generatedTitle =
        (typeof data.title === 'string' && data.title.trim().replace(/^["']|["']$/g, '')) ||
        (typeof raw.title === 'string' && raw.title.trim().replace(/^["']|["']$/g, '')) ||
        (typeof data.suggestedTitle === 'string' && data.suggestedTitle.trim().replace(/^["']|["']$/g, '')) ||
        (typeof raw.suggestedTitle === 'string' && raw.suggestedTitle.trim().replace(/^["']|["']$/g, '')) ||
        (parsedInsight.keyThemes?.[0] ? `Reflections on ${parsedInsight.keyThemes[0]}` : null) ||
        (parsedInsight.summary ? parsedInsight.summary.split('.')[0].replace(/^["']|["']$/g, '').slice(0, 45).trim() : null) ||
        'Mindful Reflection';

      const updatedEntry: JournalEntry = {
        ...currentEntry,
        title: generatedTitle,
        insights: parsedInsight,
        updatedAt: Date.now(),
      };

      setCurrentEntry(updatedEntry);
      if (user?.uid) {
        await handleSaveEntry(updatedEntry);

        // Detect habits mentioned in this journal reflection
        detectHabitsInJournal(currentEntry.content)
          .then((detected) => {
            if (Array.isArray(detected) && detected.length > 0) {
              setDetectedHabits((prev) => Array.from(new Set([...prev, ...detected])));
            }
          })
          .catch((e) => console.warn('[Habit Detection in Journal]', e));
      }
    } catch (err: any) {
      if (err?.name === 'AbortError' || err?.message?.includes('aborted')) {
        console.log('[Insights Generation] Synthesis stopped by user.');
      } else {
        console.error('[Insights Error]', err);
        setSaveError(`Failed to generate insights: ${err?.message || 'Server error'}`);
      }
    } finally {
      setIsGeneratingInsights(false);
      insightsAbortControllerRef.current = null;
    }
  };

  // Stop active AI insights synthesis
  const handleStopGeneratingInsights = () => {
    if (insightsAbortControllerRef.current) {
      insightsAbortControllerRef.current.abort();
      insightsAbortControllerRef.current = null;
    }
    setIsGeneratingInsights(false);
  };

  // Select an existing entry from history
  const handleSelectHistoryEntry = (entry: JournalEntry) => {
    setCurrentEntry(entry);
    setActiveTab('editor');
    setSaveStatus('idle');
    setSaveError(null);
  };

  // Delete entry
  const handleDeleteEntry = async (entryId: string) => {
    if (!user?.uid) return;
    try {
      await removeJournalEntry(user.uid, entryId);
      if (currentEntry?.id === entryId) {
        setCurrentEntry(createNewEntry(user.uid));
      }
    } catch (err: any) {
      console.error('[Delete Error]', err);
      setSaveError('Failed to delete reflection.');
    }
  };

  return (
    <ThemeProvider>
      <div
        className="min-h-screen flex flex-col font-sans transition-colors duration-200"
        style={{
          backgroundColor: 'var(--bg-main)',
          color: 'var(--text-primary)',
        }}
      >
        <Navbar
          user={user}
          activeTab={activeTab}
          onSelectTab={setActiveTab}
          onSignOut={handleSignOut}
          onOpenSecurityModal={() => setIsSecurityModalOpen(true)}
          entriesCount={entries.length}
          locationsCount={entries.filter((e) => !!e.location).length}
        />

        <main className="flex-1">
          {isAuthLoading ? (
            <div className="min-h-[calc(100vh-4rem)] flex flex-col items-center justify-center space-y-4">
              <div className="w-10 h-10 border-3 border-amber-500/30 border-t-amber-500 rounded-full animate-spin" />
              <p className="text-sm font-medium text-neutral-400">Verifying secure Firebase credentials...</p>
            </div>
          ) : !user ? (
            <AuthLanding
              onGoogleSignIn={handleGoogleSignIn}
              onVerifiedAccess={handleVerifiedAccess}
              isLoading={isAuthLoading}
              error={authError}
              onClearError={() => setAuthError(null)}
            />
          ) : activeTab === 'editor' && currentEntry ? (
            <JournalEditor
              entry={currentEntry}
              onChangeField={handleChangeField}
              onSave={() => handleSaveEntry(currentEntry)}
              onResetNew={handleResetNew}
              saveStatus={saveStatus}
              saveError={saveError}
              onRetrySave={() => handleSaveEntry(currentEntry)}
              onSendMessage={handleSendMessage}
              onGenerateInsights={handleGenerateInsights}
              onStopGeneratingChat={handleStopGeneratingChat}
              onStopGeneratingInsights={handleStopGeneratingInsights}
              isGeneratingInsights={isGeneratingInsights}
              isGeneratingChat={isGeneratingChat}
              reflectionMode={reflectionMode}
              onSelectMode={setReflectionMode}
            />
          ) : activeTab === 'habits' ? (
            <HabitTracker
              user={user}
              detectedHabits={detectedHabits}
              onDismissDetectedHabit={(hName) =>
                setDetectedHabits((prev) => prev.filter((item) => item !== hName))
              }
            />
          ) : activeTab === 'map' ? (
            <JournalMapView
              entries={entries}
              onSelectEntry={handleSelectHistoryEntry}
              onNewEntry={handleResetNew}
            />
          ) : activeTab === 'admin' ? (
            user.admin ? (
              <AdminDashboard currentUser={user} />
            ) : (
              <div className="max-w-3xl mx-auto px-4 py-16 text-center space-y-6">
                <div className="w-16 h-16 mx-auto rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-600 dark:text-rose-400 flex items-center justify-center shadow-xs">
                  <ShieldAlert className="w-8 h-8" />
                </div>
                <div className="space-y-2">
                  <h2
                    className="font-serif-display text-xl font-bold tracking-tight"
                    style={{ color: 'var(--color-text)' }}
                  >
                    Access Restricted: Administrator Privileges Required
                  </h2>
                  <p className="text-sm max-w-lg mx-auto leading-relaxed" style={{ color: 'var(--color-text-muted)' }}>
                    The Admin Command Center is protected by strict Role-Based Access Control (RBAC). Your authenticated account ({user.email || user.uid}) lacks verified cryptographic administrator custom claims.
                  </p>
                </div>
                <div
                  className="p-4 rounded-xl border text-left max-w-md mx-auto font-mono text-xs space-y-1.5 shadow-2xs"
                  style={{
                    backgroundColor: 'var(--color-surface)',
                    borderColor: 'var(--color-border)',
                    color: 'var(--color-text)',
                  }}
                >
                  <div className="font-semibold" style={{ color: 'var(--color-accent-text)' }}>Security Enforcement Notice:</div>
                  <div style={{ color: 'var(--color-text-muted)' }}>• Client-side flag injections or state mutations are strictly untrusted.</div>
                  <div style={{ color: 'var(--color-text-muted)' }}>• Endpoints are cryptographically verified with Firebase Admin SDK.</div>
                  <div style={{ color: 'var(--color-text-muted)' }}>• Status: <span className="text-rose-600 dark:text-rose-400 font-bold">HTTP 403 Forbidden</span></div>
                </div>
                <button
                  onClick={() => setActiveTab('editor')}
                  className="inline-flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 text-xs font-semibold transition cursor-pointer shadow-xs active:scale-98"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Return to Studio &amp; Reflection</span>
                </button>
              </div>
            )
          ) : (
            <JournalHistory
              entries={entries}
              onSelectEntry={handleSelectHistoryEntry}
              onDeleteEntry={handleDeleteEntry}
              onNewEntry={handleResetNew}
            />
          )}
        </main>

        <SecurityModal
          isOpen={isSecurityModalOpen}
          onClose={() => setIsSecurityModalOpen(false)}
          user={user}
        />
      </div>
    </ThemeProvider>
  );
}
