import React, { useState, useEffect, useMemo } from 'react';
import { UserProfile, Habit } from '../types';
import {
  subscribeUserHabits,
  createHabit,
  toggleHabit,
  deleteHabit,
} from '../services/habitService';
import {
  Flame,
  Star,
  Plus,
  Trash2,
  Check,
  Sparkles,
  Award,
  Calendar,
  Zap,
  TrendingUp,
  AlertCircle,
  Lightbulb,
  X,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface HabitTrackerProps {
  user: UserProfile;
  detectedHabits?: string[];
  onDismissDetectedHabit?: (habitName: string) => void;
}

const PRESET_EMOJIS = ['🧘', '🏃', '💧', '📚', '✍️', '🥗', '🌿', '🎯', '🛌', '🚶', '🍵', '💪'];

const QUICK_STARTERS = [
  { title: 'Morning Meditation', emoji: '🧘' },
  { title: 'Drink 2L Water', emoji: '💧' },
  { title: 'Read 20 Minutes', emoji: '📚' },
  { title: 'Evening Reflection', emoji: '✍️' },
  { title: '30-Min Walk', emoji: '🚶' },
];

export const HabitTracker: React.FC<HabitTrackerProps> = ({
  user,
  detectedHabits = [],
  onDismissDetectedHabit,
}) => {
  const [habits, setHabits] = useState<Habit[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // New Habit Form
  const [newTitle, setNewTitle] = useState('');
  const [selectedEmoji, setSelectedEmoji] = useState('🎯');
  const [isEmojiPickerOpen, setIsEmojiPickerOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Interaction State
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [floatingPoints, setFloatingPoints] = useState<{ id: string; delta: number; key: number } | null>(null);

  // Subscribe to real-time habits
  useEffect(() => {
    if (!user?.uid) return;

    setIsLoading(true);
    const unsubscribe = subscribeUserHabits(
      user.uid,
      (updatedHabits) => {
        setHabits(updatedHabits);
        setIsLoading(false);
        setError(null);
      },
      (err) => {
        console.warn('[HabitTracker Subscription Warning]', err);
        setError('Could not connect to habits stream. Changes will sync locally.');
        setIsLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user?.uid]);

  // Today's Date String YYYY-MM-DD
  const todayStr = useMemo(() => {
    const d = new Date();
    return d.toISOString().split('T')[0];
  }, []);

  // Last 7 days helper array: [{ dateStr, dayLabel, isToday }]
  const last7Days = useMemo(() => {
    const days = [];
    const now = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(now.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const dayLabel = d.toLocaleDateString(undefined, { weekday: 'narrow' });
      days.push({
        dateStr,
        dayLabel,
        isToday: dateStr === todayStr,
      });
    }
    return days;
  }, [todayStr]);

  // Summary Metrics
  const totalPoints = useMemo(() => {
    return habits.reduce((acc, h) => acc + (h.totalPoints || 0), 0);
  }, [habits]);

  const activeStreaksCount = useMemo(() => {
    return habits.filter((h) => (h.currentStreak || 0) > 0).length;
  }, [habits]);

  const completedTodayCount = useMemo(() => {
    return habits.filter((h) => h.completionHistory && h.completionHistory[todayStr]).length;
  }, [habits, todayStr]);

  // Create Habit Action
  const handleAddHabit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanTitle = newTitle.trim();
    if (!cleanTitle || isSubmitting) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const created = await createHabit(cleanTitle, selectedEmoji);
      setHabits((prev) => [created, ...prev.filter((h) => h.id !== created.id)]);
      setNewTitle('');
      setIsEmojiPickerOpen(false);
    } catch (err: any) {
      setError(err.message || 'Failed to create habit');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Quick Starter Action
  const handleAddQuickStarter = async (starter: { title: string; emoji: string }) => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    setError(null);
    try {
      const created = await createHabit(starter.title, starter.emoji);
      setHabits((prev) => [created, ...prev.filter((h) => h.id !== created.id)]);
    } catch (err: any) {
      setError(err.message || 'Failed to create habit');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Toggle Habit Action
  const handleToggleHabit = async (habit: Habit) => {
    if (togglingId) return;
    setTogglingId(habit.id);
    setError(null);

    const wasCompleted = Boolean(habit.completionHistory && habit.completionHistory[todayStr]);

    // Optimistic UI update
    const updatedHistory = { ...(habit.completionHistory || {}) };
    let newStreak = habit.currentStreak || 0;
    let newPoints = habit.totalPoints || 0;
    let earnedDelta = 0;

    if (wasCompleted) {
      delete updatedHistory[todayStr];
      newStreak = Math.max(0, newStreak - 1);
      newPoints = Math.max(0, newPoints - 10);
      earnedDelta = -10;
    } else {
      updatedHistory[todayStr] = true;
      newStreak += 1;
      earnedDelta = 10 + (newStreak * 2);
      newPoints += earnedDelta;
    }

    const optimisticHabit: Habit = {
      ...habit,
      currentStreak: newStreak,
      bestStreak: Math.max(habit.bestStreak || 0, newStreak),
      totalPoints: newPoints,
      completionHistory: updatedHistory,
      updatedAt: Date.now(),
    };

    setHabits((prev) => prev.map((h) => (h.id === habit.id ? optimisticHabit : h)));

    if (!wasCompleted) {
      setFloatingPoints({ id: habit.id, delta: earnedDelta, key: Date.now() });
      setTimeout(() => setFloatingPoints(null), 1800);
    }

    try {
      const result = await toggleHabit(habit.id, todayStr);
      setHabits((prev) => prev.map((h) => (h.id === habit.id ? result.habit : h)));
    } catch (err: any) {
      // Revert optimistic update on failure
      setHabits((prev) => prev.map((h) => (h.id === habit.id ? habit : h)));
      setError(err.message || 'Failed to update habit');
    } finally {
      setTogglingId(null);
    }
  };

  // Delete Habit Action
  const handleDeleteHabit = async (habitId: string) => {
    setError(null);
    try {
      await deleteHabit(habitId, user.uid);
      setHabits((prev) => prev.filter((h) => h.id !== habitId));
      setConfirmDeleteId(null);
    } catch (err: any) {
      setError(err.message || 'Failed to delete habit');
    }
  };

  // Handle AI suggestion quick complete or add
  const handleApplyAISuggestion = async (suggestionText: string) => {
    // Check if an existing habit matches
    const existing = habits.find((h) => h.title.toLowerCase().includes(suggestionText.toLowerCase()));
    if (existing) {
      // Toggle it on if not already done today
      if (!existing.completionHistory || !existing.completionHistory[todayStr]) {
        await handleToggleHabit(existing);
      }
    } else {
      // Create new habit and complete it
      try {
        setIsSubmitting(true);
        const created = await createHabit(suggestionText, '✨');
        setHabits((prev) => [created, ...prev]);
        await toggleHabit(created.id, todayStr);
      } catch (err: any) {
        setError(err.message || 'Failed to add suggested habit');
      } finally {
        setIsSubmitting(false);
      }
    }

    if (onDismissDetectedHabit) {
      onDismissDetectedHabit(suggestionText);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6 sm:space-y-8 animate-in fade-in duration-200">
      {/* 1. Header Section */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b pb-6" style={{ borderColor: 'var(--color-border)' }}>
        <div className="space-y-1">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/25 shadow-xs">
              <Flame className="w-5 h-5" />
            </div>
            <h1 className="font-serif-display text-2xl sm:text-3xl font-bold tracking-tight" style={{ color: 'var(--color-text)' }}>
              Habit &amp; Streak Tracker
            </h1>
          </div>
          <p className="text-xs sm:text-sm" style={{ color: 'var(--color-text-muted)' }}>
            Build mindful daily routines. Earn streak multipliers and points with every completed practice.
          </p>
        </div>

        {/* Stats Pills */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <div
            className="flex items-center space-x-2 px-3.5 py-2 rounded-xl border shadow-xs"
            style={{
              backgroundColor: 'var(--color-surface)',
              borderColor: 'var(--color-border)',
            }}
          >
            <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
            <div className="text-left">
              <div className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>
                Total Points
              </div>
              <div className="text-sm font-bold font-mono text-amber-600 dark:text-amber-400">
                {totalPoints} <span className="text-[10px] font-normal opacity-80">pts</span>
              </div>
            </div>
          </div>

          <div
            className="flex items-center space-x-2 px-3.5 py-2 rounded-xl border shadow-xs"
            style={{
              backgroundColor: 'var(--color-surface)',
              borderColor: 'var(--color-border)',
            }}
          >
            <Zap className="w-4 h-4 text-orange-500" />
            <div className="text-left">
              <div className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>
                Today's Progress
              </div>
              <div className="text-sm font-bold font-mono" style={{ color: 'var(--color-text)' }}>
                {completedTodayCount}/{habits.length}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="p-3.5 rounded-xl border bg-rose-500/10 border-rose-500/25 text-rose-700 dark:text-rose-400 text-xs flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError(null)} className="p-1 hover:opacity-75 cursor-pointer">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* 2. AI Suggestions Banner (surfaced when journal detects habits) */}
      <AnimatePresence>
        {detectedHabits && detectedHabits.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="p-4 rounded-2xl border bg-amber-500/10 border-amber-500/25 relative overflow-hidden shadow-sm"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start space-x-3">
                <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0 mt-0.5">
                  <Lightbulb className="w-4 h-4" />
                </div>
                <div className="space-y-2">
                  <div className="text-xs font-bold text-amber-700 dark:text-amber-300 flex items-center space-x-1.5">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>AI Reflection Insight: Habits Detected in Your Writing</span>
                  </div>
                  <p className="text-xs text-neutral-800 dark:text-neutral-200">
                    We noticed positive routines in your reflection. Would you like to check them off or add them to your tracker?
                  </p>
                  <div className="flex items-center gap-2 flex-wrap pt-1">
                    {detectedHabits.map((hName) => (
                      <button
                        key={hName}
                        onClick={() => handleApplyAISuggestion(hName)}
                        className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-neutral-950 text-xs font-semibold shadow-xs transition active:scale-95 cursor-pointer"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Log "{hName}"</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {onDismissDetectedHabit && (
                <button
                  onClick={() => detectedHabits.forEach(onDismissDetectedHabit)}
                  className="text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300 p-1 cursor-pointer"
                  title="Dismiss AI suggestions"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 3. Add Habit Form */}
      <form
        onSubmit={handleAddHabit}
        className="p-4 sm:p-5 rounded-2xl border shadow-xs space-y-3"
        style={{
          backgroundColor: 'var(--color-surface)',
          borderColor: 'var(--color-border)',
        }}
      >
        <div className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>
          Create New Habit
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
          {/* Emoji Picker Trigger */}
          <div className="relative shrink-0">
            <button
              type="button"
              onClick={() => setIsEmojiPickerOpen(!isEmojiPickerOpen)}
              className="w-12 h-11 rounded-xl border flex items-center justify-center text-xl transition-all cursor-pointer hover:border-amber-500/50"
              style={{
                backgroundColor: 'var(--color-surface-elevated)',
                borderColor: 'var(--color-border)',
              }}
              title="Pick Emoji Icon"
            >
              {selectedEmoji}
            </button>

            {/* Emoji Dropdown Popover */}
            {isEmojiPickerOpen && (
              <>
                <div
                  className="fixed inset-0 z-20"
                  onClick={() => setIsEmojiPickerOpen(false)}
                />
                <div
                  className="absolute left-0 top-full mt-2 p-2.5 rounded-xl border shadow-xl grid grid-cols-4 gap-2 z-30 animate-in fade-in zoom-in-95 duration-100 w-[196px]"
                  style={{
                    backgroundColor: 'var(--color-surface-elevated)',
                    borderColor: 'var(--color-border)',
                  }}
                >
                  {PRESET_EMOJIS.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => {
                        setSelectedEmoji(emoji);
                        setIsEmojiPickerOpen(false);
                      }}
                      className={`w-9 h-9 shrink-0 rounded-lg flex items-center justify-center text-lg transition-transform hover:scale-110 active:scale-95 cursor-pointer ${
                        selectedEmoji === emoji
                          ? 'bg-amber-500/20 ring-1.5 ring-amber-500'
                          : 'hover:bg-neutral-500/10'
                      }`}
                      aria-label={`Select emoji ${emoji}`}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Title Input */}
          <div className="flex-1 min-w-0">
            <input
              type="text"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="e.g. 15-Minute Mindful Meditation, Drink Water, Morning Walk..."
              maxLength={100}
              className="w-full h-11 px-3.5 rounded-xl border text-sm transition focus:outline-none focus:ring-2 focus:ring-amber-500/50"
              style={{
                backgroundColor: 'var(--color-surface-elevated)',
                borderColor: 'var(--color-border)',
                color: 'var(--color-text)',
              }}
            />
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={!newTitle.trim() || isSubmitting}
            className="h-11 px-5 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-neutral-950 text-xs font-bold transition flex items-center justify-center space-x-1.5 shrink-0 cursor-pointer shadow-xs active:scale-98"
          >
            <Plus className="w-4 h-4" />
            <span>{isSubmitting ? 'Adding...' : 'Add Habit'}</span>
          </button>
        </div>
      </form>

      {/* 4. Habit Cards List */}
      <div className="space-y-3.5">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>
            Active Habits ({habits.length})
          </h2>
          <div className="text-[11px]" style={{ color: 'var(--color-text-muted)' }}>
            Points formula: <span className="font-mono text-amber-600 dark:text-amber-400">10 + (streak × 2)</span> pts
          </div>
        </div>

        {isLoading ? (
          <div className="py-16 text-center space-y-3">
            <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs font-medium" style={{ color: 'var(--color-text-muted)' }}>
              Loading habits &amp; streaks...
            </p>
          </div>
        ) : habits.length === 0 ? (
          /* 5. Empty State with Quick Starters */
          <div
            className="py-12 px-6 rounded-2xl border text-center space-y-5"
            style={{
              backgroundColor: 'var(--color-surface)',
              borderColor: 'var(--color-border)',
            }}
          >
            <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto shadow-xs">
              <Flame className="w-7 h-7" />
            </div>
            <div className="space-y-1.5 max-w-md mx-auto">
              <h3 className="font-serif-display text-lg font-bold" style={{ color: 'var(--color-text)' }}>
                No habits established yet
              </h3>
              <p className="text-xs leading-relaxed" style={{ color: 'var(--color-text-muted)' }}>
                Starting small is the secret to enduring personal transformation. Tap any starter below to begin your daily streak:
              </p>
            </div>

            <div className="flex items-center justify-center gap-2 flex-wrap max-w-lg mx-auto pt-2">
              {QUICK_STARTERS.map((starter) => (
                <button
                  key={starter.title}
                  onClick={() => handleAddQuickStarter(starter)}
                  disabled={isSubmitting}
                  className="inline-flex items-center space-x-1.5 px-3 py-2 rounded-xl border text-xs font-semibold transition hover:border-amber-500/50 hover:scale-102 cursor-pointer shadow-2xs active:scale-98"
                  style={{
                    backgroundColor: 'var(--color-surface-elevated)',
                    borderColor: 'var(--color-border)',
                    color: 'var(--color-text)',
                  }}
                >
                  <span>{starter.emoji}</span>
                  <span>{starter.title}</span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3">
            {habits.map((habit) => {
              const isCompletedToday = Boolean(habit.completionHistory && habit.completionHistory[todayStr]);
              const streak = habit.currentStreak || 0;
              const isMilestone = streak >= 7 && streak % 7 === 0;

              return (
                <motion.div
                  key={habit.id}
                  layout
                  className="p-4 sm:p-5 rounded-2xl border transition-all relative overflow-hidden shadow-xs"
                  style={{
                    backgroundColor: 'var(--color-surface)',
                    borderColor: isCompletedToday ? 'var(--color-accent)' : 'var(--color-border)',
                  }}
                >
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    {/* Left: Checkbox + Title + Badges */}
                    <div className="flex items-start sm:items-center space-x-3.5 min-w-0 w-full sm:w-auto">
                      {/* Large Animated Toggle Checkbox */}
                      <div className="relative shrink-0 mt-0.5 sm:mt-0">
                        <button
                          type="button"
                          onClick={() => handleToggleHabit(habit)}
                          disabled={togglingId === habit.id}
                          className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl border-2 flex items-center justify-center transition-all cursor-pointer ${
                            isCompletedToday
                              ? 'bg-amber-500 border-amber-500 text-neutral-950 shadow-xs scale-102'
                              : 'border-neutral-300 dark:border-neutral-700 hover:border-amber-500/60 bg-transparent'
                          }`}
                          title={isCompletedToday ? 'Mark as incomplete' : 'Mark as completed for today'}
                          aria-label={`Toggle habit ${habit.title}`}
                        >
                          {isCompletedToday ? (
                            <Check className="w-5 h-5 stroke-[3] animate-in zoom-in-50 duration-150" />
                          ) : (
                            <span className="text-sm opacity-60 font-mono">{habit.emoji}</span>
                          )}
                        </button>

                        {/* Floating Points Pop Animation */}
                        <AnimatePresence>
                          {floatingPoints && floatingPoints.id === habit.id && (
                            <motion.div
                              key={floatingPoints.key}
                              initial={{ opacity: 0, y: 0, scale: 0.8 }}
                              animate={{ opacity: 1, y: -28, scale: 1.1 }}
                              exit={{ opacity: 0, y: -40 }}
                              transition={{ duration: 0.8 }}
                              className="absolute left-1/2 -translate-x-1/2 -top-1 pointer-events-none text-xs font-bold text-amber-500 font-mono whitespace-nowrap bg-neutral-900/90 dark:bg-white/90 dark:text-neutral-950 px-1.5 py-0.5 rounded-md shadow-lg"
                            >
                              +{floatingPoints.delta} ✨
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>

                      {/* Title & Stats */}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center space-x-2">
                          <span className="text-base">{habit.emoji}</span>
                          <h3
                            className={`font-semibold text-sm sm:text-base truncate transition-colors ${
                              isCompletedToday ? 'line-through opacity-80' : ''
                            }`}
                            style={{ color: 'var(--color-text)' }}
                          >
                            {habit.title}
                          </h3>
                        </div>

                        {/* Badges row: streak + points */}
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          {/* Streak Badge */}
                          <div
                            className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded-md text-[11px] font-bold border ${
                              isMilestone
                                ? 'bg-amber-500/25 border-amber-500 text-amber-600 dark:text-amber-300 animate-pulse'
                                : streak > 0
                                ? 'bg-orange-500/15 border-orange-500/30 text-orange-600 dark:text-orange-400'
                                : 'bg-neutral-500/10 border-neutral-500/20 text-neutral-500'
                            }`}
                          >
                            <Flame className={`w-3 h-3 ${streak > 0 ? 'fill-orange-500' : ''}`} />
                            <span>
                              {streak} {streak === 1 ? 'day' : 'days'}
                            </span>
                            {isMilestone && <span className="text-[10px]">🏆 Milestone!</span>}
                          </div>

                          {/* Points Badge */}
                          <div
                            className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-md text-[11px] font-mono border"
                            style={{
                              backgroundColor: 'var(--color-surface-elevated)',
                              borderColor: 'var(--color-border)',
                              color: 'var(--color-text-muted)',
                            }}
                          >
                            <Star className="w-3 h-3 text-amber-500" />
                            <span>{habit.totalPoints || 0} pts</span>
                          </div>

                          {habit.bestStreak ? (
                            <span className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>
                              Best: {habit.bestStreak}d
                            </span>
                          ) : null}
                        </div>
                      </div>
                    </div>

                    {/* Right: 7-day mini grid + Delete button */}
                    <div className="flex items-center justify-between sm:justify-end space-x-4 w-full sm:w-auto pt-2 sm:pt-0 border-t sm:border-t-0" style={{ borderColor: 'var(--color-border)' }}>
                      {/* 7-Day History Dots */}
                      <div className="flex items-center space-x-1.5" title="Last 7 days history">
                        {last7Days.map((day) => {
                          const done = Boolean(habit.completionHistory && habit.completionHistory[day.dateStr]);
                          return (
                            <div key={day.dateStr} className="flex flex-col items-center space-y-1">
                              <span className="text-[9px] font-mono opacity-60" style={{ color: 'var(--color-text-muted)' }}>
                                {day.dayLabel}
                              </span>
                              <div
                                className={`w-4 h-4 rounded-md transition-colors flex items-center justify-center ${
                                  done
                                    ? 'bg-amber-500 text-neutral-950'
                                    : day.isToday
                                    ? 'border border-amber-500/50 bg-amber-500/10'
                                    : 'border border-neutral-300 dark:border-neutral-700 bg-neutral-100 dark:bg-neutral-800'
                                }`}
                              >
                                {done && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Delete Habit (Two-step inline confirmation) */}
                      {confirmDeleteId === habit.id ? (
                        <div className="flex items-center space-x-1.5 animate-in fade-in duration-100 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleDeleteHabit(habit.id)}
                            className="px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-[11px] font-semibold transition cursor-pointer whitespace-nowrap shrink-0"
                          >
                            Confirm Delete
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteId(null)}
                            className="px-2 py-1 rounded-lg border text-[11px] hover:opacity-80 transition cursor-pointer whitespace-nowrap shrink-0"
                            style={{
                              borderColor: 'var(--color-border)',
                              color: 'var(--color-text-muted)',
                            }}
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteId(habit.id)}
                          className="p-2 rounded-lg opacity-60 hover:opacity-100 hover:bg-rose-500/10 hover:text-rose-500 transition cursor-pointer shrink-0"
                          title="Delete habit"
                          aria-label={`Delete ${habit.title}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
