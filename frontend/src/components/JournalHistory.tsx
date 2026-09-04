import React, { useState, useMemo } from 'react';
import { JournalEntry } from '../types';
import { formatDate, formatRelativeDate, calculateWordCount, calculateReadingTime } from '../lib/utils';
import {
  Search,
  BookOpen,
  Calendar,
  Sparkles,
  MessageSquare,
  Trash2,
  ExternalLink,
  Tag,
  Smile,
  Copy,
  Check,
  Filter,
  MapPin,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { useSpeech } from '../hooks/useSpeech';

interface JournalHistoryProps {
  entries: JournalEntry[];
  onSelectEntry: (entry: JournalEntry) => void;
  onDeleteEntry: (entryId: string) => Promise<void>;
  onNewEntry: () => void;
}

export const JournalHistory: React.FC<JournalHistoryProps> = ({
  entries,
  onSelectEntry,
  onDeleteEntry,
  onNewEntry,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMood, setSelectedMood] = useState<string>('All');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const { activeSpeakingId, speak, stop } = useSpeech();

  const moods = ['All', 'Reflective', 'Grateful', 'Peaceful', 'Energized', 'Challenged', 'Creative'];

  const filteredEntries = useMemo(() => {
    return entries.filter((entry) => {
      const matchesSearch =
        !searchQuery.trim() ||
        entry.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        entry.content?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        entry.tags?.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase())) ||
        entry.location?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        entry.location?.address?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        entry.insights?.summary?.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesMood = selectedMood === 'All' || entry.mood === selectedMood;

      return matchesSearch && matchesMood;
    });
  }, [entries, searchQuery, selectedMood]);

  const handleCopy = (entry: JournalEntry, e: React.MouseEvent) => {
    e.stopPropagation();
    const text = `# ${entry.title || 'Untitled Reflection'}\nDate: ${formatDate(entry.createdAt)}\nMood: ${entry.mood}\n\n${entry.content}\n\n${
      entry.insights?.summary ? `## AI Summary\n${entry.insights.summary}\n` : ''
    }`;
    navigator.clipboard.writeText(text);
    setCopiedId(entry.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleDelete = async (entryId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setDeletingId(entryId);
    try {
      await onDeleteEntry(entryId);
      setConfirmDeleteId(null);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header & Controls */}
      <div
        className="rounded-2xl border p-5 shadow-xs space-y-4 transition-colors"
        style={{
          backgroundColor: 'var(--color-surface)',
          borderColor: 'var(--color-border)',
        }}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="font-serif-display text-2xl font-bold" style={{ color: 'var(--color-text)' }}>
              Journal History & Reflections
            </h2>
            <p className="text-xs sm:text-sm mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
              Securely persisted in your isolated Cloud Firestore collection ({entries.length} total {entries.length === 1 ? 'entry' : 'entries'})
            </p>
          </div>

          <button
            id="btn-history-new-entry"
            onClick={onNewEntry}
            className="inline-flex items-center space-x-2 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 text-xs sm:text-sm font-bold shadow-xs transition-all cursor-pointer shrink-0"
          >
            <Sparkles className="w-4 h-4 text-neutral-950" />
            <span>Write New Reflection</span>
          </button>
        </div>

        {/* Search & Mood Filter */}
        <div className="flex flex-col sm:flex-row gap-3 pt-2 border-t" style={{ borderColor: 'var(--color-border)' }}>
          {/* Search bar */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: 'var(--color-text-muted)' }} />
            <input
              id="history-search-input"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search reflections, insights, tags, or feelings..."
              className="w-full rounded-xl pl-9 pr-4 py-2 text-xs sm:text-sm border focus:outline-none focus:ring-2 focus:ring-amber-500/20 transition-colors"
              style={{
                backgroundColor: 'var(--color-surface)',
                borderColor: 'var(--color-border)',
                color: 'var(--color-text)',
              }}
            />
          </div>

          {/* Mood Pills */}
          <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0">
            {moods.map((m) => (
              <button
                key={m}
                onClick={() => setSelectedMood(m)}
                className="px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all cursor-pointer border"
                style={{
                  backgroundColor: selectedMood === m ? 'var(--color-accent-subtle)' : 'var(--color-surface-elevated)',
                  color: selectedMood === m ? 'var(--color-accent-text)' : 'var(--color-text-muted)',
                  borderColor: selectedMood === m ? 'var(--color-accent)' : 'var(--color-border)',
                }}
              >
                {m}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Grid of Entries */}
      {filteredEntries.length === 0 ? (
        <div
          className="rounded-2xl border p-12 text-center space-y-4"
          style={{
            backgroundColor: 'var(--color-surface)',
            borderColor: 'var(--color-border)',
          }}
        >
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto"
            style={{
              backgroundColor: 'var(--color-surface-elevated)',
              color: 'var(--color-text-muted)',
            }}
          >
            <BookOpen className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-bold" style={{ color: 'var(--color-text)' }}>
              {searchQuery || selectedMood !== 'All' ? 'No matching reflections found' : 'Your reflection history is empty'}
            </h3>
            <p className="text-xs sm:text-sm mt-1 max-w-sm mx-auto" style={{ color: 'var(--color-text-muted)' }}>
              {searchQuery || selectedMood !== 'All'
                ? 'Try adjusting your search terms or mood filters.'
                : 'Start your first journal entry and converse with the Gemini companion.'}
            </p>
          </div>
          <button
            onClick={onNewEntry}
            className="inline-flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 text-xs font-bold shadow-xs transition-colors cursor-pointer"
          >
            <Sparkles className="w-4 h-4" />
            <span>Create First Reflection</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredEntries.map((entry) => (
            <div
              key={entry.id}
              onClick={() => onSelectEntry(entry)}
              className="group rounded-2xl border p-5 shadow-2xs hover:shadow-md transition-all cursor-pointer flex flex-col justify-between"
              style={{
                backgroundColor: 'var(--color-surface)',
                borderColor: 'var(--color-border)',
              }}
            >
              <div className="space-y-3">
                {/* Header: Date & Mood */}
                <div className="flex items-center justify-between text-xs" style={{ color: 'var(--color-text-muted)' }}>
                  <span className="flex items-center space-x-1 font-medium">
                    <Calendar className="w-3.5 h-3.5" style={{ color: 'var(--color-text-muted)' }} />
                    <span>{formatRelativeDate(entry.updatedAt || entry.createdAt)}</span>
                  </span>
                  <span
                    className="px-2 py-0.5 rounded-md border text-[11px] font-semibold"
                    style={{
                      backgroundColor: 'var(--color-accent-subtle)',
                      color: 'var(--color-accent-text)',
                      borderColor: 'var(--color-border)',
                    }}
                  >
                    {entry.mood}
                  </span>
                </div>

                {/* Title */}
                <h3
                  className="font-serif-display text-lg font-bold transition-colors line-clamp-1 group-hover:underline"
                  style={{ color: 'var(--color-text)' }}
                >
                  {entry.title || 'Untitled Reflection'}
                </h3>

                {/* Content Excerpt */}
                <p className="text-xs sm:text-sm line-clamp-3 leading-relaxed" style={{ color: 'var(--color-text-muted)' }}>
                  {entry.content || 'Empty entry...'}
                </p>

                {/* AI Summary Preview if present */}
                {entry.insights?.summary && (
                  <div
                    className="p-2.5 rounded-xl border text-xs"
                    style={{
                      backgroundColor: 'var(--color-surface-elevated)',
                      borderColor: 'var(--color-border)',
                    }}
                  >
                    <div
                      className="flex items-center space-x-1 text-[10px] font-bold uppercase tracking-wider mb-1"
                      style={{ color: 'var(--color-accent-text)' }}
                    >
                      <Sparkles className="w-3 h-3" style={{ color: 'var(--color-accent)' }} />
                      <span>AI Key Insight</span>
                    </div>
                    <p className="text-[11px] line-clamp-2 italic" style={{ color: 'var(--color-text)' }}>
                      "{entry.insights.summary}"
                    </p>
                  </div>
                )}

                {/* Location Badge if present */}
                {entry.location && (
                  <div
                    className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-md border text-[11px] font-medium"
                    style={{
                      backgroundColor: 'var(--color-accent-subtle)',
                      borderColor: 'var(--color-border)',
                      color: 'var(--color-accent-text)',
                    }}
                  >
                    <MapPin className="w-3 h-3 shrink-0" style={{ color: 'var(--color-accent)' }} />
                    <span className="line-clamp-1">{entry.location.name}</span>
                  </div>
                )}

                {/* Tags */}
                {entry.tags && entry.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 pt-1">
                    {entry.tags.map((t) => (
                      <span
                        key={t}
                        className="px-2 py-0.5 rounded-md border text-[10px] font-medium"
                        style={{
                          backgroundColor: 'var(--color-surface-elevated)',
                          borderColor: 'var(--color-border)',
                          color: 'var(--color-text)',
                        }}
                      >
                        #{t}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Bottom Meta & Actions */}
              <div
                className="mt-4 pt-3 border-t flex items-center justify-between text-xs"
                style={{
                  borderColor: 'var(--color-border)',
                  color: 'var(--color-text-muted)',
                }}
              >
                <div className="flex items-center space-x-3">
                  <span>{calculateWordCount(entry.content)} words</span>
                  {entry.conversation && entry.conversation.length > 0 && (
                    <span className="flex items-center space-x-1">
                      <MessageSquare className="w-3.5 h-3.5" style={{ color: 'var(--color-text-muted)' }} />
                      <span>{entry.conversation.length}</span>
                    </span>
                  )}
                </div>

                <div className="flex items-center space-x-1" onClick={(e) => e.stopPropagation()}>
                  {/* Hear Button */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      speak(entry.content, `history_${entry.id}`);
                    }}
                    className="p-1.5 rounded-lg transition-colors cursor-pointer border"
                    style={{
                      backgroundColor: activeSpeakingId === `history_${entry.id}` ? 'var(--color-accent-subtle)' : 'transparent',
                      color: activeSpeakingId === `history_${entry.id}` ? 'var(--color-accent-text)' : 'var(--color-text-muted)',
                      borderColor: activeSpeakingId === `history_${entry.id}` ? 'var(--color-accent)' : 'transparent',
                    }}
                    title={activeSpeakingId === `history_${entry.id}` ? 'Stop audio' : 'Hear reflection aloud'}
                  >
                    {activeSpeakingId === `history_${entry.id}` ? (
                      <VolumeX className="w-3.5 h-3.5 animate-pulse" style={{ color: 'var(--color-accent)' }} />
                    ) : (
                      <Volume2 className="w-3.5 h-3.5" />
                    )}
                  </button>

                  {/* Copy Button */}
                  <button
                    type="button"
                    onClick={(e) => handleCopy(entry, e)}
                    className="p-1.5 rounded-lg transition-colors cursor-pointer"
                    style={{ color: 'var(--color-text-muted)' }}
                    title="Copy entry"
                  >
                    {copiedId === entry.id ? (
                      <Check className="w-3.5 h-3.5 text-emerald-500" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>

                  {/* Delete Button & Inline Confirmation */}
                  {confirmDeleteId === entry.id ? (
                    <div className="inline-flex items-center space-x-1" onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        onClick={(e) => handleDelete(entry.id, e)}
                        disabled={deletingId === entry.id}
                        className="px-2 py-1 text-[10px] font-bold bg-rose-600 hover:bg-rose-700 text-white rounded cursor-pointer transition shadow-2xs"
                        title="Confirm deletion"
                      >
                        {deletingId === entry.id ? 'Deleting...' : 'Delete?'}
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setConfirmDeleteId(null);
                        }}
                        className="px-1.5 py-1 text-[10px] bg-stone-200 dark:bg-stone-700 text-stone-700 dark:text-stone-300 rounded cursor-pointer hover:opacity-80 transition"
                        title="Cancel"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setConfirmDeleteId(entry.id);
                      }}
                      disabled={deletingId === entry.id}
                      className="p-1.5 hover:text-rose-500 rounded-lg transition-colors cursor-pointer"
                      style={{ color: 'var(--color-text-muted)' }}
                      title="Delete reflection"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
