// マップ全体を PNG にして配置を確認する開発用スクリプト
//   npx tsx scripts/preview-map.tsx <出力先.png> [倍率] [grid]（grid をつけると座標の方眼を重ねる）
import { renderToStaticMarkup } from 'react-dom/server';
import sharp from 'sharp';
import { MAP_H, MAP_W } from '../src/data/map';
import { MapLayer } from '../src/ui/board/MapLayer';
import { Squares } from '../src/ui/board/Squares';

const scale = Number(process.argv[3] ?? 0.6);
const css = `
.region-label{font:900 56px sans-serif;text-anchor:start}
.sq-label{font:900 22px sans-serif;fill:#fff;text-anchor:middle}
.st-label{font:900 20px sans-serif;text-anchor:middle}`;
const body = renderToStaticMarkup(
  <g>
    <MapLayer />
    <Squares owner={{ 'shika#0': 0, 'shika#1': 1, 'nigiwai#0': 2 }} colors={['#c98a4b', '#f2994a', '#4a7bd0', '#ec7fa9']} destination="kemuri" />
  </g>,
);
const grid: string[] = [];
if (process.argv[4] === 'grid') {
  for (let x = 0; x <= MAP_W; x += 100) grid.push(`<line x1="${x}" y1="0" x2="${x}" y2="${MAP_H}" stroke="#000" stroke-opacity="${x % 500 ? 0.12 : 0.4}"/>`);
  for (let y = 0; y <= MAP_H; y += 100) grid.push(`<line x1="0" y1="${y}" x2="${MAP_W}" y2="${y}" stroke="#000" stroke-opacity="${y % 500 ? 0.12 : 0.4}"/>`);
  for (let x = 0; x <= MAP_W; x += 500) for (let y = 0; y <= MAP_H; y += 500) grid.push(`<text x="${x + 4}" y="${y + 24}" font-size="24">${x},${y}</text>`);
}
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${MAP_W * scale}" height="${MAP_H * scale}" viewBox="0 0 ${MAP_W} ${MAP_H}"><style>${css}</style>${body}${grid.join('')}</svg>`;
await sharp(Buffer.from(svg)).png().toFile(process.argv[2] ?? 'map.png');
console.log('ok');
