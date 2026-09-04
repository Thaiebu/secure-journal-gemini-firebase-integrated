import { useState, useEffect, useCallback, useRef } from 'react';
import {
  speakText,
  stopSpeaking,
  subscribeToSpeakingState,
  startSpeechToText,
  isSpeechRecognitionSupported,
  isSpeechSupported,
  VoiceRecognitionSession,
} from '../services/speechService';

export function useSpeech() {
  const [activeSpeakingId, setActiveSpeakingId] = useState<string | null>(null);
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);

  useEffect(() => {
    const unsubscribe = subscribeToSpeakingState((id, speaking) => {
      setActiveSpeakingId(id);
      setIsSpeaking(speaking);
    });
    return () => unsubscribe();
  }, []);

  const handleSpeak = useCallback((text: string, id: string) => {
    speakText(text, id);
  }, []);

  const handleStop = useCallback(() => {
    stopSpeaking();
  }, []);

  return {
    activeSpeakingId,
    isSpeaking,
    speak: handleSpeak,
    stop: handleStop,
    isSupported: isSpeechSupported(),
  };
}

export function useVoiceToText({
  onTranscript,
  onError,
}: {
  onTranscript: (text: string, isFinal: boolean) => void;
  onError?: (err: string) => void;
}) {
  const [isListening, setIsListening] = useState<boolean>(false);
  const [interimText, setInterimText] = useState<string>('');
  const sessionRef = useRef<VoiceRecognitionSession | null>(null);

  const onTranscriptRef = useRef(onTranscript);
  onTranscriptRef.current = onTranscript;

  const onErrorRef = useRef(onError);
  onErrorRef.current = onError;

  const isListeningRef = useRef(false);
  const isExplicitStopRef = useRef(false);

  const stopListening = useCallback(() => {
    isExplicitStopRef.current = true;
    isListeningRef.current = false;
    if (sessionRef.current) {
      sessionRef.current.stop();
      sessionRef.current = null;
    }
    setIsListening(false);
    setInterimText('');
  }, []);

  const launchSession = useCallback(() => {
    const session = startSpeechToText({
      onResult: (transcript, isFinal) => {
        if (isFinal) {
          onTranscriptRef.current(transcript, true);
          setInterimText('');
        } else {
          setInterimText(transcript);
          onTranscriptRef.current(transcript, false);
        }
      },
      onError: (err) => {
        // Only terminate if explicit or critical error
        if (err.includes('not-allowed')) {
          isListeningRef.current = false;
          setIsListening(false);
          setInterimText('');
        }
        if (onErrorRef.current) onErrorRef.current(err);
      },
      onEnd: () => {
        // If the user did not explicitly stop and we are still in listening mode,
        // seamlessly resume the recognition session so natural pauses and gaps don't kill dictation
        if (!isExplicitStopRef.current && isListeningRef.current) {
          setTimeout(() => {
            if (!isExplicitStopRef.current && isListeningRef.current) {
              launchSession();
            }
          }, 150);
        } else {
          setIsListening(false);
          setInterimText('');
        }
      },
    });

    if (session) {
      sessionRef.current = session;
    } else {
      isListeningRef.current = false;
      setIsListening(false);
    }
  }, []);

  const startListening = useCallback(() => {
    if (isListeningRef.current) {
      stopListening();
      return;
    }

    isExplicitStopRef.current = false;
    isListeningRef.current = true;
    setInterimText('');
    setIsListening(true);

    launchSession();
  }, [stopListening, launchSession]);

  useEffect(() => {
    return () => {
      if (sessionRef.current) {
        sessionRef.current.stop();
      }
    };
  }, []);

  return {
    isListening,
    interimText,
    startListening,
    stopListening,
    toggleListening: isListening ? stopListening : startListening,
    isSupported: isSpeechRecognitionSupported(),
  };
}
