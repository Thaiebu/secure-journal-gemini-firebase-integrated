import React, { useState, useEffect } from 'react';
import {
  X,
  Mail,
  Send,
  Calendar,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Clock,
  Settings,
  Flame,
  ShieldCheck,
  RefreshCw,
  ExternalLink,
  BellRing,
} from 'lucide-react';
import { NotificationSettings, WeeklyDigestData, DeliveryRecord } from '../types';
import {
  fetchNotificationSettings,
  updateNotificationSettings,
  generateWeeklyDigestPreview,
  sendWeeklyDigestNow,
} from '../services/notificationService';

interface WeeklyDigestModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUserEmail?: string;
}

export const WeeklyDigestModal: React.FC<WeeklyDigestModalProps> = ({
  isOpen,
  onClose,
  currentUserEmail = '',
}) => {
  const [activeTab, setActiveTab] = useState<'digest' | 'settings' | 'history'>('digest');
  const [settings, setSettings] = useState<NotificationSettings | null>(null);
  const [digestPreview, setDigestPreview] = useState<WeeklyDigestData | null>(null);

  // Form State
  const [emailInput, setEmailInput] = useState(currentUserEmail);
  const [weeklyDigestEnabled, setWeeklyDigestEnabled] = useState(true);
  const [deliveryDay, setDeliveryDay] = useState<'sunday' | 'monday' | 'friday'>('sunday');
  const [deliveryTime, setDeliveryTime] = useState('09:00');
  const [habitMilestonesEnabled, setHabitMilestonesEnabled] = useState(true);
  const [emotionalAlertsEnabled, setEmotionalAlertsEnabled] = useState(true);
  const [webhookUrl, setWebhookUrl] = useState('');
  const [webhookEnabled, setWebhookEnabled] = useState(false);

  // Status & Progress
  const [isLoadingSettings, setIsLoadingSettings] = useState(false);
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [isGeneratingPreview, setIsGeneratingPreview] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [showHtmlPreview, setShowHtmlPreview] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadSettings();
      if (!digestPreview) {
        handleGeneratePreview();
      }
    }
  }, [isOpen]);

  const loadSettings = async () => {
    setIsLoadingSettings(true);
    try {
      const data = await fetchNotificationSettings();
      setSettings(data);
      setEmailInput(data.email || currentUserEmail);
      setWeeklyDigestEnabled(data.weeklyDigestEnabled !== false);
      setDeliveryDay(data.deliveryDay || 'sunday');
      setDeliveryTime(data.deliveryTime || '09:00');
      setHabitMilestonesEnabled(data.habitMilestonesEnabled !== false);
      setEmotionalAlertsEnabled(data.emotionalAlertsEnabled !== false);
      setWebhookUrl(data.webhookUrl || '');
      setWebhookEnabled(Boolean(data.webhookEnabled));
    } catch (err: any) {
      console.warn('[Notification Settings Load Error]', err);
    } finally {
      setIsLoadingSettings(false);
    }
  };

  const handleGeneratePreview = async () => {
    setIsGeneratingPreview(true);
    setStatusMessage(null);
    try {
      const digest = await generateWeeklyDigestPreview();
      setDigestPreview(digest);
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: err.message || 'Could not generate weekly digest preview.',
      });
    } finally {
      setIsGeneratingPreview(false);
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingSettings(true);
    setStatusMessage(null);
    try {
      const updated = await updateNotificationSettings({
        email: emailInput,
        weeklyDigestEnabled,
        deliveryDay,
        deliveryTime,
        habitMilestonesEnabled,
        emotionalAlertsEnabled,
        webhookUrl,
        webhookEnabled,
      });
      setSettings(updated);
      setStatusMessage({
        type: 'success',
        text: 'Notification preferences updated successfully!',
      });
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: err.message || 'Failed to save settings. Check email & webhook format.',
      });
    } finally {
      setIsSavingSettings(false);
    }
  };

  const handleSendDigestNow = async () => {
    setIsSending(true);
    setStatusMessage(null);
    try {
      const result = await sendWeeklyDigestNow();
      setStatusMessage({
        type: 'success',
        text: result.message,
      });
      if (settings) {
        setSettings({
          ...settings,
          lastSentTimestamp: result.deliveryRecord.timestamp,
          deliveryHistory: [result.deliveryRecord, ...(settings.deliveryHistory || [])],
        });
      }
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: err.message || 'Failed to dispatch weekly summary email.',
      });
    } finally {
      setIsSending(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      id="weekly-digest-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-sm overflow-y-auto"
    >
      <div
        id="weekly-digest-modal-container"
        className="relative w-full max-w-3xl max-h-[92vh] flex flex-col bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden animate-in fade-in zoom-in-95 duration-150"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/80 dark:bg-zinc-900/80">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                Weekly Journal & Habit Email Digest
                <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                  AI Synthesized
                </span>
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Automated weekly coaching, streak milestones & emotional trends delivered to your inbox
              </p>
            </div>
          </div>
          <button
            id="close-weekly-digest-modal"
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-zinc-200 dark:border-zinc-800 px-6 bg-zinc-50/40 dark:bg-zinc-900/40 gap-2 pt-2">
          <button
            id="tab-digest-preview"
            onClick={() => setActiveTab('digest')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-semibold border-b-2 transition-all ${
              activeTab === 'digest'
                ? 'border-amber-500 text-amber-600 dark:text-amber-400 bg-amber-500/5 rounded-t-lg'
                : 'border-transparent text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            Weekly AI Digest Preview
          </button>
          <button
            id="tab-digest-settings"
            onClick={() => setActiveTab('settings')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-semibold border-b-2 transition-all ${
              activeTab === 'settings'
                ? 'border-amber-500 text-amber-600 dark:text-amber-400 bg-amber-500/5 rounded-t-lg'
                : 'border-transparent text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200'
            }`}
          >
            <Settings className="w-4 h-4" />
            Digest Schedule & Settings
          </button>
          <button
            id="tab-digest-history"
            onClick={() => setActiveTab('history')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-semibold border-b-2 transition-all ${
              activeTab === 'history'
                ? 'border-amber-500 text-amber-600 dark:text-amber-400 bg-amber-500/5 rounded-t-lg'
                : 'border-transparent text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200'
            }`}
          >
            <Clock className="w-4 h-4" />
            Delivery History ({settings?.deliveryHistory?.length || 0})
          </button>
        </div>

        {/* Notification / Status Banner */}
        {statusMessage && (
          <div
            className={`mx-6 mt-4 p-3 rounded-xl flex items-center justify-between text-xs sm:text-sm border ${
              statusMessage.type === 'success'
                ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200 border-emerald-300 dark:border-emerald-800'
                : 'bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-200 border-rose-300 dark:border-rose-800'
            }`}
          >
            <div className="flex items-center gap-2">
              {statusMessage.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
              )}
              <span>{statusMessage.text}</span>
            </div>
            <button
              onClick={() => setStatusMessage(null)}
              className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1">
          {/* TAB 1: AI DIGEST PREVIEW */}
          {activeTab === 'digest' && (
            <div className="space-y-6">
              {/* Action Banner */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-xl bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border border-amber-500/20">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                    Recipient Mailbox
                  </div>
                  <div className="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5 mt-0.5">
                    <Mail className="w-4 h-4 text-zinc-400" />
                    {settings?.email || currentUserEmail || 'user@example.com'}
                  </div>
                  <div className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                    Scheduled for: Every {settings?.deliveryDay ? settings.deliveryDay.toUpperCase() : 'SUNDAY'} at{' '}
                    {settings?.deliveryTime || '09:00'}
                  </div>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <button
                    id="refresh-digest-preview-btn"
                    onClick={handleGeneratePreview}
                    disabled={isGeneratingPreview || isSending}
                    className="flex-1 sm:flex-initial px-3 py-2 text-xs font-medium rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-700 transition flex items-center justify-center gap-1.5 disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isGeneratingPreview ? 'animate-spin' : ''}`} />
                    Regenerate AI
                  </button>
                  <button
                    id="send-weekly-digest-now-btn"
                    onClick={handleSendDigestNow}
                    disabled={isSending || isGeneratingPreview}
                    className="flex-1 sm:flex-initial px-4 py-2 text-xs font-semibold rounded-lg bg-amber-600 hover:bg-amber-500 text-white transition flex items-center justify-center gap-2 shadow-sm disabled:opacity-50"
                  >
                    {isSending ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        Transmitting...
                      </>
                    ) : (
                      <>
                        <Send className="w-3.5 h-3.5" />
                        Send To My Email Now
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Preview Content */}
              {isGeneratingPreview ? (
                <div className="py-16 text-center">
                  <RefreshCw className="w-8 h-8 text-amber-500 animate-spin mx-auto mb-3" />
                  <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
                    Synthesizing Weekly Journal Reflections & Habit Trends...
                  </p>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                    Executing Gemini model fallback ladder (gemini-3.6-flash &bull; gemini-3.1-flash-lite)
                  </p>
                </div>
              ) : digestPreview ? (
                <div className="space-y-4">
                  {/* Metric Pills */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60">
                      <div className="text-xs font-semibold uppercase text-amber-700 dark:text-amber-300">
                        Habit Mastery Score
                      </div>
                      <div className="text-2xl font-extrabold text-amber-900 dark:text-amber-100 mt-1">
                        {digestPreview.summary.habitScore}%
                      </div>
                      <div className="text-[11px] text-amber-700 dark:text-amber-300/80 mt-0.5">
                        {digestPreview.summary.habitsCompletionRate}% weekly consistency
                      </div>
                    </div>

                    <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60">
                      <div className="text-xs font-semibold uppercase text-emerald-700 dark:text-emerald-300">
                        Emotional Valence
                      </div>
                      <div className="text-lg font-bold text-emerald-900 dark:text-emerald-100 mt-1 truncate">
                        {digestPreview.summary.emotionalValence}
                      </div>
                      <div className="text-[11px] text-emerald-700 dark:text-emerald-300/80 mt-0.5">
                        Gemini Neural Analysis
                      </div>
                    </div>

                    <div className="p-3 rounded-xl bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800/60">
                      <div className="text-xs font-semibold uppercase text-purple-700 dark:text-purple-300">
                        Top Habit Streak
                      </div>
                      <div className="text-base font-bold text-purple-900 dark:text-purple-100 mt-1 truncate">
                        {digestPreview.summary.topHabitStreak ? (
                          <>
                            {digestPreview.summary.topHabitStreak.emoji} {digestPreview.summary.topHabitStreak.title}
                          </>
                        ) : (
                          'Active Habit Logging'
                        )}
                      </div>
                      <div className="text-[11px] text-purple-700 dark:text-purple-300/80 mt-0.5 flex items-center gap-1">
                        <Flame className="w-3.5 h-3.5 text-amber-500" />
                        {digestPreview.summary.topHabitStreak?.streak || 0} consecutive days
                      </div>
                    </div>
                  </div>

                  {/* Summary Card */}
                  <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700/60">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                        Executive AI Synthesis
                      </span>
                      <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300">
                        {digestPreview.modelUsed}
                      </span>
                    </div>
                    <p className="text-xs sm:text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed whitespace-pre-wrap">
                      {digestPreview.summary.executiveSummary}
                    </p>
                  </div>

                  {/* Themes & Action Items */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-700/60">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-800 dark:text-zinc-200 mb-2">
                        Dominant Themes:
                      </h4>
                      <ul className="space-y-1.5 text-xs text-zinc-600 dark:text-zinc-400 list-disc pl-4">
                        {digestPreview.summary.keyThemes.map((theme, i) => (
                          <li key={i}>{theme}</li>
                        ))}
                      </ul>
                    </div>

                    <div className="p-4 rounded-xl bg-blue-50/60 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900/50">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-blue-900 dark:text-blue-300 mb-2">
                        Next Week's Mindful Focus Goals:
                      </h4>
                      <ol className="space-y-1.5 text-xs text-zinc-700 dark:text-zinc-300 list-decimal pl-4">
                        {digestPreview.summary.actionItems.map((item, i) => (
                          <li key={i}>{item}</li>
                        ))}
                      </ol>
                    </div>
                  </div>

                  {/* Toggle HTML Email View */}
                  <div className="pt-2">
                    <button
                      onClick={() => setShowHtmlPreview(!showHtmlPreview)}
                      className="text-xs font-semibold text-amber-600 dark:text-amber-400 hover:underline flex items-center gap-1"
                    >
                      <ExternalLink className="w-3 h-3" />
                      {showHtmlPreview ? 'Hide HTML Email Template' : 'Inspect Formatted HTML Email (Exact In-Box Look)'}
                    </button>

                    {showHtmlPreview && (
                      <div className="mt-3 border border-zinc-200 dark:border-zinc-700 rounded-xl overflow-hidden shadow-inner h-96 bg-zinc-100">
                        <iframe
                          title="Email Preview"
                          srcDoc={digestPreview.htmlEmail}
                          className="w-full h-full bg-white"
                        />
                      </div>
                    )}
                  </div>
                </div>
              ) : null}
            </div>
          )}

          {/* TAB 2: SCHEDULE & SETTINGS */}
          {activeTab === 'settings' && (
            <form onSubmit={handleSaveSettings} className="space-y-6">
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-amber-500" />
                  Email Dispatch Schedule & Preferences
                </h3>

                {/* Main Toggle */}
                <div className="flex items-center justify-between p-4 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700/60">
                  <div>
                    <div className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                      Automated Weekly Email Digest
                    </div>
                    <div className="text-xs text-zinc-500 dark:text-zinc-400">
                      Receive an AI-synthesized report every week covering your habits & reflections
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={weeklyDigestEnabled}
                      onChange={(e) => setWeeklyDigestEnabled(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-zinc-300 peer-focus:outline-none rounded-full peer dark:bg-zinc-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500"></div>
                  </label>
                </div>

                {/* Recipient Email */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300 mb-1">
                    Recipient Email Address
                  </label>
                  <input
                    type="email"
                    required
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                  <span className="text-[11px] text-zinc-400 mt-1 block">
                    Verified with RFC 5322 regex. Summaries will only be dispatched to this verified address.
                  </span>
                </div>

                {/* Delivery Day & Time */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300 mb-1">
                      Delivery Day
                    </label>
                    <select
                      value={deliveryDay}
                      onChange={(e: any) => setDeliveryDay(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
                    >
                      <option value="sunday">Sunday (Weekly Reflection)</option>
                      <option value="monday">Monday (Week Kickoff)</option>
                      <option value="friday">Friday (Weekend Review)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300 mb-1">
                      Delivery Time
                    </label>
                    <input
                      type="time"
                      value={deliveryTime}
                      onChange={(e) => setDeliveryTime(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                </div>

                {/* Additional Notification Options */}
                <div className="space-y-3 pt-2">
                  <div className="text-xs font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
                    Content Elements Included in Digest
                  </div>
                  <label className="flex items-center gap-3 text-xs sm:text-sm text-zinc-700 dark:text-zinc-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={habitMilestonesEnabled}
                      onChange={(e) => setHabitMilestonesEnabled(e.target.checked)}
                      className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500 border-zinc-300 dark:border-zinc-700"
                    />
                    Include Habit Streak Milestones & Consistency Scoring
                  </label>
                  <label className="flex items-center gap-3 text-xs sm:text-sm text-zinc-700 dark:text-zinc-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={emotionalAlertsEnabled}
                      onChange={(e) => setEmotionalAlertsEnabled(e.target.checked)}
                      className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500 border-zinc-300 dark:border-zinc-700"
                    />
                    Include Emotional Valence Analysis & Mindful Focus Goals
                  </label>
                </div>

                {/* External Webhook (Slack/Discord) */}
                <div className="pt-4 border-t border-zinc-200 dark:border-zinc-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
                        <BellRing className="w-3.5 h-3.5 text-zinc-500" />
                        Optional Webhook (Discord / Slack)
                      </h4>
                      <p className="text-[11px] text-zinc-400 mt-0.5">
                        Also dispatch digest cards to a secure webhook channel
                      </p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={webhookEnabled}
                        onChange={(e) => setWebhookEnabled(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-zinc-300 peer-focus:outline-none rounded-full peer dark:bg-zinc-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-500"></div>
                    </label>
                  </div>

                  {webhookEnabled && (
                    <div>
                      <input
                        type="url"
                        value={webhookUrl}
                        onChange={(e) => setWebhookUrl(e.target.value)}
                        placeholder="https://discord.com/api/webhooks/... or https://hooks.slack.com/..."
                        className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-xs font-mono text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
                      />
                      <span className="text-[11px] text-zinc-400 mt-1 block">
                        Anti-SSRF Protection: Strictly restricted to HTTPS and blocks internal/private IP ranges.
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Submit Button */}
              <div className="flex justify-end pt-4 border-t border-zinc-200 dark:border-zinc-800">
                <button
                  type="submit"
                  disabled={isSavingSettings}
                  className="px-6 py-2.5 text-xs sm:text-sm font-semibold rounded-xl bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-200 transition flex items-center gap-2 shadow-sm disabled:opacity-50"
                >
                  {isSavingSettings ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Saving Preferences...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      Save Notification Settings
                    </>
                  )}
                </button>
              </div>
            </form>
          )}

          {/* TAB 3: AUDIT & DELIVERY HISTORY */}
          {activeTab === 'history' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                    Dispatch Audit & Delivery Logs
                  </h3>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    Immutable log of all generated and dispatched weekly summaries
                  </p>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-zinc-500">
                  <ShieldCheck className="w-4 h-4 text-emerald-500" />
                  Owner-Isolated Storage
                </div>
              </div>

              {!settings?.deliveryHistory || settings.deliveryHistory.length === 0 ? (
                <div className="py-12 text-center border border-dashed border-zinc-300 dark:border-zinc-700 rounded-xl">
                  <Mail className="w-8 h-8 text-zinc-400 mx-auto mb-2" />
                  <p className="text-xs text-zinc-500">No digests dispatched yet.</p>
                  <button
                    onClick={() => setActiveTab('digest')}
                    className="mt-3 text-xs font-semibold text-amber-600 dark:text-amber-400 hover:underline"
                  >
                    Generate and send your first weekly digest &rarr;
                  </button>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {settings.deliveryHistory.map((item: DeliveryRecord) => (
                    <div
                      key={item.id}
                      className="p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-700/60 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span
                            className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                              item.status === 'delivered'
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                                : 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300'
                            }`}
                          >
                            {item.status}
                          </span>
                          <span className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">
                            {item.recipientEmail}
                          </span>
                          <span className="text-[11px] font-mono text-zinc-400">
                            [{item.provider}]
                          </span>
                        </div>
                        <div className="text-xs text-zinc-600 dark:text-zinc-400 mt-1 line-clamp-1">
                          {item.summarySnippet}
                        </div>
                      </div>
                      <div className="text-[11px] text-zinc-400 shrink-0">
                        {new Date(item.timestamp).toLocaleString()}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
