// アプリのアイコン（ホーム画面に出る絵）を ポコ太の顔から作る
//   npm run icons
import { mkdirSync } from 'node:fs';
import { renderToStaticMarkup } from 'react-dom/server';
import sharp from 'sharp';
import { CharShape } from '../src/characters/Characters';

const face = renderToStaticMarkup(<CharShape id="pokota" expr="happy" />);

/** pad: 角の丸い背景の内側に、どれだけ余白をとるか（0〜1） */
function iconSvg(size: number, { rounded, pad }: { rounded: boolean; pad: number }) {
  const r = rounded ? size * 0.22 : 0;
  const inner = size * (1 - pad * 2);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <defs><radialGradient id="g" cx="50%" cy="35%" r="70%"><stop offset="0" stop-color="#ffd36b"/><stop offset="1" stop-color="#f6a13a"/></radialGradient></defs>
  <rect width="${size}" height="${size}" rx="${r}" fill="url(#g)"/>
  <circle cx="${size / 2}" cy="${size * 0.54}" r="${size * 0.36}" fill="#fff6e5" opacity="0.55"/>
  <svg x="${(size - inner) / 2}" y="${(size - inner) / 2 + size * 0.02}" width="${inner}" height="${inner}" viewBox="4 -14 112 136">${face}</svg>
</svg>`;
}

mkdirSync('public/icons', { recursive: true });
const jobs: [string, number, { rounded: boolean; pad: number }][] = [
  ['icon-192.png', 192, { rounded: true, pad: 0.06 }],
  ['icon-512.png', 512, { rounded: true, pad: 0.06 }],
  ['icon-maskable-512.png', 512, { rounded: false, pad: 0.16 }],
  ['apple-touch-icon.png', 180, { rounded: false, pad: 0.08 }],
  ['favicon.png', 64, { rounded: true, pad: 0.02 }],
];
for (const [name, size, opt] of jobs) {
  await sharp(Buffer.from(iconSvg(size, opt))).png().toFile(`public/icons/${name}`);
  console.log('wrote', name);
}
