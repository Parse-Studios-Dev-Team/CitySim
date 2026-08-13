import type { TileMap } from '../map/TileMap';
import type { CoverageMaps } from './coverage';

export type DisasterType = 'none' | 'fire' | 'flood' | 'monster';

export interface MonsterState {
  px: number;
  py: number;
  tx: number;
  ty: number;
  stepsLeft: number;
}

export interface DisasterState {
  enabled: boolean;
  active: DisasterType;
  message: string | null;
  monster: MonsterState | null;
}

export function createDisasterState(): DisasterState {
  return { enabled: true, active: 'none', message: null, monster: null };
}

export function tickDisasters(
  map: TileMap,
  coverage: CoverageMaps,
  state: DisasterState,
  population: number,
): DisasterState {
  let message: string | null = null;
  let active: DisasterType = state.active;
  let monster = state.monster;

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

  map.forEach((t) => {
    if (t.flooded && Math.random() < 0.25) t.flooded = false;
  });

  if (!state.enabled) {
    return { ...state, active: fires.length ? 'fire' : monster ? 'monster' : 'none', message: null };
  }

  const roll = Math.random();
  if (active === 'none' && !monster && population > 50) {
    if (roll < 0.02) {
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
      const x = (Math.random() * map.size) | 0;
      const y = (Math.random() * map.size) | 0;
      monster = { px: x, py: y, tx: x, ty: y, stepsLeft: 16 };
      active = 'monster';
      message = 'A monster is trampling through town!';
    }
  } else if (active === 'flood' && roll < 0.4) {
    active = 'none';
  } else if (active === 'fire' && fires.length === 0) {
    active = 'none';
  } else if (active === 'monster' && !monster) {
    active = 'none';
  }

  return { enabled: state.enabled, active, message, monster };
}

export function advanceMonster(map: TileMap, state: DisasterState, dtMs: number): void {
  const m = state.monster;
  if (!m) return;
  const speed = 0.0024;
  const dx = m.tx - m.px;
  const dy = m.ty - m.py;
  const dist = Math.hypot(dx, dy);
  if (dist < 0.08) {
    stomp(map, Math.round(m.px), Math.round(m.py));
    m.stepsLeft--;
    if (m.stepsLeft <= 0) {
      state.monster = null;
      if (state.active === 'monster') state.active = 'none';
      return;
    }
    const dirs = [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ];
    const d = dirs[(Math.random() * 4) | 0];
    m.tx = Math.max(0, Math.min(map.size - 1, Math.round(m.px) + d[0]));
    m.ty = Math.max(0, Math.min(map.size - 1, Math.round(m.py) + d[1]));
  } else {
    m.px += (dx / dist) * speed * dtMs;
    m.py += (dy / dist) * speed * dtMs;
  }
}

function stomp(map: TileMap, x: number, y: number): void {
  const t = map.get(x, y);
  if (!t || t.water) return;
  if (t.building !== 'none') {
    t.building = 'abandoned';
    t.buildingStage = 1;
    t.population = 0;
    t.footprint = false;
  }
  t.trees = false;
}
