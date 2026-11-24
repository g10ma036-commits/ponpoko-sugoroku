// 効果音とBGMは、音声ファイルを使わず Web Audio でその場で作る（著作権の心配がなく、オフラインでも鳴る）。
// iPhone では、画面をタップしたときに unlockAudio() を呼ぶまで音が出ない。

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let sfxOn = true;
let bgmOn = true;

export function unlockAudio() {
  if (!ctx) {
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AC) return;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = 0.6;
    master.connect(ctx.destination);
  }
  if (ctx.state === 'suspended') void ctx.resume();
  if (bgmOn) startBgm();
}

export function setSound(sfx: boolean, bgm: boolean) {
  sfxOn = sfx;
  bgmOn = bgm;
  if (!bgm) stopBgm();
  else if (ctx) startBgm();
}

function tone(freq: number, at: number, dur: number, type: OscillatorType = 'square', vol = 0.12, slideTo?: number, out?: AudioNode) {
  if (!ctx || !master) return;
  const t = ctx.currentTime + at;
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g);
  g.connect(out ?? master);
  o.start(t);
  o.stop(t + dur + 0.02);
}

const midi = (n: number) => 440 * Math.pow(2, (n - 69) / 12);

function play(fn: () => void) {
  if (!sfxOn || !ctx) return;
  fn();
}

export const sfx = {
  tap: () => play(() => tone(880, 0, 0.06, 'triangle', 0.12)),
  step: () => play(() => tone(700, 0, 0.05, 'square', 0.05)),
  dice: () =>
    play(() => {
      for (let i = 0; i < 9; i++) tone(300 + Math.random() * 500, i * 0.06, 0.04, 'square', 0.05);
    }),
  coin: () =>
    play(() => {
      tone(midi(83), 0, 0.08, 'square', 0.08);
      tone(midi(88), 0.08, 0.3, 'square', 0.08);
    }),
  bad: () =>
    play(() => {
      tone(392, 0, 0.18, 'sawtooth', 0.06, 330);
      tone(311, 0.2, 0.35, 'sawtooth', 0.06, 220);
    }),
  buy: () =>
    play(() => {
      tone(midi(79), 0, 0.07, 'triangle', 0.14);
      tone(midi(84), 0.07, 0.18, 'triangle', 0.14);
    }),
  card: () => play(() => tone(500, 0, 0.25, 'triangle', 0.1, 1400)),
  kumo: () =>
    play(() => {
      tone(220, 0, 0.25, 'triangle', 0.12, 180);
      tone(260, 0.22, 0.25, 'triangle', 0.12, 200);
      tone(200, 0.44, 0.4, 'triangle', 0.12, 140);
    }),
  fanfare: () =>
    play(() => {
      [72, 76, 79, 84].forEach((n, i) => tone(midi(n), i * 0.11, 0.18, 'square', 0.08));
      [72, 76, 79, 84].forEach((n) => tone(midi(n), 0.5, 0.8, 'triangle', 0.07));
    }),
  event: () =>
    play(() => {
      tone(midi(74), 0, 0.1, 'triangle', 0.12);
      tone(midi(79), 0.1, 0.1, 'triangle', 0.12);
      tone(midi(83), 0.2, 0.25, 'triangle', 0.12);
    }),
};

// ---------------------------------------------------------------- BGM（ヨナ抜き音階ののんびりした曲）

/** [MIDIノート, 長さ(8分音符いくつ分)] */
const MELODY: [number, number][] = [
  [74, 2], [71, 1], [69, 1], [67, 2], [69, 2],
  [71, 2], [69, 1], [67, 1], [64, 4],
  [67, 2], [69, 1], [71, 1], [74, 2], [71, 1], [69, 1],
  [67, 2], [64, 1], [67, 1], [69, 4],
  [74, 2], [76, 1], [74, 1], [71, 2], [69, 2],
  [67, 2], [69, 1], [71, 1], [69, 2], [67, 1], [64, 1],
  [62, 2], [64, 1], [67, 1], [69, 2], [71, 1], [69, 1],
  [67, 4], [67, 4],
];
const BASS = [43, 40, 43, 45, 43, 40, 38, 43];
const EIGHTH = 0.27;

let bgmGain: GainNode | null = null;
let timer: number | null = null;
let nextTime = 0;
let mi = 0;
let eighth = 0;

function startBgm() {
  if (!ctx || !master || timer !== null) return;
  bgmGain = ctx.createGain();
  bgmGain.gain.value = 0.35;
  bgmGain.connect(master);
  nextTime = ctx.currentTime + 0.1;
  mi = 0;
  eighth = 0;
  let noteLeft = 0;
  timer = window.setInterval(() => {
    if (!ctx || !bgmGain) return;
    while (nextTime < ctx.currentTime + 0.4) {
      const at = nextTime - ctx.currentTime;
      if (noteLeft === 0) {
        const [n, len] = MELODY[mi];
        tone(midi(n), at, len * EIGHTH * 0.9, 'triangle', 0.13, undefined, bgmGain);
        noteLeft = len;
        mi = (mi + 1) % MELODY.length;
      }
      noteLeft--;
      const bar = Math.floor(eighth / 8) % BASS.length;
      const pos = eighth % 8;
      if (pos === 0 || pos === 4) tone(midi(BASS[bar]), at, EIGHTH * 1.6, 'triangle', 0.16, undefined, bgmGain);
      if (pos === 2 || pos === 6) tone(midi(BASS[bar] + 12), at, EIGHTH * 0.6, 'square', 0.025, undefined, bgmGain);
      eighth = (eighth + 1) % (BASS.length * 8);
      nextTime += EIGHTH;
    }
  }, 100);
}

function stopBgm() {
  if (timer !== null) window.clearInterval(timer);
  timer = null;
  if (bgmGain) bgmGain.disconnect();
  bgmGain = null;
}
