'use client';
// ============================================================
// QuestionPanel — Middle 40% section
//
// Displays everything in the centre column:
//   - Current question text
//   - Countdown timer (circular)
//   - Live scoreboard
//   - BUZZ button OR multiple choice options
//   - Voice transcript (live, shown to both players)
//   - Judge buttons (correct/wrong, host only)
//   - Result flash (correct/wrong outcome)
//
// This component receives all its data as props — no hooks here.
// Easier for future developers to modify and test.
// ============================================================

import React from 'react';
import BuzzButton from './BuzzButton';
import MCOptions  from './MCOptions';
import ScoreBoard from './ScoreBoard';
import CountdownTimer from './CountdownTimer';
import type { Game, PlayerRole } from '@/lib/types';

interface QuestionPanelProps {
  game:          Game;
  role:          PlayerRole;
  timeLeft:      number;
  timerTotal:    number;
  buzzCountdown: number;
  onBuzz:        () => void;
  onMCSelect:    (index: number) => void;
}

export default function QuestionPanel({
  game,
  role,
  timeLeft,
  timerTotal,
  buzzCountdown,
  onBuzz,
  onMCSelect,
}: QuestionPanelProps) {
  const currentQuestion = game.questions[game.current_question_index];
  const phase           = game.phase;
  const isHost          = role === 'host';

  // During a steal, only the player who did NOT answer first may buzz.
  const isStealLockedForMe = game.is_steal && game.first_answerer === role;

  // Determine BUZZ button state
  type BuzzState = 'idle' | 'buzzed_me' | 'buzzed_them' | 'disabled';
  function getBuzzState(): BuzzState {
    if (phase !== 'question') return 'disabled';
    if (isStealLockedForMe) return 'disabled'; // can't steal from yourself
    if (game.buzz_player === null) return 'idle';
    if (game.buzz_player === role) return 'buzzed_me';
    return 'buzzed_them';
  }

  // Show a full-screen result overlay?
  const showResult = phase === 'result';

  // Was the last answer correct? Now read from the shared
  // answer_correct flag (set by auto-judging) so BOTH players
  // see the SAME result for both MC and open-ended modes.
  const lastAnswerCorrect = game.answer_correct === true;

  return (
    <div
      className="relative flex flex-col h-full"
      style={{ background: 'var(--bg-base)', borderLeft: '1px solid var(--border)', borderRight: '1px solid var(--border)' }}
    >
      {/* ======================================================
          TOP BAR — topic + progress
      ====================================================== */}
      <div
        className="flex items-center justify-between px-6 py-3"
        style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg-panel)' }}
      >
        <div>
          <p className="text-[10px] font-bold tracking-widest text-[var(--text-muted)] uppercase">
            Topic
          </p>
          <p className="text-sm font-semibold text-[var(--text-secondary)] truncate max-w-[180px]">
            {game.topic}
          </p>
        </div>
        <div className="text-right">
          <p className="text-[10px] font-bold tracking-widest text-[var(--text-muted)] uppercase">
            Question
          </p>
          <p className="text-sm font-bold text-[var(--text-primary)]">
            {game.current_question_index + 1} / {game.questions.length}
          </p>
        </div>
      </div>

      {/* ======================================================
          SCORES — always visible
      ====================================================== */}
      <div className="px-6 pt-4 pb-2">
        <ScoreBoard
          hostScore={game.host_score}
          playerScore={game.player_score}
          hostStreak={game.streak_host}
          playerStreak={game.streak_player}
        />
      </div>

      {/* ======================================================
          QUESTION TEXT + TIMER
      ====================================================== */}
      <div className="flex-1 flex flex-col items-center justify-center gap-4 lg:gap-6 px-4 lg:px-8 py-2 pb-4 overflow-y-auto">

        {/* STEAL banner — big and obvious when a rebound is live. */}
        {game.is_steal && (phase === 'question' || phase === 'buzzing') && (
          <div
            className="px-5 py-1.5 rounded-full font-black tracking-widest text-sm uppercase"
            style={{
              background: 'var(--buzz-red)',
              color: 'white',
              boxShadow: '0 0 24px var(--buzz-glow)',
            }}
          >
            ⚡ STEAL CHANCE ⚡
          </div>
        )}

        {/* Timer — only while the question is open or someone is buzzing.
            (Hidden during 'answering' so it doesn't sit frozen.)
            timerTotal adapts (15s question, 5s steal, 2s buzz). */}
        {(phase === 'question' || phase === 'buzzing') && (
          <CountdownTimer current={timeLeft} total={timerTotal} />
        )}

        {/* Answering indicator — shown while a player is speaking */}
        {phase === 'answering' && (
          <div className="text-center">
            <p
              className="text-2xl font-black"
              style={{ color: 'var(--buzz-red)', textShadow: '0 0 16px var(--buzz-glow)' }}
            >
              {game.buzz_player === role ? '🎤 You are answering…' : '🎤 Listening to answer…'}
            </p>
          </div>
        )}

        {/* Checking indicator — AI is judging the answer */}
        {phase === 'checking' && (
          <div className="text-center flex flex-col items-center gap-2">
            <div className="w-8 h-8 rounded-full border-4 border-t-[var(--accent)] border-[var(--border)] animate-spin" />
            <p className="text-lg font-bold text-[var(--text-secondary)]">
              Checking answer…
            </p>
          </div>
        )}

        {/* Buzz countdown overlay */}
        {phase === 'buzzing' && (
          <div className="text-center">
            <p
              className="text-4xl font-black"
              style={{
                color: 'var(--buzz-red)',
                textShadow: '0 0 20px var(--buzz-glow)',
              }}
            >
              {game.buzz_player === role ? 'SPEAK NOW!' : 'They\'re speaking…'}
            </p>
            <p className="text-[var(--text-secondary)] mt-1">
              {buzzCountdown}s remaining
            </p>
          </div>
        )}

        {/* Question text — the big centrepiece.
            Responsive size so it fits on phones too. */}
        {currentQuestion && phase !== 'ended' && (
          <div className="text-center">
            <p
              className="text-lg lg:text-2xl font-bold leading-snug text-[var(--text-primary)]"
              style={{ textShadow: '0 2px 12px rgba(0,0,0,0.5)' }}
            >
              {currentQuestion.question}
            </p>
          </div>
        )}

        {/* ---- BUZZ button (open-ended mode) ---- */}
        {!game.mc_mode && (phase === 'question' || phase === 'buzzing') && (
          isStealLockedForMe ? (
            // The player who answered wrong watches the opponent steal
            <p className="text-[var(--text-secondary)] text-base text-center">
              Opponent can steal this one…
            </p>
          ) : (
            <BuzzButton
              state={getBuzzState()}
              countdown={buzzCountdown}
              onBuzz={onBuzz}
            />
          )
        )}

        {/* ---- MC Options (multiple choice mode) ---- */}
        {game.mc_mode && currentQuestion?.options && (phase === 'question' || phase === 'result') && (
          <MCOptions
            options={currentQuestion.options}
            correctAnswer={phase === 'result' ? currentQuestion.correct_answer : undefined}
            lockedIn={phase === 'result' || game.mc_answer_index !== null}
            selectedIndex={game.mc_answer_index}
            onSelect={onMCSelect}
          />
        )}

        {/* ---- Live voice transcript ---- */}
        {(phase === 'answering' || phase === 'checking') && game.current_transcript && (
          <div
            className="w-full rounded-xl p-4 border"
            style={{
              background: 'var(--bg-card)',
              borderColor: 'var(--border)',
            }}
          >
            <p className="text-[10px] font-bold tracking-widest text-[var(--text-muted)] mb-1 uppercase">
              Live answer
            </p>
            <p className="text-[var(--text-primary)] text-base italic leading-relaxed">
              &ldquo;{game.current_transcript}&rdquo;
            </p>
          </div>
        )}

        {/* ---- Correct answer reveal (during result, open-ended) ----
            MC mode shows the right option highlighted instead. */}
        {phase === 'result' && !game.mc_mode && currentQuestion?.correct_answer && (
          <div
            className="w-full rounded-xl p-4 border text-center"
            style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}
          >
            <p className="text-[10px] font-bold tracking-widest text-[var(--text-muted)] mb-1 uppercase">
              Correct answer
            </p>
            <p className="text-xl font-bold text-[var(--correct)]">
              {currentQuestion.correct_answer}
            </p>
          </div>
        )}

        {/* ---- Waiting for player message ---- */}
        {phase === 'waiting' && (
          <div className="text-center">
            <p className="text-[var(--text-secondary)] text-base">
              {isHost
                ? 'Share the link with your opponent to start'
                : 'Waiting for the host to start…'}
            </p>
          </div>
        )}
      </div>

      {/* ======================================================
          RESULT OVERLAY — brief ✓/✗ flash after each answer.
          Works for BOTH modes via the shared answer_correct flag.
      ====================================================== */}
      {showResult && (
        <div
          className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none"
          style={{
            background: lastAnswerCorrect
              ? 'rgba(67,160,71,0.18)'
              : 'rgba(229,57,53,0.18)',
          }}
        >
          <div className="flex flex-col items-center gap-2">
            <span
              className="text-7xl font-black"
              style={{
                color: lastAnswerCorrect ? 'var(--correct)' : 'var(--wrong)',
                textShadow: lastAnswerCorrect
                  ? '0 0 40px var(--correct)'
                  : '0 0 40px var(--wrong)',
              }}
            >
              {lastAnswerCorrect ? '✓' : '✗'}
            </span>
            {/* Points earned (with streak multiplier hint) */}
            {lastAnswerCorrect && game.last_points > 0 && (
              <span
                className="text-2xl font-black"
                style={{ color: 'var(--gold)', textShadow: '0 0 20px var(--gold)' }}
              >
                +{game.last_points}
                {game.last_points > 1 && ' 🔥'}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
