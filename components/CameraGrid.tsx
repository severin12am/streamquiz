'use client';
// ============================================================
// CameraGrid — WhatsApp-style call stage with click-to-cycle layouts.
//
// TAP ANY FEED to rotate through a fixed set of camera layouts (no
// settings UI). The quiz overlay stays exactly the same — only the
// camera arrangement changes:
//
//   0 · others fill the stage, my own feed in a small PiP (top-left)   [default]
//   1 · MY feed fills the stage, the others in small PiP tiles (top-left)
//   2 · everyone in one equal grid (no PiP)
//
// The PiP always lives in the top-left corner so the overlay (which
// reserves that spot for the question/status) never needs to change.
// ============================================================

import React, { useEffect, useRef } from 'react';
import CameraPanel from './CameraPanel';
import type { Player } from '@/lib/types';
import { playerColor } from '@/lib/player-colors';

// Flip to true to print per-tile stream assignment logs while debugging.
const GRID_DEBUG = false;

// Number of camera layout schemes a tap cycles through.
export const CAMERA_LAYOUTS = 3;

interface CameraGridProps {
  players:       Player[];
  me:            Player;
  localStream:   MediaStream | null;
  remoteStreams: Record<string, MediaStream>;
  /** Per-peer connection state, keyed by player id. */
  connected:     Record<string, boolean>;
  cameraError:   string | null;
  /** Re-request local camera/mic (tap on the error tile). */
  onRetryCamera?: () => void;
  /** Host turned cameras on for this game. */
  camerasEnabled: boolean;
  /** Highlight every tile (the voice answering phase). */
  speaking:      boolean;
  /** Show each player's ✓/✗ outcome (result phase). */
  showResult:    boolean;
  /** Current layout scheme index (cycled by tapping a feed). */
  layoutMode?:   number;
  /** Tap-a-feed handler — advances to the next layout scheme. */
  onCycleLayout?: () => void;
  className?:    string;
}

// Column count for an equal grid of N feeds filling the stage.
function gridClass(n: number): string {
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
  onRetryCamera,
  camerasEnabled,
  speaking,
  showResult,
  layoutMode = 0,
  onCycleLayout,
  className = '',
}: CameraGridProps) {
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

  // Render one player's camera tile.
  const tile = (p: Player, compact: boolean) => {
    const isMe   = p.id === me.id;
    const stream = isMe ? localStream : (remoteStreams[p.id] ?? null);
    return (
      <CameraPanel
        stream={stream}
        label={p.name}
        isSpeaking={speaking}
        mirrored={isMe}
        error={isMe ? cameraError : null}
        onRetry={isMe && cameraError && onRetryCamera ? onRetryCamera : undefined}
        correct={showResult ? p.correct : null}
        color={playerColor(p.slot)}
        isLocal={isMe}
        camerasEnabled={camerasEnabled}
        connected={isMe ? undefined : !!connected[p.id]}
        compact={compact}
        className={`h-full w-full ${compact ? 'rounded-xl' : 'rounded-lg'}`}
      />
    );
  };

  // Resolve the active scheme. With no remote peers there's nothing to
  // rearrange, so we always fall back to a single full-screen feed.
  // If the local tile has a camera/mic error, keep it on the big stage so
  // the tap-to-retry message isn't clipped inside a tiny PiP.
  const mode = others.length === 0
    ? -1
    : cameraError
    ? 1
    : ((layoutMode % CAMERA_LAYOUTS) + CAMERA_LAYOUTS) % CAMERA_LAYOUTS;

  // stageList = big feeds in the grid; pipList = small corner feeds.
  let stageList: Player[];
  let pipList:   Player[];
  if (mode === -1) {
    stageList = [me];
    pipList = [];
  } else if (mode === 1) {
    stageList = [me];
    pipList = others;
  } else if (mode === 2) {
    stageList = [...players].sort((a, b) => a.slot - b.slot);
    pipList = [];
  } else {
    stageList = others;
    pipList = [me];
  }

  return (
    <div className={`relative ${className}`}>
      {/* ---- STAGE: big feeds fill the screen ---- */}
      <div className={`grid ${gridClass(stageList.length)} auto-rows-fr gap-1.5 h-full w-full`}>
        {stageList.map((p) => (
          <div
            key={p.id}
            onClick={onCycleLayout}
            className={`relative h-full w-full min-h-0 ${onCycleLayout ? 'cursor-pointer' : ''}`}
          >
            {tile(p, false)}
          </div>
        ))}
      </div>

      {/* ---- PiP: single small feed (top-left) ---- */}
      {pipList.length === 1 && (
        <div
          onClick={onCycleLayout}
          className={`absolute z-20 overflow-hidden rounded-xl
                     top-[max(0.5rem,env(safe-area-inset-top))] start-2
                     w-40 h-52 sm:w-48 sm:h-60 lg:w-80 lg:h-52 ${onCycleLayout ? 'cursor-pointer' : ''}`}
          style={{ boxShadow: '0 4px 16px rgba(0,0,0,0.45)' }}
        >
          {tile(pipList[0], true)}
        </div>
      )}

      {/* ---- PiP: several small feeds stacked (top-left) ---- */}
      {pipList.length > 1 && (
        <div
          className="absolute z-20 top-[max(0.5rem,env(safe-area-inset-top))] start-2
                     flex flex-col gap-1.5 max-h-[80%] overflow-hidden"
        >
          {pipList.map((p) => (
            <div
              key={p.id}
              onClick={onCycleLayout}
              className={`overflow-hidden rounded-xl flex-shrink-0
                         w-28 h-36 sm:w-32 sm:h-40 lg:w-56 lg:h-36 ${onCycleLayout ? 'cursor-pointer' : ''}`}
              style={{ boxShadow: '0 4px 16px rgba(0,0,0,0.45)' }}
            >
              {tile(p, true)}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
