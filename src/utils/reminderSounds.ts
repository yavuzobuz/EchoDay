export type ReminderSound = 'tts' | 'alarm1' | 'alarm2' | 'alarm3';

let ctx: AudioContext | null = null;
let stopCurrent: (() => void) | null = null;

function ensureContext(): AudioContext {
  if (!ctx) {
    // @ts-ignore
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    ctx = new AudioCtx();
  }
  return ctx!;
}

function scheduleTone(context: AudioContext, frequency: number, type: OscillatorType, durationMs: number, when: number, volume = 0.2) {
  const osc = context.createOscillator();
  const gain = context.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(frequency, when);
  gain.gain.setValueAtTime(volume, when);
  osc.connect(gain).connect(context.destination);
  osc.start(when);
  osc.stop(when + durationMs / 1000);
}

export function playReminderSound(kind: ReminderSound): () => void {
  const context = ensureContext();
  if (context.state === 'suspended') {
    context.resume();
  }
  let when = context.currentTime + 0.02;

  // Stop any previous
  if (stopCurrent) stopCurrent();

  const stops: number[] = [];

  const pushPattern = (pattern: Array<{ f: number; d: number; t?: OscillatorType; v?: number }>, repeat = 1, gapMs = 120) => {
    for (let r = 0; r < repeat; r++) {
      pattern.forEach(p => {
        scheduleTone(context, p.f, p.t || 'sine', p.d, when, p.v ?? 0.22);
        when += p.d / 1000;
      });
      when += gapMs / 1000;
    }
  };

  if (kind === 'alarm1') {
    // Soft chime pattern
    const pat = [
      { f: 880, d: 180, t: 'sine' },
      { f: 660, d: 180, t: 'sine' },
      { f: 523.25, d: 260, t: 'triangle' },
    ];
    pushPattern(pat, 4, 140);
  } else if (kind === 'alarm2') {
    // Digital bell pattern
    const pat = [
      { f: 1200, d: 100, t: 'square', v: 0.18 },
      { f: 1000, d: 100, t: 'square', v: 0.18 },
      { f: 800, d: 150, t: 'square', v: 0.18 },
    ];
    pushPattern(pat, 6, 90);
  } else if (kind === 'alarm3') {
    // Classic buzzer pulses
    for (let i = 0; i < 10; i++) {
      scheduleTone(context, 540, 'sawtooth', 120, when, 0.15);
      when += 0.2;
    }
  }

  const endTime = when;
  const stopper = () => {
    try { if (context && context.close) { /* don't close to reuse */ } } catch {}
  };
  stopCurrent = stopper;
  return stopper;
}
