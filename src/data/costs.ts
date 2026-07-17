import type { BuildingKind, RoadType, ZoneType } from '../map/layers';

export const STARTING_FUNDS = 20000;

export const ZONE_COST: Record<ZoneType, number> = {
  none: 0,
  r_light: 10,
  r_dense: 20,
  c_light: 10,
  c_dense: 20,
  i_light: 10,
  i_dense: 20,
  seaport: 50,
  airport: 100,
};

export const ROAD_COST: Record<RoadType, number> = {
  none: 0,
  road: 10,
  rail: 25,
  highway: 50,
};

export const BUILDING_COST: Partial<Record<BuildingKind, number>> = {
  coal_plant: 3000,
  oil_plant: 4400,
  nuclear_plant: 15000,
  police: 500,
  fire: 500,
  hospital: 500,
  school: 250,
  college: 1000,
  park: 25,
  pump: 100,
  water_tower: 250,
  treatment: 500,
  stadium: 3000,
  zoo: 3000,
  museum: 1000,
  library: 500,
  prison: 3000,
  city_hall: 0,
  tv_station: 0,
  rocket: 0,
};

export const POWER_LINE_COST = 2;
export const PIPE_COST = 3;
export const SUBWAY_COST = 100;
export const BULLDOZE_COST = 1;
export const TREE_COST = 3;
export const TERRAIN_COST = 25;
export const WATER_PLACE_COST = 50;

export function toolCostLabel(cost: number): string {
  if (cost <= 0) return '';
  return `$${cost}`;
}
