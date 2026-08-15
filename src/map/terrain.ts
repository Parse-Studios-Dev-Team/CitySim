import { createEmptyTile, type Tile } from './layers';
import type { TileMap } from './TileMap';

export type TerrainId = 'valley' | 'coast' | 'islands' | 'lakes' | 'archipelago' | 'plains';

export interface TerrainTemplate {
  id: TerrainId;
  title: string;
  description: string;
  seed: number;
}

export const TERRAIN_TEMPLATES: TerrainTemplate[] = [
  {
    id: 'valley',
    title: 'River Valley',
    description: 'Rolling hills split by a winding river — the classic blank map.',
    seed: 1900,
  },
  {
    id: 'coast',
    title: 'Coastal Bay',
    description: 'A long shoreline and harbor. Perfect for ports and beachfront.',
    seed: 1962,
  },
  {
    id: 'islands',
    title: 'Twin Isles',
    description: 'Two fat islands in a channel. Bridge them or build two towns.',
    seed: 77,
  },
  {
    id: 'lakes',
    title: 'Highland Lakes',
    description: 'Inland lakes and ridges. Water pumps have plenty of shoreline.',
    seed: 404,
  },
  {
    id: 'archipelago',
    title: 'Archipelago',
    description: 'Scattered islets. Tight building, lots of waterfront.',
    seed: 4400,
  },
  {
    id: 'plains',
    title: 'Great Plains',
    description: 'Mostly flat prairie and a thin creek. Easy grids, huge cities.',
    seed: 12,
  },
];

export function applyTerrain(map: TileMap, id: TerrainId, seed: number): void {
  const rnd = mulberry32(seed);
  for (let y = 0; y < map.size; y++) {
    for (let x = 0; x < map.size; x++) {
      map.tiles[map.index(x, y)] = tileFor(id, x, y, map.size, seed, rnd);
    }
  }
}

function tileFor(
  id: TerrainId,
  x: number,
  y: number,
  size: number,
  seed: number,
  rnd: () => number,
): Tile {
  const nx = x / size;
  const ny = y / size;
  switch (id) {
    case 'valley':
      return valleyTile(nx, ny, seed, rnd);
    case 'coast':
      return coastTile(nx, ny, seed, rnd);
    case 'islands':
      return islandsTile(nx, ny, rnd);
    case 'lakes':
      return lakesTile(nx, ny, seed, rnd);
    case 'archipelago':
      return archipelagoTile(nx, ny, rnd);
    case 'plains':
      return plainsTile(nx, ny, rnd);
    default: {
      const _exhaustive: never = id;
      return _exhaustive;
    }
  }
}

function valleyTile(nx: number, ny: number, seed: number, rnd: () => number): Tile {
  const hill =
    Math.sin(nx * 6 + seed) * Math.cos(ny * 5) * 1.4 + Math.sin((nx + ny) * 8) * 0.6;
  const height = Math.max(0, Math.min(6, Math.round(2 + hill + (rnd() - 0.5))));
  const river =
    Math.abs(ny - 0.45 - Math.sin(nx * 4) * 0.08) < 0.035 ||
    Math.abs(nx - 0.62 - Math.cos(ny * 3) * 0.05) < 0.03;
  const tile = createEmptyTile(river ? 0 : height);
  if (river) {
    tile.water = true;
    tile.height = 0;
  } else if (height >= 2 && rnd() < 0.12) {
    tile.trees = true;
  }
  return tile;
}

function coastTile(nx: number, ny: number, seed: number, rnd: () => number): Tile {
  const shore = 0.68 + Math.sin(ny * 7 + seed) * 0.05 + Math.cos(ny * 3) * 0.03;
  const bay = Math.hypot(nx - 0.78, ny - 0.42) < 0.16;
  const water = nx > shore || bay || ny > 0.9;
  const hill = Math.sin(nx * 4) * Math.cos(ny * 5) * 0.8;
  const height = water ? 0 : Math.max(1, Math.min(5, Math.round(2 + hill + (rnd() - 0.4))));
  const tile = createEmptyTile(height);
  if (water) {
    tile.water = true;
    tile.height = 0;
  } else if (height <= 1 && rnd() < 0.08) {
    tile.trees = true;
  } else if (height >= 3 && rnd() < 0.14) {
    tile.trees = true;
  }
  return tile;
}

function islandsTile(nx: number, ny: number, rnd: () => number): Tile {
  const a = Math.hypot(nx - 0.32, ny - 0.42);
  const b = Math.hypot(nx - 0.7, ny - 0.58);
  const land = a < 0.28 + rnd() * 0.02 || b < 0.24 + rnd() * 0.02;
  const height = land ? Math.max(1, Math.min(5, Math.round(2 + (0.28 - Math.min(a, b)) * 6))) : 0;
  const tile = createEmptyTile(height);
  if (!land) {
    tile.water = true;
    tile.height = 0;
  } else if (rnd() < 0.16) {
    tile.trees = true;
  }
  return tile;
}

function lakesTile(nx: number, ny: number, seed: number, rnd: () => number): Tile {
  const lakes = [
    Math.hypot(nx - 0.28, ny - 0.3) < 0.12,
    Math.hypot(nx - 0.7, ny - 0.62) < 0.14,
    Math.hypot(nx - 0.52, ny - 0.22) < 0.08,
  ];
  const water = lakes.some(Boolean);
  const hill = Math.sin(nx * 5 + seed) * Math.cos(ny * 6) * 1.6;
  const height = water ? 0 : Math.max(1, Math.min(6, Math.round(3 + hill + (rnd() - 0.5))));
  const tile = createEmptyTile(height);
  if (water) {
    tile.water = true;
    tile.height = 0;
  } else if (height >= 2 && rnd() < 0.18) {
    tile.trees = true;
  }
  return tile;
}

function archipelagoTile(nx: number, ny: number, rnd: () => number): Tile {
  const spots = [
    [0.2, 0.25, 0.11],
    [0.48, 0.3, 0.1],
    [0.75, 0.22, 0.09],
    [0.28, 0.55, 0.12],
    [0.55, 0.58, 0.13],
    [0.8, 0.62, 0.1],
    [0.4, 0.8, 0.11],
    [0.68, 0.82, 0.09],
  ];
  let nearest = 9;
  for (const [cx, cy, r] of spots) {
    const d = Math.hypot(nx - cx, ny - cy) / r;
    if (d < nearest) nearest = d;
  }
  const land = nearest < 1;
  const height = land ? Math.max(1, Math.min(4, Math.round(3 - nearest * 2))) : 0;
  const tile = createEmptyTile(height);
  if (!land) {
    tile.water = true;
    tile.height = 0;
  } else if (rnd() < 0.2) {
    tile.trees = true;
  }
  return tile;
}

function plainsTile(nx: number, ny: number, rnd: () => number): Tile {
  const creek = Math.abs(ny - 0.62 - Math.sin(nx * 3) * 0.04) < 0.02;
  const height = creek ? 0 : rnd() < 0.08 ? 3 : 2;
  const tile = createEmptyTile(height);
  if (creek) {
    tile.water = true;
    tile.height = 0;
  } else if (rnd() < 0.07) {
    tile.trees = true;
  }
  return tile;
}

export function mulberry32(a: number): () => number {
  return () => {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
