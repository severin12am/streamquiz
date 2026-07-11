'use client';
// ============================================================
// Lobby — shown before the match starts (game.status === 'waiting').
//
// Unified pre-game screen: shows who has joined (all 6 slots), the invite
// link + QR (host), a name field (join or rename), and Start / waiting once
// seated. Host can remove guests. Everyone is auto-seated on arrival.
// ============================================================

import React, { useEffect, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { useLocale } from '@/context/LocaleProvider';
import { MAX_PLAYERS, type Player } from '@/lib/types';
import { playerColor, playerInitial } from '@/lib/player-colors';
import { getSavedName, saveName } from '@/lib/client-id';
import { playSound } from '@/lib/sounds';

interface LobbyProps {
  players:   Player[];
  /** This browser's seat, or null if it hasn't joined yet. */
  me:        Player | null;
  /** Host intent from the URL (used before a seat is claimed). */
  asHost:    boolean;
  shareLink: string;
  /** The game is full (no free seat). */
  full:      boolean;
  /** Game listed in Browse open games (host badge). */
  isPublic?: boolean;
  onStart:   () => void;
  onJoin:    (name: string) => Promise<void> | void;
  /** Host removes a guest (kick API). */
  onKick?:   (player: Player) => Promise<void> | void;
}

export default function Lobby({
  players, me, asHost, shareLink, full, isPublic, onStart, onJoin, onKick,
}: LobbyProps) {
  const { t } = useLocale();
  const [copied, setCopied] = useState(false);
  const [name, setName]     = useState(() => getSavedName());
  const [kickingId, setKickingId] = useState<string | null>(null);
  const [kickError, setKickError] = useState<string | null>(null);

  const seated   = !!me;
  const isHost   = me ? me.role === 'host' : asHost;
  const canStart = players.length >= 2;
  const emptySlots = Math.max(0, MAX_PLAYERS - players.length);

  useEffect(() => {
    if (me?.name) setName(me.name);
  }, [me?.id, me?.name]);

  async function handleNameBlur() {
    if (!me) return;
    const trimmed = name.trim();
    if (!trimmed) {
      setName(me.name);
      return;
    }
    if (trimmed === me.name) return;
    saveName(trimmed);
    await onJoin(trimmed);
  }

  async function handleKick(p: Player) {
    if (!onKick || !isHost || p.role === 'host') return;
    const ok = window.confirm(t('lobby.removeConfirm', { name: p.name }));
    if (!ok) return;
    setKickError(null);
    setKickingId(p.id);
    playSound('click');
    try {
      await onKick(p);
    } catch {
      setKickError(t('lobby.removeError'));
    } finally {
      setKickingId(null);
    }
  }

  return (
    <div className="flex min-h-dvh items-center justify-center p-4 sm:p-6">
      <div className="card elevated flex flex-col gap-5 w-full max-w-md p-5 sm:p-7">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-[var(--text-primary)]">
            {t('lobby.title')}
          </h2>
          <p className="text-sm text-[var(--text-secondary)] mt-1">
            {t('lobby.playersCount', { n: players.length, max: MAX_PLAYERS })}
          </p>
          {isHost && isPublic && (
            <p className="text-xs text-[var(--text-muted)] mt-1.5">
              {t('lobby.listedPublicly')}
            </p>
          )}
        </div>

        {/* ---- Player list (all 6 slots) ---- */}
        <div className="flex flex-col gap-2">
          {players.map((p) => (
            <div key={p.id} className="keycap-well-frame">
              <div
                className={`keycap-well flex items-center gap-3 px-4 py-2.5${p.id === me?.id ? ' ring-1 ring-[var(--accent)] ring-inset' : ''}`}
              >
              <span
                className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white"
                style={{ background: playerColor(p.slot) }}
              >
                {playerInitial(p.name)}
              </span>
              <span className="text-sm font-medium text-[var(--text-primary)] truncate">
                {p.name}
              </span>
              <span className="ml-auto flex items-center gap-2 text-[10px] uppercase tracking-wider">
                {p.role === 'host' && (
                  <span className="font-semibold" style={{ color: 'var(--gold)' }}>
                    {t('lobby.host')}
                  </span>
                )}
                {p.id === me?.id && (
                  <span style={{ color: 'var(--text-muted)' }}>({t('lobby.you')})</span>
                )}
                {isHost && me && p.role === 'player' && onKick && (
                  <button
                    type="button"
                    disabled={kickingId === p.id}
                    onClick={() => { void handleKick(p); }}
                    className="keycap keycap-secondary keycap-compact normal-case tracking-normal font-semibold text-[11px]"
                    style={{ color: 'var(--wrong)' }}
                  >
                    {kickingId === p.id ? '…' : t('lobby.removePlayer')}
                  </button>
                )}
              </span>
              </div>
            </div>
          ))}
          {/* Empty seats */}
          {Array.from({ length: emptySlots }).map((_, i) => (
            <div key={`empty-${i}`} className="keycap-well-frame opacity-50">
              <div className="keycap-well flex items-center gap-3 px-4 py-2.5 border border-dashed border-[var(--border)]">
              <span
                className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold"
                style={{ background: 'var(--bg-elevated)', color: 'var(--text-muted)' }}
              >
                {players.length + i + 1}
              </span>
              <span className="text-sm text-[var(--text-muted)]">—</span>
              </div>
            </div>
          ))}
        </div>

        {kickError && (
          <p className="text-sm text-center" style={{ color: 'var(--wrong)' }}>{kickError}</p>
        )}

        {/* ---- Invite link + QR (host) ---- */}
        {isHost && (
          <div className="flex flex-col items-center gap-3">
            <p className="text-[var(--text-muted)] text-xs uppercase tracking-wider font-semibold text-center">
              {t('lobby.shareInvite')}
            </p>
            <div className="p-3 rounded-2xl" style={{ background: 'white' }}>
              <QRCodeSVG value={shareLink} size={132} />
            </div>
            <div className="keycap-well-frame w-full">
              <div className="keycap-well p-2.5">
                <div className="flex items-center gap-2">
                  <span className="flex-1 min-w-0 truncate text-xs text-[var(--text-primary)] font-mono">
                    {shareLink}
                  </span>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(shareLink);
                      playSound('click');
                      setCopied(true);
                      setTimeout(() => setCopied(false), 1500);
                    }}
                    className={`keycap keycap-secondary keycap-compact flex-shrink-0 font-semibold${copied ? ' text-[var(--correct)]' : ''}`}
                  >
                    {copied ? t('create.copied') : t('create.copy')}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ---- Action area ---- */}
        {!seated ? (
          full ? (
            <div className="keycap-well-frame">
              <p
                className="keycap-well rounded-xl px-4 py-3 text-sm text-center"
                style={{ color: 'var(--wrong)' }}
              >
                {t('join.full')}
              </p>
            </div>
          ) : (
            <div className="flex items-center justify-center gap-3 py-2">
              <span className="w-5 h-5 rounded-full border-2 border-[var(--border-strong)] border-t-[var(--accent)] animate-spin" />
              <p className="text-sm text-[var(--text-secondary)]">{t('join.joining')}</p>
            </div>
          )
        ) : (
          <div className="flex flex-col gap-3">
            <div className="keycap-input-frame">
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onBlur={() => { void handleNameBlur(); }}
                placeholder={t('join.namePlaceholder')}
                maxLength={24}
                className="keycap-input w-full rounded-xl px-4 py-3 text-[var(--text-primary)] text-base text-center"
              />
            </div>
            {isHost ? (
              <div className="flex flex-col items-center gap-2">
                <button
                  onClick={() => { playSound('click'); onStart(); }}
                  disabled={!canStart}
                  className="keycap keycap-primary w-full py-3.5 rounded-xl font-semibold text-base text-white"
                >
                  {t('lobby.start')}
                </button>
                {!canStart && (
                  <p className="text-xs text-[var(--text-muted)]">{t('lobby.needMore')}</p>
                )}
              </div>
            ) : (
              <div className="flex items-center justify-center gap-3 py-2">
                <span className="w-5 h-5 rounded-full border-2 border-[var(--border-strong)] border-t-[var(--accent)] animate-spin" />
                <p className="text-sm text-[var(--text-secondary)]">{t('lobby.waitingHost')}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
