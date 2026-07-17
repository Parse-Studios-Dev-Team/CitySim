import { BUILDINGS, buildingForZone, populationForTile } from '../data/buildings';
import type { TileMap } from '../map/TileMap';
import { isCZone, isIZone, isRZone, isZone } from '../map/layers';
import type { DemandState } from './demand';
import type { CoverageMaps } from './coverage';

export function updateRoadAccess(map: TileMap): void {
  map.forEach((t) => {
    t.roadAccess = false;
  });

  map.forEach((tile, x, y) => {
    if (tile.road === 'none') return;
    tile.roadAccess = true;
    for (const nb of map.neighbors4(x, y)) {
      if (isZone(nb.tile.zone) || nb.tile.building !== 'none') {
        nb.tile.roadAccess = true;
      }
    }
  });
}

export function growZones(
  map: TileMap,
  demand: DemandState,
  coverage: CoverageMaps,
): { grew: number; abandoned: number } {
  let grew = 0;
  let abandoned = 0;

  const candidates: Array<{ x: number; y: number; score: number }> = [];

  map.forEach((tile, x, y) => {
    if (!isZone(tile.zone)) return;
    if (tile.building !== 'none' && !isZoneBuilding(tile.building) && tile.building !== 'abandoned') {
      return;
    }

    const idx = y * map.size + x;
    let dem = 0;
    if (isRZone(tile.zone)) dem = demand.r;
    else if (isCZone(tile.zone)) dem = demand.c;
    else if (isIZone(tile.zone)) dem = demand.i;

    const canDevelop =
      tile.powered &&
      tile.roadAccess &&
      (tile.watered || tile.buildingStage < 2) &&
      !tile.onFire &&
      !tile.flooded;

    if (tile.building === 'abandoned') {
      if (canDevelop && dem > 10 && tile.landValue > 35) {
        tile.building = 'none';
        tile.buildingStage = 0;
        tile.population = 0;
      }
      return;
    }

    if (!canDevelop) {
      if (tile.buildingStage > 0 && Math.random() < 0.08) {
        tile.buildingStage--;
        if (tile.buildingStage <= 0) {
          tile.building = 'abandoned';
          tile.buildingStage = 1;
          tile.population = 0;
          abandoned++;
        } else {
          tile.building = buildingForZone(tile.zone, tile.buildingStage);
          const pop = populationForTile(tile.building, tile.buildingStage);
          tile.population = pop.residents || pop.jobs;
        }
      }
      return;
    }

    const score =
      dem +
      tile.landValue * 0.4 -
      tile.pollution * 0.5 -
      tile.crime * 0.3 +
      coverage.park[idx] * 10 +
      (Math.random() - 0.5) * 10;

    candidates.push({ x, y, score });
  });

  candidates.sort((a, b) => b.score - a.score);
  const growBudget = Math.max(1, Math.min(12, Math.floor(candidates.length * 0.08) + 1));

  for (let i = 0; i < candidates.length && grew < growBudget; i++) {
    const { x, y, score } = candidates[i];
    const tile = map.get(x, y)!;
    let dem = 0;
    if (isRZone(tile.zone)) dem = demand.r;
    else if (isCZone(tile.zone)) dem = demand.c;
    else if (isIZone(tile.zone)) dem = demand.i;

    if (dem < -20 && tile.buildingStage > 0) {
      tile.buildingStage--;
      if (tile.buildingStage <= 0) {
        tile.building = 'abandoned';
        tile.buildingStage = 1;
        tile.population = 0;
        abandoned++;
      } else {
        tile.building = buildingForZone(tile.zone, tile.buildingStage);
        const pop = populationForTile(tile.building, tile.buildingStage);
        tile.population = pop.residents || pop.jobs;
      }
      continue;
    }

    if (score < 15 || dem < 5) continue;

    const maxStage = tile.zone.includes('dense') ? 5 : 3;
    if (tile.buildingStage < maxStage) {
      // Dense growth needs water
      if (tile.buildingStage >= 2 && !tile.watered) continue;
      tile.buildingStage++;
      tile.building = buildingForZone(tile.zone, tile.buildingStage);
      const pop = populationForTile(tile.building, tile.buildingStage);
      tile.population = pop.residents || pop.jobs;
      grew++;
    }
  }

  // Refresh populations
  map.forEach((tile) => {
    if (isZoneBuilding(tile.building)) {
      const pop = populationForTile(tile.building, tile.buildingStage);
      tile.population = pop.residents || pop.jobs;
    } else if (tile.building !== 'none' && tile.building !== 'abandoned') {
      const def = BUILDINGS[tile.building];
      tile.population = def.residents || def.jobs;
    }
  });

  return { grew, abandoned };
}

function isZoneBuilding(b: string): boolean {
  return (
    b === 'house' ||
    b === 'apartment' ||
    b === 'shop' ||
    b === 'office' ||
    b === 'factory' ||
    b === 'warehouse'
  );
}
