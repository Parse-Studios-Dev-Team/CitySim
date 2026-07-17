export const MAP_SIZE = 64;

export type ZoneType =
  | 'none'
  | 'r_light'
  | 'r_dense'
  | 'c_light'
  | 'c_dense'
  | 'i_light'
  | 'i_dense'
  | 'seaport'
  | 'airport';

export type BuildingKind =
  | 'none'
  | 'house'
  | 'apartment'
  | 'shop'
  | 'office'
  | 'factory'
  | 'warehouse'
  | 'coal_plant'
  | 'oil_plant'
  | 'nuclear_plant'
  | 'police'
  | 'fire'
  | 'hospital'
  | 'school'
  | 'college'
  | 'park'
  | 'pump'
  | 'water_tower'
  | 'treatment'
  | 'city_hall'
  | 'tv_station'
  | 'rocket'
  | 'stadium'
  | 'zoo'
  | 'museum'
  | 'library'
  | 'prison'
  | 'abandoned';

export type RoadType = 'none' | 'road' | 'rail' | 'highway';

export type OverlayMode =
  | 'none'
  | 'power'
  | 'water'
  | 'pollution'
  | 'landValue'
  | 'crime'
  | 'traffic';

export type ViewLayer = 'surface' | 'underground';

export interface Tile {
  height: number;
  water: boolean;
  trees: boolean;
  zone: ZoneType;
  building: BuildingKind;
  buildingStage: number;
  /** True when this tile is a non-origin cell of a multi-tile building */
  footprint: boolean;
  road: RoadType;
  powerLine: boolean;
  pipe: boolean;
  subway: boolean;
  onFire: boolean;
  flooded: boolean;
  powered: boolean;
  watered: boolean;
  roadAccess: boolean;
  pollution: number;
  landValue: number;
  crime: number;
  traffic: number;
  population: number;
}

export function createEmptyTile(height = 2): Tile {
  return {
    height,
    water: false,
    trees: false,
    zone: 'none',
    building: 'none',
    buildingStage: 0,
    footprint: false,
    road: 'none',
    powerLine: false,
    pipe: false,
    subway: false,
    onFire: false,
    flooded: false,
    powered: false,
    watered: false,
    roadAccess: false,
    pollution: 0,
    landValue: 50,
    crime: 0,
    traffic: 0,
    population: 0,
  };
}

export function isRZone(z: ZoneType): boolean {
  return z === 'r_light' || z === 'r_dense';
}

export function isCZone(z: ZoneType): boolean {
  return z === 'c_light' || z === 'c_dense';
}

export function isIZone(z: ZoneType): boolean {
  return z === 'i_light' || z === 'i_dense';
}

export function isDenseZone(z: ZoneType): boolean {
  return z === 'r_dense' || z === 'c_dense' || z === 'i_dense';
}

export function isZone(z: ZoneType): boolean {
  return z !== 'none';
}

export function isPowerPlant(b: BuildingKind): boolean {
  return b === 'coal_plant' || b === 'oil_plant' || b === 'nuclear_plant';
}

export function isServiceBuilding(b: BuildingKind): boolean {
  switch (b) {
    case 'police':
    case 'fire':
    case 'hospital':
    case 'school':
    case 'college':
    case 'park':
    case 'stadium':
    case 'zoo':
    case 'museum':
    case 'library':
    case 'prison':
    case 'city_hall':
    case 'tv_station':
    case 'rocket':
      return true;
    case 'none':
    case 'house':
    case 'apartment':
    case 'shop':
    case 'office':
    case 'factory':
    case 'warehouse':
    case 'coal_plant':
    case 'oil_plant':
    case 'nuclear_plant':
    case 'pump':
    case 'water_tower':
    case 'treatment':
    case 'abandoned':
      return false;
    default: {
      const _exhaustive: never = b;
      return _exhaustive;
    }
  }
}

export function zoneCategory(z: ZoneType): 'R' | 'C' | 'I' | null {
  if (isRZone(z)) return 'R';
  if (isCZone(z)) return 'C';
  if (isIZone(z)) return 'I';
  return null;
}
