export class IsoCamera {
  x = 0;
  y = 0;
  zoom = 1;
  minZoom = 0.45;
  maxZoom = 2.4;

  /** Half-width / half-height of a floor tile diamond at zoom 1 */
  readonly tileW = 32;
  readonly tileH = 16;
  readonly heightStep = 8;

  screenToWorld(sx: number, sy: number): { wx: number; wy: number } {
    const zx = (sx - this.x) / this.zoom;
    const zy = (sy - this.y) / this.zoom;
    const wx = (zx / (this.tileW / 2) + zy / (this.tileH / 2)) / 2;
    const wy = (zy / (this.tileH / 2) - zx / (this.tileW / 2)) / 2;
    return { wx, wy };
  }

  worldToScreen(wx: number, wy: number, height = 0): { sx: number; sy: number } {
    const sx = (wx - wy) * (this.tileW / 2) * this.zoom + this.x;
    const sy =
      (wx + wy) * (this.tileH / 2) * this.zoom - height * this.heightStep * this.zoom + this.y;
    return { sx, sy };
  }

  pan(dx: number, dy: number): void {
    this.x += dx;
    this.y += dy;
  }

  zoomAt(factor: number, cx: number, cy: number): void {
    const before = this.screenToWorld(cx, cy);
    this.zoom = Math.min(this.maxZoom, Math.max(this.minZoom, this.zoom * factor));
    const after = this.worldToScreen(before.wx, before.wy);
    this.x += cx - after.sx;
    this.y += cy - after.sy;
  }

  centerOn(wx: number, wy: number, viewW: number, viewH: number, height = 2): void {
    const s = this.worldToScreen(wx, wy, height);
    this.x += viewW / 2 - s.sx;
    this.y += viewH / 2 - s.sy;
  }
}
