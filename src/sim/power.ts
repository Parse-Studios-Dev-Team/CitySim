import { BUILDINGS } from '../data/buildings';
import type { TileMap } from '../map/TileMap';
import { isPowerPlant } from '../map/layers';

export function updatePower(map: TileMap): { supplied: number; capacity: number } {
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

  let supplied = 0;
  map.forEach((tile) => {
    if (tile.powered && tile.building !== 'none' && !tile.footprint) {
      supplied += BUILDINGS[tile.building].powerUse;
    }
  });

  let capacity = 0;
  map.forEach((tile) => {
    if (isPowerPlant(tile.building) && !tile.footprint) {
      capacity += BUILDINGS[tile.building].powerOutput;
    }
  });

  return { supplied, capacity };
}
