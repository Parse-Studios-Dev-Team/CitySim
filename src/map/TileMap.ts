import {
  MAP_SIZE,
  createEmptyTile,
  type BuildingKind,
  type RoadType,
  type Tile,
  type ZoneType,
} from './layers';

export class TileMap {
  readonly size: number;
  readonly tiles: Tile[];

  constructor(size = MAP_SIZE) {
    this.size = size;
    this.tiles = new Array(size * size);
    this.generateTerrain();
  }

  index(x: number, y: number): number {
    return y * this.size + x;
  }

  inBounds(x: number, y: number): boolean {
    return x >= 0 && y >= 0 && x < this.size && y < this.size;
  }

  get(x: number, y: number): Tile | null {
    if (!this.inBounds(x, y)) return null;
    return this.tiles[this.index(x, y)];
  }

  set(x: number, y: number, tile: Tile): void {
    if (!this.inBounds(x, y)) return;
    this.tiles[this.index(x, y)] = tile;
  }

  forEach(fn: (tile: Tile, x: number, y: number) => void): void {
    for (let y = 0; y < this.size; y++) {
      for (let x = 0; x < this.size; x++) {
        fn(this.tiles[this.index(x, y)], x, y);
      }
    }
  }

  generateTerrain(seed = Date.now()): void {
    const rnd = mulberry32(seed);
    for (let y = 0; y < this.size; y++) {
      for (let x = 0; x < this.size; x++) {
        const nx = x / this.size;
        const ny = y / this.size;
        const hill =
          Math.sin(nx * 6 + seed) * Math.cos(ny * 5) * 1.4 +
          Math.sin((nx + ny) * 8) * 0.6;
        let height = Math.max(0, Math.min(6, Math.round(2 + hill + (rnd() - 0.5))));
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
        this.tiles[this.index(x, y)] = tile;
      }
    }
  }

  clearDeveloped(): void {
    this.forEach((tile) => {
      tile.zone = 'none';
      tile.building = 'none';
      tile.buildingStage = 0;
      tile.footprint = false;
      tile.road = 'none';
      tile.powerLine = false;
      tile.pipe = false;
      tile.subway = false;
      tile.onFire = false;
      tile.flooded = false;
      tile.powered = false;
      tile.watered = false;
      tile.roadAccess = false;
      tile.pollution = 0;
      tile.crime = 0;
      tile.traffic = 0;
      tile.population = 0;
    });
  }

  neighbors4(x: number, y: number): Array<{ x: number; y: number; tile: Tile }> {
    const out: Array<{ x: number; y: number; tile: Tile }> = [];
    const dirs = [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ];
    for (const [dx, dy] of dirs) {
      const t = this.get(x + dx, y + dy);
      if (t) out.push({ x: x + dx, y: y + dy, tile: t });
    }
    return out;
  }

  canPlaceBuilding(x: number, y: number, w: number, h: number): boolean {
    for (let dy = 0; dy < h; dy++) {
      for (let dx = 0; dx < w; dx++) {
        const t = this.get(x + dx, y + dy);
        if (!t || t.water || t.building !== 'none' || t.road !== 'none') return false;
      }
    }
    return true;
  }

  placeBuilding(x: number, y: number, kind: BuildingKind, w: number, h: number): boolean {
    if (!this.canPlaceBuilding(x, y, w, h)) return false;
    for (let dy = 0; dy < h; dy++) {
      for (let dx = 0; dx < w; dx++) {
        const t = this.get(x + dx, y + dy)!;
        t.trees = false;
        t.zone = 'none';
        t.building = kind;
        t.buildingStage = 1;
        t.footprint = !(dx === 0 && dy === 0);
      }
    }
    return true;
  }

  setZoneRect(x0: number, y0: number, x1: number, y1: number, zone: ZoneType): number {
    const minX = Math.min(x0, x1);
    const maxX = Math.max(x0, x1);
    const minY = Math.min(y0, y1);
    const maxY = Math.max(y0, y1);
    let count = 0;
    for (let y = minY; y <= maxY; y++) {
      for (let x = minX; x <= maxX; x++) {
        const t = this.get(x, y);
        if (!t || t.water || t.building !== 'none') continue;
        t.zone = zone;
        t.trees = false;
        count++;
      }
    }
    return count;
  }

  paintRoad(x: number, y: number, road: RoadType): boolean {
    const t = this.get(x, y);
    if (!t || t.water) return false;
    if (t.building !== 'none' && !isPowerish(t.building)) return false;
    t.road = road;
    t.trees = false;
    return true;
  }

  serialize(): object {
    return {
      size: this.size,
      tiles: this.tiles.map((t) => ({ ...t })),
    };
  }

  static deserialize(data: { size: number; tiles: Tile[] }): TileMap {
    const map = new TileMap(data.size);
    for (let i = 0; i < data.tiles.length; i++) {
      map.tiles[i] = { ...createEmptyTile(), ...data.tiles[i] };
    }
    return map;
  }
}

function isPowerish(b: BuildingKind): boolean {
  return b === 'coal_plant' || b === 'oil_plant' || b === 'nuclear_plant';
}

function mulberry32(a: number): () => number {
  return () => {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
