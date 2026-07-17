import { BUILDINGS } from '../data/buildings';
import type { TileMap } from '../map/TileMap';
import type { BudgetState } from './budget';

export interface CoverageMaps {
  police: Float32Array;
  fire: Float32Array;
  health: Float32Array;
  school: Float32Array;
  college: Float32Array;
  park: Float32Array;
}

export function createCoverage(size: number): CoverageMaps {
  const n = size * size;
  return {
    police: new Float32Array(n),
    fire: new Float32Array(n),
    health: new Float32Array(n),
    school: new Float32Array(n),
    college: new Float32Array(n),
    park: new Float32Array(n),
  };
}

export function updateCoverage(map: TileMap, coverage: CoverageMaps, budget: BudgetState): void {
  const n = map.size * map.size;
  coverage.police.fill(0);
  coverage.fire.fill(0);
  coverage.health.fill(0);
  coverage.school.fill(0);
  coverage.college.fill(0);
  coverage.park.fill(0);

  map.forEach((tile, x, y) => {
    if (tile.footprint) return;
    const def = BUILDINGS[tile.building];
    if (def.coverageType === 'none' || def.coverage <= 0) return;
    if (!tile.powered && tile.building !== 'park') return;

    let strength = 1;
    const ctype = def.coverageType;
    if (ctype === 'police') strength = budget.fundPolice / 100;
    else if (ctype === 'fire') strength = budget.fundFire / 100;
    else if (ctype === 'health') strength = budget.fundHealth / 100;
    else if (ctype === 'school' || ctype === 'college') strength = budget.fundEducation / 100;
    else if (ctype === 'park') strength = 1;

    const radius = def.coverage;
    for (let dy = -radius; dy <= radius; dy++) {
      for (let dx = -radius; dx <= radius; dx++) {
        const nx = x + dx;
        const ny = y + dy;
        if (!map.inBounds(nx, ny)) continue;
        const dist = Math.hypot(dx, dy);
        if (dist > radius) continue;
        const val = (1 - dist / radius) * strength;
        const idx = ny * map.size + nx;
        if (ctype === 'police') coverage.police[idx] = Math.max(coverage.police[idx], val);
        else if (ctype === 'fire') coverage.fire[idx] = Math.max(coverage.fire[idx], val);
        else if (ctype === 'health') coverage.health[idx] = Math.max(coverage.health[idx], val);
        else if (ctype === 'school') coverage.school[idx] = Math.max(coverage.school[idx], val);
        else if (ctype === 'college') coverage.college[idx] = Math.max(coverage.college[idx], val);
        else if (ctype === 'park') coverage.park[idx] = Math.max(coverage.park[idx], val);
      }
    }
  });

  // Land value / crime / pollution pass using coverage
  for (let i = 0; i < n; i++) {
    const x = i % map.size;
    const y = (i / map.size) | 0;
    const tile = map.tiles[i];
    const def = BUILDINGS[tile.building];

    let pollution = Math.max(0, def.pollution);
    for (const nb of map.neighbors4(x, y)) {
      pollution += Math.max(0, BUILDINGS[nb.tile.building].pollution) * 0.25;
    }
    if (budget.ordinances.pollutionControl) pollution *= 0.7;
    pollution -= coverage.park[i] * 8;
    tile.pollution = Math.max(0, Math.min(100, pollution));

    let crime = tile.population * 0.08 + (tile.building === 'abandoned' ? 20 : 0);
    crime -= coverage.police[i] * 40;
    if (budget.ordinances.neighborhoodWatch) crime *= 0.85;
    tile.crime = Math.max(0, Math.min(100, crime));

    let land = 40;
    land += coverage.park[i] * 25;
    land += coverage.school[i] * 10;
    land += coverage.college[i] * 12;
    land += coverage.health[i] * 8;
    land += tile.water ? 15 : 0;
    land -= tile.pollution * 0.6;
    land -= tile.crime * 0.4;
    if (tile.trees) land += 5;
    tile.landValue = Math.max(5, Math.min(100, land));

    tile.traffic =
      tile.road !== 'none'
        ? Math.min(100, 10 + tile.population * 0.5 + (tile.road === 'highway' ? 20 : 0))
        : 0;
  }
}
