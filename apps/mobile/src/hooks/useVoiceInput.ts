import { useState, useCallback } from 'react';
import {
  ExpoSpeechRecognitionModule,
  useSpeechRecognitionEvent,
} from 'expo-speech-recognition';

interface UseVoiceInputReturn {
  transcript: string;
  isListening: boolean;
  error: string | null;
  startListening: () => Promise<void>;
  stopListening: () => Promise<void>;
}

export function useVoiceInput(): UseVoiceInputReturn {
  const [transcript, setTranscript] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useSpeechRecognitionEvent('start', () => {
    setIsListening(true);
  });

  useSpeechRecognitionEvent('end', () => {
    setIsListening(false);
  });

  useSpeechRecognitionEvent('result', (event) => {
    if (event.results && event.results.length > 0) {
      setTranscript(event.results[0].transcript);
    }
  });

  useSpeechRecognitionEvent('error', (event) => {
    setError(event.message || 'Speech recognition error');
    setIsListening(false);
  });

  const startListening = useCallback(async () => {
    setError(null);
    setTranscript('');
    try {
      const { granted } =
        await ExpoSpeechRecognitionModule.requestPermissionsAsync();
      if (!granted) {
        setError('Microphone permission not granted');
        return;
      }
      ExpoSpeechRecognitionModule.start({
        lang: 'en-US',
        interimResults: true,
      });
    } catch (e: any) {
      setError(e.message ?? 'Failed to start voice recognition');
    }
  }, []);

  const stopListening = useCallback(async () => {
    try {
      ExpoSpeechRecognitionModule.stop();
    } catch (e: any) {
      setError(e.message ?? 'Failed to stop voice recognition');
    }
  }, []);

  return { transcript, isListening, error, startListening, stopListening };
}
