// ============================================================
// Browser Web Speech API type declarations
// These types are part of the DOM spec but not included in
// TypeScript's default lib.dom.d.ts as of TS 5.x.
// Reference: https://developer.mozilla.org/en-US/docs/Web/API/SpeechRecognition
// ============================================================

interface SpeechRecognitionResult {
  readonly isFinal: boolean;
  readonly length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionAlternative {
  readonly transcript: string;
  readonly confidence: number;
}

interface SpeechRecognitionResultList {
  readonly length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionEvent extends Event {
  readonly resultIndex: number;
  readonly results: SpeechRecognitionResultList;
}

interface SpeechRecognitionErrorEvent extends Event {
  readonly error: string;
  readonly message: string;
}

declare class SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  maxAlternatives: number;

  onresult:     ((event: SpeechRecognitionEvent) => void) | null;
  onerror:      ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend:        (() => void) | null;
  onstart:      (() => void) | null;
  onnomatch:    (() => void) | null;
  onaudiostart: (() => void) | null;
  onaudioend:   (() => void) | null;

  start(): void;
  stop(): void;
  abort(): void;
}

interface Window {
  SpeechRecognition?: typeof SpeechRecognition;
  webkitSpeechRecognition?: typeof SpeechRecognition;
}
