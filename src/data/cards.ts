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
}

export const CARDS: Record<CardId, CardDef> = {
  kakeashi: { id: 'kakeashi', name: 'かけあし靴', icon: '👟', desc: 'サイコロを2こふれる', price: 2000, weight: 18, move: true },
  hayate: { id: 'hayate', name: 'はやて靴', icon: '💨', desc: 'サイコロを3こふれる', price: 5000, weight: 9, move: true },
  pittari: { id: 'pittari', name: 'ぴったり札', icon: '🎯', desc: '1〜6の好きな数だけ進める', price: 4000, weight: 10, move: true, needsNum: true },
  fusen: { id: 'fusen', name: 'ふうせん', icon: '🎈', desc: 'どこかの駅へ ふわっと飛んでいく', price: 3000, weight: 9, move: true },
  nemuri: { id: 'nemuri', name: 'ねむり草', icon: '🌿', desc: 'ほかの人みんな、3回のあいだ\nサイコロの目が1〜3になる', price: 6000, weight: 6 },
  koban: { id: 'koban', name: 'こばん', icon: '🪙', desc: 'お金がもらえる', price: 0, weight: 12 },
  maneki: { id: 'maneki', name: '招き猫', icon: '🐈', desc: '次の決算の収益が1.5倍', price: 7000, weight: 6 },
  omamori: { id: 'omamori', name: 'おまもり', icon: '🧧', desc: '持っていると、悪いことを1回ふせぐ', price: 3000, weight: 10, passive: true },
  teruteru: { id: 'teruteru', name: 'てるてる坊主', icon: '☀️', desc: 'くもすけを ほかの人へ追いはらう', price: 4000, weight: 7 },
  koukan: { id: 'koukan', name: '交換札', icon: '🔄', desc: 'えらんだ人と 手札を全部入れかえる', price: 3000, weight: 5, needsTarget: true },
};

export const CARD_IDS = Object.keys(CARDS) as CardId[];
/** みせマスで売っているカード */
export const SHOP_IDS: CardId[] = CARD_IDS.filter((id) => CARDS[id].price > 0);
export const HAND_MAX = 8;
