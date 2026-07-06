// ============================================================
// Sound effects — lightweight Web Audio API tones (no asset files).
// Shares one AudioContext with the mic analyser cap (~6 per browser).
// ============================================================

export type SoundId =
  | 'click'
  | 'join'
  | 'start'
  | 'go'
  | 'nextRound'
  | 'answerOther'
  | 'answerSelf'
  | 'tick'
  | 'correct'
  | 'wrong'
  | 'reveal'
  | 'winner'
  | 'tie'
  | 'point'
  | 'vote'
  | 'meow';

const MUTE_KEY = 'whosmarter-sounds-muted';

let sharedCtx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (sharedCtx && sharedCtx.state !== 'closed') return sharedCtx;
  try {
    const Ctx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    sharedCtx = new Ctx();
    return sharedCtx;
  } catch {
    return null;
  }
}

export function isSoundsMuted(): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem(MUTE_KEY) === '1';
}

export function setSoundsMuted(muted: boolean): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(MUTE_KEY, muted ? '1' : '0');
}

function resume(ctx: AudioContext): void {
  if (ctx.state === 'suspended') ctx.resume().catch(() => {});
}

function tone(
  ctx: AudioContext,
  freq: number,
  start: number,
  duration: number,
  type: OscillatorType = 'sine',
  volume = 0.12,
): void {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(volume, start);
  gain.gain.exponentialRampToValueAtTime(0.001, start + duration);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(start);
  osc.stop(start + duration + 0.05);
}

// Real cat meow (~0.8s) — CC BY-SA 3.0, Dan Crosby via Wikimedia Commons (File:Meow.ogg)
let meowBuffer: AudioBuffer | null = null;
let meowLoadPromise: Promise<AudioBuffer | null> | null = null;

function loadMeowBuffer(ctx: AudioContext): Promise<AudioBuffer | null> {
  if (meowBuffer) return Promise.resolve(meowBuffer);
  if (meowLoadPromise) return meowLoadPromise;
  meowLoadPromise = fetch('/sounds/meow.mp3')
    .then((res) => (res.ok ? res.arrayBuffer() : Promise.reject(new Error('meow fetch failed'))))
    .then((data) => ctx.decodeAudioData(data))
    .then((buf) => {
      meowBuffer = buf;
      return buf;
    })
    .catch(() => null);
  return meowLoadPromise;
}

function playSample(
  ctx: AudioContext,
  buffer: AudioBuffer,
  start: number,
  volume: number,
  playbackRate = 1,
): void {
  const src = ctx.createBufferSource();
  const gain = ctx.createGain();
  src.buffer = buffer;
  src.playbackRate.value = playbackRate;
  gain.gain.value = volume;
  src.connect(gain);
  gain.connect(ctx.destination);
  src.start(start);
}

function meow(ctx: AudioContext, start: number, volume: number): void {
  const level = volume * 2.8;
  if (meowBuffer) {
    playSample(ctx, meowBuffer, start, level, 1.5);
    return;
  }
  void loadMeowBuffer(ctx).then((buf) => {
    if (buf) playSample(ctx, buf, ctx.currentTime, level, 1.5);
  });
}

export function playSound(id: SoundId): void {
  if (isSoundsMuted()) return;
  const ctx = getCtx();
  if (!ctx) return;
  resume(ctx);

  const t = ctx.currentTime;
  const v = 0.11;

  switch (id) {
    case 'click':
      tone(ctx, 720, t, 0.04, 'square', v * 0.45);
      break;
    case 'join':
      tone(ctx, 523, t, 0.09, 'sine', v);
      tone(ctx, 659, t + 0.07, 0.11, 'sine', v);
      break;
    case 'start':
      tone(ctx, 392, t, 0.1, 'sine', v);
      tone(ctx, 523, t + 0.09, 0.1, 'sine', v);
      tone(ctx, 659, t + 0.18, 0.12, 'sine', v);
      tone(ctx, 784, t + 0.3, 0.18, 'sine', v * 1.1);
      break;
    case 'go':
      tone(ctx, 880, t, 0.07, 'square', v * 0.55);
      tone(ctx, 1174, t + 0.05, 0.14, 'sine', v);
      break;
    case 'nextRound':
      tone(ctx, 440, t, 0.08, 'sine', v * 0.7);
      tone(ctx, 554, t + 0.09, 0.1, 'sine', v * 0.8);
      break;
    case 'answerOther':
      tone(ctx, 494, t, 0.05, 'triangle', v * 0.75);
      break;
    case 'answerSelf':
      tone(ctx, 600, t, 0.05, 'sine', v);
      tone(ctx, 800, t + 0.05, 0.07, 'sine', v * 0.85);
      break;
    case 'tick':
      tone(ctx, 1046, t, 0.035, 'square', v * 0.35);
      break;
    case 'correct':
      tone(ctx, 523, t, 0.09, 'sine', v);
      tone(ctx, 659, t + 0.09, 0.09, 'sine', v);
      tone(ctx, 784, t + 0.18, 0.18, 'sine', v * 1.1);
      break;
    case 'wrong':
      tone(ctx, 349, t, 0.12, 'sawtooth', v * 0.45);
      tone(ctx, 262, t + 0.1, 0.16, 'sawtooth', v * 0.35);
      break;
    case 'reveal':
      tone(ctx, 220, t, 0.07, 'sine', v * 0.75);
      tone(ctx, 330, t + 0.09, 0.18, 'sine', v);
      break;
    case 'winner':
      [523, 659, 784, 1046].forEach((f, i) => tone(ctx, f, t + i * 0.11, 0.18, 'sine', v));
      tone(ctx, 1046, t + 0.48, 0.35, 'sine', v * 1.2);
      break;
    case 'tie':
      tone(ctx, 440, t, 0.14, 'sine', v);
      tone(ctx, 440, t + 0.18, 0.14, 'sine', v * 0.75);
      break;
    case 'point':
      tone(ctx, 880, t, 0.07, 'sine', v * 0.55);
      break;
    case 'vote':
      tone(ctx, 587, t, 0.06, 'sine', v * 0.65);
      tone(ctx, 740, t + 0.06, 0.08, 'sine', v * 0.55);
      break;
    case 'meow':
      meow(ctx, t, v);
      break;
  }
}
