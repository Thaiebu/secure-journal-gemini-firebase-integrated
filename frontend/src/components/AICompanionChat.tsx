import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { ChatMessage, ReflectionMode } from '../types';
import {
  Sparkles,
  Send,
  Copy,
  Check,
  Bot,
  User,
  RefreshCw,
  Compass,
  Lightbulb,
  CheckCircle,
  Flame,
  Volume2,
  VolumeX,
  Mic,
  MicOff,
  Radio,
  Square,
} from 'lucide-react';
import { useSpeech, useVoiceToText } from '../hooks/useSpeech';

interface AICompanionChatProps {
  messages: ChatMessage[];
  onSendMessage: (content: string, mode: ReflectionMode) => Promise<void>;
  onStopGenerating?: () => void;
  isLoading: boolean;
  journalContent: string;
  reflectionMode: ReflectionMode;
  onSelectMode: (mode: ReflectionMode) => void;
}

export const AICompanionChat: React.FC<AICompanionChatProps> = ({
  messages,
  onSendMessage,
  onStopGenerating,
  isLoading,
  journalContent,
  reflectionMode,
  onSelectMode,
}) => {
  const [input, setInput] = useState('');
  const inputRef = useRef('');
  inputRef.current = input;

  const [copiedId, setCopiedId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { activeSpeakingId, speak, stop } = useSpeech();

  const { isListening, interimText, toggleListening } = useVoiceToText({
    onTranscript: (transcript, isFinal) => {
      if (isFinal && transcript) {
        setInput((prev) => {
          const current = (inputRef.current || prev || '').trim();
          const appended = current ? `${current} ${transcript}` : transcript;
          inputRef.current = appended;
          return appended;
        });
      }
    },
    onError: (err) => {
      console.warn('[VoiceToText] Error:', err);
    },
  });

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const currentText = (input || inputRef.current || '').trim();
    if (!currentText || isLoading) return;
    setInput('');
    inputRef.current = '';
    await onSendMessage(currentText, reflectionMode);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const quickPrompts = [
    { label: 'Reflect Deeper', text: 'Help me reflect deeper on what I wrote and what it reveals about my priorities.', mode: 'reflective' as ReflectionMode, icon: Compass },
    { label: 'Brainstorm Ideas', text: 'Brainstorm 3 creative solutions or alternative perspectives on my situation.', mode: 'brainstorm' as ReflectionMode, icon: Lightbulb },
    { label: 'Actionable Steps', text: 'Break down what I wrote into 2-3 manageable, gentle micro-actions for this week.', mode: 'actionable' as ReflectionMode, icon: CheckCircle },
  ];

  return (
    <div
      className="flex flex-col h-full rounded-2xl border shadow-xs overflow-hidden transition-colors"
      style={{
        backgroundColor: 'var(--color-surface)',
        borderColor: 'var(--color-border)',
      }}
    >
      {/* Header */}
      <div
        className="p-3.5 sm:p-4 border-b flex flex-wrap items-center justify-between gap-2 transition-colors"
        style={{
          backgroundColor: 'var(--color-surface-elevated)',
          borderColor: 'var(--color-border)',
        }}
      >
        <div className="flex items-center space-x-2">
          <div className="w-7 h-7 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-500 flex items-center justify-center">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h3
              className="text-xs sm:text-sm font-bold"
              style={{ color: 'var(--color-text)' }}
            >
              Gemini AI Thought Partner
            </h3>
            <p className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>
              Multi-turn conversational reflections
            </p>
          </div>
        </div>

        {/* Reflection Mode Chips */}
        <div
          className="flex items-center gap-1 p-1 rounded-lg text-[11px] border"
          style={{
            backgroundColor: 'var(--color-surface)',
            borderColor: 'var(--color-border)',
          }}
        >
          {(['reflective', 'brainstorm', 'actionable'] as const).map((mode) => {
            const isActive = reflectionMode === mode;
            return (
              <button
                key={mode}
                type="button"
                onClick={() => onSelectMode(mode)}
                className={`px-2 py-0.5 rounded-md font-medium transition-all cursor-pointer capitalize border ${
                  isActive ? 'font-semibold shadow-xs' : 'hover:opacity-80'
                }`}
                style={{
                  backgroundColor: isActive ? 'var(--color-surface-elevated)' : 'transparent',
                  color: isActive ? 'var(--color-accent-text)' : 'var(--color-text-muted)',
                  borderColor: isActive ? 'var(--color-border)' : 'transparent',
                }}
              >
                {mode}
              </button>
            );
          })}
        </div>
      </div>

      {/* Messages List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-[260px] max-h-[480px]">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-500 flex items-center justify-center">
              <Bot className="w-6 h-6" />
            </div>
            <div className="max-w-xs">
              <p className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>
                Start a conversation about your entry
              </p>
              <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>
                Ask questions, explore underlying thoughts, or click a quick reflection below.
              </p>
            </div>

            {/* Quick Inspiration Chips */}
            <div className="w-full pt-2 flex flex-col gap-1.5">
              {quickPrompts.map((qp, idx) => {
                const Icon = qp.icon;
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      onSelectMode(qp.mode);
                      onSendMessage(qp.text, qp.mode);
                    }}
                    className="flex items-center space-x-2 text-left p-2 rounded-xl transition-colors text-xs cursor-pointer border hover:border-amber-500/50"
                    style={{
                      backgroundColor: 'var(--color-surface-elevated)',
                      borderColor: 'var(--color-border)',
                      color: 'var(--color-text)',
                    }}
                  >
                    <Icon className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                    <span className="font-semibold" style={{ color: 'var(--color-text)' }}>{qp.label}:</span>
                    <span className="truncate" style={{ color: 'var(--color-text-muted)' }}>{qp.text}</span>
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
          messages.map((msg) => {
            const isUser = msg.role === 'user';
            return (
              <div
                key={msg.id}
                className={`flex items-start space-x-2.5 ${
                  isUser ? 'flex-row-reverse space-x-reverse' : 'flex-row'
                }`}
              >
                <div
                  className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 text-xs border"
                  style={
                    isUser
                      ? {
                          backgroundColor: 'var(--color-surface-elevated)',
                          borderColor: 'var(--color-border)',
                          color: 'var(--color-text)',
                        }
                      : {
                          backgroundColor: 'var(--color-accent-subtle)',
                          borderColor: 'var(--color-accent)',
                          color: 'var(--color-accent-text)',
                        }
                  }
                >
                  {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                </div>

                <div
                  className={`relative max-w-[85%] rounded-2xl px-4 py-3 text-xs sm:text-sm border ${
                    isUser
                      ? 'bg-amber-500 text-neutral-950 font-medium rounded-tr-xs shadow-xs border-amber-600/30'
                      : 'rounded-tl-xs shadow-2xs transition-colors'
                  }`}
                  style={
                    !isUser
                      ? {
                          backgroundColor: 'var(--color-surface-elevated)',
                          borderColor: 'var(--color-border)',
                          color: 'var(--color-text)',
                        }
                      : undefined
                  }
                >
                  {isUser ? (
                    <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                  ) : (
                    <div
                      className="chat-markdown-content text-xs sm:text-sm leading-relaxed"
                      style={{ color: 'var(--color-text)' }}
                    >
                      <ReactMarkdown>{msg.content}</ReactMarkdown>
                    </div>
                  )}

                  {/* Actions & Timestamp */}
                  <div
                    className="mt-1.5 flex items-center justify-between text-[10px]"
                    style={{
                      color: isUser ? 'rgba(23, 23, 23, 0.75)' : 'var(--color-text-muted)',
                    }}
                  >
                    <span>
                      {new Date(msg.timestamp).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>

                    <div className="flex items-center space-x-1 ml-2">
                      {/* Hear Button */}
                      <button
                        type="button"
                        onClick={() => speak(msg.content, msg.id)}
                        className="p-1 rounded-md transition-colors cursor-pointer"
                        style={{
                          color:
                            activeSpeakingId === msg.id
                              ? 'var(--color-accent)'
                              : isUser
                              ? '#171717'
                              : 'var(--color-text-muted)',
                          backgroundColor:
                            activeSpeakingId === msg.id ? 'var(--color-accent-subtle)' : 'transparent',
                        }}
                        title={activeSpeakingId === msg.id ? 'Stop audio' : 'Hear message aloud'}
                      >
                        {activeSpeakingId === msg.id ? (
                          <VolumeX className="w-3.5 h-3.5 animate-pulse text-amber-500" />
                        ) : (
                          <Volume2 className="w-3.5 h-3.5" />
                        )}
                      </button>

                      {/* Copy Button */}
                      <button
                        type="button"
                        onClick={() => copyToClipboard(msg.content, msg.id)}
                        className="p-1 rounded-md transition-colors cursor-pointer"
                        style={{
                          color:
                            copiedId === msg.id
                              ? '#10b981'
                              : isUser
                              ? '#171717'
                              : 'var(--color-text-muted)',
                        }}
                        title="Copy text"
                      >
                        {copiedId === msg.id ? (
                          <Check className="w-3.5 h-3.5 text-emerald-500" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}

        {isLoading && (
          <div className="flex items-start space-x-2.5">
            <div className="w-7 h-7 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/30 flex items-center justify-center text-xs shrink-0">
              <Sparkles className="w-4 h-4 animate-spin text-amber-400" />
            </div>
            <div
              className="flex-1 rounded-2xl rounded-tl-xs p-3 text-xs flex flex-wrap items-center justify-between gap-2 shadow-2xs border"
              style={{
                backgroundColor: 'var(--color-surface-elevated)',
                borderColor: 'var(--color-border)',
                color: 'var(--color-text)',
              }}
            >
              <div className="flex items-center space-x-2">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 rounded-full bg-amber-500 animate-bounce" />
                  <div className="w-2 h-2 rounded-full bg-amber-500 animate-bounce [animation-delay:0.2s]" />
                  <div className="w-2 h-2 rounded-full bg-amber-500 animate-bounce [animation-delay:0.4s]" />
                </div>
                <span className="text-[11px]" style={{ color: 'var(--color-text-muted)' }}>Gemini 3.6 Flash reflecting...</span>
              </div>

              {onStopGenerating && (
                <button
                  id="btn-stop-generating-banner"
                  type="button"
                  onClick={onStopGenerating}
                  className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 text-rose-300 text-[11px] font-semibold transition-all cursor-pointer"
                  title="Stop generation"
                >
                  <Square className="w-3 h-3 fill-rose-400 text-rose-400" />
                  <span>Stop</span>
                </button>
              )}
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area with Voice-to-Text Dictation */}
      <form
        onSubmit={handleSubmit}
        className="p-3 border-t space-y-2 transition-colors"
        style={{
          backgroundColor: 'var(--color-surface)',
          borderColor: 'var(--color-border)',
        }}
      >
        {isListening && (
          <div className="flex items-center justify-between px-3 py-1.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-xs text-rose-400 animate-pulse">
            <div className="flex items-center space-x-2">
              <span className="w-2 h-2 rounded-full bg-rose-400 animate-ping" />
              <span className="font-semibold">Listening... Speak now</span>
              {interimText && <span className="italic font-normal opacity-80">"{interimText}"</span>}
            </div>
            <button
              type="button"
              onClick={toggleListening}
              className="text-[11px] font-bold text-rose-500 hover:underline cursor-pointer"
            >
              Done Speaking
            </button>
          </div>
        )}

        <div className="relative flex items-center">
          <textarea
            id="chat-input-textarea"
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              inputRef.current = e.target.value;
            }}
            onKeyDown={handleKeyDown}
            placeholder={
              isListening
                ? 'Listening to your voice... Pauses will append naturally.'
                : 'Type or use Voice-to-Text to reflect (Shift+Enter for new line)...'
            }
            rows={2}
            className="w-full resize-none border rounded-xl px-3.5 py-2.5 pr-20 text-xs sm:text-sm placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500/60 transition-colors"
            style={{
              backgroundColor: 'var(--color-surface-elevated)',
              borderColor: 'var(--color-border)',
              color: 'var(--color-text)',
            }}
          />

          <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center space-x-1">
            {/* Voice-to-Text Button */}
            <button
              id="btn-chat-mic"
              type="button"
              onClick={toggleListening}
              className={`p-2 rounded-lg transition-all cursor-pointer border ${
                isListening
                  ? 'bg-rose-500 text-white shadow-md animate-pulse border-rose-600'
                  : 'hover:opacity-80'
              }`}
              style={
                !isListening
                  ? {
                      backgroundColor: 'var(--color-surface)',
                      borderColor: 'var(--color-border)',
                      color: 'var(--color-text)',
                    }
                  : undefined
              }
              title={isListening ? 'Stop Voice-to-Text' : 'Voice-to-Text (Speak instead of typing)'}
            >
              {isListening ? <MicOff className="w-4 h-4 text-white" /> : <Mic className="w-4 h-4" />}
            </button>

            {/* Send or Stop Button */}
            {isLoading ? (
              <button
                id="btn-stop-chat"
                type="button"
                onClick={onStopGenerating}
                className="p-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white transition-all cursor-pointer font-bold animate-pulse shadow-sm"
                title="Stop Generating (Cancel)"
              >
                <Square className="w-4 h-4 fill-white text-white" />
              </button>
            ) : (
              <button
                id="btn-send-chat"
                type="submit"
                disabled={!input.trim()}
                className="p-2 rounded-lg bg-amber-500 text-neutral-950 hover:bg-amber-400 disabled:opacity-40 transition-all cursor-pointer font-bold"
                title="Send Message"
              >
                <Send className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </form>
    </div>
  );
};
