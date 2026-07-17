import { BUILDINGS } from '../data/buildings';
import type { TileMap } from '../map/TileMap';

export function updateWater(map: TileMap): { capacity: number; used: number } {
  map.forEach((t) => {
    t.watered = false;
  });

  const queue: Array<{ x: number; y: number }> = [];
  let capacity = 0;

  map.forEach((tile, x, y) => {
    if (tile.footprint) return;
    if (tile.building === 'pump') {
      // Pumps need to be near water and powered
      const nearWater =
        tile.water ||
        map.neighbors4(x, y).some((n) => n.tile.water);
      if (nearWater && tile.powered) {
        capacity += 100;
        tile.watered = true;
        queue.push({ x, y });
      }
    } else if (tile.building === 'water_tower' && tile.powered) {
      capacity += 40;
      tile.watered = true;
      queue.push({ x, y });
    } else if (tile.building === 'treatment' && tile.powered) {
      capacity += 80;
      tile.watered = true;
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
    tile.watered = true;

    for (const nb of map.neighbors4(x, y)) {
      const nIdx = nb.y * map.size + nb.x;
      if (visited.has(nIdx)) continue;
      if (nb.tile.pipe || nb.tile.building === 'pump' || nb.tile.building === 'water_tower') {
        queue.push({ x: nb.x, y: nb.y });
      } else if (tile.pipe && (nb.tile.zone !== 'none' || nb.tile.building !== 'none')) {
        // Water seeps from pipes into adjacent developed tiles
        nb.tile.watered = true;
        visited.add(nIdx);
      }
    }
  }

  // Also mark zoned tiles that sit on pipes
  map.forEach((tile) => {
    if (tile.pipe && (tile.zone !== 'none' || tile.building !== 'none')) {
      tile.watered = true;
    }
  });

  let used = 0;
  map.forEach((tile) => {
    if (tile.watered && tile.building !== 'none' && !tile.footprint) {
      used += BUILDINGS[tile.building].waterUse;
    }
  });

  return { capacity, used };
}
