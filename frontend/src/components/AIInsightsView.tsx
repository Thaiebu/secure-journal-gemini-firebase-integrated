import React, { useState } from 'react';
import { AIInsight } from '../types';
import {
  Sparkles,
  Compass,
  Lightbulb,
  Heart,
  HelpCircle,
  Tag,
  Check,
  Volume2,
  VolumeX,
  Copy,
  Square,
} from 'lucide-react';
import { useSpeech } from '../hooks/useSpeech';

interface AIInsightsViewProps {
  insights: AIInsight | null;
  isLoading: boolean;
  onGenerate: () => void;
  onStopGenerating?: () => void;
  hasContent: boolean;
}

export const AIInsightsView: React.FC<AIInsightsViewProps> = ({
  insights,
  isLoading,
  onGenerate,
  onStopGenerating,
  hasContent,
}) => {
  const { activeSpeakingId, speak, stop } = useSpeech();
  const [copiedSection, setCopiedSection] = useState<string | null>(null);

  const handleCopy = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedSection(id);
      setTimeout(() => setCopiedSection(null), 2000);
    } catch {
      // fallback
    }
  };

  const getFullInsightsAudioText = () => {
    if (!insights) return '';
    let speech = `AI Core Summary: ${insights.summary}. `;
    if (insights.takeaways?.length) {
      speech += `Key realizations: ${insights.takeaways.join('. ')}. `;
    }
    if (insights.encouragement) {
      speech += `Encouragement: ${insights.encouragement}. `;
    }
    if (insights.followUpQuestions?.length) {
      speech += `Questions for next reflection: ${insights.followUpQuestions.join('. ')}. `;
    }
    speech += `Emotional energy: ${insights.emotionalTone}. `;
    if (insights.keyThemes?.length) {
      speech += `Key themes: ${insights.keyThemes.join(', ')}. `;
    }
    return speech;
  };

  if (isLoading) {
    return (
      <div
        className="p-6 rounded-2xl border shadow-xs text-center space-y-4 transition-colors"
        style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-card)' }}
      >
        <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center mx-auto">
          <Sparkles className="w-5 h-5 animate-spin text-amber-400" />
        </div>
        <div>
          <h4 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>Synthesizing Reflection</h4>
          <p className="text-xs text-neutral-400 mt-1">
            Analyzing themes, emotional tone, and mindful takeaways with Gemini...
          </p>
        </div>
        {onStopGenerating && (
          <div className="pt-1">
            <button
              id="btn-stop-synthesizing"
              type="button"
              onClick={onStopGenerating}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 text-rose-300 text-xs font-semibold transition-all cursor-pointer shadow-sm"
              title="Stop AI Synthesis"
            >
              <Square className="w-3 h-3 fill-rose-400 text-rose-400" />
              <span>Stop Synthesizing</span>
            </button>
          </div>
        )}
      </div>
    );
  }

  if (!insights) {
    return (
      <div
        className="p-6 rounded-2xl border shadow-xs flex flex-col items-center text-center space-y-3 transition-colors"
        style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-card)' }}
      >
        <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center">
          <Sparkles className="w-5 h-5" />
        </div>
        <div>
          <h4 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>AI Synthesis & Reflection</h4>
          <p className="text-xs text-neutral-400 max-w-sm mt-1">
            Generate an automated summary, identify key emotional themes, and receive curated inquiry questions.
          </p>
        </div>
        <button
          id="btn-generate-insights"
          type="button"
          onClick={onGenerate}
          disabled={!hasContent || isLoading}
          className="inline-flex items-center space-x-2 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 text-xs font-bold disabled:opacity-40 transition-all shadow-xs cursor-pointer"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>Generate AI Summary & Insights</span>
        </button>
      </div>
    );
  }

  return (
    <div
      className="p-5 rounded-2xl border shadow-xs space-y-4 transition-colors"
      style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-card)' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
        <div className="flex items-center space-x-2">
          <div
            className="w-6 h-6 rounded-lg border flex items-center justify-center"
            style={{
              backgroundColor: 'var(--color-accent-subtle)',
              borderColor: 'var(--color-border)',
              color: 'var(--color-accent)',
            }}
          >
            <Sparkles className="w-3.5 h-3.5" />
          </div>
          <h4 className="text-xs sm:text-sm font-bold" style={{ color: 'var(--color-text)' }}>
            AI Synthesis & Insights
          </h4>
        </div>

        <div className="flex items-center space-x-2">
          {/* Hear All Insights */}
          <button
            id="btn-hear-all-insights"
            type="button"
            onClick={() => speak(getFullInsightsAudioText(), 'all_insights')}
            className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer border"
            style={{
              backgroundColor: activeSpeakingId === 'all_insights' ? 'var(--color-accent-subtle)' : 'var(--color-surface-elevated)',
              color: activeSpeakingId === 'all_insights' ? 'var(--color-accent-text)' : 'var(--color-text)',
              borderColor: activeSpeakingId === 'all_insights' ? 'var(--color-accent)' : 'var(--color-border)',
            }}
            title={activeSpeakingId === 'all_insights' ? 'Stop audio' : 'Hear all insights read aloud'}
          >
            {activeSpeakingId === 'all_insights' ? (
              <>
                <VolumeX className="w-3.5 h-3.5" style={{ color: 'var(--color-accent)' }} />
                <span>Stop</span>
              </>
            ) : (
              <>
                <Volume2 className="w-3.5 h-3.5" style={{ color: 'var(--color-text-muted)' }} />
                <span>Hear All</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={onGenerate}
            className="text-[11px] font-semibold underline cursor-pointer hover:opacity-80 transition-opacity"
            style={{ color: 'var(--color-accent-text)' }}
          >
            Regenerate
          </button>
        </div>
      </div>

      {/* 1. Core Summary */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>
            Core Summary
          </p>
          <div className="flex items-center space-x-1">
            {/* Hear Summary */}
            <button
              type="button"
              onClick={() => speak(insights.summary, 'insight_summary')}
              className="p-1 rounded-md transition-colors cursor-pointer"
              style={{ color: activeSpeakingId === 'insight_summary' ? 'var(--color-accent-text)' : 'var(--color-text-muted)' }}
              title={activeSpeakingId === 'insight_summary' ? 'Stop audio' : 'Hear summary'}
            >
              {activeSpeakingId === 'insight_summary' ? (
                <VolumeX className="w-3.5 h-3.5 animate-pulse" style={{ color: 'var(--color-accent)' }} />
              ) : (
                <Volume2 className="w-3.5 h-3.5" />
              )}
            </button>

            {/* Copy Summary */}
            <button
              type="button"
              onClick={() => handleCopy(insights.summary, 'summary')}
              className="p-1 rounded-md transition-colors cursor-pointer"
              style={{ color: 'var(--color-text-muted)' }}
              title="Copy summary"
            >
              {copiedSection === 'summary' ? (
                <Check className="w-3.5 h-3.5 text-emerald-500" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
            </button>
          </div>
        </div>
        <p
          className="text-xs sm:text-sm leading-relaxed p-3 rounded-xl border"
          style={{
            backgroundColor: 'var(--color-surface-elevated)',
            borderColor: 'var(--color-border)',
            color: 'var(--color-text)',
          }}
        >
          {insights.summary}
        </p>
      </div>

      {/* 2. Key Realizations */}
      {insights.takeaways && insights.takeaways.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center space-x-1.5 text-xs font-semibold text-neutral-300">
              <Lightbulb className="w-3.5 h-3.5 text-amber-400" />
              <span>Key Realizations</span>
            </div>

            <div className="flex items-center space-x-1">
              <button
                type="button"
                onClick={() =>
                  speak(
                    `Key realizations: ${insights.takeaways.join('. ')}`,
                    'insight_realizations'
                  )
                }
                className={`p-1 rounded-md transition-colors cursor-pointer ${
                  activeSpeakingId === 'insight_realizations'
                    ? 'text-amber-400 bg-amber-500/20'
                    : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800'
                }`}
                title={activeSpeakingId === 'insight_realizations' ? 'Stop audio' : 'Hear key realizations'}
              >
                {activeSpeakingId === 'insight_realizations' ? (
                  <VolumeX className="w-3.5 h-3.5 animate-pulse text-amber-400" />
                ) : (
                  <Volume2 className="w-3.5 h-3.5" />
                )}
              </button>

              <button
                type="button"
                onClick={() => handleCopy(insights.takeaways.join('\n'), 'realizations')}
                className="p-1 rounded-md text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800 transition-colors cursor-pointer"
                title="Copy all realizations"
              >
                {copiedSection === 'realizations' ? (
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
              </button>
            </div>
          </div>
          <ul className="space-y-1.5">
            {insights.takeaways.map((takeaway, idx) => (
              <li
                key={idx}
                className="flex items-start justify-between text-xs p-2.5 rounded-xl border group"
                style={{
                  backgroundColor: 'var(--color-surface-elevated)',
                  borderColor: 'var(--color-border)',
                  color: 'var(--color-text)',
                }}
              >
                <div className="flex items-start space-x-2 flex-1">
                  <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                  <span>{takeaway}</span>
                </div>
                <div className="flex items-center space-x-1 opacity-80 group-hover:opacity-100 ml-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => speak(takeaway, `t_${idx}`)}
                    className="p-0.5 transition-colors cursor-pointer"
                    style={{ color: activeSpeakingId === `t_${idx}` ? 'var(--color-accent-text)' : 'var(--color-text-muted)' }}
                    title="Hear this realization"
                  >
                    {activeSpeakingId === `t_${idx}` ? (
                      <VolumeX className="w-3 h-3 animate-pulse" style={{ color: 'var(--color-accent)' }} />
                    ) : (
                      <Volume2 className="w-3 h-3" />
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleCopy(takeaway, `t_${idx}`)}
                    className="p-0.5 transition-colors cursor-pointer"
                    style={{ color: 'var(--color-text-muted)' }}
                    title="Copy this realization"
                  >
                    {copiedSection === `t_${idx}` ? (
                      <Check className="w-3 h-3 text-emerald-500" />
                    ) : (
                      <Copy className="w-3 h-3" />
                    )}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* 3. Encouraging Affirmation */}
      {insights.encouragement && (
        <div
          className="p-3 rounded-xl border flex items-center justify-between text-xs font-medium italic"
          style={{
            backgroundColor: 'var(--color-accent-subtle)',
            borderColor: 'var(--color-border)',
            color: 'var(--color-accent-text)',
          }}
        >
          <div className="flex items-center space-x-2">
            <Compass className="w-4 h-4 shrink-0" style={{ color: 'var(--color-accent)' }} />
            <span className="leading-relaxed">{insights.encouragement}</span>
          </div>
          <div className="flex items-center space-x-1 ml-2 shrink-0">
            <button
              type="button"
              onClick={() => speak(insights.encouragement!, 'insight_encouragement')}
              className="p-1 transition-colors cursor-pointer"
              style={{ color: activeSpeakingId === 'insight_encouragement' ? 'var(--color-accent-text)' : 'var(--color-text-muted)' }}
              title="Hear encouragement"
            >
              {activeSpeakingId === 'insight_encouragement' ? (
                <VolumeX className="w-3.5 h-3.5 animate-pulse" style={{ color: 'var(--color-accent)' }} />
              ) : (
                <Volume2 className="w-3.5 h-3.5" />
              )}
            </button>
            <button
              type="button"
              onClick={() => handleCopy(insights.encouragement!, 'encouragement')}
              className="p-1 transition-colors cursor-pointer"
              style={{ color: 'var(--color-text-muted)' }}
              title="Copy encouragement"
            >
              {copiedSection === 'encouragement' ? (
                <Check className="w-3.5 h-3.5 text-emerald-500" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
            </button>
          </div>
        </div>
      )}

      {/* 4. Questions for Next Reflection */}
      {insights.followUpQuestions && insights.followUpQuestions.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center space-x-1.5 text-xs font-semibold" style={{ color: 'var(--color-text)' }}>
              <HelpCircle className="w-3.5 h-3.5 text-blue-500 dark:text-blue-400" />
              <span>Questions for Next Reflection</span>
            </div>

            <div className="flex items-center space-x-1">
              {/* Hear Questions */}
              <button
                type="button"
                onClick={() =>
                  speak(
                    `Questions for next reflection: ${insights.followUpQuestions.join('. ')}`,
                    'insight_questions'
                  )
                }
                className="p-1 rounded-md transition-colors cursor-pointer"
                style={{ color: activeSpeakingId === 'insight_questions' ? 'var(--color-accent-text)' : 'var(--color-text-muted)' }}
                title={activeSpeakingId === 'insight_questions' ? 'Stop audio' : 'Hear questions aloud'}
              >
                {activeSpeakingId === 'insight_questions' ? (
                  <VolumeX className="w-3.5 h-3.5 animate-pulse" style={{ color: 'var(--color-accent)' }} />
                ) : (
                  <Volume2 className="w-3.5 h-3.5" />
                )}
              </button>

              {/* Copy Questions */}
              <button
                type="button"
                onClick={() => handleCopy(insights.followUpQuestions.join('\n'), 'questions')}
                className="p-1 rounded-md transition-colors cursor-pointer"
                style={{ color: 'var(--color-text-muted)' }}
                title="Copy all questions"
              >
                {copiedSection === 'questions' ? (
                  <Check className="w-3.5 h-3.5 text-emerald-500" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
              </button>
            </div>
          </div>
          <ul className="space-y-1.5">
            {insights.followUpQuestions.map((q, idx) => (
              <li
                key={idx}
                className="text-xs italic p-2.5 rounded-xl border flex items-start justify-between group"
                style={{
                  backgroundColor: 'var(--color-surface-elevated)',
                  borderColor: 'var(--color-border)',
                  color: 'var(--color-text)',
                }}
              >
                <span className="flex-1">"{q}"</span>
                <div className="flex items-center space-x-1 opacity-80 group-hover:opacity-100 ml-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => speak(q, `q_${idx}`)}
                    className="p-0.5 transition-colors cursor-pointer"
                    style={{ color: activeSpeakingId === `q_${idx}` ? 'var(--color-accent-text)' : 'var(--color-text-muted)' }}
                    title="Hear this question"
                  >
                    {activeSpeakingId === `q_${idx}` ? (
                      <VolumeX className="w-3 h-3 animate-pulse" style={{ color: 'var(--color-accent)' }} />
                    ) : (
                      <Volume2 className="w-3 h-3" />
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleCopy(q, `q_${idx}`)}
                    className="p-0.5 transition-colors cursor-pointer"
                    style={{ color: 'var(--color-text-muted)' }}
                    title="Copy this question"
                  >
                    {copiedSection === `q_${idx}` ? (
                      <Check className="w-3 h-3 text-emerald-500" />
                    ) : (
                      <Copy className="w-3 h-3" />
                    )}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* 5. Emotional Energy & Key Themes */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div
          className="p-3 rounded-xl border"
          style={{
            backgroundColor: 'var(--color-surface-elevated)',
            borderColor: 'var(--color-border)',
          }}
        >
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center space-x-1.5 text-xs font-semibold" style={{ color: 'var(--color-text)' }}>
              <Heart className="w-3.5 h-3.5 text-rose-500 dark:text-rose-400" />
              <span>Emotional Energy</span>
            </div>
            <button
              type="button"
              onClick={() => speak(`Emotional energy: ${insights.emotionalTone}`, 'insight_emotion')}
              className="p-0.5 transition-colors cursor-pointer"
              style={{ color: activeSpeakingId === 'insight_emotion' ? 'var(--color-accent-text)' : 'var(--color-text-muted)' }}
              title="Hear emotional tone"
            >
              {activeSpeakingId === 'insight_emotion' ? (
                <VolumeX className="w-3 h-3 animate-pulse" style={{ color: 'var(--color-accent)' }} />
              ) : (
                <Volume2 className="w-3 h-3" />
              )}
            </button>
          </div>
          <p className="text-xs font-semibold" style={{ color: 'var(--color-text)' }}>{insights.emotionalTone}</p>
        </div>

        <div
          className="p-3 rounded-xl border"
          style={{
            backgroundColor: 'var(--color-surface-elevated)',
            borderColor: 'var(--color-border)',
          }}
        >
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center space-x-1.5 text-xs font-semibold" style={{ color: 'var(--color-text)' }}>
              <Tag className="w-3.5 h-3.5" style={{ color: 'var(--color-accent)' }} />
              <span>Key Themes</span>
            </div>
            <button
              type="button"
              onClick={() =>
                speak(`Key themes: ${insights.keyThemes?.join(', ')}`, 'insight_themes')
              }
              className="p-0.5 transition-colors cursor-pointer"
              style={{ color: activeSpeakingId === 'insight_themes' ? 'var(--color-accent-text)' : 'var(--color-text-muted)' }}
              title="Hear key themes"
            >
              {activeSpeakingId === 'insight_themes' ? (
                <VolumeX className="w-3 h-3 animate-pulse" style={{ color: 'var(--color-accent)' }} />
              ) : (
                <Volume2 className="w-3 h-3" />
              )}
            </button>
          </div>
          <div className="flex flex-wrap gap-1">
            {insights.keyThemes?.map((theme, idx) => (
              <span
                key={idx}
                className="text-[11px] px-2 py-0.5 rounded-md font-medium border"
                style={{
                  backgroundColor: 'var(--color-surface)',
                  borderColor: 'var(--color-border)',
                  color: 'var(--color-text)',
                }}
              >
                {theme}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
