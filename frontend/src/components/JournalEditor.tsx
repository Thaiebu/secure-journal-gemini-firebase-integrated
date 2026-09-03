import React, { useState } from 'react';
import { JournalEntry, ReflectionMode, SaveStatus, EntryLocation } from '../types';
import { AICompanionChat } from './AICompanionChat';
import { AIInsightsView } from './AIInsightsView';
import { LocationPickerModal } from './LocationPickerModal';
import { JournalLocationBadge } from './JournalLocationBadge';
import { calculateReadingTime, calculateWordCount, formatDate } from '../lib/utils';
import {
  Save,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  PlusCircle,
  Tag,
  Smile,
  BookOpen,
  HelpCircle,
  Maximize2,
  Minimize2,
  RefreshCw,
  MapPin,
  Volume2,
  VolumeX,
  Mic,
  MicOff,
  Copy,
  Check,
  Dices,
  Edit3,
} from 'lucide-react';
import { useSpeech, useVoiceToText } from '../hooks/useSpeech';

interface JournalEditorProps {
  entry: JournalEntry;
  onChangeField: (field: keyof JournalEntry, value: any) => void;
  onSave: () => Promise<void>;
  onResetNew: () => void;
  saveStatus: SaveStatus;
  saveError: string | null;
  onRetrySave: () => void;
  onSendMessage: (content: string, mode: ReflectionMode) => Promise<void>;
  onGenerateInsights: () => Promise<void>;
  onStopGeneratingChat?: () => void;
  onStopGeneratingInsights?: () => void;
  isGeneratingInsights: boolean;
  isGeneratingChat: boolean;
  reflectionMode: ReflectionMode;
  onSelectMode: (mode: ReflectionMode) => void;
}

export const JournalEditor: React.FC<JournalEditorProps> = ({
  entry,
  onChangeField,
  onSave,
  onResetNew,
  saveStatus,
  saveError,
  onRetrySave,
  onSendMessage,
  onGenerateInsights,
  onStopGeneratingChat,
  onStopGeneratingInsights,
  isGeneratingInsights,
  isGeneratingChat,
  reflectionMode,
  onSelectMode,
}) => {
  const [activeSideTab, setActiveSideTab] = useState<'chat' | 'insights'>('chat');
  const [showInspirations, setShowInspirations] = useState(false);
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
  const [isCopied, setIsCopied] = useState(false);

  const { activeSpeakingId, speak, stop } = useSpeech();

  const { isListening, interimText, toggleListening } = useVoiceToText({
    onTranscript: (transcript, isFinal) => {
      const currentContent = entry.content || '';
      if (isFinal) {
        const appended = currentContent.trim() ? `${currentContent.trim()} ${transcript}` : transcript;
        onChangeField('content', appended);
      }
    },
    onError: (err) => {
      console.warn('[JournalDictation] Notice:', err);
    },
  });

  const handleCopy = async () => {
    if (!entry.content) return;
    try {
      await navigator.clipboard.writeText(entry.content);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch {
      // fallback
    }
  };

  const moodOptions = [
    { label: 'Reflective', emoji: '🌿' },
    { label: 'Grateful', emoji: '✨' },
    { label: 'Peaceful', emoji: '☁️' },
    { label: 'Energized', emoji: '⚡' },
    { label: 'Challenged', emoji: '⛰️' },
    { label: 'Creative', emoji: '🎨' },
  ];

  const popularTags = ['Mindfulness', 'Personal Growth', 'Career', 'Gratitude', 'Daily Log', 'Ideas'];

  const promptStarters = [
    {
      title: 'Gratitude Anchor',
      text: 'Three moments or people I appreciated today, and the subtle feeling they gave me...',
    },
    {
      title: 'Navigating Challenge',
      text: 'A friction point I encountered today was... Looking at it objectively, what is within my control?',
    },
    {
      title: 'Daily Breakthrough',
      text: 'One insight or realization that shifted my perspective today...',
    },
    {
      title: 'Future Self Check-in',
      text: 'If my future self was looking at today, what compassionate advice would they offer me?',
    },
  ];

  const toggleTag = (tag: string) => {
    const currentTags = entry.tags || [];
    if (currentTags.includes(tag)) {
      onChangeField('tags', currentTags.filter((t) => t !== tag));
    } else {
      onChangeField('tags', [...currentTags, tag]);
    }
  };

  const handleApplyStarter = (starterText: string) => {
    const existing = entry.content ? `${entry.content}\n\n` : '';
    onChangeField('content', `${existing}${starterText}`);
    setShowInspirations(false);
  };

  const handleGenerateRandomTitle = () => {
    const mood = entry.mood || 'Reflective';
    const content = entry.content?.trim() || '';
    const tags = entry.tags || [];

    // Title pools themed by mood and prompt content
    const moodTitles: Record<string, string[]> = {
      Reflective: [
        'Whispers of the Quiet Mind',
        'Echoes of Today’s Horizon',
        'Observations in Stillness',
        'A Mindful Pause at Dusk',
        'Navigating the Inner Tide',
        'Subtle Shifts and Realizations',
      ],
      Grateful: [
        'Sunlight on the Path: Small Mercies',
        'Counting Quiet Blessings',
        'The Warmth of Present Grace',
        'An Ode to Everyday Wonders',
        'Gratitude in Full Bloom',
        'Held by Gentle Moments',
      ],
      Peaceful: [
        'Sanctuary of the Calm Breath',
        'Drifting Through Still Waters',
        'Serenity in the Midst of Motion',
        'A Soft Landing for the Spirit',
        'The Poetry of Unhurried Time',
        'Tranquility Reclaimed',
      ],
      Energized: [
        'Igniting the Spark of Intention',
        'Riding the Crest of Momentum',
        'Unstoppable Clarity & Drive',
        'Catalyst: Breaking Fresh Ground',
        'Electric Horizons & Bold Steps',
        'The Momentum of Purpose',
      ],
      Challenged: [
        'Finding Anchor in the Storm',
        'Lessons Forged in Resistance',
        'Patience Through the Crossing',
        'Reframing the Mountain Ahead',
        'Resilience in the Making',
        'Strength Beneath the Surface',
      ],
      Creative: [
        'Uncharted Canvas of Thought',
        'The Spark of New Invention',
        'Weaving Ideas Into Form',
        'Curiosity Without Boundaries',
        'A Symphony of New Angles',
        'Coloring Outside the Margins',
      ],
    };

    // Extract potential keyword hints from content if available
    let contextualPool = moodTitles[mood] || moodTitles.Reflective;

    if (tags.length > 0) {
      const primaryTag = tags[0];
      contextualPool = [
        ...contextualPool,
        `Musings on ${primaryTag}`,
        `A New Perspective on ${primaryTag}`,
        `The Journey of ${primaryTag}`,
      ];
    }

    if (content.length > 20) {
      const firstWords = content
        .split(/\s+/)
        .slice(0, 5)
        .join(' ')
        .replace(/[^\w\s]/gi, '');
      if (firstWords.length > 5) {
        contextualPool = [
          ...contextualPool,
          `Reflections on "${firstWords}..."`,
          `Notes on ${firstWords}`,
        ];
      }
    }

    const randomIndex = Math.floor(Math.random() * contextualPool.length);
    const chosen = contextualPool[randomIndex];
    onChangeField('title', chosen);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Top Controls Bar */}
      <div className="bg-[#141414] rounded-2xl border border-neutral-800/80 p-4 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <button
            id="btn-new-entry"
            type="button"
            onClick={onResetNew}
            className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-semibold transition-colors cursor-pointer border border-neutral-700/60"
          >
            <PlusCircle className="w-3.5 h-3.5 text-neutral-400" />
            <span>New Reflection</span>
          </button>

          <span className="text-xs text-neutral-600">|</span>

          <span className="text-xs text-neutral-400 font-medium">
            {calculateWordCount(entry.content)} words &bull; {calculateReadingTime(entry.content)}
          </span>
        </div>

        {/* Save Status Indicator & Actions */}
        <div className="flex items-center space-x-3">
          {saveStatus === 'saving' && (
            <span className="flex items-center space-x-1.5 text-xs text-amber-400 font-medium animate-pulse">
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              <span>Saving to Firestore...</span>
            </span>
          )}

          {saveStatus === 'saved' && (
            <span className="flex items-center space-x-1.5 text-xs text-emerald-400 font-medium">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>Saved in Isolated Firestore</span>
            </span>
          )}

          {saveStatus === 'error' && (
            <div className="flex items-center space-x-2">
              <span className="flex items-center space-x-1 text-xs text-rose-400 font-medium">
                <AlertCircle className="w-3.5 h-3.5" />
                <span>Save failed</span>
              </span>
              <button
                type="button"
                onClick={onRetrySave}
                className="text-xs text-rose-400 underline font-semibold cursor-pointer"
              >
                Retry
              </button>
            </div>
          )}

          <button
            id="btn-manual-save"
            type="button"
            onClick={onSave}
            disabled={saveStatus === 'saving'}
            className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 text-xs font-semibold shadow-xs disabled:opacity-50 transition-all cursor-pointer"
          >
            <Save className="w-3.5 h-3.5" />
            <span>Save Entry</span>
          </button>
        </div>
      </div>

      {/* Error alert if any */}
      {saveError && (
        <div className="p-3 bg-rose-950/40 border border-rose-800 rounded-xl text-rose-300 text-xs flex items-center justify-between">
          <span className="flex items-center space-x-1.5">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{saveError}</span>
          </span>
          <button
            type="button"
            onClick={onRetrySave}
            className="px-2 py-1 bg-rose-900/60 rounded text-rose-200 font-bold hover:bg-rose-900 cursor-pointer"
          >
            Retry Save
          </button>
        </div>
      )}

      {/* Main Split Grid Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Journal Entry Workspace (7 cols on lg) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-[#141414] rounded-2xl border border-neutral-800 shadow-xs p-5 sm:p-6 space-y-5">
            {/* Entry Title */}
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <input
                    id="entry-title-input"
                    type="text"
                    value={entry.title}
                    onChange={(e) => onChangeField('title', e.target.value)}
                    placeholder="Give this reflection a title..."
                    className="w-full font-serif-display text-xl sm:text-2xl font-bold text-neutral-100 placeholder:text-neutral-600 border-none focus:outline-none focus:ring-0 px-0 bg-transparent pr-8"
                  />
                  <span className="absolute right-1 top-1/2 -translate-y-1/2 pointer-events-none text-neutral-600 hover:text-neutral-400">
                    <Edit3 className="w-4 h-4 opacity-40" />
                  </span>
                </div>

                <button
                  type="button"
                  id="btn-random-title"
                  onClick={handleGenerateRandomTitle}
                  title="Generate a title based on your prompt, mood & content (Click to roll a new title, editable anytime)"
                  className="inline-flex items-center space-x-1.5 px-2.5 py-1.5 rounded-xl bg-neutral-800/80 hover:bg-neutral-700 text-amber-300/90 hover:text-amber-300 text-xs font-semibold border border-neutral-700/60 hover:border-amber-500/40 transition-all cursor-pointer shrink-0 shadow-xs active:scale-95"
                >
                  <Dices className="w-3.5 h-3.5 text-amber-400" />
                  <span className="hidden sm:inline">Inspire Title</span>
                  <span className="sm:hidden">Roll</span>
                </button>
              </div>

              <div className="flex items-center justify-between text-[11px] text-neutral-500">
                <span>{entry.createdAt ? formatDate(entry.createdAt) : 'Today'}</span>
                <span className="text-neutral-600 italic">Type to edit freely or click Inspire to randomize</span>
              </div>
            </div>

            {/* Mood & Tag Selectors */}
            <div className="space-y-2.5 pt-2 border-t border-neutral-800">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-semibold text-neutral-400 flex items-center space-x-1">
                  <Smile className="w-3.5 h-3.5 text-neutral-500" />
                  <span>State:</span>
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {moodOptions.map((m) => (
                    <button
                      key={m.label}
                      type="button"
                      onClick={() => onChangeField('mood', m.label)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                        entry.mood === m.label
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 font-semibold'
                          : 'bg-neutral-800/80 text-neutral-400 border border-neutral-700/60 hover:bg-neutral-800 hover:text-neutral-200'
                      }`}
                    >
                      <span className="mr-1">{m.emoji}</span>
                      <span>{m.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Tags */}
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-semibold text-neutral-400 flex items-center space-x-1">
                  <Tag className="w-3.5 h-3.5 text-neutral-500" />
                  <span>Tags:</span>
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {popularTags.map((tag) => {
                    const isSelected = (entry.tags || []).includes(tag);
                    return (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => toggleTag(tag)}
                        className={`px-2 py-0.5 rounded-md text-[11px] font-medium transition-colors cursor-pointer ${
                          isSelected
                            ? 'bg-amber-500 text-neutral-950 font-semibold'
                            : 'bg-neutral-800 text-neutral-400 hover:bg-neutral-700 hover:text-neutral-200 border border-neutral-700/50'
                        }`}
                      >
                        #{tag}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Location Pin Row */}
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <span className="text-xs font-semibold text-neutral-400 flex items-center space-x-1">
                  <MapPin className="w-3.5 h-3.5 text-amber-500" />
                  <span>Location:</span>
                </span>
                <JournalLocationBadge
                  location={entry.location || null}
                  onOpenPicker={() => setIsLocationModalOpen(true)}
                  onRemoveLocation={() => onChangeField('location', null)}
                />
              </div>
            </div>

            {/* Writing Area with Voice-to-Text, Audio Hear, and Prompt Starters Bar */}
            <div className="relative space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center space-x-3">
                  <button
                    type="button"
                    onClick={() => setShowInspirations(!showInspirations)}
                    className="inline-flex items-center space-x-1.5 text-xs font-medium text-amber-400 hover:text-amber-300 cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>{showInspirations ? 'Hide Ideas' : 'Need inspiration?'}</span>
                  </button>
                </div>

                {/* Audio & Voice Tools Toolbar */}
                <div className="flex items-center space-x-1.5 bg-[#141414] border border-neutral-800 p-1 rounded-xl">
                  {/* Voice-to-Text Dictation Button */}
                  <button
                    id="btn-voice-dictate-entry"
                    type="button"
                    onClick={toggleListening}
                    className={`inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                      isListening
                        ? 'bg-rose-500 text-white shadow-xs animate-pulse'
                        : 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700 hover:text-amber-300'
                    }`}
                    title={isListening ? 'Stop Voice-to-Text Dictation' : 'Voice-to-Text: Dictate reflection with your voice'}
                  >
                    {isListening ? (
                      <>
                        <MicOff className="w-3.5 h-3.5 text-white" />
                        <span>Listening...</span>
                      </>
                    ) : (
                      <>
                        <Mic className="w-3.5 h-3.5 text-amber-400" />
                        <span>Voice to Text</span>
                      </>
                    )}
                  </button>

                  {/* Hear / Listen Button */}
                  <button
                    id="btn-hear-reflection"
                    type="button"
                    onClick={() => speak(entry.content || 'Your reflection is currently empty. Pour your thoughts or use voice to text.', 'journal_entry')}
                    disabled={!entry.content}
                    className={`inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer disabled:opacity-40 ${
                      activeSpeakingId === 'journal_entry'
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 animate-pulse'
                        : 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700 hover:text-amber-300'
                    }`}
                    title={activeSpeakingId === 'journal_entry' ? 'Stop audio' : 'Hear reflection read aloud'}
                  >
                    {activeSpeakingId === 'journal_entry' ? (
                      <>
                        <VolumeX className="w-3.5 h-3.5 text-amber-400" />
                        <span>Stop Audio</span>
                      </>
                    ) : (
                      <>
                        <Volume2 className="w-3.5 h-3.5 text-neutral-400" />
                        <span>Hear Entry</span>
                      </>
                    )}
                  </button>

                  {/* Copy Button */}
                  <button
                    id="btn-copy-entry-content"
                    type="button"
                    onClick={handleCopy}
                    disabled={!entry.content}
                    className="inline-flex items-center space-x-1 px-2 py-1 rounded-lg text-xs font-semibold bg-neutral-800 text-neutral-300 hover:bg-neutral-700 hover:text-neutral-100 transition-colors cursor-pointer disabled:opacity-40"
                    title="Copy reflection to clipboard"
                  >
                    {isCopied ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-emerald-400">Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5 text-neutral-400" />
                        <span>Copy</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Live Dictation Active Wave Banner */}
              {isListening && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center justify-between animate-pulse">
                  <div className="flex items-center space-x-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping" />
                    <span className="font-semibold">Recording voice reflection... Speak freely into your microphone.</span>
                    {interimText && (
                      <span className="text-neutral-300 italic font-normal">"{interimText}"</span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={toggleListening}
                    className="px-2 py-0.5 rounded-md bg-rose-500 text-white font-bold text-[11px] hover:bg-rose-600 transition-colors cursor-pointer"
                  >
                    Done
                  </button>
                </div>
              )}

              {/* Prompt Starters Accordion */}
              {showInspirations && (
                <div className="mb-3 p-3.5 rounded-xl bg-[#1c1a16] border border-amber-900/60 space-y-2">
                  <p className="text-xs font-semibold text-amber-300">
                    Click a prompt to insert into your reflection:
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {promptStarters.map((starter, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleApplyStarter(starter.text)}
                        className="text-left p-2.5 rounded-lg bg-[#24221d] hover:bg-[#2e2a22] border border-amber-900/40 text-xs text-neutral-300 transition-all shadow-2xs cursor-pointer"
                      >
                        <p className="font-semibold text-neutral-100 mb-0.5">{starter.title}</p>
                        <p className="text-[11px] text-neutral-400 line-clamp-2">{starter.text}</p>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <textarea
                id="journal-content-textarea"
                value={entry.content}
                onChange={(e) => onChangeField('content', e.target.value)}
                placeholder="Pour your thoughts freely here... What happened today? What feelings arose? What did you discover?"
                rows={14}
                className="w-full bg-[#0d0d0d] rounded-xl p-4 text-neutral-100 placeholder:text-neutral-600 border border-neutral-800 focus:border-amber-500/60 focus:bg-[#111111] focus:outline-none focus:ring-2 focus:ring-amber-500/20 text-sm sm:text-base leading-relaxed resize-y font-normal"
              />
            </div>

            {/* Bottom Actions */}
            <div className="pt-3 border-t border-neutral-800 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center space-x-2">
                <button
                  id="btn-quick-insights"
                  type="button"
                  onClick={() => {
                    setActiveSideTab('insights');
                    onGenerateInsights();
                  }}
                  disabled={!entry.content.trim() || isGeneratingInsights}
                  className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-amber-500/10 text-amber-300 border border-amber-500/30 hover:bg-amber-500/20 text-xs font-semibold disabled:opacity-40 transition-colors cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  <span>Synthesize with AI</span>
                </button>
              </div>

              <span className="text-[11px] text-neutral-500 italic">
                Isolated to Firestore document: /users/{entry.userId || 'current'}/journals
              </span>
            </div>
          </div>
        </div>

        {/* Right Column: AI Companion & Synthesis Studio (5 cols on lg) */}
        <div className="lg:col-span-5 space-y-4">
          {/* Side Tabs: Chat vs Synthesis */}
          <div className="flex items-center bg-neutral-900 border border-neutral-800/80 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => setActiveSideTab('chat')}
              className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center justify-center space-x-1.5 cursor-pointer ${
                activeSideTab === 'chat'
                  ? 'bg-neutral-800 text-neutral-100 shadow-xs'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Multi-Turn Dialogue</span>
              {entry.conversation?.length > 0 && (
                <span className="ml-1 px-1.5 py-0.2 text-[10px] rounded-full bg-neutral-700 text-neutral-200">
                  {entry.conversation.length}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setActiveSideTab('insights')}
              className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center justify-center space-x-1.5 cursor-pointer ${
                activeSideTab === 'insights'
                  ? 'bg-neutral-800 text-neutral-100 shadow-xs'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5 text-purple-400" />
              <span>AI Insights & Summary</span>
            </button>
          </div>

          {/* Active Side Tab Content */}
          {activeSideTab === 'chat' ? (
            <AICompanionChat
              messages={entry.conversation || []}
              onSendMessage={onSendMessage}
              onStopGenerating={onStopGeneratingChat}
              isLoading={isGeneratingChat}
              journalContent={entry.content}
              reflectionMode={reflectionMode}
              onSelectMode={onSelectMode}
            />
          ) : (
            <AIInsightsView
              insights={entry.insights || null}
              isLoading={isGeneratingInsights}
              onGenerate={onGenerateInsights}
              onStopGenerating={onStopGeneratingInsights}
              hasContent={!!entry.content.trim()}
            />
          )}
        </div>
      </div>

      {/* Location Picker Modal */}
      <LocationPickerModal
        isOpen={isLocationModalOpen}
        onClose={() => setIsLocationModalOpen(false)}
        currentLocation={entry.location || null}
        onSaveLocation={(newLoc) => onChangeField('location', newLoc)}
      />
    </div>
  );
};
