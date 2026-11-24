import type { CharId, SpeakerId } from '../engine/types';

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
