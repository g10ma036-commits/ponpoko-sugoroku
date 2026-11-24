// 駅ごとの物件。[名前, 価格(両), 年収益率(%), 種類]
import type { PropCategory, Property } from '../engine/types';

type P = [string, number, number, PropCategory];

const DATA: Record<string, P[]> = {
  // ゆきみ島
  shirokuma: [
    ['海鮮どんぶり屋', 3000, 18, 'food'],
    ['こんぶ干し場', 2000, 24, 'farm'],
    ['かに缶工場', 18000, 10, 'industry'],
    ['流氷クルーズ船', 40000, 8, 'tourism'],
  ],
  hotate: [
    ['焼きほたて屋台', 1500, 22, 'food'],
    ['ほたて養殖場', 6000, 20, 'farm'],
    ['ひもの工房', 9000, 12, 'industry'],
    ['灯台カフェ', 15000, 10, 'tourism'],
  ],
  lavender: [
    ['ラベンダー畑', 2500, 26, 'farm'],
    ['ソフトクリーム屋', 3000, 18, 'food'],
    ['香水工房', 20000, 10, 'industry'],
    ['花畑ホテル', 45000, 8, 'tourism'],
  ],
  koori: [
    ['わかさぎ釣り小屋', 2000, 20, 'tourism'],
    ['じゃがいも畑', 3500, 24, 'farm'],
    ['乳製品工場', 25000, 10, 'industry'],
    ['氷の宿', 50000, 7, 'tourism'],
  ],
  // やまびこ地方
  ringo: [
    ['りんご園', 4000, 25, 'farm'],
    ['アップルパイ屋', 5000, 16, 'food'],
    ['りんごジュース工場', 22000, 10, 'industry'],
    ['りんご狩り農園', 9000, 14, 'tourism'],
  ],
  yukemuri: [
    ['温泉まんじゅう屋', 2500, 20, 'food'],
    ['足湯茶屋', 6000, 14, 'tourism'],
    ['湯の花工房', 12000, 12, 'industry'],
    ['老舗旅館', 60000, 8, 'tourism'],
  ],
  kokeshi: [
    ['こけし工房', 3000, 16, 'industry'],
    ['田んぼ', 5000, 22, 'farm'],
    ['炭火焼き屋', 10000, 14, 'food'],
    ['木のおもちゃ屋', 8000, 12, 'industry'],
  ],
  hoshizora: [
    ['高原牧場', 7000, 20, 'farm'],
    ['高原キャンプ場', 12000, 12, 'tourism'],
    ['天文台', 35000, 8, 'tourism'],
  ],
  soba: [
    ['手打ちそば屋', 3000, 18, 'food'],
    ['そば畑', 2000, 26, 'farm'],
    ['山小屋', 9000, 12, 'tourism'],
    ['ぬりもの工房', 16000, 10, 'industry'],
  ],
  // みやこ地方
  kagami: [
    ['わさび田', 5000, 20, 'farm'],
    ['湖のボート屋', 4000, 14, 'tourism'],
    ['うなぎ屋', 12000, 14, 'food'],
    ['楽器工場', 30000, 9, 'industry'],
  ],
  karakuri: [
    ['みそ蔵', 6000, 16, 'food'],
    ['からくり人形工房', 14000, 12, 'industry'],
    ['ひつまぶし屋', 10000, 14, 'food'],
    ['自動車工場', 80000, 7, 'industry'],
  ],
  nigiwai: [
    ['たこ焼き屋', 2000, 18, 'food'],
    ['商店街', 15000, 12, 'tourism'],
    ['新聞社', 40000, 8, 'industry'],
    ['百貨店', 60000, 8, 'industry'],
    ['お城テーマパーク', 90000, 7, 'tourism'],
  ],
  akarenga: [
    ['中華まん屋', 3000, 18, 'food'],
    ['夜景レストラン', 18000, 12, 'food'],
    ['赤れんが倉庫', 25000, 10, 'tourism'],
    ['造船所', 70000, 7, 'industry'],
  ],
  shika: [
    ['しかせんべい屋', 1500, 22, 'food'],
    ['柿畑', 4000, 22, 'farm'],
    ['すみと筆の工房', 9000, 12, 'industry'],
    ['古いお寺', 30000, 9, 'tourism'],
  ],
  ocha: [
    ['茶畑', 3500, 25, 'farm'],
    ['茶屋', 4000, 16, 'food'],
    ['和菓子屋', 8000, 14, 'food'],
    ['茶器工房', 15000, 10, 'industry'],
  ],
  furin: [
    ['かき氷屋', 2000, 20, 'food'],
    ['金魚すくい屋', 2500, 18, 'tourism'],
    ['ふうりん工房', 5000, 16, 'industry'],
    ['夏まつり会館', 35000, 8, 'tourism'],
  ],
  // うずしお地方
  mikan: [
    ['みかん畑', 3000, 27, 'farm'],
    ['みかんジュース工場', 18000, 10, 'industry'],
    ['浜辺の温泉', 25000, 9, 'tourism'],
  ],
  udon: [
    ['うどん屋', 2000, 20, 'food'],
    ['小麦畑', 4000, 22, 'farm'],
    ['うどん学校', 9000, 14, 'tourism'],
    ['製めん所', 15000, 11, 'industry'],
  ],
  uzushio: [
    ['塩田', 4000, 20, 'farm'],
    ['たいめし屋', 6000, 16, 'food'],
    ['たいの養殖場', 12000, 14, 'farm'],
    ['うずしお観光船', 30000, 9, 'tourism'],
  ],
  shinju: [
    ['あま小屋', 5000, 16, 'tourism'],
    ['真珠いかだ', 10000, 16, 'farm'],
    ['真珠アクセサリー店', 28000, 10, 'industry'],
  ],
  // ひだまり島
  tonkotsu: [
    ['とんこつラーメン屋', 3000, 20, 'food'],
    ['屋台通り', 8000, 15, 'food'],
    ['港の市場', 16000, 11, 'tourism'],
    ['めんたいこ工場', 20000, 11, 'industry'],
  ],
  kemuri: [
    ['地獄むし料理屋', 3500, 18, 'food'],
    ['高原の牛舎', 6000, 20, 'farm'],
    ['焼きもの窯元', 12000, 12, 'industry'],
    ['火山温泉郷', 40000, 8, 'tourism'],
  ],
  sango: [
    ['マンゴーかき氷屋', 3000, 18, 'food'],
    ['南国フルーツ園', 5000, 22, 'farm'],
    ['さんごダイビング店', 9000, 14, 'tourism'],
  ],
  satokibi: [
    ['さとうきび畑', 2500, 27, 'farm'],
    ['三味線工房', 8000, 13, 'industry'],
    ['黒糖工場', 14000, 11, 'industry'],
  ],
  yashi: [
    ['南国そば屋', 2500, 20, 'food'],
    ['パイナップル畑', 4000, 24, 'farm'],
    ['ビーチハウス', 6000, 16, 'tourism'],
    ['リゾートホテル', 70000, 7, 'tourism'],
  ],
};

export const PROPERTIES: Property[] = Object.entries(DATA).flatMap(([station, list]) =>
  list.map(([name, price, rate, cat], i) => ({ id: `${station}#${i}`, station, name, price, rate, cat })),
);

export const PROP: Record<string, Property> = Object.fromEntries(PROPERTIES.map((p) => [p.id, p]));

export const PROPS_BY_STATION: Record<string, Property[]> = {};
for (const p of PROPERTIES) (PROPS_BY_STATION[p.station] ??= []).push(p);

export const CATEGORY_LABEL: Record<PropCategory, { label: string; color: string }> = {
  food: { label: '食べもの', color: '#f08a5d' },
  farm: { label: '農業', color: '#6abf69' },
  industry: { label: '工業', color: '#7d8ee0' },
  tourism: { label: '観光', color: '#e26fb0' },
};
