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

  return (
    <div
      className="relative flex flex-col h-full"
      style={{ background: 'var(--bg-base)', borderLeft: '1px solid var(--border)', borderRight: '1px solid var(--border)' }}
    >
      {/* ---- TOP BAR — topic + progress ---- */}
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

      {/* ---- SCORES — always visible ---- */}
      <div className="px-4 pt-2 pb-1 lg:pt-3 lg:pb-2">
        <ScoreBoard players={players} meId={me.id} phase={phase} />
      </div>

      {/* ---- QUESTION TEXT + TIMER ---- */}
      <div className="flex-1 flex flex-col items-center justify-start lg:justify-center gap-2 lg:gap-6 px-4 lg:px-8 py-1.5 lg:py-2 pb-4 overflow-y-auto">

        {(phase === 'thinking' || phase === 'question' || phase === 'answering') && (
          <CountdownTimer current={timeLeft} total={timerTotal} remainingMs={timeLeftMs} />
        )}

        {/* Think-mode lock banner */}
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

        {/* MC pick-phase status line (fixed height so layout doesn't jump) */}
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

        {/* Voice answer cue */}
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

        {/* Locked in — waiting for the others / timer */}
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

        {/* Checking indicator */}
        {phase === 'checking' && (
          <div className="text-center flex flex-col items-center gap-2">
            <div className="w-7 h-7 rounded-full border-2 border-[var(--border-strong)] border-t-[var(--accent)] animate-spin" />
            <p className="text-base font-medium text-[var(--text-secondary)]">
              {t('game.checkingAnswer')}
            </p>
          </div>
        )}

        {/* Question text */}
        {currentQuestion && phase !== 'ended' && phase !== 'result' && (
          <div className="text-center">
            <p className="text-lg lg:text-2xl font-semibold leading-snug text-[var(--text-primary)]">
              {currentQuestion.question}
            </p>
          </div>
        )}

        {/* ---- MC Options ---- */}
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
          <div className="w-full flex flex-col gap-2.5">
            <div className="keycap-well-frame">
              <div className="keycap-well w-full p-4 min-h-[4.5rem]">
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
            </div>

            <div className="keycap-input-frame">
              <input
                type="text"
                value={transcript}
                onChange={(e) => onTypeAnswer(e.target.value)}
                placeholder={t('game.typePlaceholder')}
                className="keycap-input w-full rounded-xl px-3 py-2.5 text-sm text-[var(--text-primary)]"
                onKeyDown={(e) => { if (e.key === 'Enter') onFinish(); }}
              />
            </div>

            <button
              onClick={onFinish}
              className="keycap keycap-primary w-full px-6 py-2.5 rounded-xl font-semibold text-white"
            >
              {t('game.doneOptional')}
            </button>
            <p className="text-center text-xs text-[var(--text-muted)]">
              {t('game.autoSubmitHint')}
            </p>
          </div>
        )}

        {/* ---- Voice RESULT reveal (every player) ---- */}
        {phase === 'result' && !game.mc_mode && (
          <div className="w-full flex flex-col gap-2 max-w-lg">
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
              <div className="keycap-well-frame mt-1">
                <div className="keycap-well w-full px-4 py-3 text-center">
                  <p className="text-[10px] font-semibold tracking-wider text-[var(--text-muted)] mb-1 uppercase">
                    {t('game.correctAnswer')}
                  </p>
                  <p className="text-lg font-semibold text-[var(--correct)]">
                    {currentQuestion.correct_answer}
                  </p>
                </div>
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
    <div className="keycap-well-frame w-full">
      <div
        className="keycap-well w-full px-3 py-2.5 flex items-center gap-3"
        style={{ borderLeft: `4px solid ${colour}` }}
      >
      {/* Colour avatar (player identity) */}
      <span
        className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white"
        style={{ background: colour }}
      >
        {playerInitial(name)}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-semibold tracking-wider uppercase" style={{ color: colour }}>
          {name}{isMe ? ` (${youLabel})` : ''}
        </p>
        <p className="text-sm text-[var(--text-primary)] italic truncate">
          {said ? `\u201C${text}\u201D` : emptyHint}
        </p>
      </div>
      {/* Outcome badge */}
      <span
        className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-sm font-bold text-white"
        style={{ background: outcome }}
      >
        {correct ? '\u2713' : said ? '\u2717' : '\u2013'}
      </span>
      </div>
    </div>
  );
}
