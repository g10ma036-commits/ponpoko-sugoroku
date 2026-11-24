import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// ---- 日本語フォントは1種類で約4MBあるので、ゲームで使う文字を含むファイルだけオフライン用に保存する
function collectChars(dir: string, out: Set<number>) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) collectChars(p, out);
    else if (/\.(tsx?|css)$/.test(name)) for (const ch of readFileSync(p, 'utf8')) out.add(ch.codePointAt(0)!);
  }
}

function usedFontFiles(): Set<string> {
  const chars = new Set<number>();
  collectChars('src', chars);
  // 名前の入力用に、ひらがな・カタカナ・英数字はぜんぶ入れる
  for (let c = 0x20; c < 0x7f; c++) chars.add(c);
  for (let c = 0x3040; c < 0x3100; c++) chars.add(c);
  for (let c = 0xff01; c < 0xff5f; c++) chars.add(c);
  const keep = new Set<string>();
  for (const css of ['500', '900']) {
    const text = readFileSync(`node_modules/@fontsource/zen-maru-gothic/${css}.css`, 'utf8');
    for (const block of text.match(/@font-face\s*{[^}]*}/g) ?? []) {
      const file = /url\(\.\/files\/([^)]+?)\.woff2\)/.exec(block)?.[1];
      const range = /unicode-range:\s*([^;]+);/.exec(block)?.[1];
      if (!file || !range) continue;
      const hit = range.split(',').some((part) => {
        const r = part.trim().replace(/^U\+/i, '');
        const [a, b] = r.includes('-') ? r.split('-') : r.includes('?') ? [r.replace(/\?/g, '0'), r.replace(/\?/g, 'F')] : [r, r];
        const lo = parseInt(a, 16);
        const hi = parseInt(b, 16);
        for (const c of chars) if (c >= lo && c <= hi) return true;
        return false;
      });
      if (hit) keep.add(file);
    }
  }
  return keep;
}

const fontKeep = usedFontFiles();

// base: './' にしておくと GitHub Pages のサブパス（/リポジトリ名/）でもそのまま動く
export default defineConfig({
  base: './',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/apple-touch-icon.png', 'icons/favicon.png'],
      manifest: {
        name: 'ぽんぽこ列島すごろく',
        short_name: 'ぽんぽこすごろく',
        description: '動物たちと列島をめぐる、オリジナルのすごろくゲーム',
        lang: 'ja',
        display: 'standalone',
        orientation: 'portrait',
        start_url: './',
        scope: './',
        theme_color: '#f6b04a',
        background_color: '#fff6e5',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,png,svg,woff2}'],
        maximumFileSizeToCacheInBytes: 6 * 1024 * 1024,
        navigateFallback: 'index.html',
        manifestTransforms: [
          async (entries) => ({
            manifest: entries.filter((e) => {
              if (!e.url.endsWith('.woff2')) return true;
              const base = e.url.split('/').pop()!;
              for (const f of fontKeep) if (base.startsWith(`${f}-`) || base === `${f}.woff2`) return true;
              return false;
            }),
            warnings: [],
          }),
        ],
        // 保存しなかったフォントは、使ったときに保存する
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.pathname.endsWith('.woff2'),
            handler: 'CacheFirst',
            options: { cacheName: 'fonts', expiration: { maxEntries: 400 } },
          },
        ],
      },
    }),
  ],
  server: { host: true },
  preview: { host: true },
});
