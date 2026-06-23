'use client';
// ============================================================
// CameraGrid — WhatsApp-style call stage.
//
// The OTHER players' feeds fill the whole stage (one feed = full screen,
// several = a fitted grid). The local player's own camera floats in a
// small draggable-looking PiP tile in a corner — just like a 1:1 video
// call. Scores + "answered" status live ON each tile (top-left pill).
// ============================================================

import React, { useEffect, useRef } from 'react';
import CameraPanel from './CameraPanel';
import type { Player, GamePhase } from '@/lib/types';
import { playerColor } from '@/lib/player-colors';

// Flip to true to print per-tile stream assignment logs while debugging.
const GRID_DEBUG = false;

interface CameraGridProps {
  players:       Player[];
  me:            Player;
  localStream:   MediaStream | null;
  remoteStreams: Record<string, MediaStream>;
  /** Per-peer connection state, keyed by player id. */
  connected:     Record<string, boolean>;
  cameraError:   string | null;
  /** Host turned cameras on for this game. */
  camerasEnabled: boolean;
  /** Highlight every tile (the voice answering phase). */
  speaking:      boolean;
  /** Show each player's ✓/✗ outcome (result phase). */
  showResult:    boolean;
  /** Current phase + answer style — used to show who has answered. */
  phase?:        GamePhase;
  mcMode?:       boolean;
  className?:    string;
}

// Column count for the REMOTE feeds filling the stage (me lives in a PiP).
function remoteGridClass(n: number): string {
  if (n <= 1) return 'grid-cols-1';
  if (n === 2) return 'grid-cols-1 sm:grid-cols-2';
  if (n <= 4) return 'grid-cols-2';
  return 'grid-cols-2 lg:grid-cols-3';
}

export default function CameraGrid({
  players,
  me,
  localStream,
  remoteStreams,
  connected,
  cameraError,
  camerasEnabled,
  speaking,
  showResult,
  phase,
  mcMode = false,
  className = '',
}: CameraGridProps) {
  const showAnswered = phase === 'question' || phase === 'answering';
  const prevLogRef = useRef('');

  const others = players.filter((p) => p.id !== me.id);

  // TEMP DEBUG — log stream assignment per tile when inputs change
  useEffect(() => {
    if (!GRID_DEBUG) return;
    const summary = players.map((p) => {
      const isMe = p.id === me.id;
      const stream = isMe ? localStream : (remoteStreams[p.id] ?? null);
      return {
        playerId: p.id,
        name: p.name,
        isMe,
        hasStream: !!stream,
        streamId: stream?.id ?? null,
        videoTracks: stream?.getVideoTracks().length ?? 0,
      };
    });
    const key = JSON.stringify(summary);
    if (key === prevLogRef.current) return;
    prevLogRef.current = key;
    console.log('[Camera] CameraGrid stream assignment', {
      playerCount: players.length,
      remoteStreamKeys: Object.keys(remoteStreams),
      tiles: summary,
      cameraError: cameraError ?? null,
    });
  }, [players, me.id, localStream, remoteStreams, cameraError]);

  const answeredOf = (p: Player) =>
    showAnswered ? (mcMode ? p.mc_index !== null : p.done) : null;

  // Solo (no remote peers yet): show my own feed full-screen, no PiP.
  const stageList = others.length > 0 ? others : [me];

  return (
    <div className={`relative ${className}`}>
      {/* ---- STAGE: remote feeds fill the screen ---- */}
      <div className={`grid ${remoteGridClass(stageList.length)} auto-rows-fr gap-1.5 h-full w-full`}>
        {stageList.map((p) => {
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
              color={playerColor(p.slot)}
              answered={answeredOf(p)}
              isLocal={isMe}
              camerasEnabled={camerasEnabled}
              connected={isMe ? undefined : !!connected[p.id]}
              className="h-full w-full rounded-lg"
            />
          );
        })}
      </div>

      {/* ---- PiP: my own camera (only when there are remote peers) ---- */}
      {others.length > 0 && (
        <div
          className="absolute z-20 overflow-hidden rounded-xl
                     top-[max(0.5rem,env(safe-area-inset-top))] start-2
                     w-20 h-28 sm:w-24 sm:h-32 lg:w-44 lg:h-32"
          style={{ boxShadow: '0 4px 16px rgba(0,0,0,0.45)' }}
        >
          <CameraPanel
            stream={localStream}
            label={me.name}
            isSpeaking={speaking}
            mirrored
            error={cameraError}
            score={me.score}
            correct={showResult ? me.correct : null}
            color={playerColor(me.slot)}
            answered={answeredOf(me)}
            isLocal
            camerasEnabled={camerasEnabled}
            compact
            className="h-full w-full rounded-xl"
          />
        </div>
      )}
    </div>
  );
}
