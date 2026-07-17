import './styles/app.css';
import { GameApp } from './game/GameApp';

const root = document.querySelector<HTMLElement>('#app');
if (!root) {
  throw new Error('#app missing');
}

new GameApp(root);

// Register service worker for PWA shell caching when available
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => {
      /* optional */
    });
  });
}
