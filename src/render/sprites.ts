import type { BuildingKind, ZoneType } from '../map/layers';

export const PALETTE = {
  grass: '#3d7a52',
  grassDark: '#2f6040',
  grassLight: '#4e9464',
  dirt: '#6b5335',
  water: '#3a7ca5',
  waterDeep: '#2a5f80',
  waterLite: '#5aa0c4',
  road: '#5a5a5a',
  roadLine: '#c8c8c8',
  rail: '#8a7048',
  highway: '#4a4a55',
  power: '#e8c547',
  pipe: '#6aa0c8',
  tree: '#2d6b3a',
  treeTop: '#4c9a58',
  zoneR: 'rgba(74, 158, 92, 0.55)',
  zoneC: 'rgba(74, 126, 196, 0.55)',
  zoneI: 'rgba(196, 160, 58, 0.55)',
  zoneSea: 'rgba(58, 124, 165, 0.45)',
  zoneAir: 'rgba(180, 180, 200, 0.45)',
  house: '#c4a35a',
  apartment: '#8a9aa8',
  shop: '#d4843a',
  office: '#6b8cbe',
  factory: '#8a6a4a',
  warehouse: '#7a7058',
  plant: '#6a6a6a',
  plantAccent: '#c44b4b',
  nuclear: '#6bcf7a',
  service: '#d0d8e0',
  park: '#5cb86e',
  fire: '#e07040',
  abandoned: '#5a5048',
  reward: '#e8c547',
  roof: '#8b3a3a',
  roofDark: '#5c2a2a',
  chimney: '#6a5040',
  window: '#2a3a48',
  windowLit: '#f0d878',
  awning: '#c44b4b',
  field: '#5a9e4a',
  concrete: '#9aa4ae',
  steel: '#7a8894',
  gold: '#e8c547',
  nightNavy: '#0a1020',
};

export function shade(hex: string, amt: number): string {
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

export function mixHex(a: string, b: string, t: number): string {
  const pa = parseHex(a);
  const pb = parseHex(b);
  if (!pa || !pb) return a;
  const u = Math.max(0, Math.min(1, t));
  const r = Math.round(pa.r + (pb.r - pa.r) * u);
  const g = Math.round(pa.g + (pb.g - pa.g) * u);
  const bch = Math.round(pa.b + (pb.b - pa.b) * u);
  return `rgb(${r},${g},${bch})`;
}

function parseHex(hex: string): { r: number; g: number; b: number } | null {
  const c = hex.replace('#', '');
  if (c.length !== 6) return null;
  const num = parseInt(c, 16);
  return { r: (num >> 16) & 0xff, g: (num >> 8) & 0xff, b: num & 0xff };
}

export function tileHash(x: number, y: number): number {
  const n = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return n - Math.floor(n);
}

export function zoneColor(zone: ZoneType): string | null {
  switch (zone) {
    case 'r_light':
    case 'r_dense':
      return PALETTE.zoneR;
    case 'c_light':
    case 'c_dense':
      return PALETTE.zoneC;
    case 'i_light':
    case 'i_dense':
      return PALETTE.zoneI;
    case 'seaport':
      return PALETTE.zoneSea;
    case 'airport':
      return PALETTE.zoneAir;
    case 'none':
      return null;
    default: {
      const _exhaustive: never = zone;
      return _exhaustive;
    }
  }
}

export function buildingFill(kind: BuildingKind): string {
  switch (kind) {
    case 'house':
      return PALETTE.house;
    case 'apartment':
      return PALETTE.apartment;
    case 'shop':
      return PALETTE.shop;
    case 'office':
      return PALETTE.office;
    case 'factory':
      return PALETTE.factory;
    case 'warehouse':
      return PALETTE.warehouse;
    case 'coal_plant':
    case 'oil_plant':
      return PALETTE.plant;
    case 'nuclear_plant':
      return PALETTE.nuclear;
    case 'police':
    case 'fire':
    case 'hospital':
    case 'school':
    case 'college':
    case 'library':
    case 'museum':
    case 'prison':
    case 'stadium':
      return PALETTE.service;
    case 'park':
    case 'zoo':
      return PALETTE.park;
    case 'pump':
    case 'water_tower':
    case 'treatment':
      return PALETTE.waterLite;
    case 'city_hall':
    case 'tv_station':
    case 'rocket':
      return PALETTE.reward;
    case 'abandoned':
      return PALETTE.abandoned;
    case 'none':
      return PALETTE.dirt;
    default: {
      const _exhaustive: never = kind;
      return _exhaustive;
    }
  }
}

export function buildingHeightPx(kind: BuildingKind, stage: number): number {
  const base: Record<BuildingKind, number> = {
    none: 0,
    house: 14,
    apartment: 28,
    shop: 16,
    office: 32,
    factory: 20,
    warehouse: 16,
    coal_plant: 24,
    oil_plant: 26,
    nuclear_plant: 30,
    police: 18,
    fire: 18,
    hospital: 20,
    school: 16,
    college: 22,
    park: 6,
    pump: 12,
    water_tower: 22,
    treatment: 16,
    city_hall: 26,
    tv_station: 28,
    rocket: 34,
    stadium: 18,
    zoo: 14,
    museum: 16,
    library: 14,
    prison: 20,
    abandoned: 10,
  };
  return base[kind] + Math.max(0, stage - 1) * 3;
}
