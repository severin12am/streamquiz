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
import ScoreBoard from './ScoreBoard';
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
  onMCSelect:      (index: number) => void;
  onTypeAnswer:    (text: string) => void;
  onFinish:        () => void;
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
  onMCSelect,
  onTypeAnswer,
  onFinish,
}: QuestionPanelProps) {
  const { t } = useLocale();
  const currentQuestion = game.questions[game.current_question_index];
  const phase           = game.phase;

  const myMcPick     = me.mc_index;
  const iHavePicked   = myMcPick !== null;
  const someonePicked = players.some((p) => p.mc_index !== null);

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

  const panel = 'rgba(255,255,255,0.86)';

  return (
    <div className="relative flex flex-col h-full w-full min-h-0 items-center pointer-events-none">
      {/* ================= TOP CLUSTER ================= */}
      {/* topic + counter, scores (desktop), timer, status, question — all
          centered and self-sized so the video stays visible around them. */}
      <div className="w-full max-w-md mx-auto flex flex-col items-center gap-1.5 sm:gap-2 pointer-events-auto">
        {/* topic + question counter (one centered pill) */}
        <div
          className="flex items-center gap-3 px-3 py-1.5 rounded-full"
          style={{ background: panel, backdropFilter: 'blur(6px)', border: '1px solid var(--border)' }}
        >
          <span className="flex items-baseline gap-1.5 min-w-0">
            <span className="text-[9px] font-semibold tracking-wider text-[var(--text-muted)] uppercase">
              {t('game.topic')}
            </span>
            <span className="text-xs font-medium text-[var(--text-secondary)] truncate max-w-[40vw] sm:max-w-[16rem]">
              {game.topic}
            </span>
          </span>
          <span className="w-px h-3.5 bg-[var(--border-strong)]" />
          <span className="text-xs font-semibold text-[var(--text-primary)] tabular-nums whitespace-nowrap">
            {game.current_question_index + 1} / {game.questions.length}
          </span>
        </div>

        {/* scores / answered panel — desktop only (on mobile it lives on
            each camera feed instead) */}
        <div
          className="hidden lg:block px-2 py-1 rounded-full max-w-full"
          style={{ background: panel, backdropFilter: 'blur(6px)', border: '1px solid var(--border)' }}
        >
          <ScoreBoard players={players} meId={me.id} phase={phase} />
        </div>

        {(phase === 'thinking' || phase === 'question' || phase === 'answering') && (
          <CountdownTimer current={timeLeft} total={timerTotal} remainingMs={timeLeftMs} />
        )}

        {/* Think-mode lock banner */}
        {phase === 'thinking' && (
          <div
            className="text-center px-3 py-1.5 rounded-xl"
            style={{ background: panel, backdropFilter: 'blur(6px)', border: '1px solid var(--border)' }}
          >
            <p className="text-base font-semibold" style={{ color: 'var(--accent)' }}>
              {t('game.getReady')}
            </p>
            <p className="text-[var(--text-secondary)] text-xs">
              {t('game.thinkHint')}
            </p>
          </div>
        )}

        {/* MC pick-phase status line */}
        {phase === 'question' && game.mc_mode && (
          <div
            className="px-3 py-1 rounded-full text-center"
            style={{ background: panel, backdropFilter: 'blur(6px)', border: '1px solid var(--border)' }}
          >
            {iHavePicked ? (
              <p className="text-xs text-[var(--text-secondary)]">
                {t('mc.answerLocked')} · {timeLeft}s
              </p>
            ) : someonePicked ? (
              <p className="text-sm font-semibold" style={{ color: 'var(--buzz-red)' }}>
                {t('mc.someoneAnswered', { n: timeLeft })}
              </p>
            ) : (
              <p className="text-sm font-semibold" style={{ color: 'var(--correct)' }}>
                {t('game.answerNow')}
              </p>
            )}
          </div>
        )}

        {/* Voice answer cue */}
        {phase === 'answering' && !iAmDone && (
          <div
            className="text-center px-3 py-1.5 rounded-xl"
            style={{ background: 'rgba(47,158,111,0.9)', backdropFilter: 'blur(6px)' }}
          >
            <p className="text-base font-semibold text-white">
              {t('game.speakAnswerNow')}
            </p>
            <p className="text-white/85 text-xs">
              {t('game.speakHint')}
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

        {/* Question text — translucent panel sized to content */}
        {currentQuestion && phase !== 'ended' && phase !== 'result' && (
          <div
            className="w-full text-center px-3 py-2 rounded-xl"
            style={{ background: panel, backdropFilter: 'blur(8px)', border: '1px solid var(--border)' }}
          >
            <p className="text-sm sm:text-base lg:text-xl font-semibold leading-snug text-[var(--text-primary)]">
              {currentQuestion.question}
            </p>
          </div>
        )}
      </div>

      {/* ============ OPEN MIDDLE (video shows through) ============ */}
      <div className="flex-1 min-h-0" />

      {/* ================= BOTTOM CLUSTER ================= */}
      {/* answers / voice area / result reveal — centered, pinned to bottom */}
      <div className="w-full flex justify-center pointer-events-auto pb-[max(0.25rem,env(safe-area-inset-bottom))]">
        {/* ---- MC Options (2x2 always — fits without scrolling) ---- */}
        {game.mc_mode && currentQuestion?.options &&
          (phase === 'thinking' || phase === 'question' || phase === 'result') && (
          <MCOptions
            options={currentQuestion.options}
            correctAnswer={phase === 'result' ? currentQuestion.correct_answer : undefined}
            myPick={myMcPick}
            picksByOption={phase === 'result' ? picksByOption : undefined}
            canSelect={phase === 'question' && !iHavePicked}
            youLabel={t('mc.you')}
            onSelect={onMCSelect}
          />
        )}

        {/* ---- Voice answer area ---- */}
        {phase === 'answering' && !game.mc_mode && !iAmDone && (
          <div className="w-full max-w-lg flex flex-col gap-1.5">
            <div
              className="w-full p-2.5 rounded-xl min-h-[3.5rem]"
              style={{ background: panel, backdropFilter: 'blur(6px)', border: '1px solid var(--border)' }}
            >
              <p className="text-[9px] font-semibold tracking-wider text-[var(--text-muted)] mb-0.5 uppercase">
                {t('game.yourAnswer')}
              </p>
              <p className="text-[var(--text-primary)] text-sm italic leading-relaxed">
                {transcript
                  ? `\u201C${transcript}\u201D`
                  : <span className="text-[var(--text-muted)] not-italic">
                      {speechSupported ? t('game.startSpeaking') : t('game.typeYourAnswer')}
                    </span>}
              </p>
            </div>

            <input
              type="text"
              value={transcript}
              onChange={(e) => onTypeAnswer(e.target.value)}
              placeholder={t('game.typePlaceholder')}
              className="w-full rounded-xl px-3 py-2 text-sm text-[var(--text-primary)]"
              style={{ background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(6px)', border: '1px solid var(--border)' }}
              onKeyDown={(e) => { if (e.key === 'Enter') onFinish(); }}
            />

            <button
              onClick={onFinish}
              className="keycap keycap-primary w-full px-6 py-2 rounded-xl font-semibold text-white"
            >
              {t('game.doneOptional')}
            </button>
            <p className="text-center text-[10px] text-white/90 font-medium">
              {t('game.autoSubmitHint')}
            </p>
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
                style={{ background: 'rgba(47,158,111,0.92)', backdropFilter: 'blur(6px)' }}
              >
                <p className="text-[9px] font-semibold tracking-wider text-white/80 mb-0.5 uppercase">
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
        background: 'rgba(255,255,255,0.86)',
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
