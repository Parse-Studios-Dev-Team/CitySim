import type { TileMap } from '../map/TileMap';
import type { OverlayMode, Tile, ViewLayer } from '../map/layers';
import { isPowerPlant } from '../map/layers';
import { drawBuildingSprite, drawGhostFootprint } from './buildings';
import type { IsoCamera } from './camera';
import { CityLife } from './life';
import { drawStreet } from './roads';
import { sampleSky } from './sky';
import { PALETTE, shade, tileHash, zoneColor } from './sprites';

export interface RenderFx {
  time: number;
  dt: number;
  timeOfDay: number;
  year: number;
  ghost: { x: number; y: number; w: number; h: number; ok: boolean } | null;
  monster: { px: number; py: number } | null;
}

export class IsoRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  readonly life = new CityLife();

  constructor(canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D) {
    this.canvas = canvas;
    this.ctx = ctx;
  }

  resize(cssW: number, cssH: number): void {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.canvas.width = Math.max(1, Math.floor(cssW * dpr));
    this.canvas.height = Math.max(1, Math.floor(cssH * dpr));
    this.canvas.style.width = `${cssW}px`;
    this.canvas.style.height = `${cssH}px`;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  burst(x: number, y: number, h: number, kind: 'dust' | 'spark' | 'splash'): void {
    this.life.burst(x, y, h, kind);
  }

  render(
    map: TileMap,
    camera: IsoCamera,
    overlay: OverlayMode,
    view: ViewLayer,
    hover: { x: number; y: number } | null,
    dragRect: { x0: number; y0: number; x1: number; y1: number } | null,
    fx: RenderFx,
  ): void {
    const w = this.canvas.clientWidth;
    const h = this.canvas.clientHeight;
    const ctx = this.ctx;
    ctx.clearRect(0, 0, w, h);

    const sky = sampleSky(fx.timeOfDay);
    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, sky.top);
    grad.addColorStop(0.55, sky.mid);
    grad.addColorStop(1, sky.bot);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);
    this.drawSunOrMoon(camera, w, h, fx.timeOfDay, sky.night);

    this.life.tick(fx.dt, map, fx.year);

    const margin = 90 * camera.zoom;
    const size = map.size;
    for (let d = 0; d < size * 2 - 1; d++) {
      const x0 = Math.max(0, d - (size - 1));
      const x1 = Math.min(d, size - 1);
      for (let x = x0; x <= x1; x++) {
        const y = d - x;
        const tile = map.get(x, y)!;
        const { sx, sy } = camera.worldToScreen(x, y, tile.height);
        if (sx < -margin || sx > w + margin || sy < -margin || sy > h + margin) continue;
        this.drawTile(map, camera, tile, x, y, overlay, view, fx, sky.night);
      }
    }

    if (sky.night > 0.2) {
      ctx.fillStyle = `rgba(8, 12, 32, ${sky.night * 0.16})`;
      ctx.fillRect(0, 0, w, h);
    }

    this.life.draw(ctx, camera, map, sky.night, fx.year);

    if (sky.night > 0.35) {
      this.drawLights(map, camera, w, h, margin, sky.night, fx.year);
    }

    if (fx.monster) {
      this.drawMonster(camera, map, fx.monster.px, fx.monster.py, fx.time);
    }

    if (dragRect) {
      const minX = Math.min(dragRect.x0, dragRect.x1);
      const maxX = Math.max(dragRect.x0, dragRect.x1);
      const minY = Math.min(dragRect.y0, dragRect.y1);
      const maxY = Math.max(dragRect.y0, dragRect.y1);
      ctx.save();
      ctx.globalAlpha = 0.35;
      for (let y = minY; y <= maxY; y++) {
        for (let x = minX; x <= maxX; x++) {
          if (!map.inBounds(x, y)) continue;
          const t = map.get(x, y)!;
          this.drawDiamond(camera, x, y, t.height, '#e8c547', true);
        }
      }
      ctx.restore();
    }

    if (fx.ghost) {
      const t = map.get(fx.ghost.x, fx.ghost.y);
      drawGhostFootprint(
        ctx,
        camera,
        fx.ghost.x,
        fx.ghost.y,
        fx.ghost.w,
        fx.ghost.h,
        t?.height ?? 2,
        fx.ghost.ok,
      );
    }

    if (hover && map.inBounds(hover.x, hover.y)) {
      const t = map.get(hover.x, hover.y)!;
      ctx.save();
      ctx.globalAlpha = 0.5;
      this.drawDiamond(camera, hover.x, hover.y, t.height, '#ffffff', true);
      ctx.restore();
    }
  }

  private drawSunOrMoon(
    _camera: IsoCamera,
    w: number,
    h: number,
    timeOfDay: number,
    night: number,
  ): void {
    const ctx = this.ctx;
    const ang = timeOfDay * Math.PI * 2 - Math.PI / 2;
    const cx = w * 0.5 + Math.cos(ang) * w * 0.38;
    const cy = h * 0.42 + Math.sin(ang) * h * 0.28;
    if (cy > h * 0.75) return;
    if (night > 0.55) {
      ctx.fillStyle = '#f0f0e8';
      ctx.beginPath();
      ctx.arc(cx, cy, 16, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = sampleSky(timeOfDay).top;
      ctx.beginPath();
      ctx.arc(cx + 6, cy - 2, 14, 0, Math.PI * 2);
      ctx.fill();
    } else {
      const g = ctx.createRadialGradient(cx, cy, 4, cx, cy, 42);
      g.addColorStop(0, '#ffe9a0');
      g.addColorStop(0.4, '#e8c547');
      g.addColorStop(1, 'rgba(232,197,71,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(cx, cy, 42, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  private drawLights(
    map: TileMap,
    camera: IsoCamera,
    w: number,
    h: number,
    margin: number,
    night: number,
    year: number,
  ): void {
    const ctx = this.ctx;
    const z = camera.zoom;
    const spacing = year < 1910 ? 5 : 3;
    ctx.save();
    ctx.globalAlpha = Math.min(1, night);
    map.forEach((tile, x, y) => {
      if (tile.road === 'none') return;
      if ((x + y) % spacing !== 0) return;
      const { sx, sy } = camera.worldToScreen(x, y, tile.height);
      if (sx < -margin || sx > w + margin || sy < -margin || sy > h + margin) return;
      const tw = (camera.tileW / 2) * z;
      const lx = sx - tw * 0.62;
      const ly = sy;
      ctx.fillStyle = year < 1920 ? '#3a3020' : '#2a2a28';
      ctx.fillRect(lx - 0.6 * z, ly - 9 * z, 1.2 * z, 9 * z);
      ctx.fillStyle = year < 1920 ? 'rgba(240, 190, 90, 0.42)' : 'rgba(240, 216, 120, 0.55)';
      ctx.beginPath();
      ctx.arc(lx, ly - 9 * z, (year < 1920 ? 1.8 : 2.2) * z, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.restore();
  }

  private drawTile(
    map: TileMap,
    camera: IsoCamera,
    tile: Tile,
    x: number,
    y: number,
    overlay: OverlayMode,
    view: ViewLayer,
    fx: RenderFx,
    night: number,
  ): void {
    if (view === 'underground') {
      this.drawUnderground(camera, tile, x, y, overlay);
      return;
    }

    const h = tile.height;
    if (tile.water) {
      this.drawWater(map, camera, x, y, h, fx.time);
    } else {
      this.drawGround(camera, x, y, h, tile);
    }

    const zc = zoneColor(tile.zone);
    if (zc && tile.building === 'none') {
      this.drawDiamond(camera, x, y, h, zc, true);
      if (tile.zone.includes('dense')) {
        this.drawZoneHatch(camera, x, y, h);
      }
      if (tile.zone === 'seaport') this.drawDock(camera, x, y, h);
      if (tile.zone === 'airport') this.drawRunway(camera, x, y, h);
    }

    if (tile.trees && tile.building === 'none' && tile.road === 'none') {
      this.drawTree(camera, x, y, h);
    }

    if (tile.road !== 'none') {
      drawStreet(this.ctx, camera, map, tile, x, y, fx.year);
    }

    if (tile.powerLine) {
      this.drawPowerLine(map, camera, tile, x, y);
    }

    if (tile.building !== 'none' && !tile.footprint) {
      drawBuildingSprite(this.ctx, camera, tile, x, y, fx.time, night);
    }

    if (tile.onFire) {
      this.drawFire(camera, x, y, h, fx.time);
    }

    if (overlay !== 'none') {
      this.drawOverlay(camera, tile, x, y, overlay);
    }
  }

  private drawUnderground(
    camera: IsoCamera,
    tile: Tile,
    x: number,
    y: number,
    overlay: OverlayMode,
  ): void {
    this.drawDiamond(camera, x, y, 0, '#1a2820', true);
    if (tile.pipe) {
      this.drawDiamond(camera, x, y, 0, PALETTE.pipe, true);
    }
    if (tile.subway) {
      const { sx, sy } = camera.worldToScreen(x, y, 0);
      const ctx = this.ctx;
      ctx.fillStyle = '#333';
      ctx.beginPath();
      ctx.arc(sx, sy, 4 * camera.zoom, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#e8c547';
      ctx.lineWidth = 1;
      ctx.stroke();
    }
    if (tile.building === 'pump' || tile.building === 'water_tower' || tile.building === 'treatment') {
      drawBuildingSprite(this.ctx, camera, tile, x, y, 0, 0);
    }
    if (overlay === 'water') {
      this.drawOverlay(camera, tile, x, y, 'water');
    }
  }

  private drawGround(camera: IsoCamera, x: number, y: number, h: number, tile: Tile): void {
    const hash = tileHash(x, y);
    let top = h >= 4 ? PALETTE.dirt : h <= 1 ? PALETTE.grassDark : PALETTE.grass;
    if (h >= 5) top = shade(PALETTE.dirt, 0.12);
    if (hash > 0.7 && h < 4) top = shade(top, 0.06);
    this.drawBlock(camera, x, y, h, top, PALETTE.grassDark, PALETTE.grassLight);
    if (tile.flooded) {
      this.drawDiamond(camera, x, y, h, 'rgba(58,124,165,0.45)', true);
    }
  }

  private drawWater(map: TileMap, camera: IsoCamera, x: number, y: number, h: number, time: number): void {
    const pulse = 0.5 + 0.5 * Math.sin(time * 0.0022 + x * 0.55 + y * 0.4);
    const col = pulse > 0.55 ? PALETTE.waterLite : PALETTE.water;
    this.drawDiamond(camera, x, y, h, col, true);
    const { sx, sy } = camera.worldToScreen(x, y, h);
    const ctx = this.ctx;
    const z = camera.zoom;
    ctx.fillStyle = 'rgba(200,230,245,0.28)';
    ctx.beginPath();
    ctx.ellipse(sx + Math.sin(time * 0.001 + x) * 3 * z, sy - 2 * z, 7 * z, 2.5 * z, 0, 0, Math.PI * 2);
    ctx.fill();

    const shore =
      map.neighbors4(x, y).some((n) => !n.tile.water);
    if (shore) {
      ctx.strokeStyle = 'rgba(210, 232, 220, 0.35)';
      ctx.lineWidth = 1.2 * z;
      ctx.beginPath();
      const tw = (camera.tileW / 2) * z;
      const th = (camera.tileH / 2) * z;
      ctx.moveTo(sx, sy - th);
      ctx.lineTo(sx + tw, sy);
      ctx.lineTo(sx, sy + th);
      ctx.lineTo(sx - tw, sy);
      ctx.closePath();
      ctx.stroke();
    }
  }

  private drawDock(camera: IsoCamera, x: number, y: number, h: number): void {
    const { sx, sy } = camera.worldToScreen(x, y, h);
    const z = camera.zoom;
    const ctx = this.ctx;
    ctx.strokeStyle = '#6a5040';
    ctx.lineWidth = 2 * z;
    ctx.beginPath();
    ctx.moveTo(sx - 6 * z, sy);
    ctx.lineTo(sx + 6 * z, sy);
    ctx.stroke();
  }

  private drawRunway(camera: IsoCamera, x: number, y: number, h: number): void {
    const { sx, sy } = camera.worldToScreen(x, y, h);
    const z = camera.zoom;
    const ctx = this.ctx;
    ctx.strokeStyle = '#e8e8e8';
    ctx.lineWidth = 1.4 * z;
    ctx.setLineDash([3 * z, 3 * z]);
    ctx.beginPath();
    ctx.moveTo(sx - 8 * z, sy);
    ctx.lineTo(sx + 8 * z, sy);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  private drawBlock(
    camera: IsoCamera,
    x: number,
    y: number,
    h: number,
    top: string,
    left: string,
    right: string,
  ): void {
    const ctx = this.ctx;
    const tw = (camera.tileW / 2) * camera.zoom;
    const th = (camera.tileH / 2) * camera.zoom;
    const hs = camera.heightStep * camera.zoom;
    const { sx, sy } = camera.worldToScreen(x, y, h);
    const topY = sy;
    const baseY = sy + hs * Math.max(1, h === 0 ? 0.4 : 0.85);

    ctx.fillStyle = left;
    ctx.beginPath();
    ctx.moveTo(sx - tw, topY);
    ctx.lineTo(sx, topY + th);
    ctx.lineTo(sx, baseY + th);
    ctx.lineTo(sx - tw, baseY);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = right;
    ctx.beginPath();
    ctx.moveTo(sx + tw, topY);
    ctx.lineTo(sx, topY + th);
    ctx.lineTo(sx, baseY + th);
    ctx.lineTo(sx + tw, baseY);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = top;
    ctx.beginPath();
    ctx.moveTo(sx, topY - th);
    ctx.lineTo(sx + tw, topY);
    ctx.lineTo(sx, topY + th);
    ctx.lineTo(sx - tw, topY);
    ctx.closePath();
    ctx.fill();
  }

  private drawDiamond(
    camera: IsoCamera,
    x: number,
    y: number,
    h: number,
    color: string,
    filled: boolean,
  ): void {
    const ctx = this.ctx;
    const tw = (camera.tileW / 2) * camera.zoom;
    const th = (camera.tileH / 2) * camera.zoom;
    const { sx, sy } = camera.worldToScreen(x, y, h);
    ctx.beginPath();
    ctx.moveTo(sx, sy - th);
    ctx.lineTo(sx + tw, sy);
    ctx.lineTo(sx, sy + th);
    ctx.lineTo(sx - tw, sy);
    ctx.closePath();
    if (filled) {
      ctx.fillStyle = color;
      ctx.fill();
    } else {
      ctx.strokeStyle = color;
      ctx.stroke();
    }
  }

  private drawZoneHatch(camera: IsoCamera, x: number, y: number, h: number): void {
    const ctx = this.ctx;
    const { sx, sy } = camera.worldToScreen(x, y, h);
    ctx.strokeStyle = 'rgba(255,255,255,0.25)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(sx - 6 * camera.zoom, sy);
    ctx.lineTo(sx + 6 * camera.zoom, sy);
    ctx.stroke();
  }

  private drawTree(camera: IsoCamera, x: number, y: number, h: number): void {
    const ctx = this.ctx;
    const { sx, sy } = camera.worldToScreen(x, y, h);
    const z = camera.zoom;
    const pine = h >= 4 || tileHash(x, y) > 0.72;
    ctx.fillStyle = '#4a3420';
    ctx.fillRect(sx - 1 * z, sy - 6 * z, 2 * z, 6 * z);
    if (pine) {
      ctx.fillStyle = PALETTE.tree;
      ctx.beginPath();
      ctx.moveTo(sx, sy - 16 * z);
      ctx.lineTo(sx + 6 * z, sy - 4 * z);
      ctx.lineTo(sx - 6 * z, sy - 4 * z);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = PALETTE.treeTop;
      ctx.beginPath();
      ctx.moveTo(sx, sy - 18 * z);
      ctx.lineTo(sx + 4 * z, sy - 8 * z);
      ctx.lineTo(sx - 4 * z, sy - 8 * z);
      ctx.closePath();
      ctx.fill();
    } else {
      ctx.fillStyle = PALETTE.treeTop;
      ctx.beginPath();
      ctx.arc(sx, sy - 10 * z, 6 * z, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = PALETTE.tree;
      ctx.beginPath();
      ctx.arc(sx - 3 * z, sy - 8 * z, 4 * z, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  private drawPowerLine(map: TileMap, camera: IsoCamera, tile: Tile, x: number, y: number): void {
    const ctx = this.ctx;
    const { sx, sy } = camera.worldToScreen(x, y, tile.height);
    const z = camera.zoom;
    ctx.fillStyle = '#333';
    ctx.fillRect(sx - 1 * z, sy - 10 * z, 2 * z, 10 * z);
    ctx.strokeStyle = tile.powered ? PALETTE.power : '#777';
    ctx.lineWidth = 1.5 * z;
    for (const nb of map.neighbors4(x, y)) {
      if (!nb.tile.powerLine && !isPowerPlant(nb.tile.building) && nb.tile.building === 'none') {
        continue;
      }
      if (!nb.tile.powerLine && !isPowerPlant(nb.tile.building)) continue;
      const p = camera.worldToScreen(nb.x, nb.y, nb.tile.height);
      ctx.beginPath();
      ctx.moveTo(sx, sy - 10 * z);
      ctx.lineTo((sx + p.sx) / 2, (sy + p.sy) / 2 - 10 * z);
      ctx.stroke();
    }
  }

  private drawFire(camera: IsoCamera, x: number, y: number, h: number, time: number): void {
    const ctx = this.ctx;
    const { sx, sy } = camera.worldToScreen(x, y, h);
    const z = camera.zoom;
    const flicker = 0.85 + 0.15 * Math.sin(time * 0.02 + x * 3 + y);
    const tall = 16 * z * flicker;
    ctx.fillStyle = '#ff6a00';
    ctx.beginPath();
    ctx.moveTo(sx, sy - tall);
    ctx.lineTo(sx + 6 * z, sy - 2 * z);
    ctx.lineTo(sx - 6 * z, sy - 2 * z);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#ffd000';
    ctx.beginPath();
    ctx.moveTo(sx, sy - tall * 0.7);
    ctx.lineTo(sx + 3 * z, sy - 3 * z);
    ctx.lineTo(sx - 3 * z, sy - 3 * z);
    ctx.closePath();
    ctx.fill();
  }

  private drawMonster(camera: IsoCamera, map: TileMap, px: number, py: number, time: number): void {
    const t = map.get(Math.round(px), Math.round(py));
    const h = t ? t.height : 2;
    const { sx, sy } = camera.worldToScreen(px, py, h);
    const z = camera.zoom;
    const bob = Math.sin(time * 0.01) * 3 * z;
    const ctx = this.ctx;
    ctx.fillStyle = '#5a3a78';
    ctx.beginPath();
    ctx.ellipse(sx, sy - 18 * z + bob, 14 * z, 10 * z, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#4a2a62';
    ctx.fillRect(sx - 10 * z, sy - 12 * z + bob, 5 * z, 14 * z);
    ctx.fillRect(sx + 5 * z, sy - 12 * z + bob, 5 * z, 14 * z);
    ctx.fillStyle = '#e8c547';
    ctx.beginPath();
    ctx.arc(sx + 5 * z, sy - 22 * z + bob, 3 * z, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#1a1020';
    ctx.beginPath();
    ctx.arc(sx + 5 * z, sy - 22 * z + bob, 1.2 * z, 0, Math.PI * 2);
    ctx.fill();
  }

  private drawOverlay(
    camera: IsoCamera,
    tile: Tile,
    x: number,
    y: number,
    overlay: OverlayMode,
  ): void {
    let alpha = 0;
    let color = '#fff';
    switch (overlay) {
      case 'power':
        color = tile.powered ? '#e8c547' : '#444';
        alpha = tile.powered || tile.powerLine || isPowerPlant(tile.building) ? 0.45 : 0.15;
        break;
      case 'water':
        color = tile.watered || tile.pipe ? '#5aa0c4' : '#333';
        alpha = tile.watered || tile.pipe ? 0.45 : 0.12;
        break;
      case 'pollution':
        color = '#a05020';
        alpha = Math.min(0.7, tile.pollution / 40);
        break;
      case 'landValue':
        color = tile.landValue > 60 ? '#6bcf7a' : tile.landValue < 35 ? '#c44b4b' : '#e8c547';
        alpha = 0.35;
        break;
      case 'crime':
        color = '#c44b4b';
        alpha = Math.min(0.7, tile.crime / 40);
        break;
      case 'traffic':
        color = '#d4843a';
        alpha = Math.min(0.7, tile.traffic / 40);
        break;
      case 'none':
        return;
      default: {
        const _exhaustive: never = overlay;
        return _exhaustive;
      }
    }
    this.ctx.save();
    this.ctx.globalAlpha = alpha;
    this.drawDiamond(camera, x, y, tile.height, color, true);
    this.ctx.restore();
  }
}
