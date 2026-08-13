import type { TileMap } from '../map/TileMap';
import type { BudgetState } from './budget';
import type { CoverageMaps } from './coverage';

export interface MoodInputs {
  population: number;
  brownout: boolean;
  drought: boolean;
}

export function computeHappiness(
  map: TileMap,
  coverage: CoverageMaps,
  budget: BudgetState,
  stats: MoodInputs,
): number {
  if (stats.population <= 0) return 55;

  let park = 0;
  let school = 0;
  let health = 0;
  let pol = 0;
  let crime = 0;
  let n = 0;
  map.forEach((t, x, y) => {
    if (t.zone === 'none' || t.population <= 0) return;
    const idx = y * map.size + x;
    park += coverage.park[idx];
    school += coverage.school[idx] + coverage.college[idx] * 0.5;
    health += coverage.health[idx];
    pol += t.pollution;
    crime += t.crime;
    n++;
  });
  if (n === 0) return 50;
  park /= n;
  school /= n;
  health /= n;
  pol /= n;
  crime /= n;

  const tax = (budget.taxR + budget.taxC + budget.taxI) / 3;
  let h = 52;
  h += park * 22;
  h += school * 10;
  h += health * 8;
  h -= pol * 0.35;
  h -= crime * 0.28;
  h -= Math.max(0, tax - 7) * 2.4;
  if (stats.brownout) h -= 18;
  if (stats.drought) h -= 10;
  if (budget.funds < 0) h -= 12;
  if (stats.population > 800) h += 4;

  return Math.max(0, Math.min(100, Math.round(h)));
}

export function moodFace(happiness: number): string {
  if (happiness >= 80) return '😄';
  if (happiness >= 62) return '🙂';
  if (happiness >= 45) return '😐';
  if (happiness >= 28) return '🙁';
  return '😠';
}
