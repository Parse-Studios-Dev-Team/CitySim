export type StreetEra = 'horse' | 'brass' | 'interwar' | 'motor' | 'modern' | 'future';

export type LandTraffic = 'wagon' | 'carriage' | 'car';

export type RoadKind = 'road' | 'highway' | 'rail';

export interface RoadSurface {
  fill: string;
  curb: string;
  mark: string;
  texture: 'dirt' | 'cobble' | 'asphalt' | 'future';
}

/** Ford Model T lands in 1908. Before that, streets are horses and wagons. */
export const AUTOMOBILE_YEAR = 1908;

/** Scheduled passenger flight is a 1920s phenomenon. */
export const AEROPLANE_YEAR = 1920;

/** Painted center lines become common on American streets in the mid-1920s. */
export const LANE_PAINT_YEAR = 1924;

export function streetEra(year: number): StreetEra {
  const y = Number.isFinite(year) ? year : 1900;
  if (y < AUTOMOBILE_YEAR) return 'horse';
  if (y < 1920) return 'brass';
  if (y < 1940) return 'interwar';
  if (y < 1970) return 'motor';
  if (y < 2100) return 'modern';
  return 'future';
}

export function automobilesExist(year: number): boolean {
  return year >= AUTOMOBILE_YEAR;
}

export function aeroplanesExist(year: number): boolean {
  return year >= AEROPLANE_YEAR;
}

export function paintedLaneLines(year: number): boolean {
  return year >= LANE_PAINT_YEAR;
}

export function pickLandTraffic(year: number, roll: number): LandTraffic {
  const u = ((roll % 1) + 1) % 1;
  const era = streetEra(year);
  switch (era) {
    case 'horse':
      return u < 0.38 ? 'carriage' : 'wagon';
    case 'brass':
      if (u < 0.1) return 'car';
      return u < 0.42 ? 'carriage' : 'wagon';
    case 'interwar':
      if (u < 0.78) return 'car';
      return u < 0.9 ? 'carriage' : 'wagon';
    case 'motor':
    case 'modern':
    case 'future':
      return 'car';
    default: {
      const _exhaustive: never = era;
      return _exhaustive;
    }
  }
}

export function landTrafficCap(year: number, roads: number, pop: number): number {
  if (pop < 12 || roads < 8) return 0;
  const bySize = Math.max(1, Math.floor(roads / 18) + Math.floor(pop / 220));
  const era = streetEra(year);
  switch (era) {
    case 'horse':
      return Math.min(5, bySize);
    case 'brass':
      return Math.min(6, bySize);
    case 'interwar':
      return Math.min(8, bySize);
    case 'motor':
      return Math.min(10, bySize);
    case 'modern':
      return Math.min(12, bySize);
    case 'future':
      return Math.min(10, bySize);
    default: {
      const _exhaustive: never = era;
      return _exhaustive;
    }
  }
}

export function roadSurface(year: number, kind: RoadKind): RoadSurface {
  if (kind === 'rail') {
    return {
      fill: '#7a6a52',
      curb: '#4a3c2c',
      mark: '#3a3028',
      texture: 'dirt',
    };
  }

  const era = streetEra(year);
  const highway = kind === 'highway';
  switch (era) {
    case 'horse':
      return {
        fill: highway ? '#6a5c48' : '#7a6a50',
        curb: '#4a3e30',
        mark: '#4a3828',
        texture: 'dirt',
      };
    case 'brass':
      return {
        fill: highway ? '#5e5648' : '#6a6254',
        curb: '#3e382e',
        mark: '#4a4438',
        texture: 'cobble',
      };
    case 'interwar':
      return {
        fill: highway ? '#4e4c48' : '#58564e',
        curb: '#32302c',
        mark: highway ? '#e8c547' : '#c8c4b0',
        texture: 'asphalt',
      };
    case 'motor':
    case 'modern':
      return {
        fill: highway ? '#3e4048' : '#4a4a4c',
        curb: '#2a2a2c',
        mark: highway ? '#e8c547' : '#d0d0d0',
        texture: 'asphalt',
      };
    case 'future':
      return {
        fill: highway ? '#2e3644' : '#3a4250',
        curb: '#1a222c',
        mark: '#7ec8e0',
        texture: 'future',
      };
    default: {
      const _exhaustive: never = era;
      return _exhaustive;
    }
  }
}
