import type { Tile } from '../map/layers';
import type { TileMap } from '../map/TileMap';
import type { IsoCamera } from './camera';
import { paintedLaneLines, roadSurface, streetEra, type RoadKind } from './era';
import { shade, tileHash } from './sprites';

export interface StreetLinks {
  xp: boolean;
  xn: boolean;
  yp: boolean;
  yn: boolean;
  count: number;
}

export function streetLinks(map: TileMap, x: number, y: number): StreetLinks {
  const xp = isStreet(map, x + 1, y);
  const xn = isStreet(map, x - 1, y);
  const yp = isStreet(map, x, y + 1);
  const yn = isStreet(map, x, y - 1);
  return { xp, xn, yp, yn, count: Number(xp) + Number(xn) + Number(yp) + Number(yn) };
}

function isStreet(map: TileMap, x: number, y: number): boolean {
  const t = map.get(x, y);
  return !!t && t.road !== 'none';
}

export function drawStreet(
  ctx: CanvasRenderingContext2D,
  camera: IsoCamera,
  map: TileMap,
  tile: Tile,
  x: number,
  y: number,
  year: number,
): void {
  if (tile.road === 'none') return;
  const kind: RoadKind = tile.road;
  const { sx, sy } = camera.worldToScreen(x, y, tile.height);
  const z = camera.zoom;
  const tw = (camera.tileW / 2) * z;
  const th = (camera.tileH / 2) * z;
  const links = streetLinks(map, x, y);
  const surface = roadSurface(year, kind);

  if (kind === 'rail') {
    drawRailBed(ctx, sx, sy, tw, th, z, x, y, links);
    return;
  }

  fillDiamond(ctx, sx, sy, tw, th, surface.fill);
  ctx.strokeStyle = surface.curb;
  ctx.lineWidth = Math.max(1, 1.15 * z);
  strokeDiamond(ctx, sx, sy, tw, th);

  switch (surface.texture) {
    case 'dirt':
      stipple(ctx, sx, sy, tw, th, z, x, y, shade(surface.fill, -0.1), 6);
      drawRuts(ctx, sx, sy, tw, th, z, links, surface.mark);
      break;
    case 'cobble':
      drawCobbles(ctx, sx, sy, tw, th, z, x, y, surface.fill);
      break;
    case 'asphalt':
      stipple(ctx, sx, sy, tw, th, z, x, y, shade(surface.fill, 0.06), 4);
      if (paintedLaneLines(year)) {
        drawLanePaint(ctx, sx, sy, tw, th, z, links, surface.mark, kind === 'highway');
      }
      break;
    case 'future':
      drawLanePaint(ctx, sx, sy, tw, th, z, links, surface.mark, true);
      break;
    default: {
      const _exhaustive: never = surface.texture;
      return _exhaustive;
    }
  }

  if (kind === 'highway' && streetEra(year) !== 'horse' && streetEra(year) !== 'brass') {
    ctx.strokeStyle = 'rgba(232, 197, 71, 0.35)';
    ctx.lineWidth = Math.max(1, 1.1 * z);
    strokeDiamond(ctx, sx, sy, tw * 0.86, th * 0.86);
  }
}

function fillDiamond(
  ctx: CanvasRenderingContext2D,
  sx: number,
  sy: number,
  tw: number,
  th: number,
  color: string,
): void {
  diamond(ctx, sx, sy, tw, th);
  ctx.fillStyle = color;
  ctx.fill();
}

function strokeDiamond(
  ctx: CanvasRenderingContext2D,
  sx: number,
  sy: number,
  tw: number,
  th: number,
): void {
  diamond(ctx, sx, sy, tw, th);
  ctx.stroke();
}

function diamond(
  ctx: CanvasRenderingContext2D,
  sx: number,
  sy: number,
  tw: number,
  th: number,
): void {
  ctx.beginPath();
  ctx.moveTo(sx, sy - th);
  ctx.lineTo(sx + tw, sy);
  ctx.lineTo(sx, sy + th);
  ctx.lineTo(sx - tw, sy);
  ctx.closePath();
}

function screenAxis(ax: number, ay: number, tw: number, th: number): { x: number; y: number } {
  return { x: (ax - ay) * tw, y: (ax + ay) * th };
}

function eachArm(links: StreetLinks, fn: (ax: number, ay: number) => void): void {
  if (links.xp) fn(1, 0);
  if (links.xn) fn(-1, 0);
  if (links.yp) fn(0, 1);
  if (links.yn) fn(0, -1);
  if (links.count === 0) {
    fn(1, 0);
    fn(-1, 0);
  }
}

function drawRuts(
  ctx: CanvasRenderingContext2D,
  sx: number,
  sy: number,
  tw: number,
  th: number,
  z: number,
  links: StreetLinks,
  color: string,
): void {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.globalAlpha = 0.4;
  ctx.lineWidth = Math.max(1, 1.05 * z);
  ctx.lineCap = 'butt';
  eachArm(links, (ax, ay) => {
    const along = screenAxis(ax, ay, tw, th);
    const side = screenAxis(-ay, ax, tw, th);
    for (const s of [-0.16, 0.16]) {
      ctx.beginPath();
      ctx.moveTo(sx + side.x * s, sy + side.y * s);
      ctx.lineTo(sx + along.x * 0.72 + side.x * s, sy + along.y * 0.72 + side.y * s);
      ctx.stroke();
    }
  });
  ctx.restore();
}

function drawLanePaint(
  ctx: CanvasRenderingContext2D,
  sx: number,
  sy: number,
  tw: number,
  th: number,
  z: number,
  links: StreetLinks,
  color: string,
  solid: boolean,
): void {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.globalAlpha = 0.85;
  ctx.lineWidth = Math.max(1, 1.05 * z);
  ctx.lineCap = 'butt';
  ctx.setLineDash(solid ? [] : [2.6 * z, 2.4 * z]);
  eachArm(links, (ax, ay) => {
    const along = screenAxis(ax, ay, tw, th);
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.lineTo(sx + along.x * 0.7, sy + along.y * 0.7);
    ctx.stroke();
  });
  ctx.setLineDash([]);
  ctx.restore();
}

function drawCobbles(
  ctx: CanvasRenderingContext2D,
  sx: number,
  sy: number,
  tw: number,
  th: number,
  z: number,
  x: number,
  y: number,
  fill: string,
): void {
  ctx.save();
  diamond(ctx, sx, sy, tw, th);
  ctx.clip();
  for (let i = 0; i < 8; i++) {
    const u = tileHash(x * 17 + i, y * 9 + i * 3);
    const v = tileHash(x * 5 + i * 2, y * 13 + i);
    ctx.fillStyle = shade(fill, i % 2 === 0 ? -0.08 : 0.07);
    ctx.beginPath();
    ctx.ellipse(
      sx + (u - 0.5) * tw * 1.55,
      sy + (v - 0.5) * th * 1.55,
      2.1 * z,
      1.05 * z,
      0,
      0,
      Math.PI * 2,
    );
    ctx.fill();
  }
  ctx.restore();
}

function stipple(
  ctx: CanvasRenderingContext2D,
  sx: number,
  sy: number,
  tw: number,
  th: number,
  z: number,
  x: number,
  y: number,
  color: string,
  n: number,
): void {
  ctx.save();
  diamond(ctx, sx, sy, tw, th);
  ctx.clip();
  ctx.fillStyle = color;
  for (let i = 0; i < n; i++) {
    const u = tileHash(x + i * 4, y + i * 7);
    const v = tileHash(x * 3 + i, y * 2 + i);
    ctx.fillRect(sx + (u - 0.5) * tw * 1.4, sy + (v - 0.5) * th * 1.4, 1.4 * z, 1.1 * z);
  }
  ctx.restore();
}

function drawRailBed(
  ctx: CanvasRenderingContext2D,
  sx: number,
  sy: number,
  tw: number,
  th: number,
  z: number,
  x: number,
  y: number,
  links: StreetLinks,
): void {
  fillDiamond(ctx, sx, sy, tw, th, '#6e624c');
  ctx.strokeStyle = '#4a3c2c';
  ctx.lineWidth = Math.max(1, 1.1 * z);
  strokeDiamond(ctx, sx, sy, tw, th);
  stipple(ctx, sx, sy, tw, th, z, x, y, '#8a7a60', 5);

  const alongX = links.xp || links.xn || links.count === 0;
  const ax = alongX ? 1 : 0;
  const ay = alongX ? 0 : 1;
  const along = screenAxis(ax, ay, tw, th);
  const side = screenAxis(-ay, ax, tw, th);

  ctx.strokeStyle = '#5a4030';
  ctx.lineWidth = Math.max(1.2, 1.8 * z);
  ctx.lineCap = 'butt';
  for (let i = -2; i <= 2; i++) {
    const t = i / 2.6;
    ctx.beginPath();
    ctx.moveTo(sx + along.x * t - side.x * 0.22, sy + along.y * t - side.y * 0.22);
    ctx.lineTo(sx + along.x * t + side.x * 0.22, sy + along.y * t + side.y * 0.22);
    ctx.stroke();
  }

  ctx.strokeStyle = '#8a8a90';
  ctx.lineWidth = Math.max(1, 1.15 * z);
  for (const s of [-0.12, 0.12]) {
    ctx.beginPath();
    ctx.moveTo(sx - along.x * 0.7 + side.x * s, sy - along.y * 0.7 + side.y * s);
    ctx.lineTo(sx + along.x * 0.7 + side.x * s, sy + along.y * 0.7 + side.y * s);
    ctx.stroke();
  }
}
