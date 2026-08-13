import type { TileMap } from '../map/TileMap';
import type { IsoCamera } from './camera';
import { PALETTE, tileHash } from './sprites';

interface Vehicle {
  x: number;
  y: number;
  dir: number;
  color: string;
  kind: 'car' | 'boat';
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

const CAR_COLORS = ['#c44b4b', '#4a7ec4', '#e8c547', '#e8e8e8', '#2a2a2a', '#d4843a'];

export class CityLife {
  private vehicles: Vehicle[] = [];
  private particles: Particle[] = [];
  private flyers: Flyer[] = [];
  private spawnAcc = 0;
  private smokeAcc = 0;
  private flyerAcc = 0;

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

  tick(dt: number, map: TileMap): void {
    this.spawnAcc += dt;
    this.smokeAcc += dt;
    this.flyerAcc += dt;

    if (this.spawnAcc > 420) {
      this.spawnAcc = 0;
      this.trySpawn(map);
    }
    if (this.smokeAcc > 180) {
      this.smokeAcc = 0;
      this.spawnSmoke(map);
    }
    if (this.flyerAcc > 2800) {
      this.flyerAcc = 0;
      this.spawnFlyer(map);
    }

    const step = dt * 0.001;
    for (const v of this.vehicles) {
      const nx = v.x + DIRS[v.dir][0] * v.speed * step;
      const ny = v.y + DIRS[v.dir][1] * v.speed * step;
      const tx = Math.round(nx);
      const ty = Math.round(ny);
      const tile = map.get(tx, ty);
      const ok =
        tile &&
        (v.kind === 'boat' ? tile.water : tile.road !== 'none');
      if (ok) {
        v.x = nx;
        v.y = ny;
      } else {
        this.reroute(v, map);
      }
      if (Math.random() < 0.01) this.reroute(v, map);
    }

    this.vehicles = this.vehicles.filter((v) => map.inBounds(Math.round(v.x), Math.round(v.y)));
    if (this.vehicles.length > 56) this.vehicles.length = 56;

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
    this.flyers = this.flyers.filter((f) => f.life > 0);
  }

  draw(ctx: CanvasRenderingContext2D, camera: IsoCamera, map: TileMap, night: number): void {
    const z = camera.zoom;
    for (const v of this.vehicles) {
      const t = map.get(Math.round(v.x), Math.round(v.y));
      const h = t ? t.height : 0;
      const { sx, sy } = camera.worldToScreen(v.x, v.y, h);
      if (v.kind === 'boat') {
        ctx.fillStyle = '#d8d0c4';
        ctx.beginPath();
        ctx.ellipse(sx, sy - 2 * z, 5 * z, 2.2 * z, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#c44b4b';
        ctx.fillRect(sx - z, sy - 7 * z, 2 * z, 5 * z);
      } else {
        ctx.fillStyle = v.color;
        const dx = DIRS[v.dir][0] - DIRS[v.dir][1];
        const dy = DIRS[v.dir][0] + DIRS[v.dir][1];
        ctx.save();
        ctx.translate(sx, sy - 2 * z);
        ctx.rotate(Math.atan2(dy, dx) * 0.4);
        ctx.fillRect(-3.5 * z, -1.5 * z, 7 * z, 3 * z);
        if (night > 0.5) {
          ctx.fillStyle = '#f0d878';
          ctx.fillRect(2.4 * z, -1 * z, 1.4 * z, 2 * z);
        }
        ctx.restore();
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

  private trySpawn(map: TileMap): void {
    const roads: Array<{ x: number; y: number }> = [];
    const waters: Array<{ x: number; y: number }> = [];
    map.forEach((t, x, y) => {
      if (t.road !== 'none' && t.traffic > 4) roads.push({ x, y });
      else if (t.road !== 'none' && roads.length < 8) roads.push({ x, y });
      if (t.water) waters.push({ x, y });
    });
    if (roads.length && this.vehicles.filter((v) => v.kind === 'car').length < 40) {
      const p = roads[(Math.random() * roads.length) | 0];
      this.vehicles.push({
        x: p.x,
        y: p.y,
        dir: (Math.random() * 4) | 0,
        color: CAR_COLORS[(Math.random() * CAR_COLORS.length) | 0],
        kind: 'car',
        speed: 1.6 + Math.random() * 1.4,
      });
    }
    if (waters.length && this.vehicles.filter((v) => v.kind === 'boat').length < 6) {
      const p = waters[(Math.random() * waters.length) | 0];
      this.vehicles.push({
        x: p.x,
        y: p.y,
        dir: (Math.random() * 4) | 0,
        color: '#d8d0c4',
        kind: 'boat',
        speed: 0.6 + Math.random() * 0.4,
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

  private spawnFlyer(map: TileMap): void {
    const plane = Math.random() < 0.35;
    const edge = Math.random() < 0.5;
    this.flyers.push({
      x: edge ? -2 : map.size + 2,
      y: Math.random() * map.size,
      vx: edge ? 2.8 : -2.8,
      vy: (Math.random() - 0.5) * 0.8,
      kind: plane ? 'plane' : 'bird',
      life: plane ? 18000 : 9000,
    });
    if (!plane) {
      for (let i = 0; i < 3; i++) {
        this.flyers.push({
          x: edge ? -2 - i : map.size + 2 + i,
          y: Math.random() * map.size,
          vx: edge ? 1.4 : -1.4,
          vy: (Math.random() - 0.5) * 1.2,
          kind: 'bird',
          life: 8000,
        });
      }
    }
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
