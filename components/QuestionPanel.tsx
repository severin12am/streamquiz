'use client';
// ============================================================
// QuestionPanel — Middle 40% section
//
// Displays everything in the centre column:
//   - Current question text
//   - Countdown timer (circular, smooth)
//   - Live scoreboard
//   - Multiple-choice options  OR  the voice answer area
//   - Live voice transcript (your own, while you speak)
//   - Per-player result reveal (who said what / correct answer)
//
// VOICE MODE HAS NO BUZZER: after the question both players simply talk.
// Each player's spoken answer is judged independently, so both can score.
//
// This component receives all its data as props — no hooks here.
// Easier for future developers to modify and test.
// ============================================================

import React from 'react';
import MCOptions  from './MCOptions';
import ScoreBoard from './ScoreBoard';
import CountdownTimer from './CountdownTimer';
import { useLocale } from '@/context/LocaleProvider';
import type { Game, PlayerRole } from '@/lib/types';

interface QuestionPanelProps {
  game:            Game;
  role:            PlayerRole;
  timeLeft:        number;
  timeLeftMs:      number; // fractional ms — drives the smooth timer ring
  timerTotal:      number;
  transcript:      string;  // this viewer's OWN live answer (speech or typed)
  iAmDone:         boolean; // this viewer locked in their voice answer
  speechSupported: boolean; // false on browsers without the Speech API
  onMCSelect:      (index: number) => void;
  onTypeAnswer:    (text: string) => void; // fallback: type instead of speak
  onFinish:        () => void;             // lock in the voice answer early
}

export default function QuestionPanel({
  game,
  role,
  timeLeft,
  timeLeftMs,
  timerTotal,
  transcript,
  iAmDone,
  speechSupported,
  onMCSelect,
  onTypeAnswer,
  onFinish,
}: QuestionPanelProps) {
  const { t } = useLocale();
  const currentQuestion = game.questions[game.current_question_index];
  const phase           = game.phase;
  const isHost          = role === 'host';

  // This viewer's own multiple-choice pick (each player answers separately).
  const myMcPick = isHost ? game.host_mc_index : game.player_mc_index;
  const iHavePicked = myMcPick !== null;
  const someonePicked = game.host_mc_index !== null || game.player_mc_index !== null;

  // Voice result data (per player). "me" = this viewer, "opp" = the other.
  const myTranscript  = isHost ? game.host_transcript   : game.player_transcript;
  const oppTranscript = isHost ? game.player_transcript  : game.host_transcript;
  const myCorrect     = isHost ? game.host_correct       : game.player_correct;
  const oppCorrect    = isHost ? game.player_correct      : game.host_correct;
  const oppLabel      = t('game.streamer');

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
          hostLabel={t('game.host')}
          playerLabel={t('game.streamer')}
        />
      </div>

      {/* ======================================================
          QUESTION TEXT + TIMER
      ====================================================== */}
      <div className="flex-1 flex flex-col items-center justify-start lg:justify-center gap-2.5 lg:gap-6 px-4 lg:px-8 py-2 lg:py-2 pb-4 overflow-y-auto">

        {/* Timer — during the locked think countdown, the MC pick phase
            (incl. the grace window), or the voice answer window. Kept
            visible across these so the layout doesn't jump. */}
        {(phase === 'thinking' || phase === 'question' || phase === 'answering') && (
          <CountdownTimer current={timeLeft} total={timerTotal} remainingMs={timeLeftMs} />
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

        {/* Status line for the MC pick phase — ONE fixed-height row so the
            message can change (go cue / someone answered / locked) without
            shifting the question and options below it. */}
        {phase === 'question' && game.mc_mode && (
          <div className="min-h-[1.75rem] flex items-center justify-center text-center px-2">
            {iHavePicked ? (
              <p className="text-sm text-[var(--text-secondary)]">
                {t('mc.answerLocked')} · {timeLeft}s
              </p>
            ) : someonePicked ? (
              <p className="text-base font-semibold" style={{ color: 'var(--buzz-red)' }}>
                {t('mc.someoneAnswered', { n: timeLeft })}
              </p>
            ) : (
              <p className="text-base font-semibold" style={{ color: 'var(--correct)' }}>
                {t('game.answerNow')}
              </p>
            )}
          </div>
        )}

        {/* Voice answer cue — both players speak at once (no buzzer). */}
        {phase === 'answering' && !iAmDone && (
          <div className="text-center">
            <p className="text-xl font-semibold" style={{ color: 'var(--correct)' }}>
              {t('game.speakAnswerNow')}
            </p>
            <p className="text-[var(--text-secondary)] mt-1 text-sm">
              {t('game.speakHint')}
            </p>
          </div>
        )}

        {/* After locking in — waiting for the opponent (or the timer). */}
        {phase === 'answering' && iAmDone && (
          <div className="text-center flex flex-col items-center gap-2">
            <span className="text-3xl" style={{ color: 'var(--correct)' }}>{'\u2713'}</span>
            <p className="text-base font-semibold text-[var(--text-primary)]">
              {t('game.answerLockedIn')}
            </p>
            <p className="text-[var(--text-secondary)] text-sm">
              {t('game.waitingOpponent')}
            </p>
          </div>
        )}

        {/* Checking indicator — AI is judging both answers */}
        {phase === 'checking' && (
          <div className="text-center flex flex-col items-center gap-2">
            <div className="w-7 h-7 rounded-full border-2 border-[var(--border-strong)] border-t-[var(--accent)] animate-spin" />
            <p className="text-base font-medium text-[var(--text-secondary)]">
              {t('game.checkingAnswer')}
            </p>
          </div>
        )}

        {/* Question text — the big centrepiece. Hidden on the result screen
            so the per-player reveal has room. */}
        {currentQuestion && phase !== 'ended' && phase !== 'result' && (
          <div className="text-center">
            <p className="text-lg lg:text-2xl font-semibold leading-snug text-[var(--text-primary)]">
              {currentQuestion.question}
            </p>
          </div>
        )}

        {/* ---- MC Options (multiple choice mode) ----
            Visible (but disabled) during 'thinking' so both players can
            read the choices, then become clickable when the lock lifts.
            Each player answers independently; once I've picked, my choice
            locks (the opponent still has the grace window to also answer). */}
        {game.mc_mode && currentQuestion?.options &&
          (phase === 'thinking' || phase === 'question' || phase === 'result') && (
          <MCOptions
            options={currentQuestion.options}
            correctAnswer={phase === 'result' ? currentQuestion.correct_answer : undefined}
            myPick={myMcPick}
            opponentPick={isHost ? game.player_mc_index : game.host_mc_index}
            canSelect={phase === 'question' && !iHavePicked}
            youLabel={t('mc.you')}
            opponentLabel={oppLabel}
            onSelect={onMCSelect}
          />
        )}

        {/* ---- Voice answer area: live "heard" box + type fallback + Done ----
            Hidden once locked in (the waiting state above shows instead). */}
        {phase === 'answering' && !game.mc_mode && !iAmDone && (
          <div className="w-full flex flex-col gap-2.5">
            {/* Live transcript — what the mic / typing has so far. */}
            <div
              className="w-full rounded-xl p-4 border min-h-[4.5rem]"
              style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}
            >
              <p className="text-[10px] font-semibold tracking-wider text-[var(--text-muted)] mb-1 uppercase">
                {t('game.yourAnswer')}
              </p>
              <p className="text-[var(--text-primary)] text-base italic leading-relaxed">
                {transcript
                  ? `\u201C${transcript}\u201D`
                  : <span className="text-[var(--text-muted)] not-italic">
                      {speechSupported ? t('game.startSpeaking') : t('game.typeYourAnswer')}
                    </span>}
              </p>
            </div>

            {/* Type fallback — always available; the only path if the
                browser has no speech support. Typing stops the mic. */}
            <input
              type="text"
              value={transcript}
              onChange={(e) => onTypeAnswer(e.target.value)}
              placeholder={t('game.typePlaceholder')}
              className="w-full rounded-lg px-3 py-2 text-sm outline-none border"
              style={{
                background: 'var(--bg-base)',
                borderColor: 'var(--border)',
                color: 'var(--text-primary)',
              }}
              onKeyDown={(e) => { if (e.key === 'Enter') onFinish(); }}
            />

            {/* Done — lock in early so we don't wait out the whole window. */}
            <button
              onClick={onFinish}
              className="w-full px-6 py-2.5 rounded-xl font-semibold text-white transition-colors"
              style={{ background: 'var(--accent)' }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--accent-hover)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'var(--accent)')}
            >
              {t('game.done')}
            </button>
          </div>
        )}

        {/* ---- Voice RESULT reveal (per player) ----
            Shows both players' spoken answers with ✓/✗ and the correct
            answer. No full-screen flash — clearer and no layout jump. */}
        {phase === 'result' && !game.mc_mode && (
          <div className="w-full flex flex-col gap-2.5">
            <TranscriptResult
              label={t('mc.you')}
              text={myTranscript}
              correct={myCorrect}
              emptyHint={t('game.saidNothing')}
            />
            <TranscriptResult
              label={oppLabel}
              text={oppTranscript}
              correct={oppCorrect}
              emptyHint={t('game.saidNothing')}
            />
            {currentQuestion?.correct_answer && (
              <div
                className="w-full rounded-xl px-4 py-3 border text-center"
                style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}
              >
                <p className="text-[10px] font-semibold tracking-wider text-[var(--text-muted)] mb-1 uppercase">
                  {t('game.correctAnswer')}
                </p>
                <p className="text-lg font-semibold text-[var(--correct)]">
                  {currentQuestion.correct_answer}
                </p>
              </div>
            )}
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
    </div>
  );
}

// ------------------------------------------------------------
// One player's spoken answer on the result screen.
// Green border/✓ if judged correct, red/✗ if wrong, neutral if blank.
// ------------------------------------------------------------
function TranscriptResult({
  label, text, correct, emptyHint,
}: {
  label: string;
  text: string;
  correct: boolean | null;
  emptyHint: string;
}) {
  const said = text && text.trim().length > 0;
  const colour = correct ? 'var(--correct)' : said ? 'var(--wrong)' : 'var(--border-strong)';
  return (
    <div
      className="w-full rounded-xl px-4 py-2.5 border flex items-center gap-3"
      style={{ background: 'var(--bg-card)', borderColor: colour }}
    >
      <span
        className="text-lg font-bold w-5 text-center shrink-0"
        style={{ color: colour }}
      >
        {correct ? '\u2713' : said ? '\u2717' : '\u2013'}
      </span>
      <div className="min-w-0">
        <p className="text-[10px] font-semibold tracking-wider text-[var(--text-muted)] uppercase">
          {label}
        </p>
        <p className="text-sm text-[var(--text-primary)] italic truncate">
          {said ? `\u201C${text}\u201D` : emptyHint}
        </p>
      </div>
    </div>
  );
}
