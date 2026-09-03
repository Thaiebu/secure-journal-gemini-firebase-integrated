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

  const stopListening = useCallback(() => {
    if (sessionRef.current) {
      sessionRef.current.stop();
      sessionRef.current = null;
    }
    setIsListening(false);
    setInterimText('');
  }, []);

  const startListening = useCallback(() => {
    if (isListening) {
      stopListening();
      return;
    }

    setInterimText('');
    setIsListening(true);

    const session = startSpeechToText({
      onResult: (transcript, isFinal) => {
        if (isFinal) {
          onTranscript(transcript, true);
          setInterimText('');
        } else {
          setInterimText(transcript);
          onTranscript(transcript, false);
        }
      },
      onError: (err) => {
        setIsListening(false);
        setInterimText('');
        if (onError) onError(err);
      },
      onEnd: () => {
        setIsListening(false);
        setInterimText('');
      },
    });

    if (session) {
      sessionRef.current = session;
    } else {
      setIsListening(false);
    }
  }, [isListening, onTranscript, onError, stopListening]);

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
