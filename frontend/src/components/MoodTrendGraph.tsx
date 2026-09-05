import React, { useState, useMemo } from 'react';
import { JournalEntry } from '../types';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from 'recharts';
import {
  TrendingUp,
  Smile,
  Activity,
  Calendar,
  Sparkles,
  Zap,
  Heart,
  AlertCircle,
  BarChart3,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

interface MoodTrendGraphProps {
  entries: JournalEntry[];
}

type TimeframeOption = '7d' | '14d' | '30d' | 'all';

interface TimelinePoint {
  date: string;
  timestamp: number;
  energized: number;
  peaceful: number;
  challenged: number;
  totalScore: number;
  entryCount: number;
  dominantTone: string;
  titles: string[];
}

export const MoodTrendGraph: React.FC<MoodTrendGraphProps> = ({ entries }) => {
  const [timeframe, setTimeframe] = useState<TimeframeOption>('30d');
  const [isExpanded, setIsExpanded] = useState<boolean>(true);
  const [activeMetric, setActiveMetric] = useState<'all' | 'energized' | 'peaceful' | 'challenged'>('all');

  // Filter entries based on selected timeframe
  const timeframeMs = useMemo(() => {
    switch (timeframe) {
      case '7d':
        return 7 * 86400000;
      case '14d':
        return 14 * 86400000;
      case '30d':
        return 30 * 86400000;
      case 'all':
      default:
        return Infinity;
    }
  }, [timeframe]);

  const filteredEntries = useMemo(() => {
    const cutoff = Date.now() - timeframeMs;
    return entries.filter((e) => (timeframe === 'all' ? true : e.createdAt >= cutoff));
  }, [entries, timeframeMs, timeframe]);

  // Aggregate timeline data grouped by day
  const timelineData = useMemo(() => {
    if (filteredEntries.length === 0) return [];

    // Map by YYYY-MM-DD
    const dayMap = new Map<
      string,
      {
        timestamp: number;
        energized: number;
        peaceful: number;
        challenged: number;
        entryCount: number;
        tones: Record<string, number>;
        titles: string[];
      }
    >();

    // Sort entries ascending by timestamp
    const sorted = [...filteredEntries].sort((a, b) => a.createdAt - b.createdAt);

    sorted.forEach((entry) => {
      const d = new Date(entry.createdAt);
      const dayKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      
      const moodLower = (entry.mood || '').toLowerCase();
      const toneLower = (entry.insights?.emotionalTone || '').toLowerCase();

      // Assess scores based on mood + Gemini extracted emotionalTone
      let energizedScore = 0;
      let peacefulScore = 0;
      let challengedScore = 0;

      if (moodLower.includes('energiz') || toneLower.includes('energiz') || toneLower.includes('motivat') || moodLower.includes('creativ')) {
        energizedScore += 80;
      }
      if (moodLower.includes('peace') || moodLower.includes('grate') || moodLower.includes('reflect') || toneLower.includes('peace') || toneLower.includes('calm') || toneLower.includes('grounded')) {
        peacefulScore += 85;
      }
      if (moodLower.includes('challeng') || moodLower.includes('anxious') || toneLower.includes('anxious') || toneLower.includes('stress') || toneLower.includes('uncertain')) {
        challengedScore += 75;
      }

      // Default baseline values if neutral
      if (energizedScore === 0 && peacefulScore === 0 && challengedScore === 0) {
        peacefulScore = 60;
        energizedScore = 50;
      }

      const existing = dayMap.get(dayKey) || {
        timestamp: entry.createdAt,
        energized: 0,
        peaceful: 0,
        challenged: 0,
        entryCount: 0,
        tones: {},
        titles: [],
      };

      existing.energized = Math.max(existing.energized, energizedScore);
      existing.peaceful = Math.max(existing.peaceful, peacefulScore);
      existing.challenged = Math.max(existing.challenged, challengedScore);
      existing.entryCount += 1;
      existing.titles.push(entry.title || 'Untitled');

      const resolvedTone = entry.insights?.emotionalTone || entry.mood || 'Reflective';
      existing.tones[resolvedTone] = (existing.tones[resolvedTone] || 0) + 1;

      dayMap.set(dayKey, existing);
    });

    const result: TimelinePoint[] = [];
    dayMap.forEach((val, key) => {
      const d = new Date(val.timestamp);
      const shortDate = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
      
      // Determine dominant tone for the day
      let topTone = 'Reflective';
      let maxCount = -1;
      Object.entries(val.tones).forEach(([t, count]) => {
        if (count > maxCount) {
          maxCount = count;
          topTone = t;
        }
      });

      const totalScore = Math.round((val.energized * 1.2 + val.peaceful * 1.1) / Math.max(1, (val.challenged * 0.7 + 1)));

      result.push({
        date: shortDate,
        timestamp: val.timestamp,
        energized: val.energized,
        peaceful: val.peaceful,
        challenged: val.challenged,
        totalScore,
        entryCount: val.entryCount,
        dominantTone: topTone,
        titles: val.titles,
      });
    });

    return result;
  }, [filteredEntries]);

  // Overall metrics summary
  const summaryMetrics = useMemo(() => {
    if (filteredEntries.length === 0) {
      return {
        dominantTone: 'None Recorded',
        positiveRatio: 0,
        totalCheckins: 0,
        energizedCount: 0,
        peacefulCount: 0,
        challengedCount: 0,
      };
    }

    const toneCounts: Record<string, number> = {};
    let energized = 0;
    let peaceful = 0;
    let challenged = 0;

    filteredEntries.forEach((e) => {
      const m = (e.mood || '').toLowerCase();
      const t = (e.insights?.emotionalTone || '').toLowerCase();
      const toneLabel = e.insights?.emotionalTone || e.mood || 'Reflective';
      toneCounts[toneLabel] = (toneCounts[toneLabel] || 0) + 1;

      if (m.includes('energiz') || t.includes('energiz') || m.includes('creativ')) energized++;
      if (m.includes('peace') || m.includes('grate') || m.includes('reflect')) peaceful++;
      if (m.includes('challeng') || t.includes('anxious') || t.includes('stress')) challenged++;
    });

    let dominantTone = 'Reflective & Centered';
    let topVal = -1;
    Object.entries(toneCounts).forEach(([k, v]) => {
      if (v > topVal) {
        topVal = v;
        dominantTone = k;
      }
    });

    const total = filteredEntries.length;
    const positiveCount = energized + peaceful;
    const positiveRatio = Math.round((positiveCount / Math.max(1, total)) * 100);

    return {
      dominantTone,
      positiveRatio: Math.min(100, positiveRatio),
      totalCheckins: total,
      energizedCount: energized,
      peacefulCount: peaceful,
      challengedCount: challenged,
    };
  }, [filteredEntries]);

  if (entries.length === 0) {
    return null;
  }

  return (
    <div
      id="mood-trend-analysis-container"
      className="rounded-3xl border shadow-xs transition-colors overflow-hidden"
      style={{
        backgroundColor: 'var(--color-surface)',
        borderColor: 'var(--color-border)',
      }}
    >
      {/* Header Bar */}
      <div
        className="p-5 sm:p-6 border-b flex flex-col sm:flex-row sm:items-center justify-between gap-4"
        style={{ borderColor: 'var(--color-border)' }}
      >
        <div className="flex items-center space-x-3">
          <div
            className="w-10 h-10 rounded-2xl border flex items-center justify-center shrink-0"
            style={{
              backgroundColor: 'rgba(245, 158, 11, 0.1)',
              borderColor: 'rgba(245, 158, 11, 0.25)',
              color: 'var(--color-accent)',
            }}
          >
            <TrendingUp className="w-5 h-5 text-amber-500" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h3 className="font-serif-display text-lg font-bold" style={{ color: 'var(--color-text)' }}>
                Emotional Tone & Mood Timeline
              </h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold border bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20">
                Gemini Synthesized
              </span>
            </div>
            <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
              Interactive trajectory of your psychological states and emotional balance over time
            </p>
          </div>
        </div>

        {/* Controls: Timeframe buttons & Expand toggle */}
        <div className="flex items-center space-x-2 self-start sm:self-auto">
          <div
            className="flex items-center rounded-xl p-1 border text-xs"
            style={{
              backgroundColor: 'var(--color-surface-elevated)',
              borderColor: 'var(--color-border)',
            }}
          >
            {(['7d', '14d', '30d', 'all'] as TimeframeOption[]).map((tf) => (
              <button
                key={tf}
                id={`btn-timeframe-${tf}`}
                onClick={() => setTimeframe(tf)}
                className="px-2.5 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer"
                style={{
                  backgroundColor: timeframe === tf ? 'var(--color-accent)' : 'transparent',
                  color: timeframe === tf ? '#1a1a1a' : 'var(--color-text-muted)',
                }}
              >
                {tf === '7d' ? '7D' : tf === '14d' ? '14D' : tf === '30d' ? '30D' : 'All'}
              </button>
            ))}
          </div>

          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-2 rounded-xl border transition-colors cursor-pointer"
            style={{
              backgroundColor: 'var(--color-surface-elevated)',
              borderColor: 'var(--color-border)',
              color: 'var(--color-text-muted)',
            }}
            title={isExpanded ? 'Collapse graph' : 'Expand graph'}
          >
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {isExpanded && (
        <div className="p-5 sm:p-6 space-y-6">
          {/* Summary Metric Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {/* Dominant Emotional Tone */}
            <div
              className="p-4 rounded-2xl border space-y-1 transition-colors"
              style={{
                backgroundColor: 'var(--color-surface-elevated)',
                borderColor: 'var(--color-border)',
              }}
            >
              <div className="flex items-center space-x-2 text-xs font-semibold" style={{ color: 'var(--color-text-muted)' }}>
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                <span>Dominant Tone</span>
              </div>
              <p className="text-sm sm:text-base font-bold truncate capitalize" style={{ color: 'var(--color-text)' }}>
                {summaryMetrics.dominantTone}
              </p>
              <p className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>
                Synthesized by Gemini AI
              </p>
            </div>

            {/* Positive & Grounded Valence */}
            <div
              className="p-4 rounded-2xl border space-y-1 transition-colors"
              style={{
                backgroundColor: 'var(--color-surface-elevated)',
                borderColor: 'var(--color-border)',
              }}
            >
              <div className="flex items-center space-x-2 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                <Heart className="w-3.5 h-3.5 text-emerald-500" />
                <span>Grounded / Uplifting</span>
              </div>
              <p className="text-sm sm:text-base font-bold" style={{ color: 'var(--color-text)' }}>
                {summaryMetrics.positiveRatio}%
              </p>
              <p className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>
                Peaceful & Energized states
              </p>
            </div>

            {/* Total Check-ins */}
            <div
              className="p-4 rounded-2xl border space-y-1 transition-colors"
              style={{
                backgroundColor: 'var(--color-surface-elevated)',
                borderColor: 'var(--color-border)',
              }}
            >
              <div className="flex items-center space-x-2 text-xs font-semibold" style={{ color: 'var(--color-text-muted)' }}>
                <Calendar className="w-3.5 h-3.5 text-blue-500" />
                <span>Total Check-ins</span>
              </div>
              <p className="text-sm sm:text-base font-bold" style={{ color: 'var(--color-text)' }}>
                {summaryMetrics.totalCheckins} {summaryMetrics.totalCheckins === 1 ? 'entry' : 'entries'}
              </p>
              <p className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>
                In {timeframe === 'all' ? 'total history' : `last ${timeframe.replace('d', ' days')}`}
              </p>
            </div>

            {/* Active Resonance */}
            <div
              className="p-4 rounded-2xl border space-y-1 transition-colors"
              style={{
                backgroundColor: 'var(--color-surface-elevated)',
                borderColor: 'var(--color-border)',
              }}
            >
              <div className="flex items-center space-x-2 text-xs font-semibold" style={{ color: 'var(--color-text-muted)' }}>
                <Zap className="w-3.5 h-3.5 text-amber-500" />
                <span>High Energy Pulses</span>
              </div>
              <p className="text-sm sm:text-base font-bold" style={{ color: 'var(--color-text)' }}>
                {summaryMetrics.energizedCount}
              </p>
              <p className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>
                Energized & Creative entries
              </p>
            </div>
          </div>

          {/* Metric Category Filter Filter Pills */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium mr-1" style={{ color: 'var(--color-text-muted)' }}>
              Chart Series:
            </span>
            <button
              onClick={() => setActiveMetric('all')}
              className="px-3 py-1 rounded-xl text-xs font-medium transition-all cursor-pointer border"
              style={{
                backgroundColor: activeMetric === 'all' ? 'var(--color-accent-subtle)' : 'var(--color-surface-elevated)',
                borderColor: activeMetric === 'all' ? 'var(--color-accent)' : 'var(--color-border)',
                color: activeMetric === 'all' ? 'var(--color-accent-text)' : 'var(--color-text-muted)',
              }}
            >
              All Dimensions
            </button>
            <button
              onClick={() => setActiveMetric('energized')}
              className="px-3 py-1 rounded-xl text-xs font-medium transition-all cursor-pointer border"
              style={{
                backgroundColor: activeMetric === 'energized' ? 'rgba(245, 158, 11, 0.15)' : 'var(--color-surface-elevated)',
                borderColor: activeMetric === 'energized' ? '#f59e0b' : 'var(--color-border)',
                color: activeMetric === 'energized' ? '#f59e0b' : 'var(--color-text-muted)',
              }}
            >
              ⚡ Energized & Creative
            </button>
            <button
              onClick={() => setActiveMetric('peaceful')}
              className="px-3 py-1 rounded-xl text-xs font-medium transition-all cursor-pointer border"
              style={{
                backgroundColor: activeMetric === 'peaceful' ? 'rgba(16, 185, 129, 0.15)' : 'var(--color-surface-elevated)',
                borderColor: activeMetric === 'peaceful' ? '#10b981' : 'var(--color-border)',
                color: activeMetric === 'peaceful' ? '#10b981' : 'var(--color-text-muted)',
              }}
            >
              🌿 Peaceful & Grounded
            </button>
            <button
              onClick={() => setActiveMetric('challenged')}
              className="px-3 py-1 rounded-xl text-xs font-medium transition-all cursor-pointer border"
              style={{
                backgroundColor: activeMetric === 'challenged' ? 'rgba(239, 68, 68, 0.15)' : 'var(--color-surface-elevated)',
                borderColor: activeMetric === 'challenged' ? '#ef4444' : 'var(--color-border)',
                color: activeMetric === 'challenged' ? '#ef4444' : 'var(--color-text-muted)',
              }}
            >
              🌧️ Challenged & Anxious
            </button>
          </div>

          {/* Recharts Area Chart */}
          <div className="h-64 sm:h-72 w-full pt-2">
            {timelineData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs" style={{ color: 'var(--color-text-muted)' }}>
                No entries recorded in this timeframe. Write a reflection to plot your mood!
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={timelineData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorEnergized" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.6} />
                      <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.0} />
                    </linearGradient>
                    <linearGradient id="colorPeaceful" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.6} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                    </linearGradient>
                    <linearGradient id="colorChallenged" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ef4444" stopOpacity={0.5} />
                      <stop offset="95%" stopColor="#ef4444" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(150, 150, 150, 0.15)" />
                  <XAxis
                    dataKey="date"
                    tick={{ fill: 'var(--color-text-muted)', fontSize: 11 }}
                    tickLine={false}
                    axisLine={{ stroke: 'rgba(150, 150, 150, 0.2)' }}
                  />
                  <YAxis
                    domain={[0, 100]}
                    tick={{ fill: 'var(--color-text-muted)', fontSize: 11 }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip
                    content={({ active, payload, label }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload as TimelinePoint;
                        return (
                          <div
                            className="p-3 rounded-2xl border shadow-xl text-xs space-y-1.5"
                            style={{
                              backgroundColor: 'var(--color-surface)',
                              borderColor: 'var(--color-border)',
                              color: 'var(--color-text)',
                            }}
                          >
                            <div className="font-bold flex items-center justify-between gap-4 border-b pb-1" style={{ borderColor: 'var(--color-border)' }}>
                              <span>{label}</span>
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-500 font-mono">
                                {data.entryCount} {data.entryCount === 1 ? 'reflection' : 'reflections'}
                              </span>
                            </div>
                            <div className="text-[11px] pt-0.5">
                              <span style={{ color: 'var(--color-text-muted)' }}>Dominant Tone: </span>
                              <span className="font-semibold text-amber-500 capitalize">{data.dominantTone}</span>
                            </div>
                            {(activeMetric === 'all' || activeMetric === 'energized') && (
                              <div className="flex items-center justify-between text-[#f59e0b]">
                                <span>Energized Intensity:</span>
                                <span className="font-mono font-bold">{data.energized} / 100</span>
                              </div>
                            )}
                            {(activeMetric === 'all' || activeMetric === 'peaceful') && (
                              <div className="flex items-center justify-between text-[#10b981]">
                                <span>Peaceful / Calm:</span>
                                <span className="font-mono font-bold">{data.peaceful} / 100</span>
                              </div>
                            )}
                            {(activeMetric === 'all' || activeMetric === 'challenged') && (
                              <div className="flex items-center justify-between text-[#ef4444]">
                                <span>Challenged / Anxious:</span>
                                <span className="font-mono font-bold">{data.challenged} / 100</span>
                              </div>
                            )}
                            {data.titles.length > 0 && (
                              <div className="pt-1 text-[10px] italic truncate max-w-xs" style={{ color: 'var(--color-text-muted)' }}>
                                "{data.titles[0]}"
                              </div>
                            )}
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Legend
                    verticalAlign="top"
                    height={36}
                    wrapperStyle={{ fontSize: '11px', color: 'var(--color-text-muted)' }}
                  />
                  {(activeMetric === 'all' || activeMetric === 'peaceful') && (
                    <Area
                      type="monotone"
                      name="Peaceful / Centered"
                      dataKey="peaceful"
                      stroke="#10b981"
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#colorPeaceful)"
                    />
                  )}
                  {(activeMetric === 'all' || activeMetric === 'energized') && (
                    <Area
                      type="monotone"
                      name="Energized / Creative"
                      dataKey="energized"
                      stroke="#f59e0b"
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#colorEnergized)"
                    />
                  )}
                  {(activeMetric === 'all' || activeMetric === 'challenged') && (
                    <Area
                      type="monotone"
                      name="Challenged / Anxious"
                      dataKey="challenged"
                      stroke="#ef4444"
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#colorChallenged)"
                    />
                  )}
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
