import type { TileMap } from '../map/TileMap';
import type { IsoCamera } from './camera';

/** Return true if screen point is inside the ground diamond for tile (x,y) at height. */
export function pointInTileDiamond(
  camera: IsoCamera,
  sx: number,
  sy: number,
  x: number,
  y: number,
  height: number,
): boolean {
  const { sx: cx, sy: cy } = camera.worldToScreen(x, y, height);
  const tw = (camera.tileW / 2) * camera.zoom;
  const th = (camera.tileH / 2) * camera.zoom;
  if (tw <= 0.001 || th <= 0.001) return false;
  const dx = sx - cx;
  const dy = sy - cy;
  return Math.abs(dx) / tw + Math.abs(dy) / th <= 1.05;
}

/**
 * Pick the front-most tile under a screen point by testing diamonds in reverse
 * paint order. Far more reliable on mobile than inverting the iso projection.
 */
export function pickTileAtScreen(
  map: TileMap,
  camera: IsoCamera,
  sx: number,
  sy: number,
): { x: number; y: number } | null {
  // Coarse guess to limit search
  const approx = camera.screenToWorld(sx, sy);
  const cx = Math.floor(approx.wx);
  const cy = Math.floor(approx.wy);
  const radius = 14;

  let best: { x: number; y: number; depth: number } | null = null;

  const minX = Math.max(0, cx - radius);
  const maxX = Math.min(map.size - 1, cx + radius);
  const minY = Math.max(0, cy - radius);
  const maxY = Math.min(map.size - 1, cy + radius);

  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      const tile = map.get(x, y)!;
      if (!pointInTileDiamond(camera, sx, sy, x, y, tile.height)) continue;
      const depth = x + y;
      if (!best || depth >= best.depth) {
        best = { x, y, depth };
      }
    }
  }

  if (best) return { x: best.x, y: best.y };

  // Fallback: full-map scan near screen (handles bad approx / zoom extremes)
  for (let y = map.size - 1; y >= 0; y--) {
    for (let x = map.size - 1; x >= 0; x--) {
      const tile = map.get(x, y)!;
      const { sx: tx, sy: ty } = camera.worldToScreen(x, y, tile.height);
      if (Math.abs(tx - sx) > 48 * camera.zoom || Math.abs(ty - sy) > 48 * camera.zoom) {
        continue;
      }
      if (!pointInTileDiamond(camera, sx, sy, x, y, tile.height)) continue;
      return { x, y };
    }
  }

  // Last resort: clamped projection
  const x = Math.max(0, Math.min(map.size - 1, Math.round(approx.wx)));
  const y = Math.max(0, Math.min(map.size - 1, Math.round(approx.wy)));
  return { x, y };
}
