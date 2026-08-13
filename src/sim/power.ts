import { BUILDINGS } from '../data/buildings';
import type { TileMap } from '../map/TileMap';
import { isPowerPlant } from '../map/layers';

export function updatePower(map: TileMap): { supplied: number; capacity: number; brownout: boolean } {
  map.forEach((t) => {
    t.powered = false;
  });

  const queue: Array<{ x: number; y: number }> = [];

  map.forEach((tile, x, y) => {
    if (isPowerPlant(tile.building)) {
      tile.powered = true;
      queue.push({ x, y });
    }
  });

  const visited = new Set<number>();

  while (queue.length) {
    const { x, y } = queue.pop()!;
    const idx = y * map.size + x;
    if (visited.has(idx)) continue;
    visited.add(idx);
    const tile = map.get(x, y)!;
    tile.powered = true;

    for (const nb of map.neighbors4(x, y)) {
      const nIdx = nb.y * map.size + nb.x;
      if (visited.has(nIdx)) continue;
      const conducts =
        nb.tile.powerLine ||
        isPowerPlant(nb.tile.building) ||
        nb.tile.building !== 'none' ||
        nb.tile.zone !== 'none' ||
        nb.tile.road !== 'none';
      const fromConductor =
        tile.powerLine || isPowerPlant(tile.building) || tile.building !== 'none';
      if (conducts && (fromConductor || nb.tile.powerLine || isPowerPlant(nb.tile.building))) {
        queue.push({ x: nb.x, y: nb.y });
      }
    }
  }

  let capacity = 0;
  map.forEach((tile) => {
    if (isPowerPlant(tile.building) && !tile.footprint) {
      capacity += BUILDINGS[tile.building].powerOutput;
    }
  });

  const consumers: Array<{ x: number; y: number; use: number; land: number }> = [];
  let demand = 0;
  map.forEach((tile, x, y) => {
    if (!tile.powered || tile.footprint || tile.building === 'none') return;
    if (isPowerPlant(tile.building)) return;
    const use = BUILDINGS[tile.building].powerUse;
    if (use <= 0) return;
    demand += use;
    consumers.push({ x, y, use, land: tile.landValue });
  });

  let brownout = false;
  if (demand > capacity) {
    brownout = true;
    consumers.sort((a, b) => a.land - b.land);
    let extra = demand - capacity;
    for (const c of consumers) {
      if (extra <= 0) break;
      const t = map.get(c.x, c.y)!;
      t.powered = false;
      extra -= c.use;
      demand -= c.use;
    }
  }

  return { supplied: Math.max(0, demand), capacity, brownout };
}
