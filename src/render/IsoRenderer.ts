import type { TileMap } from '../map/TileMap';
import type { OverlayMode, Tile, ViewLayer } from '../map/layers';
import { isPowerPlant } from '../map/layers';
import type { IsoCamera } from './camera';
import { PALETTE, buildingFill, buildingHeightPx, zoneColor } from './sprites';

export class IsoRenderer {
  private dirty = true;
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;

  constructor(canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D) {
    this.canvas = canvas;
    this.ctx = ctx;
  }

  markDirty(): void {
    this.dirty = true;
  }

  resize(cssW: number, cssH: number): void {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.canvas.width = Math.max(1, Math.floor(cssW * dpr));
    this.canvas.height = Math.max(1, Math.floor(cssH * dpr));
    this.canvas.style.width = `${cssW}px`;
    this.canvas.style.height = `${cssH}px`;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.dirty = true;
  }

  render(
    map: TileMap,
    camera: IsoCamera,
    overlay: OverlayMode,
    view: ViewLayer,
    hover: { x: number; y: number } | null,
    dragRect: { x0: number; y0: number; x1: number; y1: number } | null,
  ): void {
    if (!this.dirty) {
      // Still redraw each frame for smooth camera; dirty flag reserved for future chunking
    }
    const w = this.canvas.clientWidth;
    const h = this.canvas.clientHeight;
    const ctx = this.ctx;
    ctx.clearRect(0, 0, w, h);

    // Soft horizon
    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, '#24553a');
    grad.addColorStop(0.55, '#163526');
    grad.addColorStop(1, '#0f2418');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    const order: Array<{ x: number; y: number }> = [];
    for (let y = 0; y < map.size; y++) {
      for (let x = 0; x < map.size; x++) {
        order.push({ x, y });
      }
    }
    order.sort((a, b) => a.x + a.y - (b.x + b.y) || a.x - b.x);

    for (const { x, y } of order) {
      const tile = map.get(x, y)!;
      this.drawTile(map, camera, tile, x, y, overlay, view);
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

    if (hover && map.inBounds(hover.x, hover.y)) {
      const t = map.get(hover.x, hover.y)!;
      ctx.save();
      ctx.globalAlpha = 0.55;
      this.drawDiamond(camera, hover.x, hover.y, t.height, '#ffffff', true);
      ctx.restore();
    }

    this.dirty = false;
  }

  private drawTile(
    map: TileMap,
    camera: IsoCamera,
    tile: Tile,
    x: number,
    y: number,
    overlay: OverlayMode,
    view: ViewLayer,
  ): void {
    if (view === 'underground') {
      this.drawUnderground(camera, tile, x, y, overlay);
      return;
    }

    const h = tile.height;
    if (tile.water) {
      this.drawWater(camera, x, y, h);
    } else {
      this.drawGround(camera, x, y, h, tile);
    }

    const zc = zoneColor(tile.zone);
    if (zc && tile.building === 'none') {
      this.drawDiamond(camera, x, y, h, zc, true);
      if (tile.zone.includes('dense')) {
        this.drawZoneHatch(camera, x, y, h);
      }
    }

    if (tile.trees && tile.building === 'none' && tile.road === 'none') {
      this.drawTree(camera, x, y, h);
    }

    if (tile.road !== 'none') {
      this.drawRoad(map, camera, tile, x, y);
    }

    if (tile.powerLine) {
      this.drawPowerLine(map, camera, tile, x, y);
    }

    if (tile.building !== 'none' && !tile.footprint) {
      this.drawBuilding(camera, tile, x, y);
    }

    if (tile.onFire) {
      this.drawFire(camera, x, y, h);
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
    }
    if (tile.building === 'pump' || tile.building === 'water_tower' || tile.building === 'treatment') {
      this.drawBuilding(camera, tile, x, y);
    }
    if (overlay === 'water') {
      this.drawOverlay(camera, tile, x, y, 'water');
    }
  }

  private drawGround(camera: IsoCamera, x: number, y: number, h: number, tile: Tile): void {
    const base = h >= 4 ? PALETTE.dirt : h <= 1 ? PALETTE.grassDark : PALETTE.grass;
    this.drawBlock(camera, x, y, h, base, PALETTE.grassDark, PALETTE.grassLight);
    if (tile.flooded) {
      this.drawDiamond(camera, x, y, h, 'rgba(58,124,165,0.45)', true);
    }
  }

  private drawWater(camera: IsoCamera, x: number, y: number, h: number): void {
    this.drawDiamond(camera, x, y, h, PALETTE.water, true);
    const { sx, sy } = camera.worldToScreen(x, y, h);
    const ctx = this.ctx;
    const z = camera.zoom;
    ctx.fillStyle = PALETTE.waterLite;
    ctx.globalAlpha = 0.35;
    ctx.beginPath();
    ctx.ellipse(sx, sy - 2 * z, 8 * z, 3 * z, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
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

    // left face
    ctx.fillStyle = left;
    ctx.beginPath();
    ctx.moveTo(sx - tw, topY);
    ctx.lineTo(sx, topY + th);
    ctx.lineTo(sx, baseY + th);
    ctx.lineTo(sx - tw, baseY);
    ctx.closePath();
    ctx.fill();

    // right face
    ctx.fillStyle = right;
    ctx.beginPath();
    ctx.moveTo(sx + tw, topY);
    ctx.lineTo(sx, topY + th);
    ctx.lineTo(sx, baseY + th);
    ctx.lineTo(sx + tw, baseY);
    ctx.closePath();
    ctx.fill();

    // top
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
    ctx.fillStyle = '#4a3420';
    ctx.fillRect(sx - 1 * z, sy - 6 * z, 2 * z, 6 * z);
    ctx.fillStyle = PALETTE.treeTop;
    ctx.beginPath();
    ctx.arc(sx, sy - 10 * z, 6 * z, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = PALETTE.tree;
    ctx.beginPath();
    ctx.arc(sx - 3 * z, sy - 8 * z, 4 * z, 0, Math.PI * 2);
    ctx.fill();
  }

  private drawRoad(map: TileMap, camera: IsoCamera, tile: Tile, x: number, y: number): void {
    const ctx = this.ctx;
    const { sx, sy } = camera.worldToScreen(x, y, tile.height);
    const z = camera.zoom;
    const color =
      tile.road === 'rail' ? PALETTE.rail : tile.road === 'highway' ? PALETTE.highway : PALETTE.road;
    ctx.strokeStyle = color;
    ctx.lineWidth = (tile.road === 'highway' ? 7 : 5) * z;
    ctx.lineCap = 'round';
    const n = map.neighbors4(x, y);
    let drew = false;
    for (const nb of n) {
      if (nb.tile.road === 'none') continue;
      const p = camera.worldToScreen(nb.x, nb.y, nb.tile.height);
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.lineTo((sx + p.sx) / 2, (sy + p.sy) / 2);
      ctx.stroke();
      drew = true;
    }
    if (!drew) {
      ctx.beginPath();
      ctx.moveTo(sx - 6 * z, sy);
      ctx.lineTo(sx + 6 * z, sy);
      ctx.stroke();
    }
    if (tile.road === 'road') {
      ctx.strokeStyle = PALETTE.roadLine;
      ctx.lineWidth = 1 * z;
      ctx.beginPath();
      ctx.moveTo(sx - 3 * z, sy);
      ctx.lineTo(sx + 3 * z, sy);
      ctx.stroke();
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

  private drawBuilding(camera: IsoCamera, tile: Tile, x: number, y: number): void {
    const ctx = this.ctx;
    const kind = tile.building;
    const bh = buildingHeightPx(kind, tile.buildingStage) * camera.zoom;
    const { sx, sy } = camera.worldToScreen(x, y, tile.height);
    const tw = (camera.tileW / 2) * camera.zoom * 0.72;
    const th = (camera.tileH / 2) * camera.zoom * 0.72;
    const fill = buildingFill(kind);
    const top = sy - bh;

    ctx.fillStyle = shade(fill, -0.25);
    ctx.beginPath();
    ctx.moveTo(sx - tw, sy);
    ctx.lineTo(sx, sy + th);
    ctx.lineTo(sx, top + th);
    ctx.lineTo(sx - tw, top);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = shade(fill, 0.1);
    ctx.beginPath();
    ctx.moveTo(sx + tw, sy);
    ctx.lineTo(sx, sy + th);
    ctx.lineTo(sx, top + th);
    ctx.lineTo(sx + tw, top);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = fill;
    ctx.beginPath();
    ctx.moveTo(sx, top - th);
    ctx.lineTo(sx + tw, top);
    ctx.lineTo(sx, top + th);
    ctx.lineTo(sx - tw, top);
    ctx.closePath();
    ctx.fill();

    if (kind === 'coal_plant' || kind === 'oil_plant') {
      ctx.fillStyle = PALETTE.plantAccent;
      ctx.fillRect(sx - 2 * camera.zoom, top - 8 * camera.zoom, 4 * camera.zoom, 8 * camera.zoom);
    }
    if (kind === 'fire') {
      ctx.fillStyle = PALETTE.fire;
      ctx.beginPath();
      ctx.arc(sx, top - 2 * camera.zoom, 3 * camera.zoom, 0, Math.PI * 2);
      ctx.fill();
    }
    if (kind === 'rocket') {
      ctx.fillStyle = '#eee';
      ctx.fillRect(sx - 2 * camera.zoom, top - 14 * camera.zoom, 4 * camera.zoom, 14 * camera.zoom);
    }
    if (!tile.powered && kind !== 'park' && kind !== 'none') {
      ctx.fillStyle = 'rgba(200,60,60,0.55)';
      ctx.beginPath();
      ctx.arc(sx + 6 * camera.zoom, top - 4 * camera.zoom, 3 * camera.zoom, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  private drawFire(camera: IsoCamera, x: number, y: number, h: number): void {
    const ctx = this.ctx;
    const { sx, sy } = camera.worldToScreen(x, y, h);
    const z = camera.zoom;
    ctx.fillStyle = '#ff6a00';
    ctx.beginPath();
    ctx.moveTo(sx, sy - 16 * z);
    ctx.lineTo(sx + 6 * z, sy - 2 * z);
    ctx.lineTo(sx - 6 * z, sy - 2 * z);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#ffd000';
    ctx.beginPath();
    ctx.moveTo(sx, sy - 12 * z);
    ctx.lineTo(sx + 3 * z, sy - 3 * z);
    ctx.lineTo(sx - 3 * z, sy - 3 * z);
    ctx.closePath();
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

function shade(hex: string, amt: number): string {
  const c = hex.replace('#', '');
  if (c.length !== 6) return hex;
  const num = parseInt(c, 16);
  let r = (num >> 16) & 0xff;
  let g = (num >> 8) & 0xff;
  let b = num & 0xff;
  r = Math.max(0, Math.min(255, Math.round(r + 255 * amt)));
  g = Math.max(0, Math.min(255, Math.round(g + 255 * amt)));
  b = Math.max(0, Math.min(255, Math.round(b + 255 * amt)));
  return `rgb(${r},${g},${b})`;
}
