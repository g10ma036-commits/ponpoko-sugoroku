import type { CardId } from '../engine/types';

export interface CardDef {
  id: CardId;
  name: string;
  icon: string;
  desc: string;
  /** みせマスでの値段 */
  price: number;
  /** ふだマスで出やすさ */
  weight: number;
  /** サイコロのかわりに使うカード（使うと移動が始まる） */
  move?: boolean;
  /** 持っているだけで効く（自分では使わない） */
  passive?: boolean;
  needsNum?: boolean;
  needsTarget?: boolean;
  /** 行き先の駅をえらぶ */
  needsStation?: boolean;
}

export const CARDS: Record<CardId, CardDef> = {
  kakeashi: { id: 'kakeashi', name: 'かけあし靴', icon: '👟', desc: 'サイコロを2こふれる', price: 2000, weight: 18, move: true },
  hayate: { id: 'hayate', name: 'はやて靴', icon: '💨', desc: 'サイコロを3こふれる', price: 5000, weight: 9, move: true },
  pittari: { id: 'pittari', name: 'ぴったり札', icon: '🎯', desc: '1〜6の好きな数だけ進める。会場に ぴったり止まりたいときに', price: 4000, weight: 10, move: true, needsNum: true },
  fusen: { id: 'fusen', name: 'ふうせん', icon: '🎈', desc: 'どこかの駅へ ふわっと飛んでいく', price: 3000, weight: 9, move: true },
  nemuri: { id: 'nemuri', name: 'ねむり草', icon: '🌿', desc: 'ほかの人みんな、3回のあいだ\n1〜3マスしか進めない（靴も使えない）', price: 6000, weight: 6 },
  koban: { id: 'koban', name: 'こばん', icon: '🪙', desc: 'お金がもらえる', price: 0, weight: 12 },
  maneki: { id: 'maneki', name: '招き猫', icon: '🐈', desc: '次の決算の収益が1.5倍', price: 7000, weight: 6 },
  omamori: { id: 'omamori', name: 'おまもり', icon: '🧧', desc: '持っていると、悪いことを1回ふせぐ', price: 3000, weight: 10, passive: true },
  teruteru: { id: 'teruteru', name: 'てるてる坊主', icon: '☀️', desc: 'くもすけを ほかの人へ追いはらう', price: 4000, weight: 7 },
  koukan: { id: 'koukan', name: '交換札', icon: '🔄', desc: 'えらんだ人と 手札を全部入れかえる', price: 3000, weight: 5, needsTarget: true },
  kippu: { id: 'kippu', name: 'ひとりじめ切符', icon: '🎫', desc: 'ひとりじめできそうな駅（自分だけが物件を持つ駅）を えらんで 一気に行ける', price: 6000, weight: 6, move: true, needsStation: true },
};

export const CARD_IDS = Object.keys(CARDS) as CardId[];
/** みせマスで売っているカード */
export const SHOP_IDS: CardId[] = CARD_IDS.filter((id) => CARDS[id].price > 0);
export const HAND_MAX = 8;
