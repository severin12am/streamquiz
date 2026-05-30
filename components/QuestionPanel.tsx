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
import { useLocale } from '@/context/LocaleProvider';
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
  const { t } = useLocale();
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
        className="flex items-center justify-between px-6 py-2 lg:py-3"
        style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg-panel)' }}
      >
        <div>
          <p className="text-[10px] font-semibold tracking-wider text-[var(--text-muted)] uppercase">
            {t('game.topic')}
          </p>
          <p className="text-sm font-medium text-[var(--text-secondary)] truncate max-w-[180px]">
            {game.topic}
          </p>
        </div>
        <div className="text-right">
          <p className="text-[10px] font-semibold tracking-wider text-[var(--text-muted)] uppercase">
            {t('game.question')}
          </p>
          <p className="text-sm font-semibold text-[var(--text-primary)] tabular-nums">
            {game.current_question_index + 1} / {game.questions.length}
          </p>
        </div>
      </div>

      {/* ======================================================
          SCORES — always visible
      ====================================================== */}
      <div className="px-6 pt-2 pb-1 lg:pt-4 lg:pb-2">
        <ScoreBoard
          hostScore={game.host_score}
          playerScore={game.player_score}
          hostStreak={game.streak_host}
          playerStreak={game.streak_player}
          hostLabel={t('game.host')}
          playerLabel={t('game.streamer')}
        />
      </div>

      {/* ======================================================
          QUESTION TEXT + TIMER
      ====================================================== */}
      <div className="flex-1 flex flex-col items-center justify-start lg:justify-center gap-2.5 lg:gap-6 px-4 lg:px-8 py-2 lg:py-2 pb-4 overflow-y-auto">

        {/* STEAL banner — clear when a rebound is live (flat styling). */}
        {game.is_steal && (phase === 'question' || phase === 'buzzing') && (
          <div
            className="px-4 py-1.5 rounded-full font-semibold tracking-wider text-xs uppercase"
            style={{
              background: 'rgba(229,72,77,0.14)',
              border: '1px solid var(--buzz-red)',
              color: 'var(--buzz-red)',
            }}
          >
            {t('game.stealChance')}
          </div>
        )}

        {/* Timer — during the locked think countdown, the open question,
            or the buzz window. (Hidden during 'answering' so it doesn't
            sit frozen.) timerTotal adapts per phase. */}
        {(phase === 'thinking' || phase === 'question' || phase === 'buzzing') && (
          <CountdownTimer current={timeLeft} total={timerTotal} />
        )}

        {/* Think-mode lock banner — both players read the question but
            can't answer yet. Unlocks for everyone at the same instant. */}
        {phase === 'thinking' && (
          <div className="text-center">
            <p className="text-xl font-semibold" style={{ color: 'var(--accent)' }}>
              {t('game.getReady')}
            </p>
            <p className="text-[var(--text-secondary)] mt-1 text-sm">
              {t('game.thinkHint')}
            </p>
          </div>
        )}

        {/* GO cue — appears the moment the think lock lifts (think mode,
            normal question, not a steal). Makes the unlock obvious. */}
        {game.game_mode === 'think' && phase === 'question' && !game.is_steal && (
          <p className="text-lg font-semibold" style={{ color: 'var(--correct)' }}>
            {t('game.answerNow')}
          </p>
        )}

        {/* Answering indicator — shown while a player is speaking */}
        {phase === 'answering' && (
          <div className="text-center">
            <p className="text-xl font-semibold" style={{ color: 'var(--buzz-red)' }}>
              {game.buzz_player === role ? t('game.youAnswering') : t('game.listeningAnswer')}
            </p>
          </div>
        )}

        {/* Checking indicator — AI is judging the answer */}
        {phase === 'checking' && (
          <div className="text-center flex flex-col items-center gap-2">
            <div className="w-7 h-7 rounded-full border-2 border-[var(--border-strong)] border-t-[var(--accent)] animate-spin" />
            <p className="text-base font-medium text-[var(--text-secondary)]">
              {t('game.checkingAnswer')}
            </p>
          </div>
        )}

        {/* Buzz countdown overlay */}
        {phase === 'buzzing' && (
          <div className="text-center">
            <p className="text-3xl font-semibold" style={{ color: 'var(--buzz-red)' }}>
              {game.buzz_player === role ? t('game.speakNow') : t('game.theySpeaking')}
            </p>
            <p className="text-[var(--text-secondary)] mt-1 text-sm">
              {t('game.secondsLeft', { n: buzzCountdown })}
            </p>
          </div>
        )}

        {/* Question text — the big centrepiece.
            Responsive size so it fits on phones too. */}
        {currentQuestion && phase !== 'ended' && (
          <div className="text-center">
            <p className="text-lg lg:text-2xl font-semibold leading-snug text-[var(--text-primary)]">
              {currentQuestion.question}
            </p>
          </div>
        )}

        {/* ---- BUZZ button (open-ended mode) ---- */}
        {!game.mc_mode && (phase === 'question' || phase === 'buzzing') && (
          isStealLockedForMe ? (
            // The player who answered wrong watches the opponent steal
            <p className="text-[var(--text-secondary)] text-base text-center">
              {t('game.opponentSteal')}
            </p>
          ) : (
            <BuzzButton
              state={getBuzzState()}
              countdown={buzzCountdown}
              onBuzz={onBuzz}
            />
          )
        )}

        {/* ---- MC Options (multiple choice mode) ----
            Visible (but disabled) during 'thinking' so both players can
            read the choices, then become clickable when the lock lifts. */}
        {game.mc_mode && currentQuestion?.options &&
          (phase === 'thinking' || phase === 'question' || phase === 'result') && (
          isStealLockedForMe && phase === 'question' ? (
            <p className="text-[var(--text-secondary)] text-base text-center">
              {t('mc.opponentSteal')}
            </p>
          ) : (
            <MCOptions
              options={currentQuestion.options}
              correctAnswer={phase === 'result' ? currentQuestion.correct_answer : undefined}
              lockedIn={phase === 'result' || game.mc_answer_index !== null}
              selectedIndex={game.mc_answer_index}
              disabled={isStealLockedForMe || phase === 'thinking'}
              onSelect={onMCSelect}
            />
          )
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
            <p className="text-[10px] font-semibold tracking-wider text-[var(--text-muted)] mb-1 uppercase">
              {t('game.liveAnswer')}
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
            <p className="text-[10px] font-semibold tracking-wider text-[var(--text-muted)] mb-1 uppercase">
              {t('game.correctAnswer')}
            </p>
            <p className="text-xl font-semibold text-[var(--correct)]">
              {currentQuestion.correct_answer}
            </p>
          </div>
        )}

        {/* ---- Waiting for player message ---- */}
        {phase === 'waiting' && (
          <div className="text-center">
            <p className="text-[var(--text-secondary)] text-base">
              {isHost
                ? t('game.waitShareLink')
                : t('game.waitHostStart')}
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
              ? 'rgba(34,160,107,0.12)'
              : 'rgba(229,72,77,0.12)',
          }}
        >
          <div className="flex flex-col items-center gap-2">
            <span
              className="text-7xl font-semibold"
              style={{ color: lastAnswerCorrect ? 'var(--correct)' : 'var(--wrong)' }}
            >
              {lastAnswerCorrect ? '✓' : '✗'}
            </span>
            {/* Points earned (with streak multiplier hint) */}
            {lastAnswerCorrect && game.last_points > 0 && (
              <span className="text-2xl font-semibold" style={{ color: 'var(--gold)' }}>
                +{game.last_points}
                {game.last_points > 1 ? ` ${t('game.pointsMultiplier', { n: game.last_points })}` : ''}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
