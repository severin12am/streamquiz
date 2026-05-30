'use client';
// ============================================================
// useSpeechRecognition — Browser Web Speech API wrapper
//
// Listens to the microphone and returns a live transcript.
// Currently using the browser's built-in recognition (Chrome).
//
// TO SWITCH TO OPENAI WHISPER:
//   Replace this hook's internals with:
//   1. Record audio with MediaRecorder
//   2. Send audio blobs to /api/transcribe (an API route you add)
//   3. That route calls openai.audio.transcriptions.create(...)
//   4. Push transcript back via a prop callback or Supabase update
//   The rest of the app doesn't need to change — it just reads
//   the `transcript` string from this hook.
//
// BROWSER SUPPORT:
//   Chrome / Edge: works great
//   Firefox: NOT supported (SpeechRecognition not implemented)
//   Safari: partial support, may require webkit prefix
// ============================================================

import { useEffect, useRef, useState, useCallback } from 'react';
// Type declarations for the Web Speech API live in lib/speech-recognition.d.ts

export interface UseSpeechRecognitionReturn {
  transcript:    string;      // live transcript text
  isListening:   boolean;     // true when microphone is active
  isSupported:   boolean;     // false on Firefox
  startListening: () => void;
  stopListening:  () => void;
  resetTranscript: () => void;
}

export function useSpeechRecognition(
  onTranscriptUpdate?: (text: string) => void,
  lang = 'en-US'  // BCP-47 tag, e.g. 'ru-RU' for Russian
): UseSpeechRecognitionReturn {

  const [transcript,  setTranscript]  = useState('');
  const [isListening, setIsListening] = useState(false);

  const recognitionRef = useRef<SpeechRecognition | null>(null);

  // Check once on mount whether the browser supports Speech API
  const isSupported =
    typeof window !== 'undefined' &&
    !!(window.SpeechRecognition || window.webkitSpeechRecognition);

  // -------------------------------------------------------
  // Create the recognition instance
  // -------------------------------------------------------
  useEffect(() => {
    if (!isSupported) return;

    const SpeechRecognitionAPI =
      window.SpeechRecognition || window.webkitSpeechRecognition!;

    const recognition = new SpeechRecognitionAPI();

    // continuous: keeps listening instead of stopping after first phrase
    recognition.continuous    = true;
    // interimResults: gives partial results as the user speaks
    recognition.interimResults = true;
    recognition.lang           = lang;

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let fullTranscript = '';
      for (let i = 0; i < event.results.length; i++) {
        fullTranscript += event.results[i][0].transcript;
      }
      setTranscript(fullTranscript);
      onTranscriptUpdate?.(fullTranscript);
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      // 'no-speech' is common and not a real error — suppress it
      if (event.error !== 'no-speech') {
        console.error('[SpeechRecognition] error:', event.error);
      }
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = recognition;

    return () => {
      recognition.abort();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSupported, lang]);

  const startListening = useCallback(() => {
    if (!recognitionRef.current || isListening) return;
    try {
      // Clear last round's words so the new answer starts blank.
      setTranscript('');
      recognitionRef.current.start();
      setIsListening(true);
    } catch {
      // Can throw if already started — safe to ignore
    }
  }, [isListening]);

  const stopListening = useCallback(() => {
    if (!recognitionRef.current) return;
    recognitionRef.current.stop();
    setIsListening(false);
  }, []);

  const resetTranscript = useCallback(() => {
    setTranscript('');
  }, []);

  return {
    transcript,
    isListening,
    isSupported,
    startListening,
    stopListening,
    resetTranscript,
  };
}
