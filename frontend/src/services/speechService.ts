/**
 * Speech Synthesis (Text-to-Speech) and Speech Recognition (Voice-to-Text) Service
 */

// Helper to strip markdown formatting before speaking aloud
export function cleanMarkdownForSpeech(text: string): string {
  if (!text) return '';
  return text
    .replace(/[#*`_~>[\]()]/g, ' ')
    .replace(/!\[.*?\]\(.*?\)/g, '')
    .replace(/\[(.*?)\]\(.*?\)/g, '$1')
    .replace(/```[\s\S]*?```/g, 'Code snippet omitted.')
    .replace(/\s+/g, ' ')
    .trim();
}

// Global speaking state listeners
type SpeakingListener = (speakingId: string | null, isSpeaking: boolean) => void;
const speakingListeners = new Set<SpeakingListener>();
let currentSpeakingId: string | null = null;

function notifySpeakingListeners(speakingId: string | null, isSpeaking: boolean) {
  currentSpeakingId = isSpeaking ? speakingId : null;
  speakingListeners.forEach((fn) => fn(currentSpeakingId, isSpeaking));
}

export function subscribeToSpeakingState(listener: SpeakingListener): () => void {
  speakingListeners.add(listener);
  listener(currentSpeakingId, currentSpeakingId !== null);
  return () => {
    speakingListeners.delete(listener);
  };
}

/**
 * Text-to-Speech playback using standard Web Speech API
 */
export function speakText(
  text: string,
  id: string = 'global',
  onEnd?: () => void
): boolean {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    console.warn('[Speech] Web SpeechSynthesis API is not supported in this environment.');
    return false;
  }

  // If already speaking the same text/id, toggle off (stop)
  if (window.speechSynthesis.speaking && currentSpeakingId === id) {
    stopSpeaking();
    return false;
  }

  // Cancel any ongoing speech
  stopSpeaking();

  const cleaned = cleanMarkdownForSpeech(text);
  if (!cleaned) return false;

  const utterance = new SpeechSynthesisUtterance(cleaned);
  utterance.rate = 0.95; // Slightly calmer, mindful pace
  utterance.pitch = 1.0;

  // Prefer natural English voices if available
  const voices = window.speechSynthesis.getVoices();
  const naturalVoice = voices.find(
    (v) => (v.lang.startsWith('en') && (v.name.includes('Natural') || v.name.includes('Google') || v.name.includes('Samantha') || v.name.includes('Premium')))
  ) || voices.find((v) => v.lang.startsWith('en'));

  if (naturalVoice) {
    utterance.voice = naturalVoice;
  }

  utterance.onstart = () => {
    notifySpeakingListeners(id, true);
  };

  utterance.onend = () => {
    notifySpeakingListeners(null, false);
    if (onEnd) onEnd();
  };

  utterance.onerror = (e) => {
    console.warn('[Speech] Playback notice or cancelled:', e);
    notifySpeakingListeners(null, false);
    if (onEnd) onEnd();
  };

  window.speechSynthesis.speak(utterance);
  return true;
}

export function stopSpeaking(): void {
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    window.speechSynthesis.cancel();
  }
  notifySpeakingListeners(null, false);
}

export function isSpeechSupported(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window;
}

/**
 * Speech-to-Text Recognition Compatibility
 */
export function isSpeechRecognitionSupported(): boolean {
  if (typeof window === 'undefined') return false;
  const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
  return !!SpeechRec;
}

export interface VoiceRecognitionSession {
  stop: () => void;
}

/**
 * Starts Speech Recognition for voice dictation
 */
export function startSpeechToText(options: {
  onResult: (transcript: string, isFinal: boolean) => void;
  onError: (error: string) => void;
  onEnd: () => void;
  continuous?: boolean;
}): VoiceRecognitionSession | null {
  if (typeof window === 'undefined') return null;

  const SpeechRecognitionConstructor =
    (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

  if (!SpeechRecognitionConstructor) {
    options.onError('Speech recognition is not supported in this browser. Please use Chrome, Edge, or Safari.');
    return null;
  }

  try {
    const recognition = new SpeechRecognitionConstructor();
    recognition.continuous = options.continuous !== false;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    let lastFinalIndex = 0;

    recognition.onresult = (event: any) => {
      let newFinalTranscript = '';
      let interimTranscript = '';

      for (let i = 0; i < event.results.length; ++i) {
        const result = event.results[i];
        if (result.isFinal) {
          if (i >= lastFinalIndex) {
            newFinalTranscript += result[0].transcript + ' ';
            lastFinalIndex = i + 1;
          }
        } else {
          interimTranscript += result[0].transcript + ' ';
        }
      }

      if (newFinalTranscript.trim()) {
        options.onResult(newFinalTranscript.trim(), true);
      }
      if (interimTranscript.trim()) {
        options.onResult(interimTranscript.trim(), false);
      }
    };

    recognition.onerror = (event: any) => {
      console.warn('[SpeechRecognition] Notice:', event.error);
      if (event.error === 'not-allowed') {
        options.onError('Microphone access was denied. Please allow microphone permissions in your browser.');
      } else if (event.error === 'no-speech') {
        // Normal silence timeout
      } else {
        options.onError(`Speech recognition notice: ${event.error}`);
      }
    };

    recognition.onend = () => {
      options.onEnd();
    };

    recognition.start();

    return {
      stop: () => {
        try {
          recognition.stop();
        } catch {
          // ignore
        }
      },
    };
  } catch (err: any) {
    options.onError(err.message || 'Could not start voice recognition.');
    return null;
  }
}
