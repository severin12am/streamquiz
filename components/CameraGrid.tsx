'use client';
// ============================================================
// CameraGrid — responsive grid of every player's camera (up to 6).
//
// Each tile shows one player's live video (the local player's own camera
// is mirrored), their name + running score, and a ✓/✗ badge during the
// result reveal. Replaces the old fixed 2-camera layout.
// ============================================================

import React from 'react';
import CameraPanel from './CameraPanel';
import type { Player } from '@/lib/types';

interface CameraGridProps {
  players:       Player[];
  me:            Player;
  localStream:   MediaStream | null;
  remoteStreams: Record<string, MediaStream>;
  cameraError:   string | null;
  /** Highlight every tile (the voice answering phase). */
  speaking:      boolean;
  /** Show each player's ✓/✗ outcome (result phase). */
  showResult:    boolean;
  className?:    string;
}

// Tailwind column count tuned to the number of players so tiles stay big.
function gridColsClass(n: number): string {
  if (n <= 1) return 'grid-cols-1';
  if (n === 2) return 'grid-cols-2';
  if (n <= 4) return 'grid-cols-2';
  return 'grid-cols-2 lg:grid-cols-3';
}

export default function CameraGrid({
  players,
  me,
  localStream,
  remoteStreams,
  cameraError,
  speaking,
  showResult,
  className = '',
}: CameraGridProps) {
  return (
    <div className={`grid ${gridColsClass(players.length)} auto-rows-fr gap-1.5 ${className}`}>
      {players.map((p) => {
        const isMe   = p.id === me.id;
        const stream = isMe ? localStream : (remoteStreams[p.id] ?? null);
        return (
          <CameraPanel
            key={p.id}
            stream={stream}
            label={p.name}
            isSpeaking={speaking}
            mirrored={isMe}
            error={isMe ? cameraError : null}
            score={p.score}
            correct={showResult ? p.correct : null}
            className="h-full w-full rounded-lg"
          />
        );
      })}
    </div>
  );
}
