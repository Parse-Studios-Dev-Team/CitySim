import type { TileMap } from '../map/TileMap';
import { isCZone, isIZone, isRZone } from '../map/layers';
import type { BudgetState } from './budget';

export interface DemandState {
  r: number;
  c: number;
  i: number;
}

export function computeDemand(map: TileMap, budget: BudgetState): DemandState {
  let rPop = 0;
  let cJobs = 0;
  let iJobs = 0;
  let rZones = 0;
  let cZones = 0;
  let iZones = 0;
  let rBuilt = 0;
  let cBuilt = 0;
  let iBuilt = 0;
  let avgLand = 0;
  let tiles = 0;
  let pollution = 0;
  let seaports = 0;
  let airports = 0;

  map.forEach((t) => {
    if (isRZone(t.zone)) {
      rZones++;
      if (t.building !== 'none' && t.building !== 'abandoned') rBuilt++;
      rPop += t.population;
    }
    if (isCZone(t.zone)) {
      cZones++;
      if (t.building !== 'none' && t.building !== 'abandoned') cBuilt++;
      cJobs += t.population;
    }
    if (isIZone(t.zone)) {
      iZones++;
      if (t.building !== 'none' && t.building !== 'abandoned') iBuilt++;
      iJobs += t.population;
    }
    if (t.zone === 'seaport') seaports++;
    if (t.zone === 'airport') airports++;
    if (t.zone !== 'none') {
      avgLand += t.landValue;
      pollution += t.pollution;
      tiles++;
    }
  });

  avgLand = tiles ? avgLand / tiles : 50;
  const avgPol = tiles ? pollution / tiles : 0;
  const taxPenalty = (budget.taxR + budget.taxC + budget.taxI) / 3 - 7;
  const jobs = cJobs + iJobs;
  const jobRatio = rPop === 0 ? 1 : jobs / Math.max(1, rPop);

  let r = 0;
  let c = 0;
  let i = 0;

  // Residential wants jobs and low pollution
  r = clamp((jobRatio - 0.6) * 40 + (50 - avgPol) * 0.4 - taxPenalty * 3, -100, 100);
  if (rZones === 0) r = 40;
  if (rZones > 0 && rBuilt / rZones > 0.85 && r > 0) r *= 0.4;

  // Commercial wants residents nearby
  c = clamp((rPop / 40) - cJobs * 0.3 - taxPenalty * 2 + (avgLand - 50) * 0.3, -100, 100);
  if (cZones === 0 && rPop > 20) c = 35;
  if (airports > 0) c += 12;
  if (seaports > 0) c += 6;
  if (cZones > 0 && cBuilt / cZones > 0.85 && c > 0) c *= 0.4;

  // Industry early-game demand, hurt by high taxes
  i = clamp(55 - iJobs * 0.25 - taxPenalty * 2.5 - avgPol * 0.15, -100, 100);
  if (seaports > 0) i += 14;
  if (iZones === 0) i = 50;
  if (rPop > 100) i -= 10;
  if (iZones > 0 && iBuilt / iZones > 0.85 && i > 0) i *= 0.4;

  return {
    r: Math.round(r),
    c: Math.round(c),
    i: Math.round(i),
  };
}

function clamp(n: number, a: number, b: number): number {
  return Math.max(a, Math.min(b, n));
}
