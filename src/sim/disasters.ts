import type { TileMap } from '../map/TileMap';
import type { CoverageMaps } from './coverage';

export type DisasterType = 'none' | 'fire' | 'flood' | 'monster';

export interface DisasterState {
  enabled: boolean;
  active: DisasterType;
  message: string | null;
}

export function createDisasterState(): DisasterState {
  return { enabled: true, active: 'none', message: null };
}

export function tickDisasters(
  map: TileMap,
  coverage: CoverageMaps,
  state: DisasterState,
  population: number,
): DisasterState {
  let message: string | null = null;
  let active: DisasterType = state.active;

  // Spread / extinguish fires
  const fires: Array<{ x: number; y: number }> = [];
  map.forEach((t, x, y) => {
    if (t.onFire) fires.push({ x, y });
  });

  for (const f of fires) {
    const idx = f.y * map.size + f.x;
    if (coverage.fire[idx] > 0.35 && Math.random() < coverage.fire[idx]) {
      map.get(f.x, f.y)!.onFire = false;
      continue;
    }
    if (Math.random() < 0.35) {
      const nbs = map.neighbors4(f.x, f.y);
      const victim = nbs[(Math.random() * nbs.length) | 0];
      if (victim && !victim.tile.water && victim.tile.building !== 'none') {
        victim.tile.onFire = true;
      }
    }
    if (Math.random() < 0.2) {
      const t = map.get(f.x, f.y)!;
      if (t.building !== 'none') {
        t.building = 'abandoned';
        t.buildingStage = 1;
        t.population = 0;
        t.onFire = false;
      }
    }
  }

  // Clear floods gradually
  map.forEach((t) => {
    if (t.flooded && Math.random() < 0.25) t.flooded = false;
  });

  if (!state.enabled) {
    return { ...state, active: fires.length ? 'fire' : 'none', message: null };
  }

  // Random events
  const roll = Math.random();
  if (active === 'none' && population > 50) {
    if (roll < 0.02) {
      // Start a fire on a random building
      const buildings: Array<{ x: number; y: number }> = [];
      map.forEach((t, x, y) => {
        if (t.building !== 'none' && !t.water) buildings.push({ x, y });
      });
      if (buildings.length) {
        const b = buildings[(Math.random() * buildings.length) | 0];
        map.get(b.x, b.y)!.onFire = true;
        active = 'fire';
        message = 'Fire breaks out in the city!';
      }
    } else if (roll < 0.03) {
      // Flood near water
      map.forEach((t, x, y) => {
        if (t.water) {
          for (const nb of map.neighbors4(x, y)) {
            if (!nb.tile.water && Math.random() < 0.35) {
              nb.tile.flooded = true;
              if (nb.tile.buildingStage > 0 && Math.random() < 0.4) {
                nb.tile.buildingStage = Math.max(0, nb.tile.buildingStage - 1);
              }
            }
          }
        }
      });
      active = 'flood';
      message = 'Heavy rains flood the waterfront!';
    } else if (roll < 0.035 && population > 200) {
      // Monster stomps a path
      let x = (Math.random() * map.size) | 0;
      let y = (Math.random() * map.size) | 0;
      for (let step = 0; step < 12; step++) {
        const t = map.get(x, y);
        if (t && !t.water) {
          if (t.building !== 'none') {
            t.building = 'abandoned';
            t.buildingStage = 1;
            t.population = 0;
          }
          t.trees = false;
        }
        x = Math.max(0, Math.min(map.size - 1, x + ((Math.random() * 3) | 0) - 1));
        y = Math.max(0, Math.min(map.size - 1, y + ((Math.random() * 3) | 0) - 1));
      }
      active = 'monster';
      message = 'A monster is trampling through town!';
    }
  } else if (active !== 'none' && fires.length === 0 && roll < 0.4) {
    active = 'none';
  }

  return { enabled: state.enabled, active, message };
}
