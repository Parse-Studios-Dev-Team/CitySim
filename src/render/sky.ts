import { mixHex } from './sprites';

export interface SkySample {
  top: string;
  mid: string;
  bot: string;
  night: number;
  ambient: number;
  label: 'night' | 'dawn' | 'day' | 'dusk';
}

interface SkyKey {
  t: number;
  top: string;
  mid: string;
  bot: string;
  night: number;
  ambient: number;
  label: SkySample['label'];
}

const KEYS: SkyKey[] = [
  { t: 0, top: '#070b18', mid: '#12182c', bot: '#1a2238', night: 1, ambient: 0.28, label: 'night' },
  { t: 0.2, top: '#c45a48', mid: '#e09058', bot: '#3a4a38', night: 0.4, ambient: 0.55, label: 'dawn' },
  { t: 0.32, top: '#5a9ec8', mid: '#2f6a48', bot: '#163526', night: 0.05, ambient: 1, label: 'day' },
  { t: 0.5, top: '#4a8ab8', mid: '#24553a', bot: '#0f2418', night: 0, ambient: 1, label: 'day' },
  { t: 0.7, top: '#d4683a', mid: '#8a4060', bot: '#2a3048', night: 0.35, ambient: 0.62, label: 'dusk' },
  { t: 0.82, top: '#2a1848', mid: '#1a2040', bot: '#12182c', night: 0.8, ambient: 0.34, label: 'night' },
  { t: 1, top: '#070b18', mid: '#12182c', bot: '#1a2238', night: 1, ambient: 0.28, label: 'night' },
];

export function sampleSky(timeOfDay: number): SkySample {
  const t = ((timeOfDay % 1) + 1) % 1;
  let i = 0;
  while (i < KEYS.length - 1 && KEYS[i + 1].t < t) i++;
  const a = KEYS[i];
  const b = KEYS[i + 1];
  const span = b.t - a.t || 1;
  const u = (t - a.t) / span;
  return {
    top: mixHex(a.top, b.top, u),
    mid: mixHex(a.mid, b.mid, u),
    bot: mixHex(a.bot, b.bot, u),
    night: a.night + (b.night - a.night) * u,
    ambient: a.ambient + (b.ambient - a.ambient) * u,
    label: u < 0.5 ? a.label : b.label,
  };
}

export function clockLabel(timeOfDay: number): string {
  const minutes = Math.floor(((timeOfDay % 1) + 1) % 1 * 24 * 60);
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  const ampm = h >= 12 ? 'PM' : 'AM';
  const hr = h % 12 === 0 ? 12 : h % 12;
  return `${hr}:${m.toString().padStart(2, '0')} ${ampm}`;
}
