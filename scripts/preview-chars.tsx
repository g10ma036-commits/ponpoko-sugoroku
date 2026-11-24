// キャラ一覧を PNG にして見た目を確認する開発用スクリプト
//   npx tsx scripts/preview-chars.tsx <出力先.png>
import { renderToStaticMarkup } from 'react-dom/server';
import sharp from 'sharp';
import { CharShape, VIEWBOX } from '../src/characters/Characters';
import type { Expr, SpeakerId } from '../src/engine/types';

const ids: SpeakerId[] = ['pokota', 'mikeko', 'shibamaru', 'penkichi', 'usami', 'konko', 'hoo', 'kumo'];
const exprs: Expr[] = ['normal', 'happy', 'sad'];
const cell = 150;
const [vx, vy, vw, vh] = VIEWBOX.split(' ').map(Number);
const cells = ids.flatMap((id, c) =>
  exprs.map((e, r) =>
    `<svg x="${c * cell}" y="${r * cell * 1.1}" width="${cell}" height="${cell * 1.1}" viewBox="${vx} ${vy} ${vw} ${vh}">${renderToStaticMarkup(<CharShape id={id} expr={e} />)}</svg>`,
  ),
);
const W = ids.length * cell;
const H = exprs.length * cell * 1.1;
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}"><rect width="100%" height="100%" fill="#fff6e5"/>${cells.join('')}</svg>`;
await sharp(Buffer.from(svg)).png().toFile(process.argv[2] ?? 'chars.png');
console.log('ok');
