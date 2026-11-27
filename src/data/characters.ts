import type { CardId, CharId, SpeakerId, SquareKind } from '../engine/types';

export interface CharInfo {
  id: SpeakerId;
  name: string;
  animal: string;
  color: string;
  intro: string;
}

export const CHARACTERS: Record<SpeakerId, CharInfo> = {
  pokota: { id: 'pokota', name: 'ポコ太', animal: 'たぬき', color: '#c98a4b', intro: '列車が大好きな、のんびり車掌さん' },
  mikeko: { id: 'mikeko', name: 'ミケ子', animal: 'みけねこ', color: '#f2994a', intro: 'そろばん片手のしっかり者の商人' },
  shibamaru: { id: 'shibamaru', name: 'シバまる', animal: 'しばいぬ', color: '#e2a047', intro: '元気いっぱい、走るのが得意' },
  penkichi: { id: 'penkichi', name: 'ペン吉', animal: 'ペンギン', color: '#4a7bd0', intro: '北の島生まれの、のんびり屋' },
  usami: { id: 'usami', name: 'うさみ', animal: 'うさぎ', color: '#ec7fa9', intro: 'おしゃれ好きで、耳がじまん' },
  konko: { id: 'konko', name: 'コンコ', animal: 'きつね', color: '#e8743b', intro: 'おみくじを引くのが大好き' },
  hoo: { id: 'hoo', name: 'ホー博士', animal: 'ふくろう', color: '#8a6a4f', intro: 'このすごろくの司会役' },
  kumo: { id: 'kumo', name: 'くもすけ', animal: 'あまぐも', color: '#8d98ad', intro: 'いたずら好きの小さな雨雲' },
};

export const PLAYABLE: CharId[] = ['pokota', 'mikeko', 'shibamaru', 'penkichi', 'usami', 'konko'];

// ---------------------------------------------------------------- CPU の性格
/** CPU の性格（キャラごと）。強さ（よわい〜つよい）とは別に、考え方のくせを変える */
export interface Persona {
  label: string;
  desc: string;
  /** 物件を買うときに残しておくお金の倍率 */
  reserve: number;
  /** カード屋で残しておくお金の倍率 */
  cardReserve: number;
  /** カード屋で先に欲しがるカード */
  shop: CardId[];
  /** 移動カードを使いはじめる距離を、何マス手前にするか */
  rush: number;
  /** 止まりたいマス（マイナスほど好き、プラスほど きらい） */
  land: Partial<Record<SquareKind, number>>;
  /** フェリーに乗る条件：おまつり会場に何マス近づけば乗るか */
  ferry: number;
  /** 持っている駅の残りを買い足して、ひとりじめをねらう */
  collector: boolean;
  /** カードを手札いっぱいまで集める */
  hoarder: boolean;
}

const BASE: Persona = { label: '', desc: '', reserve: 1, cardReserve: 1, shop: [], rush: 0, land: {}, ferry: 2, collector: false, hoarder: false };

export const PERSONA: Record<CharId, Persona> = {
  pokota: { ...BASE, label: 'のりもの好き', desc: 'フェリーに よく乗る。ほかは バランス型', land: { ferry: -6 }, ferry: 0 },
  mikeko: { ...BASE, label: '買い物好き', desc: 'お金を使ってでも 物件を買い、ひとりじめを ねらう', reserve: 0.4, cardReserve: 1.3, land: { station: -4 }, collector: true },
  shibamaru: { ...BASE, label: 'いそぎ屋', desc: '移動カードを どんどん使って おまつり会場へ 急ぐ', cardReserve: 0.8, shop: ['hayate', 'kakeashi'], rush: 3, ferry: 1 },
  penkichi: { ...BASE, label: '慎重派', desc: 'お金を多めに残し、とほほマスを さける', reserve: 1.8, cardReserve: 1.5, shop: ['omamori'], land: { minus: 12 }, ferry: 3 },
  usami: { ...BASE, label: 'カード集め', desc: 'カード屋さんが 大好き。カードを たくさん持ちたがる', cardReserve: 0.5, shop: ['maneki', 'pittari'], land: { card: -6, shop: -6 }, hoarder: true },
  konko: { ...BASE, label: 'おみくじ好き', desc: 'おみくじマスに 止まりたがる。くもすけは すぐ追いはらう', shop: ['teruteru'], land: { omikuji: -10 } },
};

// ---------------------------------------------------------------- 口ぐせ
/** キャラの口ぐせ（メッセージの ふきだしに出す） */
export interface Quips {
  happy: string[];
  sad: string[];
  buy: string[];
  arrive: string[];
  kumo: string[];
  /** オープニングのあいさつ */
  hello: string[];
}

export const QUIPS: Record<CharId, Quips> = {
  pokota: {
    happy: ['やったね、いい旅だ！', 'つぎの駅も たのしみだなあ', 'しゅっぱつ しんこう〜！'],
    sad: ['あいたた… 今日は ついてないなあ', 'のんびり いこう…', 'とほほ、寄り道しすぎたかな'],
    buy: ['この町、気に入ったよ', 'いい駅には いい物件だね'],
    arrive: ['おまつり会場〜、おまつり会場〜！ 到着です！'],
    kumo: ['雨雲さん、切符は お持ちですか？', 'わわ、ずぶぬれだ〜'],
    hello: ['しゅっぱつ しんこう〜！ よろしくね'],
  },
  mikeko: {
    happy: ['もうけ もうけ♪', 'そろばんが はずむわ！', 'これぞ 商売上手ね'],
    sad: ['ぐぬぬ… 大赤字よ！', 'この借りは 返すわよ', 'そろばんが 合わない〜'],
    buy: ['いい買い物したわ', 'ここは 伸びるわよ〜', 'まいど ありがとう！'],
    arrive: ['一番のりは 商売の基本よ！'],
    kumo: ['ちょっと！ 売り物が ぬれちゃう！'],
    hello: ['いい物件は ぜんぶ いただくわよ'],
  },
  shibamaru: {
    happy: ['わんっ！ やったー！', 'しっぽが とまらないよ！', 'ごほうびだー！'],
    sad: ['くぅ〜ん…', 'つぎは もっと 走るぞ！', 'しょんぼり わん…'],
    buy: ['ここ、いい におい！', '買っちゃった！ わんっ'],
    arrive: ['いっちばーん！ わんわん！'],
    kumo: ['ぬれるの きらい〜！ ぶるぶる'],
    hello: ['いちばんのりは ぼくだ！ わんっ'],
  },
  penkichi: {
    happy: ['ふふ、ちょっと うれしいな', 'ひんやり 気持ちいいね', 'こつこつが 一番だね'],
    sad: ['…まあ、こんな日も あるよね', 'しんちょうに いけば よかった', 'さむ〜い…'],
    buy: ['よく考えて 決めたよ', 'これは 堅い 物件だね'],
    arrive: ['のんびり来たら 一番だった！'],
    kumo: ['雨なら へっちゃら… だけど…'],
    hello: ['あわてず、こつこつ いくよ'],
  },
  usami: {
    happy: ['きゃー、すてき！', 'きょうの わたし、ついてる！', 'ぴょんぴょん しちゃう！'],
    sad: ['耳が しおれちゃう…', 'もう、さいあく〜', 'しくしく…'],
    buy: ['かわいい物件 みーつけた♪', 'これ、ほしかったの！'],
    arrive: ['いちばん おしゃれに 到着♪'],
    kumo: ['せっかくの 毛なみが〜！'],
    hello: ['カード、いっぱい 集めちゃう♪'],
  },
  konko: {
    happy: ['大吉の よかん！', 'お稲荷さまの おかげだね', 'こんこん、ラッキー！'],
    sad: ['今日は 凶の日かも…', 'お参り したのに〜', 'こ〜ん…'],
    buy: ['ご縁が ありそう！', 'きっと 福を まねくよ'],
    arrive: ['おまつり 大好き！ 一番のり〜！'],
    kumo: ['おはらい しなくちゃ！'],
    hello: ['きょうの運勢は… 大吉の よかん！'],
  },
};

/** 同じ場面では同じセリフになるように、文字列から選ぶ */
export function quipFor(id: SpeakerId, kind: keyof Quips, seed: string): string | null {
  const q = QUIPS[id as CharId];
  if (!q) return null;
  const list = q[kind];
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return list[h % list.length];
}
