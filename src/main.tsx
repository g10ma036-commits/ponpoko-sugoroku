import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import '@fontsource/zen-maru-gothic/500.css';
import '@fontsource/zen-maru-gothic/900.css';
import './styles.css';
import { App } from './App';

// オフラインで遊べるように、サービスワーカーでファイルを保存する
registerSW({ immediate: true });

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
