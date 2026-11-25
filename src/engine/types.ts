// ゲーム全体で使う型。engine/ は React に依存しない純TS。

export type RegionId = 'hokkaido' | 'tohoku' | 'kanto' | 'chubu' | 'kinki' | 'chugoku' | 'shikoku' | 'kyushu' | 'okinawa';
export type SquareKind = 'station' | 'plus' | 'minus' | 'card' | 'shop' | 'omikuji' | 'ferry';
export type PropCategory = 'food' | 'farm' | 'industry' | 'tourism';

export type CharId = 'pokota' | 'mikeko' | 'shibamaru' | 'penkichi' | 'usami' | 'konko';
export type SpeakerId = CharId | 'hoo' | 'kumo';
export type Expr = 'normal' | 'happy' | 'sad';

export type CardId =
  | 'kakeashi'
  | 'hayate'
  | 'fusen'
  | 'pittari'
  | 'nemuri'
  | 'koban'
  | 'maneki'
  | 'omamori'
  | 'teruteru'
  | 'koukan';

export interface MapNode {
  id: string;
  kind: SquareKind;
  x: number;
  y: number;
  region: RegionId;
  /** kind === 'station' のときの駅名 */
  name?: string;
}

export interface MapEdge {
  a: string;
  b: string;
  /** 船の航路（点線で描く） */
  sea?: boolean;
}

export interface Property {
  id: string;
  station: string;
  name: string;
  price: number;
  /** 年あたりの収益率（%）。実際の収益は income() で計算 */
  rate: number;
  cat: PropCategory;
}

export type CpuLevel = 1 | 2 | 3;

export interface PlayerConfig {
  name: string;
  charId: CharId;
  isCpu: boolean;
  cpuLevel: CpuLevel;
}

export interface GameConfig {
  players: PlayerConfig[];
  years: number;
  kumosuke: boolean;
  seed?: number;
}

export interface Player extends PlayerConfig {
  id: number;
  pos: string;
  money: number;
  cards: CardId[];
  /** 何回おまつり会場に一番乗りしたか */
  arrivals: number;
  /** ねむり草の残りターン */
  sleep: number;
  /** 招き猫：次の決算の収益が1.5倍 */
  maneki: boolean;
  /** 今年の収益（表示・表彰用） */
  lastIncome: number;
  /** 合計で払わされた金額（表彰用） */
  kumoDamage: number;
}

export type Tone = 'info' | 'good' | 'bad' | 'event' | 'arrival' | 'kumo';

/** 今年の景気（1月に発表）。boom の地方は収益アップ、slump の種類は収益ダウン。hot は6月のニュース速報の駅 */
export interface Economy {
  year: number;
  boom: RegionId;
  slump: PropCategory;
  hot?: string;
}

/** 名場面（結果画面に出す）。いちばん大きかった出来事だけを残す */
export type HighlightKey = 'buy' | 'luck' | 'loss' | 'kumo' | 'income' | 'prize';
export interface Highlight {
  player: number;
  amount: number;
  /** 「〇〇を 1万両で 買った」など（名前はつけない） */
  text: string;
  year: number;
  month: number;
}

export interface SettlementRow {
  player: number;
  income: number;
  monopolies: number;
  maneki: boolean;
  /** 決算の前とあとの総資産（順位が入れかわる演出用） */
  before?: number;
  after?: number;
}

export interface Msg {
  tone: Tone;
  title?: string;
  text: string;
  /** 顔を出すキャラ */
  speaker?: SpeakerId;
  expr?: Expr;
  /** 関係するプレイヤー */
  player?: number;
  /** お金の増減（表示用） */
  delta?: number;
  settlement?: SettlementRow[];
  /** ひとりじめ達成など、紙ふぶきでお祝いする */
  celebrate?: boolean;
  /** 景気ニュース（新聞ふうに出す） */
  news?: boolean;
}

export type Phase =
  | { t: 'action' }
  | {
      t: 'moving';
      /** 残りの歩数 */
      steps: number;
      dice: number[];
      /** 今回の移動でひとつ前にいたマス（すぐ引き返せない） */
      prev: string | null;
      /** 分かれ道で選べる行き先。null なら自動で進む */
      options: string[] | null;
      /** これまで進んだ歩数（演出用） */
      walked: number;
      /** 止まるマスを選んだときの行き先。分かれ道でも自動でそこへ向かう */
      goal?: string;
    }
  | { t: 'buy'; station: string }
  /** フェリーの乗り場に止まった。to は相手の乗り場 */
  | { t: 'ferry'; to: string }
  | { t: 'shop'; items: CardId[] }
  | { t: 'sell'; next: 'action' | 'end' }
  | { t: 'end' }
  | { t: 'gameOver' };

export interface GameState {
  version: 1;
  rng: number;
  years: number;
  kumosukeOn: boolean;
  year: number;
  month: number;
  turn: number;
  players: Player[];
  destination: string;
  /** ひとつ前のおまつり会場（賞金の計算用） */
  prevDestination: string;
  /** くもすけがついているプレイヤー */
  kumo: number | null;
  /** 今回の移動ですでに乗り移った（行ったり来たりを防ぐ） */
  kumoMoved: boolean;
  owner: Record<string, number>;
  phase: Phase;
  queue: Msg[];
  /** UI がアニメーションを判断するための連番 */
  rollId: number;
  /** ログ（新しいものが後ろ） */
  log: string[];
  /** 今年の景気（古いセーブには無い） */
  economy?: Economy;
  /** 月末ごとの全員の総資産（結果画面のグラフ用。古いセーブには無い） */
  history?: number[][];
  /** 名場面 */
  highlights?: Partial<Record<HighlightKey, Highlight>>;
}

export type Action =
  | { t: 'ROLL' }
  | { t: 'USE_CARD'; index: number; num?: number; target?: number }
  | { t: 'STEP' }
  | { t: 'DIR'; to: string }
  | { t: 'GOAL'; to: string }
  | { t: 'RIDE' }
  | { t: 'BUY'; prop: string }
  | { t: 'BUY_CARD'; card: CardId }
  | { t: 'SELL'; prop: string }
  | { t: 'DONE' }
  | { t: 'ACK' };
