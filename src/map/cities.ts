import { BUILDINGS, buildingForZone, populationForTile } from '../data/buildings';
import type { BuildingKind, RoadType, ZoneType } from './layers';
import type { TerrainId } from './terrain';
import { TileMap } from './TileMap';

export interface CityTemplate {
  id: string;
  title: string;
  era: string;
  description: string;
  year: number;
  funds: number;
  terrain: TerrainId;
  seed: number;
  paint: (map: TileMap) => void;
}

export const CITY_TEMPLATES: CityTemplate[] = [
  {
    id: 'industrial',
    title: 'Millford',
    era: 'Industrial Revolution',
    description:
      'Creative sandbox. Soot, brick, rail, and mill stacks along the river — poke around a finished 1880s city.',
    year: 1888,
    funds: 9_999_999,
    terrain: 'valley',
    seed: 1888,
    paint: paintIndustrial,
  },
  {
    id: 'midcentury',
    title: 'Fairview',
    era: 'Mid-20th Century',
    description:
      'Creative sandbox. Highways, ranch houses, a downtown skyline, and a drive-in era civic core.',
    year: 1962,
    funds: 9_999_999,
    terrain: 'coast',
    seed: 1962,
    paint: paintMidcentury,
  },
  {
    id: 'farfuture',
    title: 'Aether Spire',
    era: '45th Century',
    description:
      'Creative sandbox. Arcologies, fusion stacks, launch gantries, and skyways across twin isles.',
    year: 4488,
    funds: 9_999_999,
    terrain: 'islands',
    seed: 4488,
    paint: paintFarFuture,
  },
];

export function buildCity(template: CityTemplate): TileMap {
  const map = new TileMap(undefined, template.terrain, template.seed);
  template.paint(map);
  return map;
}

function paintIndustrial(map: TileMap): void {
  streetGrid(map, 4, 'road');
  for (let x = 6; x < map.size - 4; x += 8) railLine(map, x, 4, x, map.size - 5);
  zoneByRegion(map, (x, y, size) => {
    if (x > size * 0.55 && y > size * 0.35) return y % 8 < 4 ? 'i_dense' : 'i_light';
    if (x > size * 0.38 && x < size * 0.58 && y > size * 0.28 && y < size * 0.62) return 'c_light';
    return 'r_light';
  });
  developZones(map, (zone) => (zone.startsWith('i') ? 3 : zone.startsWith('c') ? 2 : 2));
  pipesOnRoads(map);
  seedUtilities(map, 'coal_plant', 12);
  seedUtilities(map, 'pump', 16);
  seedUtilities(map, 'water_tower', 32);
  placeNear(map, 'treatment', 0.68, 0.42, 2);
  placeNear(map, 'police', 0.42, 0.4, 1);
  placeNear(map, 'fire', 0.46, 0.5, 1);
  placeNear(map, 'school', 0.3, 0.32, 1);
  placeNear(map, 'prison', 0.78, 0.78, 2);
  sprinkle(map, 'park', 8);
  forceTowers(map, 40);
  serviceAccess(map);
}

function paintMidcentury(map: TileMap): void {
  streetGrid(map, 4, 'road');
  ringRoad(map, 6, 'highway');
  zoneByRegion(map, (x, y, size) => {
    const dx = x - size * 0.4;
    const dy = y - size * 0.4;
    const d = Math.hypot(dx, dy) / size;
    if (d < 0.12) return 'c_dense';
    if (d < 0.18) return 'r_dense';
    if (x > size * 0.62 && y > size * 0.18 && y < size * 0.55) return 'i_light';
    if (x > size * 0.72 && y < size * 0.22) return 'airport';
    return 'r_light';
  });
  developZones(map, (zone) => {
    if (zone === 'c_dense') return 4;
    if (zone === 'r_dense') return 4;
    if (zone.startsWith('i')) return 3;
    return 2;
  });
  pipesOnRoads(map);
  seaportAlongWater(map);
  seedUtilities(map, 'oil_plant', 8);
  seedUtilities(map, 'coal_plant', 4);
  seedUtilities(map, 'pump', 14);
  seedUtilities(map, 'water_tower', 22);
  placeNear(map, 'hospital', 0.38, 0.46, 1);
  placeNear(map, 'school', 0.28, 0.3, 1);
  placeNear(map, 'college', 0.34, 0.52, 2);
  placeNear(map, 'stadium', 0.5, 0.28, 2);
  placeNear(map, 'police', 0.42, 0.38, 1);
  placeNear(map, 'fire', 0.48, 0.44, 1);
  placeNear(map, 'library', 0.4, 0.34, 1);
  sprinkle(map, 'park', 18);
  forceTowers(map, 16);
  serviceAccess(map);
}

function paintFarFuture(map: TileMap): void {
  streetGrid(map, 3, 'highway');
  subwayOnRoads(map);
  map.forEach((t, x, y) => {
    if (t.water) return;
    const nx = x / map.size;
    const ny = y / map.size;
    if (Math.hypot(nx - 0.55, ny - 0.58) < 0.16) t.height = Math.max(t.height, 4);
    else if (Math.hypot(nx - 0.28, ny - 0.55) < 0.12) t.height = Math.max(t.height, 3);
  });
  zoneByRegion(map, (x, y, size) => {
    const nx = x / size;
    const ny = y / size;
    if (Math.hypot(nx - 0.55, ny - 0.58) < 0.14) return 'c_dense';
    if (Math.hypot(nx - 0.28, ny - 0.55) < 0.12) return 'r_dense';
    if (nx > 0.7 && ny > 0.55) return 'i_dense';
    if (nx > 0.72 && ny < 0.28) return 'airport';
    return Math.random() < 0.55 ? 'r_dense' : 'c_dense';
  });
  developZones(map, (zone) => (zone.includes('dense') ? 5 : 3));
  pipesOnRoads(map);
  seaportAlongWater(map);
  seedUtilities(map, 'nuclear_plant', 6);
  seedUtilities(map, 'pump', 14);
  seedUtilities(map, 'water_tower', 28);
  placeNear(map, 'rocket', 0.8, 0.22, 2);
  placeNear(map, 'tv_station', 0.52, 0.5, 2);
  placeNear(map, 'city_hall', 0.55, 0.58, 2);
  placeNear(map, 'college', 0.3, 0.52, 2);
  placeNear(map, 'museum', 0.5, 0.54, 1);
  placeNear(map, 'hospital', 0.42, 0.6, 1);
  placeNear(map, 'police', 0.48, 0.62, 1);
  placeNear(map, 'fire', 0.6, 0.52, 1);
  placeNear(map, 'pump', 0.55, 0.7, 1);
  placeNear(map, 'water_tower', 0.3, 0.55, 1);
  placeNear(map, 'treatment', 0.75, 0.6, 2);
  sprinkle(map, 'park', 10);
  forceTowers(map, 20);
  serviceAccess(map);
}

function streetGrid(map: TileMap, step: number, road: RoadType): void {
  for (let y = 3; y < map.size - 3; y++) {
    for (let x = 3; x < map.size - 3; x++) {
      if (x % step === 0 || y % step === 0) map.paintRoad(x, y, road);
    }
  }
}

function railLine(map: TileMap, x0: number, y0: number, x1: number, y1: number): void {
  const dx = Math.sign(x1 - x0);
  const dy = Math.sign(y1 - y0);
  let x = x0;
  let y = y0;
  for (let i = 0; i < map.size * 2; i++) {
    map.paintRoad(x, y, 'rail');
    if (x === x1 && y === y1) break;
    if (x !== x1) x += dx;
    if (y !== y1) y += dy;
  }
}

function ringRoad(map: TileMap, pad: number, road: RoadType): void {
  const a = pad;
  const b = map.size - pad - 1;
  for (let x = a; x <= b; x++) {
    map.paintRoad(x, a, road);
    map.paintRoad(x, b, road);
  }
  for (let y = a; y <= b; y++) {
    map.paintRoad(a, y, road);
    map.paintRoad(b, y, road);
  }
}

function zoneByRegion(
  map: TileMap,
  pick: (x: number, y: number, size: number) => ZoneType,
): void {
  map.forEach((t, x, y) => {
    if (t.water || t.road !== 'none' || t.building !== 'none') return;
    t.zone = pick(x, y, map.size);
    t.trees = false;
  });
}

function developZones(map: TileMap, stageFor: (zone: ZoneType) => number): void {
  map.forEach((t) => {
    if (t.water || t.road !== 'none' || t.zone === 'none' || t.zone === 'seaport' || t.zone === 'airport') {
      return;
    }
    if (t.building !== 'none') return;
    const stage = stageFor(t.zone);
    t.buildingStage = stage;
    t.building = buildingForZone(t.zone, stage);
    if (t.building === 'none') {
      t.buildingStage = 0;
      return;
    }
    t.powered = true;
    t.watered = true;
    t.roadAccess = true;
    const pop = populationForTile(t.building, stage);
    t.population = pop.residents || pop.jobs;
  });
}

function pipesOnRoads(map: TileMap): void {
  map.forEach((t) => {
    if (t.road !== 'none') t.pipe = true;
  });
}

function subwayOnRoads(map: TileMap): void {
  map.forEach((t) => {
    if (t.road === 'highway' || t.road === 'road') t.subway = true;
  });
}

function seaportAlongWater(map: TileMap): void {
  map.forEach((t, x, y) => {
    if (t.water || t.road !== 'none' || t.building !== 'none') return;
    const near = map.neighbors4(x, y).some((n) => n.tile.water);
    if (near && x > map.size * 0.55) t.zone = 'seaport';
  });
}

function forceTowers(map: TileMap, extra: number): void {
  let placed = 0;
  map.forEach((t, x, y) => {
    if (placed >= extra) return;
    if (t.water || t.road !== 'none' || t.footprint || isUtility(t.building)) return;
    if ((x + y) % 5 !== 1) return;
    if (!clearForBuilding(map, x, y, 1, 1)) return;
    if (map.placeBuilding(x, y, 'water_tower', 1, 1)) {
      const nt = map.get(x, y)!;
      nt.powered = true;
      nt.watered = true;
      nt.pipe = true;
      nt.powerLine = true;
      hookup(map, x, y);
      placed++;
    }
  });
}

function seedUtilities(map: TileMap, kind: BuildingKind, count: number): void {
  if (kind === 'pump') {
    seedPumps(map, count);
    return;
  }
  for (let i = 0; i < count; i++) {
    const fx = 0.12 + ((i * 17) % 80) / 100;
    const fy = 0.14 + ((i * 29) % 78) / 100;
    placeNear(map, kind, fx, fy, 2);
  }
}

function seedPumps(map: TileMap, count: number): void {
  const shores: Array<{ x: number; y: number }> = [];
  map.forEach((t, x, y) => {
    if (t.water || t.road !== 'none') return;
    if (map.neighbors4(x, y).some((n) => n.tile.water)) shores.push({ x, y });
  });
  let placed = 0;
  for (const s of shores) {
    if (placed >= count) break;
    if (!clearForBuilding(map, s.x, s.y, 1, 1)) continue;
    if (map.placeBuilding(s.x, s.y, 'pump', 1, 1)) {
      const t = map.get(s.x, s.y)!;
      t.powered = true;
      t.watered = true;
      t.roadAccess = true;
      hookup(map, s.x, s.y);
      placed++;
    }
  }
}

function placeNear(map: TileMap, kind: BuildingKind, fx: number, fy: number, span: number): void {
  const def = BUILDINGS[kind];
  const cx = Math.round(fx * (map.size - 1));
  const cy = Math.round(fy * (map.size - 1));
  for (let r = 0; r < 18; r++) {
    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        const x = cx + dx;
        const y = cy + dy;
        if (!map.inBounds(x, y)) continue;
        if (!clearForBuilding(map, x, y, def.width, def.height)) continue;
        if (map.placeBuilding(x, y, kind, def.width, def.height)) {
          const t = map.get(x, y)!;
          t.powered = true;
          t.watered = true;
          t.roadAccess = true;
          hookup(map, x, y);
          return;
        }
      }
    }
    if (r > span + 12) break;
  }
}

function isUtility(kind: BuildingKind): boolean {
  switch (kind) {
    case 'coal_plant':
    case 'oil_plant':
    case 'nuclear_plant':
    case 'pump':
    case 'water_tower':
    case 'treatment':
      return true;
    default:
      return false;
  }
}

function clearForBuilding(map: TileMap, x: number, y: number, w: number, h: number): boolean {
  for (let dy = 0; dy < h; dy++) {
    for (let dx = 0; dx < w; dx++) {
      const t = map.get(x + dx, y + dy);
      if (!t || t.water) return false;
      if (isUtility(t.building)) return false;
    }
  }
  for (let dy = 0; dy < h; dy++) {
    for (let dx = 0; dx < w; dx++) {
      const t = map.get(x + dx, y + dy)!;
      t.building = 'none';
      t.buildingStage = 0;
      t.footprint = false;
      t.road = 'none';
      t.population = 0;
    }
  }
  return true;
}

function sprinkle(map: TileMap, kind: BuildingKind, count: number): void {
  const def = BUILDINGS[kind];
  let placed = 0;
  for (let i = 0; i < 400 && placed < count; i++) {
    const x = 4 + ((Math.random() * (map.size - 8)) | 0);
    const y = 4 + ((Math.random() * (map.size - 8)) | 0);
    const t = map.get(x, y);
    if (!t || t.water || t.road !== 'none') continue;
    if (t.zone.startsWith('i')) continue;
    if (!clearForBuilding(map, x, y, def.width, def.height)) continue;
    if (map.placeBuilding(x, y, kind, def.width, def.height)) placed++;
  }
}

function hookup(map: TileMap, x: number, y: number): void {
  const origin = map.get(x, y);
  if (origin) {
    origin.pipe = true;
    origin.powerLine = true;
  }
  for (const n of map.neighbors4(x, y)) {
    if (n.tile.water) continue;
    n.tile.pipe = true;
    n.tile.powerLine = true;
    if (n.tile.building === 'none') {
      map.paintRoad(n.x, n.y, n.tile.road === 'highway' ? 'highway' : 'road');
    }
  }
}

function riverCrossings(map: TileMap): void {
  map.forEach((t, x, y) => {
    if (!t.water) return;
    if (map.neighbors4(x, y).some((n) => !n.tile.water)) {
      t.powerLine = true;
      t.pipe = true;
    }
  });
}

function serviceAccess(map: TileMap): void {
  riverCrossings(map);
  map.forEach((t, x, y) => {
    if (t.road !== 'none') t.roadAccess = true;
    if (t.building !== 'none') {
      t.powered = true;
      t.roadAccess = true;
    }
    if (t.pipe) t.watered = true;
    if (t.zone !== 'none' && map.neighbors4(x, y).some((n) => n.tile.road !== 'none')) {
      t.roadAccess = true;
    }
  });
}
