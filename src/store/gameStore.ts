// 画面の状態とゲームの状態をまとめて持つ。ゲームは毎回の操作のあとに自動保存する。
import { create } from 'zustand';
import { setSound } from '../audio/sound';
import { NODE } from '../data/map';
import { PROP } from '../data/properties';
import { createGame, reduce } from '../engine/game';
import type { Action, GameConfig, GameState } from '../engine/types';

export type Screen = 'title' | 'setup' | 'game' | 'howto' | 'settings';

export interface Prefs {
  sfx: boolean;
  bgm: boolean;
  /** 1:ゆっくり 2:ふつう 3:はやい */
  speed: 1 | 2 | 3;
}

const SAVE_KEY = 'ponpoko-sugoroku/save/v1';
const PREFS_KEY = 'ponpoko-sugoroku/prefs/v1';
const LAST_CFG_KEY = 'ponpoko-sugoroku/last-config/v1';

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

const defaultPrefs: Prefs = { sfx: true, bgm: true, speed: 2 };

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

  setScreen: (screen) => set({ screen }),

  startGame: (cfg) => {
    const game = createGame(cfg);
    save(SAVE_KEY, game);
    save(LAST_CFG_KEY, { ...cfg, seed: undefined });
    set({ game, screen: 'game', hasSave: true, lastConfig: cfg, fastForward: false });
  },

  continueGame: () => {
    const game = loadSave();
    if (game) set({ game, screen: 'game', fastForward: false });
  },

  dispatch: (a) => {
    const g = get().game;
    if (!g) return false;
    const next = reduce(g, a);
    if (next === g) return false;
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
}));
