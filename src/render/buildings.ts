import { BUILDINGS } from '../data/buildings';
import type { Tile } from '../map/layers';
import type { IsoCamera } from './camera';
import { PALETTE, buildingFill, buildingHeightPx, shade, tileHash } from './sprites';

export function drawBuildingSprite(
  ctx: CanvasRenderingContext2D,
  camera: IsoCamera,
  tile: Tile,
  x: number,
  y: number,
  time: number,
  night: number,
): void {
  const kind = tile.building;
  if (kind === 'none') return;
  const def = BUILDINGS[kind];
  const z = camera.zoom;
  const cx = x + (def.width - 1) / 2;
  const cy = y + (def.height - 1) / 2;
  const { sx, sy } = camera.worldToScreen(cx, cy, tile.height);
  const tw = (camera.tileW / 2) * z * (0.7 + 0.42 * (def.width - 1));
  const th = (camera.tileH / 2) * z * (0.7 + 0.42 * (def.height - 1));
  const bh = buildingHeightPx(kind, tile.buildingStage) * z * (def.width > 1 ? 1.15 : 1);
  const fill = buildingFill(kind);
  const seed = tileHash(x, y);
  const lit = night > 0.45 && tile.powered;

  drawPrism(ctx, sx, sy, tw, th, bh, fill);

  switch (kind) {
    case 'house':
      drawPeakedRoof(ctx, sx, sy, tw, th, bh, PALETTE.roof);
      drawChimney(ctx, sx, sy, tw, th, bh, z);
      drawDoor(ctx, sx, sy, tw, th, bh, z, '#5a3a22');
      drawWindows(ctx, sx, sy, tw, th, bh, 2, 1, lit, seed, z);
      break;
    case 'apartment':
      drawWindows(ctx, sx, sy, tw, th, bh, 3, 4, lit, seed, z);
      drawRoofBox(ctx, sx, sy - bh, tw * 0.25, z, PALETTE.steel);
      break;
    case 'shop':
      drawAwning(ctx, sx, sy, tw, th, bh, z);
      drawWindows(ctx, sx, sy, tw, th, bh, 2, 1, lit, seed, z);
      drawSign(ctx, sx, sy, tw, th, bh, z, PALETTE.awning);
      break;
    case 'office':
      drawWindows(ctx, sx, sy, tw, th, bh, 4, 5, lit, seed, z);
      drawMast(ctx, sx, sy - bh, z * 10, '#ccc', false, time);
      break;
    case 'factory':
      drawSawtooth(ctx, sx, sy, tw, th, bh, shade(fill, 0.08));
      drawStack(ctx, sx + tw * 0.25, sy - bh, z, 16, PALETTE.plant);
      drawWindows(ctx, sx, sy, tw, th, bh, 3, 1, lit, seed, z);
      break;
    case 'warehouse':
      drawLoadingDoor(ctx, sx, sy, tw, th, bh, z);
      break;
    case 'coal_plant':
      drawStack(ctx, sx - tw * 0.2, sy - bh, z, 22, PALETTE.plant);
      drawStack(ctx, sx + tw * 0.28, sy - bh, z, 18, PALETTE.plant);
      drawWindows(ctx, sx, sy, tw, th, bh, 3, 2, lit, seed, z);
      break;
    case 'oil_plant':
      drawTank(ctx, sx - tw * 0.35, sy + th * 0.1, z * 7, '#6a5a48');
      drawTank(ctx, sx + tw * 0.15, sy + th * 0.15, z * 6, '#5a4a3a');
      drawStack(ctx, sx + tw * 0.4, sy - bh * 0.4, z, 16, PALETTE.plant);
      break;
    case 'nuclear_plant':
      drawCoolingTower(ctx, sx - tw * 0.28, sy - bh * 0.15, z, PALETTE.concrete);
      drawCoolingTower(ctx, sx + tw * 0.22, sy - bh * 0.05, z, PALETTE.concrete);
      break;
    case 'police':
      drawStripe(ctx, sx, sy, tw, th, bh, '#3a5a9a');
      drawMast(ctx, sx, sy - bh, z * 8, '#ddd', true, time);
      drawDoor(ctx, sx, sy, tw, th, bh, z, '#2a3a58');
      drawWindows(ctx, sx, sy, tw, th, bh, 2, 1, lit, seed, z);
      break;
    case 'fire':
      drawGarage(ctx, sx, sy, tw, th, bh, z, PALETTE.fire);
      drawStack(ctx, sx + tw * 0.15, sy - bh, z, 10, PALETTE.fire);
      break;
    case 'hospital':
      drawCross(ctx, sx, sy - bh * 0.55, z * 4, '#c44b4b');
      drawWindows(ctx, sx, sy, tw, th, bh, 3, 2, lit, seed, z);
      drawDoor(ctx, sx, sy, tw, th, bh, z, '#eee');
      break;
    case 'school':
      drawFlag(ctx, sx + tw * 0.4, sy - bh, z, time);
      drawWindows(ctx, sx, sy, tw, th, bh, 3, 2, lit, seed, z);
      drawDoor(ctx, sx, sy, tw, th, bh, z, '#5a3a22');
      break;
    case 'college':
      drawPeakedRoof(ctx, sx, sy, tw, th, bh, '#4a3a6a');
      drawWindows(ctx, sx, sy, tw, th, bh, 4, 2, lit, seed, z);
      drawMast(ctx, sx, sy - bh - th * 0.6, z * 8, PALETTE.gold, false, time);
      break;
    case 'park':
      drawPark(ctx, sx, sy, z, seed);
      break;
    case 'pump':
      drawRoofBox(ctx, sx, sy - bh, tw * 0.5, z, PALETTE.waterLite);
      drawPipeStub(ctx, sx, sy, z);
      break;
    case 'water_tower':
      drawWaterTower(ctx, sx, sy, tw, th, bh, z);
      break;
    case 'treatment':
      drawPool(ctx, sx - tw * 0.25, sy, z * 8, PALETTE.water);
      drawPool(ctx, sx + tw * 0.2, sy + th * 0.2, z * 6, PALETTE.waterLite);
      break;
    case 'city_hall':
      drawDome(ctx, sx, sy - bh, tw, z, PALETTE.gold);
      drawColumns(ctx, sx, sy, tw, th, bh, z);
      drawWindows(ctx, sx, sy, tw, th, bh, 3, 2, lit, seed, z);
      break;
    case 'tv_station':
      drawMast(ctx, sx, sy - bh, z * 22, '#ddd', true, time);
      drawWindows(ctx, sx, sy, tw, th, bh, 3, 2, lit, seed, z);
      break;
    case 'rocket':
      drawRocket(ctx, sx, sy, tw, th, bh, z, time);
      break;
    case 'stadium':
      drawStadium(ctx, sx, sy, tw, th, bh, z);
      break;
    case 'zoo':
      drawPark(ctx, sx, sy, z, seed);
      drawFence(ctx, sx, sy, tw, th, z);
      break;
    case 'museum':
      drawPeakedRoof(ctx, sx, sy, tw, th, bh, PALETTE.concrete);
      drawColumns(ctx, sx, sy, tw, th, bh, z);
      break;
    case 'library':
      drawColumns(ctx, sx, sy, tw, th, bh, z);
      drawWindows(ctx, sx, sy, tw, th, bh, 2, 2, lit, seed, z);
      break;
    case 'prison':
      drawFence(ctx, sx, sy, tw * 1.1, th * 1.1, z);
      drawStack(ctx, sx + tw * 0.45, sy - bh * 0.2, z, 12, PALETTE.abandoned);
      drawWindows(ctx, sx, sy, tw, th, bh, 4, 2, false, seed, z);
      break;
    case 'abandoned':
      drawBroken(ctx, sx, sy, tw, th, bh, z, seed);
      break;
    default: {
      const _exhaustive: never = kind;
      return _exhaustive;
    }
  }

  if (!tile.powered && kind !== 'park') {
    ctx.fillStyle = 'rgba(200,60,60,0.7)';
    ctx.beginPath();
    ctx.arc(sx + tw * 0.55, sy - bh - 4 * z, 3.2 * z, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.font = `${7 * z}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('!', sx + tw * 0.55, sy - bh - 4 * z + 0.5);
    ctx.textAlign = 'start';
    ctx.textBaseline = 'alphabetic';
  }
}

export function drawGhostFootprint(
  ctx: CanvasRenderingContext2D,
  camera: IsoCamera,
  x: number,
  y: number,
  w: number,
  h: number,
  height: number,
  ok: boolean,
): void {
  ctx.save();
  ctx.globalAlpha = 0.4;
  const color = ok ? '#6bcf7a' : '#c44b4b';
  for (let dy = 0; dy < h; dy++) {
    for (let dx = 0; dx < w; dx++) {
      diamond(ctx, camera, x + dx, y + dy, height, color);
    }
  }
  ctx.restore();
}

function diamond(
  ctx: CanvasRenderingContext2D,
  camera: IsoCamera,
  x: number,
  y: number,
  h: number,
  color: string,
): void {
  const tw = (camera.tileW / 2) * camera.zoom;
  const th = (camera.tileH / 2) * camera.zoom;
  const { sx, sy } = camera.worldToScreen(x, y, h);
  ctx.beginPath();
  ctx.moveTo(sx, sy - th);
  ctx.lineTo(sx + tw, sy);
  ctx.lineTo(sx, sy + th);
  ctx.lineTo(sx - tw, sy);
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
}

function drawPrism(
  ctx: CanvasRenderingContext2D,
  sx: number,
  sy: number,
  tw: number,
  th: number,
  bh: number,
  fill: string,
): void {
  const top = sy - bh;
  ctx.fillStyle = shade(fill, -0.28);
  ctx.beginPath();
  ctx.moveTo(sx - tw, sy);
  ctx.lineTo(sx, sy + th);
  ctx.lineTo(sx, top + th);
  ctx.lineTo(sx - tw, top);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = shade(fill, 0.12);
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
}

function drawPeakedRoof(
  ctx: CanvasRenderingContext2D,
  sx: number,
  sy: number,
  tw: number,
  th: number,
  bh: number,
  color: string,
): void {
  const top = sy - bh;
  const peak = top - th * 0.95;
  ctx.fillStyle = shade(color, -0.2);
  ctx.beginPath();
  ctx.moveTo(sx - tw, top);
  ctx.lineTo(sx, peak);
  ctx.lineTo(sx, top + th);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = shade(color, 0.08);
  ctx.beginPath();
  ctx.moveTo(sx + tw, top);
  ctx.lineTo(sx, peak);
  ctx.lineTo(sx, top + th);
  ctx.closePath();
  ctx.fill();
}

function drawChimney(
  ctx: CanvasRenderingContext2D,
  sx: number,
  sy: number,
  tw: number,
  _th: number,
  bh: number,
  z: number,
): void {
  const x = sx + tw * 0.35;
  const y = sy - bh - 4 * z;
  ctx.fillStyle = PALETTE.chimney;
  ctx.fillRect(x, y - 6 * z, 3 * z, 8 * z);
}

function drawDoor(
  ctx: CanvasRenderingContext2D,
  sx: number,
  sy: number,
  tw: number,
  th: number,
  bh: number,
  z: number,
  color: string,
): void {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(sx - tw * 0.35, sy - 2 * z);
  ctx.lineTo(sx - tw * 0.12, sy + th * 0.35);
  ctx.lineTo(sx - tw * 0.12, sy - bh * 0.35 + th * 0.35);
  ctx.lineTo(sx - tw * 0.35, sy - bh * 0.35);
  ctx.closePath();
  ctx.fill();
}

function drawWindows(
  ctx: CanvasRenderingContext2D,
  sx: number,
  sy: number,
  tw: number,
  th: number,
  bh: number,
  cols: number,
  rows: number,
  lit: boolean,
  seed: number,
  z: number,
): void {
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const on = lit && ((c * 3 + r * 7 + seed * 10) % 1 > 0.28);
      ctx.fillStyle = on ? PALETTE.windowLit : PALETTE.window;
      const u = (c + 0.35) / (cols + 0.4);
      const v = (r + 0.45) / (rows + 0.6);
      const px = sx + tw * (u - 0.15);
      const py = sy - bh * (1 - v) + th * 0.15;
      ctx.fillRect(px, py, Math.max(1.4, 2.2 * z), Math.max(1.4, 2.4 * z));
    }
  }
}

function drawRoofBox(
  ctx: CanvasRenderingContext2D,
  sx: number,
  sy: number,
  w: number,
  z: number,
  color: string,
): void {
  ctx.fillStyle = color;
  ctx.fillRect(sx - w * 0.3, sy - 5 * z, w * 0.6, 5 * z);
}

function drawAwning(
  ctx: CanvasRenderingContext2D,
  sx: number,
  sy: number,
  tw: number,
  th: number,
  bh: number,
  z: number,
): void {
  ctx.fillStyle = PALETTE.awning;
  ctx.beginPath();
  ctx.moveTo(sx - tw * 0.9, sy - bh * 0.45);
  ctx.lineTo(sx + tw * 0.15, sy - bh * 0.45 + th * 0.7);
  ctx.lineTo(sx + tw * 0.15, sy - bh * 0.35 + th * 0.7);
  ctx.lineTo(sx - tw * 0.9, sy - bh * 0.35);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = Math.max(1, 1.2 * z);
  ctx.beginPath();
  ctx.moveTo(sx - tw * 0.9, sy - bh * 0.4);
  ctx.lineTo(sx + tw * 0.15, sy - bh * 0.4 + th * 0.7);
  ctx.stroke();
}

function drawSign(
  ctx: CanvasRenderingContext2D,
  sx: number,
  sy: number,
  _tw: number,
  _th: number,
  bh: number,
  z: number,
  color: string,
): void {
  ctx.fillStyle = color;
  ctx.fillRect(sx - 5 * z, sy - bh - 4 * z, 10 * z, 4 * z);
}

function drawMast(
  ctx: CanvasRenderingContext2D,
  sx: number,
  sy: number,
  h: number,
  color: string,
  blink: boolean,
  time: number,
): void {
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(sx, sy);
  ctx.lineTo(sx, sy - h);
  ctx.stroke();
  if (blink) {
    ctx.fillStyle = Math.sin(time * 0.008) > 0 ? '#ff3030' : '#5a1010';
    ctx.beginPath();
    ctx.arc(sx, sy - h, 2.2, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawSawtooth(
  ctx: CanvasRenderingContext2D,
  sx: number,
  sy: number,
  tw: number,
  th: number,
  bh: number,
  color: string,
): void {
  const top = sy - bh;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(sx - tw, top);
  ctx.lineTo(sx - tw * 0.4, top - th * 0.7);
  ctx.lineTo(sx, top);
  ctx.lineTo(sx + tw * 0.4, top - th * 0.7);
  ctx.lineTo(sx + tw, top);
  ctx.lineTo(sx, top + th);
  ctx.closePath();
  ctx.fill();
}

function drawStack(
  ctx: CanvasRenderingContext2D,
  sx: number,
  sy: number,
  z: number,
  h: number,
  color: string,
): void {
  ctx.fillStyle = color;
  ctx.fillRect(sx - 2 * z, sy - h * z, 4 * z, h * z);
  ctx.fillStyle = shade(color, -0.2);
  ctx.fillRect(sx - 2.5 * z, sy - h * z - 2 * z, 5 * z, 3 * z);
}

function drawLoadingDoor(
  ctx: CanvasRenderingContext2D,
  sx: number,
  sy: number,
  tw: number,
  th: number,
  bh: number,
  z: number,
): void {
  ctx.fillStyle = '#3a342c';
  ctx.beginPath();
  ctx.moveTo(sx + tw * 0.15, sy - 2 * z);
  ctx.lineTo(sx + tw * 0.55, sy - 2 * z - th * 0.15);
  ctx.lineTo(sx + tw * 0.55, sy - bh * 0.55 - th * 0.15);
  ctx.lineTo(sx + tw * 0.15, sy - bh * 0.55);
  ctx.closePath();
  ctx.fill();
}

function drawTank(ctx: CanvasRenderingContext2D, sx: number, sy: number, r: number, color: string): void {
  ctx.fillStyle = shade(color, -0.15);
  ctx.beginPath();
  ctx.ellipse(sx, sy + r * 0.35, r, r * 0.45, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.ellipse(sx, sy, r, r * 0.45, 0, 0, Math.PI * 2);
  ctx.fill();
}

function drawCoolingTower(
  ctx: CanvasRenderingContext2D,
  sx: number,
  sy: number,
  z: number,
  color: string,
): void {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(sx - 7 * z, sy + 10 * z);
  ctx.quadraticCurveTo(sx - 3 * z, sy - 4 * z, sx - 8 * z, sy - 18 * z);
  ctx.lineTo(sx + 8 * z, sy - 18 * z);
  ctx.quadraticCurveTo(sx + 3 * z, sy - 4 * z, sx + 7 * z, sy + 10 * z);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = shade(color, 0.12);
  ctx.beginPath();
  ctx.ellipse(sx, sy - 18 * z, 8 * z, 2.5 * z, 0, 0, Math.PI * 2);
  ctx.fill();
}

function drawStripe(
  ctx: CanvasRenderingContext2D,
  sx: number,
  sy: number,
  tw: number,
  th: number,
  bh: number,
  color: string,
): void {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(sx - tw, sy - bh * 0.55);
  ctx.lineTo(sx, sy - bh * 0.55 + th);
  ctx.lineTo(sx, sy - bh * 0.4 + th);
  ctx.lineTo(sx - tw, sy - bh * 0.4);
  ctx.closePath();
  ctx.fill();
}

function drawGarage(
  ctx: CanvasRenderingContext2D,
  sx: number,
  sy: number,
  tw: number,
  th: number,
  bh: number,
  z: number,
  color: string,
): void {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(sx - tw * 0.2, sy);
  ctx.lineTo(sx + tw * 0.35, sy - th * 0.1);
  ctx.lineTo(sx + tw * 0.35, sy - bh * 0.5 - th * 0.1);
  ctx.lineTo(sx - tw * 0.2, sy - bh * 0.5);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = Math.max(1, z);
  ctx.beginPath();
  ctx.moveTo(sx - tw * 0.2, sy - bh * 0.25);
  ctx.lineTo(sx + tw * 0.35, sy - bh * 0.25 - th * 0.1);
  ctx.stroke();
}

function drawCross(ctx: CanvasRenderingContext2D, sx: number, sy: number, s: number, color: string): void {
  ctx.fillStyle = color;
  ctx.fillRect(sx - s * 0.2, sy - s, s * 0.4, s * 2);
  ctx.fillRect(sx - s, sy - s * 0.2, s * 2, s * 0.4);
}

function drawFlag(
  ctx: CanvasRenderingContext2D,
  sx: number,
  sy: number,
  z: number,
  time: number,
): void {
  ctx.strokeStyle = '#ccc';
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(sx, sy);
  ctx.lineTo(sx, sy - 12 * z);
  ctx.stroke();
  const wave = Math.sin(time * 0.006) * 2 * z;
  ctx.fillStyle = '#4a7ec4';
  ctx.beginPath();
  ctx.moveTo(sx, sy - 12 * z);
  ctx.lineTo(sx + 8 * z + wave, sy - 10 * z);
  ctx.lineTo(sx, sy - 8 * z);
  ctx.closePath();
  ctx.fill();
}

function drawPark(ctx: CanvasRenderingContext2D, sx: number, sy: number, z: number, seed: number): void {
  ctx.fillStyle = PALETTE.park;
  ctx.beginPath();
  ctx.ellipse(sx, sy, 10 * z, 5 * z, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#6a4a28';
  ctx.fillRect(sx - 6 * z, sy, 12 * z, 1.5 * z);
  const trees = seed > 0.5 ? 3 : 2;
  for (let i = 0; i < trees; i++) {
    const ox = (i - 1) * 5 * z;
    ctx.fillStyle = '#4a3420';
    ctx.fillRect(sx + ox - z, sy - 6 * z, 2 * z, 6 * z);
    ctx.fillStyle = i % 2 ? PALETTE.treeTop : PALETTE.tree;
    ctx.beginPath();
    ctx.arc(sx + ox, sy - 9 * z, 4.5 * z, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawPipeStub(ctx: CanvasRenderingContext2D, sx: number, sy: number, z: number): void {
  ctx.strokeStyle = PALETTE.pipe;
  ctx.lineWidth = 2 * z;
  ctx.beginPath();
  ctx.moveTo(sx - 6 * z, sy + 4 * z);
  ctx.lineTo(sx + 6 * z, sy + 4 * z);
  ctx.stroke();
}

function drawWaterTower(
  ctx: CanvasRenderingContext2D,
  sx: number,
  sy: number,
  _tw: number,
  _th: number,
  bh: number,
  z: number,
): void {
  ctx.strokeStyle = '#6a6a6a';
  ctx.lineWidth = 1.6 * z;
  ctx.beginPath();
  ctx.moveTo(sx - 5 * z, sy);
  ctx.lineTo(sx - 3 * z, sy - bh);
  ctx.moveTo(sx + 5 * z, sy);
  ctx.lineTo(sx + 3 * z, sy - bh);
  ctx.stroke();
  ctx.fillStyle = PALETTE.waterLite;
  ctx.beginPath();
  ctx.ellipse(sx, sy - bh, 8 * z, 5 * z, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = shade(PALETTE.waterLite, 0.15);
  ctx.beginPath();
  ctx.ellipse(sx, sy - bh - 2 * z, 6 * z, 2.5 * z, 0, 0, Math.PI * 2);
  ctx.fill();
}

function drawPool(ctx: CanvasRenderingContext2D, sx: number, sy: number, r: number, color: string): void {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.ellipse(sx, sy, r, r * 0.45, 0, 0, Math.PI * 2);
  ctx.fill();
}

function drawDome(
  ctx: CanvasRenderingContext2D,
  sx: number,
  sy: number,
  tw: number,
  z: number,
  color: string,
): void {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.ellipse(sx, sy - 2 * z, tw * 0.45, tw * 0.35, 0, Math.PI, 0);
  ctx.fill();
  ctx.fillStyle = shade(color, 0.2);
  ctx.beginPath();
  ctx.arc(sx, sy - tw * 0.35, 2 * z, 0, Math.PI * 2);
  ctx.fill();
}

function drawColumns(
  ctx: CanvasRenderingContext2D,
  sx: number,
  sy: number,
  tw: number,
  _th: number,
  bh: number,
  z: number,
): void {
  ctx.fillStyle = '#e8e0d0';
  for (let i = 0; i < 3; i++) {
    const u = (i - 1) * 0.28;
    ctx.fillRect(sx + tw * u - z, sy - bh * 0.75, 2 * z, bh * 0.55);
  }
}

function drawRocket(
  ctx: CanvasRenderingContext2D,
  sx: number,
  sy: number,
  tw: number,
  _th: number,
  bh: number,
  z: number,
  time: number,
): void {
  const cycle = (time / 22000) % 1;
  const launching = cycle < 0.18;
  const lift = launching ? (cycle / 0.18) * 70 * z : 0;
  const bodyTop = sy - bh - 8 * z - lift;
  ctx.fillStyle = '#d8dce0';
  ctx.beginPath();
  ctx.moveTo(sx, bodyTop - 16 * z);
  ctx.lineTo(sx + 5 * z, bodyTop + 10 * z);
  ctx.lineTo(sx - 5 * z, bodyTop + 10 * z);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#c44b4b';
  ctx.beginPath();
  ctx.moveTo(sx - 5 * z, bodyTop + 6 * z);
  ctx.lineTo(sx - 10 * z, bodyTop + 14 * z);
  ctx.lineTo(sx - 4 * z, bodyTop + 10 * z);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(sx + 5 * z, bodyTop + 6 * z);
  ctx.lineTo(sx + 10 * z, bodyTop + 14 * z);
  ctx.lineTo(sx + 4 * z, bodyTop + 10 * z);
  ctx.closePath();
  ctx.fill();
  if (launching) {
    ctx.fillStyle = '#ff9a2a';
    ctx.beginPath();
    ctx.moveTo(sx, bodyTop + 28 * z);
    ctx.lineTo(sx + 4 * z, bodyTop + 12 * z);
    ctx.lineTo(sx - 4 * z, bodyTop + 12 * z);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#ffe060';
    ctx.beginPath();
    ctx.moveTo(sx, bodyTop + 22 * z);
    ctx.lineTo(sx + 2 * z, bodyTop + 12 * z);
    ctx.lineTo(sx - 2 * z, bodyTop + 12 * z);
    ctx.closePath();
    ctx.fill();
  }
  ctx.fillStyle = '#4a4a55';
  ctx.fillRect(sx + tw * 0.5, sy - bh, 3 * z, bh);
}

function drawStadium(
  ctx: CanvasRenderingContext2D,
  sx: number,
  sy: number,
  tw: number,
  th: number,
  bh: number,
  _z: number,
): void {
  ctx.fillStyle = PALETTE.concrete;
  ctx.beginPath();
  ctx.ellipse(sx, sy - bh * 0.2, tw * 1.05, th * 1.4, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = PALETTE.field;
  ctx.beginPath();
  ctx.ellipse(sx, sy - bh * 0.2, tw * 0.62, th * 0.8, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.5)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.ellipse(sx, sy - bh * 0.2, tw * 0.62, th * 0.8, 0, 0, Math.PI * 2);
  ctx.stroke();
}

function drawFence(
  ctx: CanvasRenderingContext2D,
  sx: number,
  sy: number,
  tw: number,
  th: number,
  z: number,
): void {
  ctx.strokeStyle = '#c8c8c8';
  ctx.lineWidth = Math.max(1, z);
  ctx.beginPath();
  ctx.moveTo(sx, sy - th);
  ctx.lineTo(sx + tw, sy);
  ctx.lineTo(sx, sy + th);
  ctx.lineTo(sx - tw, sy);
  ctx.closePath();
  ctx.stroke();
}

function drawBroken(
  ctx: CanvasRenderingContext2D,
  sx: number,
  sy: number,
  tw: number,
  th: number,
  bh: number,
  z: number,
  seed: number,
): void {
  ctx.fillStyle = 'rgba(20,16,12,0.35)';
  ctx.beginPath();
  ctx.moveTo(sx + tw * 0.1, sy - bh - th);
  ctx.lineTo(sx + tw * 0.5, sy - bh * (0.4 + seed * 0.3));
  ctx.lineTo(sx + tw * 0.2, sy - bh * 0.2);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#3a3028';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(sx - 4 * z, sy - bh * 0.5);
  ctx.lineTo(sx + 6 * z, sy - bh * 0.2);
  ctx.stroke();
}
