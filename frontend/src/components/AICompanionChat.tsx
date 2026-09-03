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
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { activeSpeakingId, speak, stop } = useSpeech();

  const { isListening, interimText, toggleListening } = useVoiceToText({
    onTranscript: (transcript, isFinal) => {
      setInput((prev) => {
        const cleanedPrev = prev.trim();
        if (isFinal) {
          return cleanedPrev ? `${cleanedPrev} ${transcript}` : transcript;
        }
        return prev;
      });
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
    if (!input.trim() || isLoading) return;
    const text = input.trim();
    setInput('');
    await onSendMessage(text, reflectionMode);
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
    <div className="flex flex-col h-full bg-[#141414] rounded-2xl border border-neutral-800 shadow-xs overflow-hidden">
      {/* Header */}
      <div className="p-3.5 sm:p-4 bg-[#111111] border-b border-neutral-800 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center space-x-2">
          <div className="w-7 h-7 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs sm:text-sm font-bold text-neutral-100">
              Gemini AI Thought Partner
            </h3>
            <p className="text-[10px] text-neutral-400">
              Multi-turn conversational reflections
            </p>
          </div>
        </div>

        {/* Reflection Mode Chips */}
        <div className="flex items-center gap-1 bg-neutral-900 border border-neutral-800 p-1 rounded-lg text-[11px]">
          <button
            type="button"
            onClick={() => onSelectMode('reflective')}
            className={`px-2 py-0.5 rounded-md font-medium transition-all cursor-pointer ${
              reflectionMode === 'reflective'
                ? 'bg-neutral-800 text-amber-300 shadow-xs font-semibold'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            Reflective
          </button>
          <button
            type="button"
            onClick={() => onSelectMode('brainstorm')}
            className={`px-2 py-0.5 rounded-md font-medium transition-all cursor-pointer ${
              reflectionMode === 'brainstorm'
                ? 'bg-neutral-800 text-amber-300 shadow-xs font-semibold'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            Brainstorm
          </button>
          <button
            type="button"
            onClick={() => onSelectMode('actionable')}
            className={`px-2 py-0.5 rounded-md font-medium transition-all cursor-pointer ${
              reflectionMode === 'actionable'
                ? 'bg-neutral-800 text-amber-300 shadow-xs font-semibold'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            Actionable
          </button>
        </div>
      </div>

      {/* Messages List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-[260px] max-h-[480px]">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 text-neutral-400 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center">
              <Bot className="w-6 h-6" />
            </div>
            <div className="max-w-xs">
              <p className="text-sm font-semibold text-neutral-100">
                Start a conversation about your entry
              </p>
              <p className="text-xs text-neutral-400 mt-1">
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
                    className="flex items-center space-x-2 text-left p-2 rounded-xl bg-[#1c1c1c] hover:bg-[#242424] border border-neutral-800 hover:border-amber-500/40 transition-colors text-xs text-neutral-300 cursor-pointer"
                  >
                    <Icon className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    <span className="font-semibold text-neutral-100">{qp.label}:</span>
                    <span className="truncate text-neutral-400">{qp.text}</span>
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
                  className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 text-xs ${
                    isUser
                      ? 'bg-neutral-800 text-neutral-100 border border-neutral-700'
                      : 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                  }`}
                >
                  {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                </div>

                <div
                  className={`relative max-w-[85%] rounded-2xl px-4 py-3 text-xs sm:text-sm ${
                    isUser
                      ? 'bg-amber-500 text-neutral-950 font-medium rounded-tr-xs shadow-xs'
                      : 'bg-[#1c1c1c] border border-neutral-800 text-neutral-200 rounded-tl-xs shadow-2xs'
                  }`}
                >
                  {isUser ? (
                    <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                  ) : (
                    <div className="prose prose-invert prose-xs max-w-none leading-relaxed text-neutral-200">
                      <ReactMarkdown>{msg.content}</ReactMarkdown>
                    </div>
                  )}

                  {/* Actions & Timestamp */}
                  <div
                    className={`mt-1.5 flex items-center justify-between text-[10px] ${
                      isUser ? 'text-neutral-800/80 font-medium' : 'text-neutral-500'
                    }`}
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
                        className={`p-1 rounded-md transition-colors cursor-pointer ${
                          activeSpeakingId === msg.id
                            ? 'text-amber-400 bg-amber-500/20'
                            : isUser
                            ? 'text-neutral-900 hover:text-neutral-950'
                            : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800'
                        }`}
                        title={activeSpeakingId === msg.id ? 'Stop audio' : 'Hear message aloud'}
                      >
                        {activeSpeakingId === msg.id ? (
                          <VolumeX className="w-3.5 h-3.5 animate-pulse text-amber-400" />
                        ) : (
                          <Volume2 className="w-3.5 h-3.5" />
                        )}
                      </button>

                      {/* Copy Button */}
                      <button
                        type="button"
                        onClick={() => copyToClipboard(msg.content, msg.id)}
                        className={`p-1 rounded-md transition-colors cursor-pointer ${
                          isUser
                            ? 'text-neutral-900 hover:text-neutral-950'
                            : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800'
                        }`}
                        title="Copy text"
                      >
                        {copiedId === msg.id ? (
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
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
            <div className="flex-1 bg-[#1c1c1c] border border-neutral-800 rounded-2xl rounded-tl-xs p-3 text-xs text-neutral-300 flex flex-wrap items-center justify-between gap-2 shadow-2xs">
              <div className="flex items-center space-x-2">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 rounded-full bg-amber-400 animate-bounce" />
                  <div className="w-2 h-2 rounded-full bg-amber-400 animate-bounce [animation-delay:0.2s]" />
                  <div className="w-2 h-2 rounded-full bg-amber-400 animate-bounce [animation-delay:0.4s]" />
                </div>
                <span className="text-[11px] text-neutral-400">Gemini 3.6 Flash reflecting...</span>
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
      <form onSubmit={handleSubmit} className="p-3 bg-[#111111] border-t border-neutral-800 space-y-2">
        {isListening && (
          <div className="flex items-center justify-between px-3 py-1.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-xs text-rose-300 animate-pulse">
            <div className="flex items-center space-x-2">
              <span className="w-2 h-2 rounded-full bg-rose-400 animate-ping" />
              <span className="font-semibold">Listening... Speak now</span>
              {interimText && <span className="text-neutral-400 italic font-normal">"{interimText}"</span>}
            </div>
            <button
              type="button"
              onClick={toggleListening}
              className="text-[11px] font-bold text-rose-400 hover:text-rose-200 underline cursor-pointer"
            >
              Done Speaking
            </button>
          </div>
        )}

        <div className="relative flex items-center">
          <textarea
            id="chat-input-textarea"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              isListening
                ? 'Listening to your voice... (keep speaking)'
                : 'Type or use Voice-to-Text to reflect (Shift+Enter for new line)...'
            }
            rows={2}
            className="w-full resize-none bg-[#0d0d0d] border border-neutral-700/80 rounded-xl px-3.5 py-2.5 pr-20 text-xs sm:text-sm text-neutral-100 placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500/60"
          />

          <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center space-x-1">
            {/* Voice-to-Text Button */}
            <button
              id="btn-chat-mic"
              type="button"
              onClick={toggleListening}
              className={`p-2 rounded-lg transition-all cursor-pointer ${
                isListening
                  ? 'bg-rose-500 text-white shadow-md animate-pulse'
                  : 'bg-neutral-800 text-neutral-300 hover:text-amber-400 hover:bg-neutral-700'
              }`}
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
