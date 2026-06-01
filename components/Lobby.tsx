'use client';
// ============================================================
// Lobby — shown before the match starts (game.status === 'waiting').
//
// Everyone sees who has joined. The host also sees the invite link + QR
// and the START button (enabled once at least one guest has joined).
// Guests see a "waiting for the host" message.
// ============================================================

import React, { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { useLocale } from '@/context/LocaleProvider';
import { MAX_PLAYERS, type Player } from '@/lib/types';

interface LobbyProps {
  players:   Player[];
  me:        Player;
  shareLink: string;
  onStart:   () => void;
}

export default function Lobby({ players, me, shareLink, onStart }: LobbyProps) {
  const { t } = useLocale();
  const [copied, setCopied] = useState(false);

  const isHost   = me.role === 'host';
  const canStart = players.length >= 2;

  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <div className="card elevated flex flex-col gap-6 w-full max-w-md p-7">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-[var(--text-primary)]">
            {t('lobby.title')}
          </h2>
          <p className="text-sm text-[var(--text-secondary)] mt-1">
            {t('lobby.playersCount', { n: players.length, max: MAX_PLAYERS })}
          </p>
        </div>

        {/* ---- Player list ---- */}
        <div className="flex flex-col gap-2">
          {players.map((p) => (
            <div
              key={p.id}
              className="flex items-center gap-3 rounded-xl px-4 py-2.5 border"
              style={{
                background: 'var(--bg-card)',
                borderColor: p.id === me.id ? 'var(--accent)' : 'var(--border)',
              }}
            >
              <span
                className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white"
                style={{ background: p.role === 'host' ? 'var(--gold)' : 'var(--accent)' }}
              >
                {p.slot + 1}
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
                {p.id === me.id && (
                  <span style={{ color: 'var(--text-muted)' }}>({t('lobby.you')})</span>
                )}
              </span>
            </div>
          ))}
          {/* Empty seats */}
          {Array.from({ length: MAX_PLAYERS - players.length }).map((_, i) => (
            <div
              key={`empty-${i}`}
              className="flex items-center gap-3 rounded-xl px-4 py-2.5 border border-dashed"
              style={{ borderColor: 'var(--border)', opacity: 0.5 }}
            >
              <span
                className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold"
                style={{ background: 'var(--bg-elevated)', color: 'var(--text-muted)' }}
              >
                {players.length + i + 1}
              </span>
              <span className="text-sm text-[var(--text-muted)]">—</span>
            </div>
          ))}
        </div>

        {/* ---- Invite link (host) ---- */}
        {isHost && (
          <div className="flex flex-col items-center gap-3">
            <p className="text-[var(--text-muted)] text-xs uppercase tracking-wider font-semibold text-center">
              {t('lobby.shareInvite')}
            </p>
            <div className="p-3 rounded-2xl" style={{ background: 'white' }}>
              <QRCodeSVG value={shareLink} size={132} />
            </div>
            <div
              className="flex items-center gap-2 rounded-xl border p-2.5 w-full"
              style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}
            >
              <span className="flex-1 text-xs text-[var(--text-primary)] truncate font-mono">
                {shareLink}
              </span>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(shareLink);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 1500);
                }}
                className="flex-shrink-0 text-xs font-semibold hover:underline"
                style={{ color: copied ? 'var(--correct)' : 'var(--accent)' }}
              >
                {copied ? t('create.copied') : t('create.copy')}
              </button>
            </div>
          </div>
        )}

        {/* ---- Start (host) / waiting (guests) ---- */}
        {isHost ? (
          <div className="flex flex-col items-center gap-2">
            <button
              onClick={onStart}
              disabled={!canStart}
              className="w-full py-3.5 rounded-xl font-semibold text-base text-white transition-colors disabled:cursor-not-allowed disabled:opacity-60"
              style={{ background: 'var(--accent)' }}
              onMouseEnter={(e) => { if (canStart) e.currentTarget.style.background = 'var(--accent-hover)'; }}
              onMouseLeave={(e) => { if (canStart) e.currentTarget.style.background = 'var(--accent)'; }}
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
    </div>
  );
}
