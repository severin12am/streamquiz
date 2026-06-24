'use client';
// ============================================================
// QuestionPanel — central game column (question, timer, answers)
//
// Displays:
//   - Current question text + circular countdown
//   - Live multiplayer leaderboard
//   - Multiple-choice options  OR  the voice answer area
//   - Per-player result reveal (everyone's answer + ✓/✗)
//
// No buzzer: in voice mode everyone talks; in MC mode everyone picks.
// Each answer is judged independently so every correct player scores.
// All data arrives as props — no hooks here.
// ============================================================

import React from 'react';
import MCOptions  from './MCOptions';
import PlayerStatusBar from './PlayerStatusBar';
import TopicPill from './TopicPill';
import CountdownTimer from './CountdownTimer';
import { useLocale } from '@/context/LocaleProvider';
import type { Game, Player } from '@/lib/types';
import { playerColor, playerInitial } from '@/lib/player-colors';

/** One player's pick on an MC option (shown at the reveal). */
export interface OptionPick {
  id:     string;
  name:   string;
  colour: string;
  isMe:   boolean;
}

interface QuestionPanelProps {
  game:            Game;
  me:              Player;
  players:         Player[];
  timeLeft:        number;
  timeLeftMs:      number;
  timerTotal:      number;
  transcript:      string;  // this viewer's OWN live answer (speech or typed)
  iAmDone:         boolean; // this viewer locked in their voice answer
  speechSupported: boolean;
  /** True while this viewer is holding the answer button (recording aloud). */
  answerHeld:      boolean;
  onMCSelect:      (index: number) => void;
  onTypeAnswer:    (text: string) => void;
  onFinish:        () => void;        // typed answer submit (Enter)
  onAnswerHoldStart: () => void;      // press-and-hold to record a spoken answer
  onAnswerHoldEnd:   () => void;      // release to lock the spoken answer in
}

export default function QuestionPanel({
  game,
  me,
  players,
  timeLeft,
  timeLeftMs,
  timerTotal,
  transcript,
  iAmDone,
  speechSupported,
  answerHeld,
  onMCSelect,
  onTypeAnswer,
  onFinish,
  onAnswerHoldStart,
  onAnswerHoldEnd,
}: QuestionPanelProps) {
  const { t } = useLocale();
  const currentQuestion = game.questions[game.current_question_index];
  const phase           = game.phase;

  const myMcPick     = me.mc_index;
  const iHavePicked   = myMcPick !== null;

  // Mode behaviour: 'regular' lets you change your MC pick until the timer
  // ends; legacy 'classic'/'think' lock the pick once made.
  const isRegular   = game.game_mode === 'regular';
  const canPick      = phase === 'question' && (isRegular || !iHavePicked);

  // WHO chose each option (shown at the reveal so everyone can see what
  // each player picked — colour-coded by player).
  const picksByOption: OptionPick[][] = [[], [], [], []];
  for (const p of players) {
    if (p.mc_index !== null && p.mc_index >= 0 && p.mc_index < 4) {
      picksByOption[p.mc_index].push({
        id: p.id,
        name: p.name,
        colour: playerColor(p.slot),
        isMe: p.id === me.id,
      });
    }
  }

  // Translucent surfaces (more see-through than before, per request).
  const panel  = 'rgba(255,255,255,0.28)';
  const panelQ = 'rgba(255,255,255,0.36)';   // question text — slightly stronger for legibility

  // ----- Shared "timer + status + question" block. Rendered beside the PiP
  //       on mobile (top) and above the answers on desktop (bottom). -----
  const qBlock = (
    <>
      {(phase === 'thinking' || phase === 'question' || phase === 'answering') && (
        <CountdownTimer current={timeLeft} total={timerTotal} remainingMs={timeLeftMs} />
      )}

      {/* Think-mode lock banner */}
      {phase === 'thinking' && (
        <div
          className="text-center px-3 py-1.5 rounded-xl"
          style={{ background: panel, backdropFilter: 'blur(6px)', border: '1px solid var(--border)' }}
        >
          <p className="text-sm lg:text-base font-semibold" style={{ color: 'var(--accent)' }}>
            {t('game.getReady')}
          </p>
          <p className="text-[var(--text-secondary)] text-[11px] lg:text-xs">
            {t('game.thinkHint')}
          </p>
        </div>
      )}

      {/* Locked in — waiting for the others / timer */}
      {phase === 'answering' && iAmDone && (
        <div
          className="text-center flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl"
          style={{ background: panel, backdropFilter: 'blur(6px)', border: '1px solid var(--border)' }}
        >
          <span className="text-2xl" style={{ color: 'var(--correct)' }}>{'\u2713'}</span>
          <p className="text-sm font-semibold text-[var(--text-primary)]">
            {t('game.answerLockedIn')}
          </p>
          <p className="text-[var(--text-secondary)] text-xs">
            {t('game.waitingOpponent')}
          </p>
        </div>
      )}

      {/* Checking indicator */}
      {phase === 'checking' && (
        <div
          className="text-center flex flex-col items-center gap-1 px-3 py-2 rounded-xl"
          style={{ background: panel, backdropFilter: 'blur(6px)', border: '1px solid var(--border)' }}
        >
          <div className="w-6 h-6 rounded-full border-2 border-[var(--border-strong)] border-t-[var(--accent)] animate-spin" />
          <p className="text-sm font-medium text-[var(--text-secondary)]">
            {t('game.checkingAnswer')}
          </p>
        </div>
      )}

      {/* Question text — with the question counter appended inline (e.g. "… 2/5") */}
      {currentQuestion && phase !== 'ended' && phase !== 'result' && (
        <div
          className="w-full text-center px-3 py-2 rounded-xl"
          style={{ background: panelQ, backdropFilter: 'blur(8px)', border: '1px solid var(--border)' }}
        >
          <p className="text-xs sm:text-sm lg:text-xl font-semibold leading-snug text-[var(--text-primary)]">
            {currentQuestion.question}
            <span className="ml-1.5 font-bold tabular-nums whitespace-nowrap" style={{ color: 'var(--accent)' }}>
              {game.current_question_index + 1}/{game.questions.length}
            </span>
          </p>
        </div>
      )}
    </>
  );

  return (
    <div className="relative flex flex-col h-full w-full min-h-0 items-center pointer-events-none">
      {/* ================= TOP ================= */}

      {/* ---- DESKTOP top: centered topic + player status ---- */}
      <div className="hidden lg:flex w-full max-w-md mx-auto flex-col items-center gap-2 pointer-events-auto">
        <TopicPill topic={game.topic} background={panel} showLabel textClassName="max-w-[18rem]" />
        <PlayerStatusBar players={players} meId={me.id} phase={phase} mcMode={game.mc_mode} align="center" />
      </div>

      {/* ---- MOBILE top: flows to the RIGHT of the self-PiP, then wraps BELOW it.
           A float spacer reserves the PiP footprint; the topic+question block sits
           beside it and the player-status chips flow around it (right, then below). */}
      <div className="w-full lg:hidden pointer-events-auto pr-2">
        <div className="float-start w-40 h-52 sm:w-48 sm:h-60 me-2 pointer-events-none" aria-hidden />

        {/* topic + timer + question — beside the PiP (own block, never overlaps it) */}
        <div className="flow-root flex flex-col items-start gap-1.5">
          <TopicPill topic={game.topic} background={panel} textClassName="max-w-[7rem] sm:max-w-[12rem]" />
          {qBlock}
        </div>

        {/* player status — inline chips wrap beside the PiP, then continue below it */}
        <div className="pt-1.5">
          <PlayerStatusBar players={players} meId={me.id} phase={phase} mcMode={game.mc_mode} inline />
        </div>
      </div>

      {/* ============ OPEN MIDDLE (video shows through) ============ */}
      <div className="flex-1 min-h-0" />

      {/* ================= BOTTOM ================= */}
      <div className="w-full flex flex-col items-center gap-1.5 sm:gap-2 pointer-events-auto pb-[max(0.25rem,env(safe-area-inset-bottom))]">
        {/* timer + status + question — DESKTOP position (above answers) */}
        <div className="hidden lg:flex w-full max-w-md flex-col items-center gap-2">
          {qBlock}
        </div>

        {/* ---- MC Options (2x2 always — fits without scrolling) ---- */}
        {game.mc_mode && currentQuestion?.options &&
          (phase === 'thinking' || phase === 'question' || phase === 'result') && (
          <MCOptions
            options={currentQuestion.options}
            correctAnswer={phase === 'result' ? currentQuestion.correct_answer : undefined}
            myPick={myMcPick}
            picksByOption={phase === 'result' ? picksByOption : undefined}
            canSelect={canPick}
            youLabel={t('mc.you')}
            onSelect={onMCSelect}
          />
        )}

        {/* ---- Voice answer area: hold-to-answer ---- */}
        {phase === 'answering' && !game.mc_mode && !iAmDone && (
          <div className="w-full max-w-lg flex flex-col gap-1.5">
            <div
              className="w-full px-2.5 py-2 rounded-xl min-h-[3rem]"
              style={{ background: panel, backdropFilter: 'blur(6px)', border: '1px solid var(--border)' }}
            >
              <p className="text-[9px] font-semibold tracking-wider text-[var(--text-muted)] mb-0.5 uppercase">
                {t('game.yourAnswer')}
              </p>
              <p className="text-[var(--text-primary)] text-sm italic leading-relaxed">
                {transcript
                  ? `\u201C${transcript}\u201D`
                  : <span className="text-[var(--text-muted)] not-italic">
                      {answerHeld
                        ? t('game.listening')
                        : speechSupported ? t('game.holdHint') : t('game.typeYourAnswer')}
                    </span>}
              </p>
            </div>

            <input
              type="text"
              value={transcript}
              onChange={(e) => onTypeAnswer(e.target.value)}
              placeholder={t('game.typePlaceholder')}
              className="w-full rounded-xl px-3 py-2 text-sm text-[var(--text-primary)]"
              style={{ background: 'rgba(255,255,255,0.55)', backdropFilter: 'blur(6px)', border: '1px solid var(--border)' }}
              onKeyDown={(e) => { if (e.key === 'Enter') onFinish(); }}
            />

            {/* Hold to record a spoken answer (mic muted to peers while held). */}
            <button
              type="button"
              onPointerDown={(e) => { e.preventDefault(); onAnswerHoldStart(); }}
              onPointerUp={onAnswerHoldEnd}
              onPointerLeave={onAnswerHoldEnd}
              onPointerCancel={onAnswerHoldEnd}
              className={`keycap keycap-glass w-full px-6 py-3 rounded-xl font-semibold text-white select-none touch-none ${
                answerHeld ? 'keycap-success' : 'keycap-primary'
              }`}
            >
              {answerHeld ? t('game.recording') : t('game.holdToAnswer')}
            </button>
          </div>
        )}

        {/* ---- Voice RESULT reveal (every player) ---- */}
        {phase === 'result' && !game.mc_mode && (
          <div className="w-full max-w-lg flex flex-col gap-1.5 max-h-[42vh] overflow-y-auto pr-0.5">
            {[...players]
              .sort((a, b) => a.slot - b.slot)
              .map((p) => (
                <TranscriptResult
                  key={p.id}
                  name={p.name}
                  isMe={p.id === me.id}
                  youLabel={t('mc.you')}
                  colour={playerColor(p.slot)}
                  text={p.transcript}
                  correct={p.correct}
                  emptyHint={t('game.saidNothing')}
                />
              ))}
            {currentQuestion?.correct_answer && (
              <div
                className="px-3 py-2 text-center rounded-xl"
                style={{ background: 'rgba(47,158,111,0.72)', backdropFilter: 'blur(6px)' }}
              >
                <p className="text-[9px] font-semibold tracking-wider text-white/85 mb-0.5 uppercase">
                  {t('game.correctAnswer')}
                </p>
                <p className="text-base font-semibold text-white">
                  {currentQuestion.correct_answer}
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ------------------------------------------------------------
// One player's spoken answer on the result screen. Colour-coded by
// player (avatar) so it's obvious whose answer this is, with a clear
// ✓ / ✗ outcome badge.
// ------------------------------------------------------------
function TranscriptResult({
  name, isMe, youLabel, colour, text, correct, emptyHint,
}: {
  name: string;
  isMe: boolean;
  youLabel: string;
  colour: string;
  text: string;
  correct: boolean | null;
  emptyHint: string;
}) {
  const said = text && text.trim().length > 0;
  const outcome = correct ? 'var(--correct)' : said ? 'var(--wrong)' : 'var(--border-strong)';
  return (
    <div
      className="w-full px-3 py-2 flex items-center gap-2.5 rounded-xl"
      style={{
        background: 'rgba(255,255,255,0.62)',
        backdropFilter: 'blur(8px)',
        border: '1px solid var(--border)',
        borderLeft: `4px solid ${colour}`,
      }}
    >
      {/* Colour avatar (player identity) */}
      <span
        className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white"
        style={{ background: colour }}
      >
        {playerInitial(name)}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[9px] font-semibold tracking-wider uppercase" style={{ color: colour }}>
          {name}{isMe ? ` (${youLabel})` : ''}
        </p>
        <p className="text-xs text-[var(--text-primary)] italic truncate">
          {said ? `\u201C${text}\u201D` : emptyHint}
        </p>
      </div>
      {/* Outcome badge */}
      <span
        className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold text-white"
        style={{ background: outcome }}
      >
        {correct ? '\u2713' : said ? '\u2717' : '\u2013'}
      </span>
    </div>
  );
}
