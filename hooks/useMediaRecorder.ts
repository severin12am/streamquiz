'use client';
// ============================================================
// useMediaRecorder — Records each answer as a video clip
//
// Creates a MediaRecorder from the player's local stream.
// Each answer is recorded as a separate Blob, then collected
// so the user can download them at the end of the game.
//
// Clips are stored in memory (not uploaded anywhere).
// TO CHANGE FORMAT: edit the mimeType below.
// ============================================================

import { useRef, useState, useCallback } from 'react';

export interface AnswerClip {
  questionIndex: number;
  role: string;
  blob: Blob;
  url: string; // object URL for download
}

export interface UseMediaRecorderReturn {
  clips: AnswerClip[];
  startRecording: (stream: MediaStream, questionIndex: number, role: string) => void;
  stopRecording:  () => void;
  isRecording:    boolean;
}

export function useMediaRecorder(): UseMediaRecorderReturn {
  const [clips,       setClips]       = useState<AnswerClip[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const recorderRef   = useRef<MediaRecorder | null>(null);
  const chunksRef     = useRef<Blob[]>([]);
  const metaRef       = useRef<{ questionIndex: number; role: string } | null>(null);

  const startRecording = useCallback((
    stream: MediaStream,
    questionIndex: number,
    role: string
  ) => {
    if (isRecording) return;

    // Choose best supported format
    // Change 'video/webm;codecs=vp9' here if needed
    const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
      ? 'video/webm;codecs=vp9'
      : 'video/webm';

    try {
      const recorder = new MediaRecorder(stream, { mimeType });
      chunksRef.current = [];
      metaRef.current   = { questionIndex, role };

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mimeType });
        const url  = URL.createObjectURL(blob);
        if (metaRef.current) {
          setClips((prev) => [
            ...prev,
            { blob, url, ...metaRef.current! },
          ]);
        }
        setIsRecording(false);
      };

      recorder.start(250); // collect chunks every 250ms
      recorderRef.current = recorder;
      setIsRecording(true);
    } catch (err) {
      console.error('[MediaRecorder] Failed to start recording:', err);
    }
  }, [isRecording]);

  const stopRecording = useCallback(() => {
    if (recorderRef.current?.state === 'recording') {
      recorderRef.current.stop();
    }
  }, []);

  return { clips, startRecording, stopRecording, isRecording };
}
