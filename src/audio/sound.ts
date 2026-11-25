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
  horn: () =>
    play(() => {
      // ボーッ、ボーッ（フェリーの汽笛）
      for (const at of [0, 0.75]) {
        tone(147, at, 0.6, 'sawtooth', 0.045);
        tone(185, at, 0.6, 'triangle', 0.08);
      }
    }),
  event: () =>
    play(() => {
      tone(midi(74), 0, 0.1, 'triangle', 0.12);
      tone(midi(79), 0.1, 0.1, 'triangle', 0.12);
      tone(midi(83), 0.2, 0.25, 'triangle', 0.12);
    }),
  /** おまつり会場に一番のり：太鼓と笛のファンファーレ */
  festival: () =>
    play(() => {
      for (const at of [0, 0.16, 0.32]) taiko(at, 0.4);
      [76, 79, 81, 84, 81, 84].forEach((n, i) => tone(midi(n), 0.5 + i * 0.12, 0.16, 'square', 0.07));
      tone(midi(88), 1.22, 0.9, 'triangle', 0.12);
      [72, 76, 79].forEach((n) => tone(midi(n), 1.22, 0.9, 'triangle', 0.06));
      taiko(1.22, 0.45);
    }),
  /** ひとりじめ達成：きらきらの上り音 */
  monopoly: () =>
    play(() => {
      [72, 76, 79, 84, 88, 91].forEach((n, i) => tone(midi(n), i * 0.07, 0.2, 'triangle', 0.12));
      [96, 100].forEach((n, i) => tone(midi(n), 0.5 + i * 0.1, 0.25, 'sine', 0.06));
    }),
  /** 決算で収益が入る：チャリン */
  chaching: () =>
    play(() => {
      tone(midi(88), 0, 0.05, 'square', 0.06);
      tone(midi(95), 0.05, 0.28, 'triangle', 0.11);
      tone(midi(100), 0.09, 0.2, 'sine', 0.04);
    }),
  /** 景気ニュース：ニュースのチャイム */
  news: () =>
    play(() => {
      [0, 0.07, 0.14].forEach((at) => tone(1200, at, 0.035, 'square', 0.04));
      tone(midi(79), 0.26, 0.18, 'triangle', 0.12);
      tone(midi(84), 0.42, 0.35, 'triangle', 0.12);
    }),
};

/** 太鼓（低い音を すばやく下げる） */
function taiko(at: number, vol: number, out?: AudioNode) {
  tone(120, at, 0.2, 'sine', vol, 48, out);
  tone(240, at, 0.05, 'triangle', vol * 0.25, 90, out);
}

// ---------------------------------------------------------------- BGM（場面ごとに曲が変わる。どれもヨナ抜き・都節の音階で作ったオリジナル）

export type BgmMode = 'normal' | 'near' | 'kumo' | 'festival';

interface Track {
  /** 8分音符の長さ（秒） */
  eighth: number;
  /** [MIDIノート(0は休み), 長さ(8分音符いくつ分)] */
  melody: [number, number][];
  /** 1小節（8分音符8つ）ごとのベースの音 */
  bass: number[];
  lead: OscillatorType;
  leadVol: number;
  /** walk：ふつう／drive：8分で刻む／slow：のばす／march：行進 */
  bassStyle: 'walk' | 'drive' | 'slow' | 'march';
  /** 太鼓を鳴らす */
  drum?: boolean;
  /** 雨だれの音（くもすけ） */
  drip?: boolean;
}

const TRACKS: Record<BgmMode, Track> = {
  // ふだん：のんびりした旅の曲
  normal: {
    eighth: 0.27,
    lead: 'triangle',
    leadVol: 0.13,
    bassStyle: 'walk',
    bass: [43, 40, 43, 45, 43, 40, 38, 43],
    melody: [
      [74, 2], [71, 1], [69, 1], [67, 2], [69, 2],
      [71, 2], [69, 1], [67, 1], [64, 4],
      [67, 2], [69, 1], [71, 1], [74, 2], [71, 1], [69, 1],
      [67, 2], [64, 1], [67, 1], [69, 4],
      [74, 2], [76, 1], [74, 1], [71, 2], [69, 2],
      [67, 2], [69, 1], [71, 1], [69, 2], [67, 1], [64, 1],
      [62, 2], [64, 1], [67, 1], [69, 2], [71, 1], [69, 1],
      [67, 4], [67, 4],
    ],
  },
  // だれかが おまつり会場の近くにいる：はやめで太鼓入り
  near: {
    eighth: 0.19,
    lead: 'square',
    leadVol: 0.06,
    bassStyle: 'drive',
    drum: true,
    bass: [50, 47, 50, 45, 50, 47, 43, 45],
    melody: [
      [74, 1], [76, 1], [78, 2], [76, 1], [74, 1], [71, 2],
      [69, 1], [71, 1], [74, 2], [71, 2], [69, 2],
      [74, 1], [76, 1], [78, 2], [81, 2], [78, 2],
      [76, 1], [78, 1], [76, 1], [74, 1], [76, 4],
      [78, 1], [81, 1], [78, 2], [76, 1], [74, 1], [71, 2],
      [69, 1], [71, 1], [74, 1], [76, 1], [78, 2], [76, 2],
      [74, 1], [71, 1], [69, 1], [71, 1], [74, 2], [69, 2],
      [74, 4], [0, 2], [69, 1], [71, 1],
    ],
  },
  // くもすけが ついている人の番：ちょっと とほほな曲と雨だれ
  kumo: {
    eighth: 0.3,
    lead: 'sine',
    leadVol: 0.16,
    bassStyle: 'slow',
    drip: true,
    bass: [40, 41, 45, 40, 40, 41, 45, 40],
    melody: [
      [76, 2], [77, 1], [76, 1], [72, 2], [71, 2],
      [69, 2], [71, 1], [72, 1], [71, 4],
      [69, 2], [65, 1], [64, 1], [65, 2], [69, 2],
      [71, 2], [72, 1], [71, 1], [69, 4],
      [76, 2], [77, 1], [76, 1], [72, 2], [76, 2],
      [77, 2], [76, 1], [72, 1], [71, 4],
      [69, 1], [71, 1], [72, 2], [71, 1], [69, 1], [65, 2],
      [64, 6], [0, 2],
    ],
  },
  // 決算・結果発表：にぎやかな行進曲
  festival: {
    eighth: 0.21,
    lead: 'square',
    leadVol: 0.065,
    bassStyle: 'march',
    drum: true,
    bass: [48, 45, 43, 48, 48, 45, 43, 48],
    melody: [
      [72, 1], [72, 1], [74, 1], [76, 1], [79, 2], [76, 2],
      [74, 1], [76, 1], [74, 1], [72, 1], [69, 2], [72, 2],
      [67, 1], [69, 1], [72, 1], [74, 1], [76, 2], [79, 2],
      [81, 1], [79, 1], [76, 1], [74, 1], [76, 4],
      [72, 1], [72, 1], [74, 1], [76, 1], [79, 2], [81, 2],
      [79, 1], [76, 1], [74, 1], [76, 1], [79, 2], [76, 2],
      [74, 1], [72, 1], [69, 1], [72, 1], [74, 2], [76, 1], [74, 1],
      [72, 4], [0, 2], [67, 1], [69, 1],
    ],
  },
};

const BGM_VOL = 0.35;
let mode: BgmMode = 'normal';
let playing: { gain: GainNode; timer: number; mode: BgmMode } | null = null;

function startTrack(m: BgmMode) {
  if (!ctx || !master) return;
  const tr = TRACKS[m];
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.0001, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(BGM_VOL, ctx.currentTime + 0.8);
  gain.connect(master);
  let next = ctx.currentTime + 0.15;
  let mi = 0;
  let eighth = 0;
  let noteLeft = 0;
  const timer = window.setInterval(() => {
    if (!ctx) return;
    while (next < ctx.currentTime + 0.4) {
      const at = Math.max(0, next - ctx.currentTime);
      const e = tr.eighth;
      if (noteLeft === 0) {
        const [n, len] = tr.melody[mi];
        if (n > 0) tone(midi(n), at, len * e * 0.9, tr.lead, tr.leadVol, undefined, gain);
        noteLeft = len;
        mi = (mi + 1) % tr.melody.length;
      }
      noteLeft--;
      const root = tr.bass[Math.floor(eighth / 8) % tr.bass.length];
      const pos = eighth % 8;
      switch (tr.bassStyle) {
        case 'walk':
          if (pos === 0 || pos === 4) tone(midi(root), at, e * 1.6, 'triangle', 0.16, undefined, gain);
          if (pos === 2 || pos === 6) tone(midi(root + 12), at, e * 0.6, 'square', 0.025, undefined, gain);
          break;
        case 'drive':
          tone(midi(pos % 2 === 0 ? root : root + 12), at, e * 0.8, 'triangle', 0.14, undefined, gain);
          break;
        case 'slow':
          if (pos === 0) tone(midi(root), at, e * 7, 'triangle', 0.15, undefined, gain);
          if (pos === 4) tone(midi(root + 7), at, e * 3, 'sine', 0.06, undefined, gain);
          break;
        case 'march':
          if (pos === 0 || pos === 4) tone(midi(pos === 0 ? root : root + 7), at, e * 1.2, 'triangle', 0.17, undefined, gain);
          if (pos % 2 === 1) [0, 4, 7].forEach((k) => tone(midi(root + 24 + k), at, e * 0.5, 'triangle', 0.025, undefined, gain));
          break;
      }
      if (tr.drum) {
        if (pos === 0 || pos === 4) taiko(at, 0.22, gain);
        if (pos === 6 || (tr.bassStyle === 'march' && pos === 2)) tone(1800, at, 0.03, 'square', 0.018, 900, gain);
      }
      if (tr.drip && (pos === 3 || pos === 7) && (eighth * 7) % 3 !== 0) {
        tone(midi([88, 91, 93][eighth % 3]), at, 0.12, 'sine', 0.05, midi([84, 86, 88][eighth % 3]), gain);
      }
      eighth = (eighth + 1) % (tr.bass.length * 8);
      next += e;
    }
  }, 100);
  playing = { gain, timer, mode: m };
}

function stopTrack(fade: boolean) {
  if (!playing) return;
  const { gain, timer } = playing;
  window.clearInterval(timer);
  playing = null;
  if (fade && ctx) {
    const t = ctx.currentTime;
    gain.gain.cancelScheduledValues(t);
    gain.gain.setValueAtTime(Math.max(gain.gain.value, 0.0001), t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.6);
    window.setTimeout(() => gain.disconnect(), 800);
  } else {
    gain.disconnect();
  }
}

function startBgm() {
  if (playing) return;
  startTrack(mode);
}

function stopBgm() {
  stopTrack(false);
}

/** 場面に合わせて曲を切りかえる（同じ曲なら何もしない） */
export function setBgmMode(m: BgmMode) {
  mode = m;
  if (playing && playing.mode !== m) {
    stopTrack(true);
    startTrack(m);
  }
}
