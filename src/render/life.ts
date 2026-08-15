import type { TileMap } from '../map/TileMap';
import type { IsoCamera } from './camera';
import {
  aeroplanesExist,
  automobilesExist,
  landTrafficCap,
  pickLandTraffic,
  type LandTraffic,
} from './era';
import { PALETTE, shade, tileHash } from './sprites';

type VehicleKind = LandTraffic | 'boat';

interface Vehicle {
  x: number;
  y: number;
  dir: number;
  color: string;
  horse: string;
  kind: VehicleKind;
  speed: number;
}

interface Particle {
  x: number;
  y: number;
  h: number;
  ox: number;
  oy: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
  kind: 'smoke' | 'dust' | 'spark' | 'splash';
}

interface Flyer {
  x: number;
  y: number;
  vx: number;
  vy: number;
  kind: 'bird' | 'plane';
  life: number;
}

const DIRS = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
];

const WAGON_COLORS = ['#8a5a32', '#6a4428', '#7a5030', '#5a3a22'];
const CARRIAGE_COLORS = ['#3a2420', '#4a2a28', '#2a1a18', '#4a3428'];
const HORSE_COLORS = ['#5a3a22', '#3a2418', '#6a4a30', '#2a1a10', '#8a6a44'];
const BRASS_CAR_COLORS = ['#2a2a2a', '#3a3020', '#4a2020', '#2a3a28'];
const CAR_COLORS = ['#c44b4b', '#4a7ec4', '#2a2a2a', '#d4843a', '#3a5a48', '#6a3030'];

export class CityLife {
  private vehicles: Vehicle[] = [];
  private particles: Particle[] = [];
  private flyers: Flyer[] = [];
  private spawnAcc = -4000;
  private smokeAcc = 0;
  private flyerAcc = -16000;
  private birdAcc = -8000;

  reset(): void {
    this.vehicles = [];
    this.particles = [];
    this.flyers = [];
    this.spawnAcc = -4000;
    this.smokeAcc = 0;
    this.flyerAcc = -16000;
    this.birdAcc = -8000;
  }

  burst(x: number, y: number, h: number, kind: 'dust' | 'spark' | 'splash'): void {
    const n = kind === 'spark' ? 10 : 8;
    for (let i = 0; i < n; i++) {
      this.particles.push({
        x,
        y,
        h,
        ox: (Math.random() - 0.5) * 8,
        oy: (Math.random() - 0.5) * 4,
        vx: (Math.random() - 0.5) * 0.04,
        vy: kind === 'splash' ? -0.03 - Math.random() * 0.02 : -0.02 - Math.random() * 0.03,
        life: 0,
        max: 400 + Math.random() * 280,
        kind: kind === 'dust' ? 'dust' : kind === 'spark' ? 'spark' : 'splash',
      });
    }
  }

  tick(dt: number, map: TileMap, year: number): void {
    this.spawnAcc += dt;
    this.smokeAcc += dt;
    this.flyerAcc += dt;
    this.birdAcc += dt;

    if (this.spawnAcc > 2600) {
      this.spawnAcc = 0;
      this.trySpawn(map, year);
    }
    if (this.smokeAcc > 420) {
      this.smokeAcc = 0;
      this.spawnSmoke(map);
    }
    if (this.flyerAcc > 28000) {
      this.flyerAcc = 0;
      this.spawnPlane(map, year);
    }
    if (this.birdAcc > 18000) {
      this.birdAcc = 0;
      this.spawnBirds(map);
    }

    const step = dt * 0.001;
    for (const v of this.vehicles) {
      if (v.kind === 'car' && !automobilesExist(year)) {
        v.kind = Math.random() < 0.4 ? 'carriage' : 'wagon';
        v.color = v.kind === 'carriage' ? pick(CARRIAGE_COLORS) : pick(WAGON_COLORS);
        v.speed = 0.55 + Math.random() * 0.25;
      }
      const nx = v.x + DIRS[v.dir][0] * v.speed * step;
      const ny = v.y + DIRS[v.dir][1] * v.speed * step;
      const tx = Math.round(nx);
      const ty = Math.round(ny);
      const tile = map.get(tx, ty);
      const ok = tile && (v.kind === 'boat' ? tile.water : tile.road !== 'none');
      if (ok) {
        v.x = nx;
        v.y = ny;
      } else {
        this.reroute(v, map);
      }
      if (Math.random() < 0.01) this.reroute(v, map);
    }

    this.vehicles = this.vehicles.filter((v) => map.inBounds(Math.round(v.x), Math.round(v.y)));
    if (this.vehicles.length > 16) this.vehicles.length = 16;

    for (const p of this.particles) {
      p.life += dt;
      p.ox += p.vx * dt;
      p.oy += p.vy * dt;
      if (p.kind === 'smoke') {
        p.oy -= 0.018 * dt;
        p.ox += 0.006 * dt;
      }
    }
    this.particles = this.particles.filter((p) => p.life < p.max);
    if (this.particles.length > 220) this.particles.splice(0, this.particles.length - 220);

    for (const f of this.flyers) {
      f.x += f.vx * step;
      f.y += f.vy * step;
      f.life -= dt;
    }
    this.flyers = this.flyers.filter((f) => f.life > 0 && (f.kind !== 'plane' || aeroplanesExist(year)));
  }

  draw(
    ctx: CanvasRenderingContext2D,
    camera: IsoCamera,
    map: TileMap,
    night: number,
    year: number,
  ): void {
    const z = camera.zoom;
    for (const v of this.vehicles) {
      const t = map.get(Math.round(v.x), Math.round(v.y));
      const h = t ? t.height : 0;
      const { sx, sy } = camera.worldToScreen(v.x, v.y, h);
      switch (v.kind) {
        case 'boat':
          drawBoat(ctx, sx, sy, z, year);
          break;
        case 'wagon':
        case 'carriage':
          drawHorseRig(ctx, sx, sy, z, v.dir, v.color, v.horse, v.kind === 'carriage', night);
          break;
        case 'car':
          drawAutomobile(ctx, sx, sy, z, v.dir, v.color, night, year);
          break;
        default: {
          const _exhaustive: never = v.kind;
          return _exhaustive;
        }
      }
    }

    for (const p of this.particles) {
      const t = map.get(Math.round(p.x), Math.round(p.y));
      const h = t ? t.height : p.h;
      const { sx, sy } = camera.worldToScreen(p.x, p.y, h);
      const u = 1 - p.life / p.max;
      ctx.globalAlpha = Math.max(0, u * (p.kind === 'smoke' ? 0.45 : 0.8));
      if (p.kind === 'smoke') {
        ctx.fillStyle = '#9aa4ae';
        ctx.beginPath();
        ctx.arc(sx + p.ox, sy + p.oy - 16 * camera.zoom, (3 + (1 - u) * 6) * z, 0, Math.PI * 2);
        ctx.fill();
      } else if (p.kind === 'spark') {
        ctx.fillStyle = '#ff9a2a';
        ctx.fillRect(sx + p.ox, sy + p.oy, 2 * z, 2 * z);
      } else if (p.kind === 'splash') {
        ctx.fillStyle = PALETTE.waterLite;
        ctx.beginPath();
        ctx.arc(sx + p.ox, sy + p.oy, 2 * z, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.fillStyle = '#c4b48a';
        ctx.beginPath();
        ctx.arc(sx + p.ox, sy + p.oy, 2.2 * z, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    }

    for (const f of this.flyers) {
      const { sx, sy } = camera.worldToScreen(f.x, f.y, 8);
      if (f.kind === 'plane') {
        ctx.fillStyle = '#e8e8e8';
        ctx.fillRect(sx - 8 * z, sy, 16 * z, 2 * z);
        ctx.fillRect(sx - 2 * z, sy - 5 * z, 4 * z, 10 * z);
        if (night > 0.5) {
          ctx.fillStyle = '#c44b4b';
          ctx.fillRect(sx + 7 * z, sy, 2 * z, 2 * z);
        }
      } else {
        ctx.strokeStyle = '#2a2a2a';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(sx - 3 * z, sy);
        ctx.lineTo(sx, sy - 2 * z);
        ctx.lineTo(sx + 3 * z, sy);
        ctx.stroke();
      }
    }
  }

  private census(map: TileMap): { roads: number; pop: number; airports: number; water: number } {
    let roads = 0;
    let pop = 0;
    let airports = 0;
    let water = 0;
    map.forEach((t) => {
      if (t.road !== 'none') roads++;
      pop += t.population;
      if (t.zone === 'airport') airports++;
      if (t.water) water++;
    });
    return { roads, pop, airports, water };
  }

  private trySpawn(map: TileMap, year: number): void {
    const { roads, pop, water } = this.census(map);
    const roadTiles: Array<{ x: number; y: number }> = [];
    const waterTiles: Array<{ x: number; y: number }> = [];
    map.forEach((t, x, y) => {
      if (t.road === 'road' || t.road === 'highway') roadTiles.push({ x, y });
      if (t.water) waterTiles.push({ x, y });
    });

    const land = this.vehicles.filter((v) => v.kind !== 'boat');
    const cap = landTrafficCap(year, roads, pop);
    if (land.length < cap && roadTiles.length && Math.random() < 0.55) {
      const p = roadTiles[(Math.random() * roadTiles.length) | 0];
      const kind = pickLandTraffic(year, Math.random());
      this.vehicles.push({
        x: p.x,
        y: p.y,
        dir: (Math.random() * 4) | 0,
        color: colorFor(kind, year),
        horse: pick(HORSE_COLORS),
        kind,
        speed: speedFor(kind),
      });
    }

    const boats = this.vehicles.filter((v) => v.kind === 'boat').length;
    if (pop >= 80 && water > 20 && boats < 2 && waterTiles.length && Math.random() < 0.22) {
      const p = waterTiles[(Math.random() * waterTiles.length) | 0];
      this.vehicles.push({
        x: p.x,
        y: p.y,
        dir: (Math.random() * 4) | 0,
        color: '#d8d0c4',
        horse: '#5a3a22',
        kind: 'boat',
        speed: 0.45 + Math.random() * 0.25,
      });
    }
  }

  private spawnSmoke(map: TileMap): void {
    map.forEach((t, x, y) => {
      if (t.footprint) return;
      const smoky =
        t.building === 'factory' ||
        t.building === 'coal_plant' ||
        t.building === 'oil_plant' ||
        t.building === 'nuclear_plant';
      if (!smoky || !t.powered) return;
      if (tileHash(x, y + (performance.now() | 0)) < 0.35) return;
      this.particles.push({
        x,
        y,
        h: t.height,
        ox: (Math.random() - 0.5) * 6,
        oy: -12,
        vx: 0.01 + Math.random() * 0.01,
        vy: -0.02,
        life: 0,
        max: 1400 + Math.random() * 800,
        kind: 'smoke',
      });
    });
  }

  private spawnPlane(map: TileMap, year: number): void {
    if (!aeroplanesExist(year)) return;
    const { pop, airports } = this.census(map);
    if (pop < 350 && airports < 6) return;
    if (this.flyers.some((f) => f.kind === 'plane')) return;
    if (Math.random() < 0.4) return;
    const edge = Math.random() < 0.5;
    this.flyers.push({
      x: edge ? -4 : map.size + 4,
      y: 6 + Math.random() * (map.size - 12),
      vx: edge ? 1.6 : -1.6,
      vy: (Math.random() - 0.5) * 0.25,
      kind: 'plane',
      life: 22000,
    });
  }

  private spawnBirds(map: TileMap): void {
    if (this.flyers.filter((f) => f.kind === 'bird').length >= 2) return;
    if (Math.random() < 0.55) return;
    const edge = Math.random() < 0.5;
    this.flyers.push({
      x: edge ? -2 : map.size + 2,
      y: Math.random() * map.size,
      vx: edge ? 0.9 : -0.9,
      vy: (Math.random() - 0.5) * 0.5,
      kind: 'bird',
      life: 10000,
    });
  }

  private reroute(v: Vehicle, map: TileMap): void {
    const cx = Math.round(v.x);
    const cy = Math.round(v.y);
    const options: number[] = [];
    for (let d = 0; d < 4; d++) {
      const t = map.get(cx + DIRS[d][0], cy + DIRS[d][1]);
      if (!t) continue;
      if (v.kind === 'boat' ? t.water : t.road !== 'none') options.push(d);
    }
    if (options.length) v.dir = options[(Math.random() * options.length) | 0];
  }
}

function pick(list: string[]): string {
  return list[(Math.random() * list.length) | 0];
}

function colorFor(kind: LandTraffic, year: number): string {
  switch (kind) {
    case 'wagon':
      return pick(WAGON_COLORS);
    case 'carriage':
      return pick(CARRIAGE_COLORS);
    case 'car':
      return year < 1935 ? pick(BRASS_CAR_COLORS) : pick(CAR_COLORS);
    default: {
      const _exhaustive: never = kind;
      return _exhaustive;
    }
  }
}

function speedFor(kind: LandTraffic): number {
  switch (kind) {
    case 'wagon':
      return 0.48 + Math.random() * 0.22;
    case 'carriage':
      return 0.58 + Math.random() * 0.22;
    case 'car':
      return 1.05 + Math.random() * 0.7;
    default: {
      const _exhaustive: never = kind;
      return _exhaustive;
    }
  }
}

function heading(dir: number, z: number): { fx: number; fy: number } {
  const dx = DIRS[dir][0];
  const dy = DIRS[dir][1];
  return { fx: (dx - dy) * z, fy: (dx + dy) * 0.5 * z };
}

function drawHorseRig(
  ctx: CanvasRenderingContext2D,
  sx: number,
  sy: number,
  z: number,
  dir: number,
  color: string,
  horse: string,
  coach: boolean,
  night: number,
): void {
  const { fx, fy } = heading(dir, z);
  const hx = sx + fx * 3.1;
  const hy = sy + fy * 3.1 - 2.2 * z;

  ctx.strokeStyle = shade(horse, -0.18);
  ctx.lineWidth = Math.max(1, 0.95 * z);
  for (const s of [-1.1, 1.1]) {
    ctx.beginPath();
    ctx.moveTo(hx + fy * s * 0.4, hy + 0.4 * z);
    ctx.lineTo(hx + fy * s * 0.4 - fy * 0.2, hy + 2.8 * z);
    ctx.stroke();
  }

  ctx.fillStyle = horse;
  ctx.beginPath();
  ctx.ellipse(hx, hy, 3.1 * z, 1.7 * z, Math.atan2(fy, fx), 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = shade(horse, -0.12);
  ctx.beginPath();
  ctx.ellipse(hx + fx * 1.5, hy + fy * 1.5 - 0.7 * z, 1.35 * z, 1.05 * z, Math.atan2(fy, fx), 0, Math.PI * 2);
  ctx.fill();

  const cx = sx - fx * 1.7;
  const cy = sy - fy * 1.7 - (coach ? 3.1 : 2.2) * z;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.ellipse(cx, cy, (coach ? 3.4 : 3.2) * z, (coach ? 2.2 : 1.7) * z, Math.atan2(fy, fx), 0, Math.PI * 2);
  ctx.fill();
  if (coach) {
    ctx.fillStyle = shade(color, 0.12);
    ctx.fillRect(cx - 1.1 * z, cy - 2.6 * z, 2.2 * z, 1.8 * z);
    ctx.fillStyle = 'rgba(200, 210, 220, 0.35)';
    ctx.fillRect(cx - 0.7 * z, cy - 2.3 * z, 1.4 * z, 1.1 * z);
  }

  ctx.fillStyle = '#2a1a10';
  ctx.beginPath();
  ctx.arc(cx - fy * 1.5, cy + 1.5 * z, 1.45 * z, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(cx + fy * 1.5, cy + 1.5 * z, 1.45 * z, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#c4a35a';
  ctx.lineWidth = Math.max(0.8, 0.7 * z);
  ctx.beginPath();
  ctx.arc(cx - fy * 1.5, cy + 1.5 * z, 0.7 * z, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(cx + fy * 1.5, cy + 1.5 * z, 0.7 * z, 0, Math.PI * 2);
  ctx.stroke();

  if (night > 0.45) {
    ctx.fillStyle = 'rgba(240, 190, 80, 0.7)';
    ctx.beginPath();
    ctx.arc(sx + fx * 0.4, sy + fy * 0.4 - 4.2 * z, 1.15 * z, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawAutomobile(
  ctx: CanvasRenderingContext2D,
  sx: number,
  sy: number,
  z: number,
  dir: number,
  color: string,
  night: number,
  year: number,
): void {
  const { fx, fy } = heading(dir, z);
  const early = year < 1935;
  const wr = (early ? 1.55 : 1.2) * z;

  ctx.fillStyle = '#1a1a1a';
  for (const along of [-1.7, 1.7]) {
    for (const side of [-1, 1]) {
      ctx.beginPath();
      ctx.arc(
        sx + fx * along + fy * side * 1.05,
        sy + fy * along + 1.15 * z,
        wr,
        0,
        Math.PI * 2,
      );
      ctx.fill();
    }
  }

  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.ellipse(
    sx,
    sy - (early ? 2.5 : 1.9) * z,
    (early ? 4.1 : 4.5) * z,
    (early ? 1.9 : 1.65) * z,
    Math.atan2(fy, fx),
    0,
    Math.PI * 2,
  );
  ctx.fill();

  ctx.fillStyle = shade(color, -0.16);
  ctx.beginPath();
  ctx.ellipse(
    sx - fx * 0.55,
    sy - fy * 0.55 - (early ? 4.1 : 3.35) * z,
    2.15 * z,
    1.35 * z,
    Math.atan2(fy, fx),
    0,
    Math.PI * 2,
  );
  ctx.fill();

  ctx.fillStyle = 'rgba(180, 210, 230, 0.35)';
  ctx.beginPath();
  ctx.ellipse(
    sx + fx * 0.35,
    sy + fy * 0.35 - (early ? 4.0 : 3.3) * z,
    1.2 * z,
    0.7 * z,
    Math.atan2(fy, fx),
    0,
    Math.PI * 2,
  );
  ctx.fill();

  if (night > 0.5) {
    ctx.fillStyle = '#f0d878';
    ctx.beginPath();
    ctx.arc(sx + fx * 3.3, sy + fy * 3.3 - 2.1 * z, 1.05 * z, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawBoat(
  ctx: CanvasRenderingContext2D,
  sx: number,
  sy: number,
  z: number,
  year: number,
): void {
  ctx.fillStyle = year < 1920 ? '#c4b49a' : '#d8d0c4';
  ctx.beginPath();
  ctx.ellipse(sx, sy - 2 * z, 5.2 * z, 2.1 * z, 0, 0, Math.PI * 2);
  ctx.fill();
  if (year < 1920) {
    ctx.fillStyle = '#6a5040';
    ctx.fillRect(sx - 0.7 * z, sy - 8 * z, 1.4 * z, 5 * z);
    ctx.fillStyle = '#4a4a4a';
    ctx.fillRect(sx - 1.6 * z, sy - 5.2 * z, 3.2 * z, 2.2 * z);
  } else {
    ctx.fillStyle = '#c44b4b';
    ctx.fillRect(sx - z, sy - 7 * z, 2 * z, 5 * z);
  }
}
