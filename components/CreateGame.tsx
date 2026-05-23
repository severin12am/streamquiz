'use client';
// ============================================================
// CreateGame — Host's game creation form
//
// 4 inputs + 1 button. That's it.
//
// On submit:
//   1. Calls /api/generate-questions (OpenAI) to make questions
//   2. Creates a row in Supabase games table
//   3. Redirects host to /game/[id]?role=host
//   4. Shows the shareable link + QR code
//
// TO CHANGE DEFAULT VALUES: edit the `useState` defaults below.
// ============================================================

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { QRCodeSVG } from 'qrcode.react';
import { supabase } from '@/lib/supabase';
import type { Difficulty, CreateGamePayload } from '@/lib/types';

export default function CreateGame() {
  const router = useRouter();

  // ---- Form state ----
  // TO CHANGE DEFAULTS: edit the values here
  const [topic,        setTopic]        = useState('');
  const [difficulty,   setDifficulty]   = useState<Difficulty>('medium');
  const [numQuestions, setNumQuestions] = useState(5);
  const [mcMode,       setMcMode]       = useState(false);

  // ---- UI state ----
  const [loading,       setLoading]       = useState(false);
  const [error,         setError]         = useState<string | null>(null);
  const [shareLink,     setShareLink]     = useState<string | null>(null);
  const [gameId,        setGameId]        = useState<string | null>(null);

  // -------------------------------------------------------
  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!topic.trim()) {
      setError('Please enter a topic.');
      return;
    }
    setError(null);
    setLoading(true);

    try {
      // Step 1: Generate questions via OpenAI API route
      const payload: CreateGamePayload = {
        topic: topic.trim(),
        difficulty,
        num_questions: numQuestions,
        mc_mode: mcMode,
      };

      const res = await fetch('/api/generate-questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? 'Failed to generate questions.');
      }

      const { questions } = await res.json();

      // Step 2: Create the game row in Supabase
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error: dbError } = await (supabase as any)
        .from('games')
        .insert({
          topic: topic.trim(),
          difficulty,
          num_questions: numQuestions,
          mc_mode: mcMode,
          questions,
          status: 'waiting',
          phase: 'waiting',
        })
        .select('id')
        .single();

      if (dbError || !data) {
        throw new Error(dbError?.message ?? 'Failed to create game in database.');
      }

      // Step 3: Build the shareable link (no ?role= means player)
      const id   = (data as { id: string }).id;
      const link = `${window.location.origin}/game/${id}`;

      setGameId(id);
      setShareLink(link);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  }

  function handleGoToGame() {
    if (gameId) router.push(`/game/${gameId}?role=host`);
  }

  // -------------------------------------------------------
  // After creation: show share screen
  // -------------------------------------------------------
  if (shareLink && gameId) {
    return (
      <div className="flex flex-col items-center gap-8 text-center">
        {/* Success heading */}
        <div>
          <div className="text-4xl mb-2">✅</div>
          <h2 className="text-2xl font-black text-[var(--text-primary)]">
            Quiz Created!
          </h2>
          <p className="text-[var(--text-secondary)] mt-1">
            Share this link with your opponent, then click Enter Quiz.
          </p>
        </div>

        {/* QR code */}
        <div
          className="p-4 rounded-2xl"
          style={{ background: 'white' }}
        >
          <QRCodeSVG value={shareLink} size={180} />
        </div>

        {/* Shareable link */}
        <div className="w-full max-w-md">
          <p className="text-[var(--text-muted)] text-xs uppercase tracking-widest mb-2">
            Shareable Link
          </p>
          <div
            className="flex items-center gap-2 rounded-xl border p-3"
            style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}
          >
            <span
              className="flex-1 text-sm text-[var(--text-primary)] truncate font-mono"
            >
              {shareLink}
            </span>
            <button
              onClick={() => navigator.clipboard.writeText(shareLink)}
              className="flex-shrink-0 text-xs font-bold text-[var(--accent)] hover:underline"
            >
              Copy
            </button>
          </div>
        </div>

        {/* Enter the game */}
        <button
          onClick={handleGoToGame}
          className="px-12 py-4 rounded-2xl font-black text-xl text-white transition-all hover:brightness-110 active:scale-95"
          style={{
            background: 'var(--accent)',
            boxShadow: '0 0 30px var(--accent-glow)',
          }}
        >
          Enter Quiz →
        </button>
      </div>
    );
  }

  // -------------------------------------------------------
  // Creation form
  // -------------------------------------------------------
  return (
    <form onSubmit={handleCreate} className="flex flex-col gap-6 w-full max-w-md">

      {/* ---- Topic ---- */}
      <div>
        <label className="block text-sm font-bold text-[var(--text-secondary)] mb-2 uppercase tracking-widest">
          Topic
        </label>
        <input
          type="text"
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          placeholder="e.g. 90s Cartoons, Science, Football…"
          maxLength={100}
          className="w-full rounded-xl px-4 py-3 text-[var(--text-primary)] text-base outline-none transition-all"
          style={{
            background: 'var(--bg-card)',
            border: '2px solid var(--border)',
          }}
          onFocus={(e) => (e.target.style.borderColor = 'var(--accent)')}
          onBlur={(e)  => (e.target.style.borderColor = 'var(--border)')}
          autoFocus
        />
      </div>

      {/* ---- Difficulty ---- */}
      <div>
        <label className="block text-sm font-bold text-[var(--text-secondary)] mb-2 uppercase tracking-widest">
          Difficulty
        </label>
        <div className="flex gap-3">
          {(['easy', 'medium', 'hard'] as Difficulty[]).map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => setDifficulty(d)}
              className="flex-1 py-2.5 rounded-xl font-bold capitalize transition-all"
              style={{
                background: difficulty === d ? 'var(--accent)' : 'var(--bg-card)',
                border: `2px solid ${difficulty === d ? 'var(--accent)' : 'var(--border)'}`,
                color: difficulty === d ? 'white' : 'var(--text-secondary)',
              }}
            >
              {d}
            </button>
          ))}
        </div>
      </div>

      {/* ---- Number of questions ---- */}
      <div>
        <label className="block text-sm font-bold text-[var(--text-secondary)] mb-2 uppercase tracking-widest">
          Questions: {numQuestions}
        </label>
        <input
          type="range"
          min={3}
          max={10}
          value={numQuestions}
          onChange={(e) => setNumQuestions(Number(e.target.value))}
          className="w-full accent-[var(--accent)] cursor-pointer h-2"
          style={{ accentColor: 'var(--accent)' }}
        />
        <div className="flex justify-between text-xs text-[var(--text-muted)] mt-1">
          <span>3</span><span>10</span>
        </div>
      </div>

      {/* ---- Multiple Choice toggle ---- */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-bold text-[var(--text-secondary)] uppercase tracking-widest">
            Multiple Choice
          </p>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">
            Show 4 options instead of open answers
          </p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={mcMode}
          onClick={() => setMcMode(!mcMode)}
          className="relative w-12 h-6 rounded-full transition-all flex-shrink-0"
          style={{ background: mcMode ? 'var(--accent)' : 'var(--border)' }}
        >
          <span
            className="absolute top-1 w-4 h-4 rounded-full bg-white transition-all duration-200"
            style={{ left: mcMode ? '26px' : '4px' }}
          />
        </button>
      </div>

      {/* ---- Error message ---- */}
      {error && (
        <div
          className="rounded-xl px-4 py-3 text-sm"
          style={{ background: '#33111155', border: '1px solid var(--wrong)', color: '#ff8a80' }}
        >
          {error}
        </div>
      )}

      {/* ---- Submit button ---- */}
      <button
        type="submit"
        disabled={loading}
        className="py-4 rounded-2xl font-black text-lg text-white transition-all disabled:opacity-60 disabled:cursor-not-allowed"
        style={{
          background: loading ? 'var(--bg-card)' : 'var(--accent)',
          boxShadow: loading ? 'none' : '0 0 30px var(--accent-glow)',
        }}
      >
        {loading ? (
          <span className="flex items-center justify-center gap-3">
            <span className="w-5 h-5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
            Generating questions…
          </span>
        ) : (
          'Create Challenge →'
        )}
      </button>
    </form>
  );
}
