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
    if (window.confirm('Are you sure you want to delete this reflection? This action cannot be undone.')) {
      setDeletingId(entryId);
      try {
        await onDeleteEntry(entryId);
      } finally {
        setDeletingId(null);
      }
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header & Controls */}
      <div className="bg-[#141414] rounded-2xl border border-neutral-800/80 p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="font-serif-display text-2xl font-bold text-neutral-100">
              Journal History & Reflections
            </h2>
            <p className="text-xs sm:text-sm text-neutral-400 mt-0.5">
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
        <div className="flex flex-col sm:flex-row gap-3 pt-2 border-t border-neutral-800">
          {/* Search bar */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-neutral-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              id="history-search-input"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search reflections, insights, tags, or feelings..."
              className="w-full bg-[#0d0d0d] border border-neutral-800 rounded-xl pl-9 pr-4 py-2 text-xs sm:text-sm text-neutral-100 placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500/60"
            />
          </div>

          {/* Mood Pills */}
          <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0">
            {moods.map((m) => (
              <button
                key={m}
                onClick={() => setSelectedMood(m)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all cursor-pointer ${
                  selectedMood === m
                    ? 'bg-amber-500/20 text-amber-300 font-semibold border border-amber-500/40'
                    : 'bg-neutral-800/80 text-neutral-400 hover:bg-neutral-800 hover:text-neutral-200 border border-neutral-700/50'
                }`}
              >
                {m}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Grid of Entries */}
      {filteredEntries.length === 0 ? (
        <div className="bg-[#141414] rounded-2xl border border-neutral-800 p-12 text-center space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-neutral-800 text-neutral-400 flex items-center justify-center mx-auto">
            <BookOpen className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-neutral-100">
              {searchQuery || selectedMood !== 'All' ? 'No matching reflections found' : 'Your reflection history is empty'}
            </h3>
            <p className="text-xs sm:text-sm text-neutral-400 mt-1 max-w-sm mx-auto">
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
              className="group bg-[#141414] rounded-2xl border border-neutral-800/80 p-5 shadow-2xs hover:shadow-md hover:border-amber-500/40 transition-all cursor-pointer flex flex-col justify-between"
            >
              <div className="space-y-3">
                {/* Header: Date & Mood */}
                <div className="flex items-center justify-between text-xs text-neutral-400">
                  <span className="flex items-center space-x-1 font-medium">
                    <Calendar className="w-3.5 h-3.5 text-neutral-500" />
                    <span>{formatRelativeDate(entry.updatedAt || entry.createdAt)}</span>
                  </span>
                  <span className="px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-300 border border-amber-500/30 text-[11px] font-semibold">
                    {entry.mood}
                  </span>
                </div>

                {/* Title */}
                <h3 className="font-serif-display text-lg font-bold text-neutral-100 group-hover:text-amber-300 transition-colors line-clamp-1">
                  {entry.title || 'Untitled Reflection'}
                </h3>

                {/* Content Excerpt */}
                <p className="text-xs sm:text-sm text-neutral-400 line-clamp-3 leading-relaxed">
                  {entry.content || 'Empty entry...'}
                </p>

                {/* AI Summary Preview if present */}
                {entry.insights?.summary && (
                  <div className="p-2.5 rounded-xl bg-[#1c1a16] border border-amber-900/40 text-xs text-neutral-300">
                    <div className="flex items-center space-x-1 text-[10px] font-bold text-amber-300 uppercase tracking-wider mb-1">
                      <Sparkles className="w-3 h-3 text-amber-400" />
                      <span>AI Key Insight</span>
                    </div>
                    <p className="text-[11px] text-neutral-300 line-clamp-2 italic">
                      "{entry.insights.summary}"
                    </p>
                  </div>
                )}

                {/* Location Badge if present */}
                {entry.location && (
                  <div className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-md bg-amber-500/10 border border-amber-500/20 text-amber-300 text-[11px] font-medium">
                    <MapPin className="w-3 h-3 text-amber-400 shrink-0" />
                    <span className="line-clamp-1">{entry.location.name}</span>
                  </div>
                )}

                {/* Tags */}
                {entry.tags && entry.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 pt-1">
                    {entry.tags.map((t) => (
                      <span
                        key={t}
                        className="px-2 py-0.5 rounded-md bg-neutral-800 border border-neutral-700 text-neutral-300 text-[10px] font-medium"
                      >
                        #{t}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Bottom Meta & Actions */}
              <div className="mt-4 pt-3 border-t border-neutral-800 flex items-center justify-between text-xs text-neutral-500">
                <div className="flex items-center space-x-3">
                  <span>{calculateWordCount(entry.content)} words</span>
                  {entry.conversation && entry.conversation.length > 0 && (
                    <span className="flex items-center space-x-1 text-neutral-400">
                      <MessageSquare className="w-3.5 h-3.5 text-neutral-500" />
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
                    className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                      activeSpeakingId === `history_${entry.id}`
                        ? 'text-amber-400 bg-amber-500/20'
                        : 'text-neutral-500 hover:text-neutral-200 hover:bg-neutral-800'
                    }`}
                    title={activeSpeakingId === `history_${entry.id}` ? 'Stop audio' : 'Hear reflection aloud'}
                  >
                    {activeSpeakingId === `history_${entry.id}` ? (
                      <VolumeX className="w-3.5 h-3.5 animate-pulse text-amber-400" />
                    ) : (
                      <Volume2 className="w-3.5 h-3.5" />
                    )}
                  </button>

                  {/* Copy Button */}
                  <button
                    type="button"
                    onClick={(e) => handleCopy(entry, e)}
                    className="p-1.5 text-neutral-500 hover:text-neutral-200 hover:bg-neutral-800 rounded-lg transition-colors cursor-pointer"
                    title="Copy entry"
                  >
                    {copiedId === entry.id ? (
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>

                  {/* Delete Button */}
                  <button
                    type="button"
                    onClick={(e) => handleDelete(entry.id, e)}
                    disabled={deletingId === entry.id}
                    className="p-1.5 text-neutral-500 hover:text-rose-400 hover:bg-rose-950/40 rounded-lg transition-colors cursor-pointer"
                    title="Delete reflection"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
