// 画面の状態とゲームの状態をまとめて持つ。ゲームは毎回の操作のあとに自動保存する。
// 図鑑・記録（何度遊んでも残る）と、はじめての人向けの案内の「見た」印もここで保存する。
import { create } from 'zustand';
import { setSound } from '../audio/sound';
import { NODE } from '../data/map';
import { PROP } from '../data/properties';
import { assets, createGame, isMonopoly, reduce } from '../engine/game';
import type { Action, CharId, GameConfig, GameState } from '../engine/types';

export type Screen = 'title' | 'setup' | 'game' | 'howto' | 'settings' | 'zukan';

export interface Prefs {
  sfx: boolean;
  bgm: boolean;
  /** 1:ゆっくり 2:ふつう 3:はやい */
  speed: 1 | 2 | 3;
  /** はじめての人向けの案内（ホー博士のふきだし） */
  tutorial: boolean;
  /** 豪華な演出（オープニング・手番のカットイン・季節の天気） */
  fx: boolean;
}

/** 図鑑と記録（人間のプレイヤーのぶんだけ数える。何度遊んでも残る） */
export interface Records {
  /** 最後まで遊んだ回数 */
  games: number;
  /** 人間が優勝した回数 */
  wins: number;
  /** これまでの最高の総資産 */
  best: { value: number; name: string; charId: CharId; years: number; date: string } | null;
  /** 行ったことのある駅（通りすぎた駅もふくむ） */
  stations: string[];
  /** 買ったことのある物件 */
  props: string[];
  /** ひとりじめしたことのある駅 */
  monopolies: string[];
  /** おまつり会場に一番のりした回数 */
  arrivals: number;
}

const emptyRecords: Records = { games: 0, wins: 0, best: null, stations: [], props: [], monopolies: [], arrivals: 0 };

const SAVE_KEY = 'ponpoko-sugoroku/save/v1';
const PREFS_KEY = 'ponpoko-sugoroku/prefs/v1';
const LAST_CFG_KEY = 'ponpoko-sugoroku/last-config/v1';
const RECORDS_KEY = 'ponpoko-sugoroku/records/v1';
const TIPS_KEY = 'ponpoko-sugoroku/tips/v1';

function load<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}
function save(key: string, v: unknown) {
  try {
    if (v === null) localStorage.removeItem(key);
    else localStorage.setItem(key, JSON.stringify(v));
  } catch {
    /* 容量不足などは無視（遊ぶのは続けられる） */
  }
}

const defaultPrefs: Prefs = { sfx: true, bgm: true, speed: 2, tutorial: true, fx: true };

/** 1回の操作で、図鑑・記録に新しく加わったもの */
function updateRecords(r: Records, prev: GameState, next: GameState): { records: Records; changed: boolean; newProps: string[]; newBest: boolean } {
  const humans = next.players.filter((p) => !p.isCpu);
  if (humans.length === 0) return { records: r, changed: false, newProps: [], newBest: false };
  const out: Records = { ...r };
  let changed = false;
  const newProps: string[] = [];
  let newBest = false;
  const stations = new Set(r.stations);
  for (const p of humans) {
    if (NODE[p.pos]?.kind === 'station' && !stations.has(p.pos)) {
      stations.add(p.pos);
      changed = true;
    }
    const before = prev.players[p.id];
    if (before && p.arrivals > before.arrivals) {
      out.arrivals += p.arrivals - before.arrivals;
      changed = true;
    }
  }
  const props = new Set(r.props);
  const monos = new Set(r.monopolies);
  for (const [id, o] of Object.entries(next.owner)) {
    if (prev.owner[id] === o || next.players[o]?.isCpu) continue;
    if (!props.has(id)) {
      props.add(id);
      newProps.push(id);
      changed = true;
    }
    const st = PROP[id]?.station;
    if (st && !monos.has(st) && isMonopoly(next, st, o)) {
      monos.add(st);
      changed = true;
    }
  }
  // ゲームが終わった瞬間
  const ended = next.phase.t === 'gameOver' && next.queue.length === 0 && !(prev.phase.t === 'gameOver' && prev.queue.length === 0);
  if (ended) {
    out.games += 1;
    const ranking = [...next.players].sort((a, b) => assets(next, b.id) - assets(next, a.id));
    if (!ranking[0].isCpu) out.wins += 1;
    const top = [...humans].sort((a, b) => assets(next, b.id) - assets(next, a.id))[0];
    const value = assets(next, top.id);
    if (!r.best || value > r.best.value) {
      out.best = { value, name: top.name, charId: top.charId, years: next.years, date: new Date().toISOString().slice(0, 10) };
      newBest = true;
    }
    changed = true;
  }
  out.stations = [...stations];
  out.props = [...props];
  out.monopolies = [...monos];
  return { records: out, changed, newProps, newBest };
}

/** 今の地図で続きを遊べるセーブか（地図を作りかえる前のセーブは使えない） */
function fitsMap(g: GameState): boolean {
  const ph = g.phase;
  return (
    g.players.every((p) => NODE[p.pos]) &&
    !!NODE[g.destination] &&
    !!NODE[g.prevDestination] &&
    Object.keys(g.owner).every((id) => PROP[id]) &&
    (ph.t !== 'buy' || !!NODE[ph.station]) &&
    (ph.t !== 'moving' || ((ph.prev === null || !!NODE[ph.prev]) && (!ph.options || ph.options.every((o) => NODE[o]))))
  );
}

function loadSave(): GameState | null {
  const g = load<GameState>(SAVE_KEY);
  if (!g || g.version !== 1 || g.phase.t === 'gameOver') return null;
  if (!fitsMap(g)) {
    save(SAVE_KEY, null);
    return null;
  }
  return g;
}

interface AppState {
  screen: Screen;
  game: GameState | null;
  prefs: Prefs;
  hasSave: boolean;
  lastConfig: GameConfig | null;
  /** CPUの手番をすごく速くする */
  fastForward: boolean;
  /** はじめからのときだけ、オープニングを見せる */
  opening: boolean;
  endOpening: () => void;
  records: Records;
  /** 図鑑に新しくのった物件（お知らせ用。id は毎回ちがう番号） */
  zukanNews: { id: number; props: string[] } | null;
  /** いま終わったゲームで、最高の総資産を更新した */
  newBest: boolean;
  /** 見おわった案内 */
  tipsSeen: string[];
  markTip: (id: string) => void;
  resetTips: () => void;
  setScreen: (s: Screen) => void;
  startGame: (cfg: GameConfig) => void;
  continueGame: () => void;
  dispatch: (a: Action) => boolean;
  quitToTitle: () => void;
  setPrefs: (p: Partial<Prefs>) => void;
  deleteSave: () => void;
  setFastForward: (v: boolean) => void;
}

const initialPrefs = { ...defaultPrefs, ...(load<Prefs>(PREFS_KEY) ?? {}) };
setSound(initialPrefs.sfx, initialPrefs.bgm);

export const useApp = create<AppState>((set, get) => ({
  screen: 'title',
  game: null,
  prefs: initialPrefs,
  hasSave: loadSave() !== null,
  lastConfig: load<GameConfig>(LAST_CFG_KEY),
  fastForward: false,
  opening: false,
  endOpening: () => set({ opening: false }),
  records: { ...emptyRecords, ...(load<Records>(RECORDS_KEY) ?? {}) },
  zukanNews: null,
  newBest: false,
  tipsSeen: load<string[]>(TIPS_KEY) ?? [],

  setScreen: (screen) => set({ screen }),

  startGame: (cfg) => {
    const game = createGame(cfg);
    save(SAVE_KEY, game);
    save(LAST_CFG_KEY, { ...cfg, seed: undefined });
    set({ game, screen: 'game', hasSave: true, lastConfig: cfg, fastForward: false, newBest: false, opening: get().prefs.fx });
  },

  continueGame: () => {
    const game = loadSave();
    if (game) set({ game, screen: 'game', fastForward: false, opening: false });
  },

  dispatch: (a) => {
    const g = get().game;
    if (!g) return false;
    const next = reduce(g, a);
    if (next === g) return false;
    const up = updateRecords(get().records, g, next);
    if (up.changed) {
      save(RECORDS_KEY, up.records);
      set({ records: up.records });
      if (up.newProps.length) set({ zukanNews: { id: Date.now(), props: up.newProps } });
      if (up.newBest) set({ newBest: true });
    }
    if (next.phase.t === 'gameOver' && next.queue.length === 0) {
      save(SAVE_KEY, null);
      set({ game: next, hasSave: false });
    } else {
      save(SAVE_KEY, next);
      set({ game: next });
    }
    return true;
  },

  quitToTitle: () => set({ screen: 'title', game: null, hasSave: loadSave() !== null }),

  setPrefs: (p) => {
    const prefs = { ...get().prefs, ...p };
    save(PREFS_KEY, prefs);
    setSound(prefs.sfx, prefs.bgm);
    set({ prefs });
  },

  deleteSave: () => {
    save(SAVE_KEY, null);
    set({ hasSave: false });
  },

  setFastForward: (fastForward) => set({ fastForward }),

  markTip: (id) => {
    const tipsSeen = [...new Set([...get().tipsSeen, id])];
    save(TIPS_KEY, tipsSeen);
    set({ tipsSeen });
  },

  resetTips: () => {
    save(TIPS_KEY, []);
    const prefs = { ...get().prefs, tutorial: true };
    save(PREFS_KEY, prefs);
    set({ tipsSeen: [], prefs });
  },
}));
