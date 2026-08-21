/**
 * Headless smoke test for core simulation loop.
 * Run: node scripts/smoke-sim.mjs
 * Uses dynamic import of built chunks is awkward; instead duplicates a minimal check via vite-node-less logic.
 * This script launches a tiny inline validation by spawning the TypeScript through vite-node alternative:
 * we re-implement a minimal placement sequence against the source via tsx if available, else skip.
 */

import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';

const entry = `
import { TileMap } from '../src/map/TileMap.ts';
import { createBudget } from '../src/sim/budget.ts';
import { Simulation } from '../src/sim/Simulation.ts';
import {
  automobilesExist,
  aeroplanesExist,
  landTrafficCap,
  paintedLaneLines,
  pickLandTraffic,
  roadSurface,
  streetEra,
} from '../src/render/era.ts';

const map = new TileMap(32);
map.clearDeveloped();
// flatten center
for (let y = 10; y < 20; y++) for (let x = 10; x < 20; x++) {
  const t = map.get(x,y); t.water=false; t.height=2; t.trees=false;
}
map.placeBuilding(10, 10, 'coal_plant', 2, 2);
for (let x = 12; x < 18; x++) { map.get(x,10).powerLine = true; map.get(x,11).powerLine = true; }
map.setZoneRect(12, 12, 16, 16, 'r_light');
map.setZoneRect(12, 17, 16, 18, 'c_light');
map.setZoneRect(17, 12, 18, 16, 'i_light');
for (let x = 12; x <= 18; x++) map.paintRoad(x, 11, 'road');
for (let y = 12; y <= 18; y++) map.paintRoad(11, y, 'road');

if (streetEra(1901) !== 'horse' || automobilesExist(1901) || aeroplanesExist(1901)) {
  console.error('FAIL: 1901 must be a horse-and-wagon street, no cars or planes');
  process.exit(1);
}
if (pickLandTraffic(1901, 0.01) === 'car' || pickLandTraffic(1901, 0.99) === 'car') {
  console.error('FAIL: 1901 traffic rolled a car');
  process.exit(1);
}
if (landTrafficCap(1901, 40, 0) !== 0) {
  console.error('FAIL: empty 1901 lots should have no traffic');
  process.exit(1);
}
if (landTrafficCap(1901, 40, 80) <= 0 || landTrafficCap(1901, 40, 80) > 5) {
  console.error('FAIL: 1901 traffic cap should be a handful of wagons');
  process.exit(1);
}
if (paintedLaneLines(1901) || roadSurface(1901, 'road').texture !== 'dirt') {
  console.error('FAIL: 1901 streets should be packed dirt, not painted asphalt');
  process.exit(1);
}
if (!automobilesExist(1908) || pickLandTraffic(1962, 0.2) !== 'car') {
  console.error('FAIL: later years should allow automobiles');
  process.exit(1);
}

const sim = new Simulation(map, createBudget(50000), 1900);
for (let i = 0; i < 36; i++) sim.stepMonth();
if (sim.stats.population <= 0) {
  console.error('FAIL: expected population growth, got', sim.stats.population);
  process.exit(1);
}
if (sim.budget.funds === 50000) {
  console.error('FAIL: budget did not change');
  process.exit(1);
}
console.log('OK pop=', sim.stats.population, 'funds=', sim.budget.funds, 'demand=', sim.demand);
`;

import { writeFileSync, unlinkSync } from 'node:fs';
const tmp = 'scripts/_smoke_tmp.mts';
writeFileSync(tmp, entry);

// Prefer npx tsx
const r = spawnSync('npx', ['--yes', 'tsx', tmp], { encoding: 'utf8', cwd: process.cwd() });
unlinkSync(tmp);
process.stdout.write(r.stdout || '');
process.stderr.write(r.stderr || '');
if (r.status !== 0) process.exit(r.status ?? 1);
