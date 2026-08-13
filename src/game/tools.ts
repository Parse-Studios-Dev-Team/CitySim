import { BUILDINGS } from '../data/buildings';
import {
  BULLDOZE_COST,
  BUILDING_COST,
  PIPE_COST,
  POWER_LINE_COST,
  ROAD_COST,
  SUBWAY_COST,
  TERRAIN_COST,
  TREE_COST,
  WATER_PLACE_COST,
  ZONE_COST,
  toolCostLabel,
} from '../data/costs';
import type { BuildingKind, RoadType, ZoneType } from '../map/layers';

export type ToolId =
  | 'pan'
  | 'query'
  | 'bulldoze'
  | 'raise'
  | 'lower'
  | 'trees'
  | 'water'
  | 'r_light'
  | 'r_dense'
  | 'c_light'
  | 'c_dense'
  | 'i_light'
  | 'i_dense'
  | 'seaport'
  | 'airport'
  | 'road'
  | 'rail'
  | 'highway'
  | 'power_line'
  | 'coal_plant'
  | 'oil_plant'
  | 'nuclear_plant'
  | 'pipe'
  | 'subway'
  | 'pump'
  | 'water_tower'
  | 'treatment'
  | 'police'
  | 'fire'
  | 'hospital'
  | 'school'
  | 'college'
  | 'park'
  | 'stadium'
  | 'zoo'
  | 'museum'
  | 'library'
  | 'prison'
  | 'reward_city_hall'
  | 'reward_tv'
  | 'reward_rocket';

export interface ToolDef {
  id: ToolId;
  label: string;
  glyph: string;
  cost: number;
  group: 'nav' | 'terrain' | 'zone' | 'transit' | 'power' | 'water' | 'service' | 'reward';
  drag: boolean;
}

export const TOOL_CATEGORIES: Array<{
  id: Exclude<ToolDef['group'], 'reward'>;
  label: string;
  glyph: string;
}> = [
  { id: 'nav', label: 'Edit', glyph: '✥' },
  { id: 'zone', label: 'Zone', glyph: 'RCI' },
  { id: 'transit', label: 'Roads', glyph: '═' },
  { id: 'power', label: 'Power', glyph: '⚡' },
  { id: 'water', label: 'Water', glyph: '≈' },
  { id: 'service', label: 'Civic', glyph: '★' },
  { id: 'terrain', label: 'Land', glyph: '▲' },
];

export const TOOLS: ToolDef[] = [
  { id: 'pan', label: 'Pan', glyph: '✥', cost: 0, group: 'nav', drag: false },
  { id: 'query', label: 'Query', glyph: '?', cost: 0, group: 'nav', drag: false },
  { id: 'bulldoze', label: 'Bulldoze', glyph: '✖', cost: BULLDOZE_COST, group: 'nav', drag: true },
  { id: 'raise', label: 'Raise', glyph: '▲', cost: TERRAIN_COST, group: 'terrain', drag: true },
  { id: 'lower', label: 'Lower', glyph: '▼', cost: TERRAIN_COST, group: 'terrain', drag: true },
  { id: 'trees', label: 'Trees', glyph: '♣', cost: TREE_COST, group: 'terrain', drag: true },
  { id: 'water', label: 'Water', glyph: '≈', cost: WATER_PLACE_COST, group: 'terrain', drag: true },
  { id: 'r_light', label: 'R Light', glyph: 'R', cost: ZONE_COST.r_light, group: 'zone', drag: true },
  { id: 'r_dense', label: 'R Dense', glyph: 'R+', cost: ZONE_COST.r_dense, group: 'zone', drag: true },
  { id: 'c_light', label: 'C Light', glyph: 'C', cost: ZONE_COST.c_light, group: 'zone', drag: true },
  { id: 'c_dense', label: 'C Dense', glyph: 'C+', cost: ZONE_COST.c_dense, group: 'zone', drag: true },
  { id: 'i_light', label: 'I Light', glyph: 'I', cost: ZONE_COST.i_light, group: 'zone', drag: true },
  { id: 'i_dense', label: 'I Dense', glyph: 'I+', cost: ZONE_COST.i_dense, group: 'zone', drag: true },
  { id: 'seaport', label: 'Seaport', glyph: '⚓', cost: ZONE_COST.seaport, group: 'zone', drag: true },
  { id: 'airport', label: 'Airport', glyph: '✈', cost: ZONE_COST.airport, group: 'zone', drag: true },
  { id: 'road', label: 'Road', glyph: '═', cost: ROAD_COST.road, group: 'transit', drag: true },
  { id: 'rail', label: 'Rail', glyph: '╬', cost: ROAD_COST.rail, group: 'transit', drag: true },
  { id: 'highway', label: 'Highway', glyph: '≡', cost: ROAD_COST.highway, group: 'transit', drag: true },
  { id: 'subway', label: 'Subway', glyph: 'S', cost: SUBWAY_COST, group: 'transit', drag: true },
  { id: 'power_line', label: 'Power', glyph: '⚡', cost: POWER_LINE_COST, group: 'power', drag: true },
  {
    id: 'coal_plant',
    label: 'Coal',
    glyph: 'P',
    cost: BUILDING_COST.coal_plant!,
    group: 'power',
    drag: false,
  },
  {
    id: 'oil_plant',
    label: 'Oil',
    glyph: 'O',
    cost: BUILDING_COST.oil_plant!,
    group: 'power',
    drag: false,
  },
  {
    id: 'nuclear_plant',
    label: 'Nuke',
    glyph: 'N',
    cost: BUILDING_COST.nuclear_plant!,
    group: 'power',
    drag: false,
  },
  { id: 'pipe', label: 'Pipes', glyph: '⌀', cost: PIPE_COST, group: 'water', drag: true },
  { id: 'pump', label: 'Pump', glyph: 'W', cost: BUILDING_COST.pump!, group: 'water', drag: false },
  {
    id: 'water_tower',
    label: 'Tower',
    glyph: 'T',
    cost: BUILDING_COST.water_tower!,
    group: 'water',
    drag: false,
  },
  {
    id: 'treatment',
    label: 'Treat',
    glyph: 'Δ',
    cost: BUILDING_COST.treatment!,
    group: 'water',
    drag: false,
  },
  { id: 'police', label: 'Police', glyph: '★', cost: BUILDING_COST.police!, group: 'service', drag: false },
  { id: 'fire', label: 'Fire', glyph: '♨', cost: BUILDING_COST.fire!, group: 'service', drag: false },
  {
    id: 'hospital',
    label: 'Hospital',
    glyph: 'H',
    cost: BUILDING_COST.hospital!,
    group: 'service',
    drag: false,
  },
  { id: 'school', label: 'School', glyph: 'A', cost: BUILDING_COST.school!, group: 'service', drag: false },
  {
    id: 'college',
    label: 'College',
    glyph: 'U',
    cost: BUILDING_COST.college!,
    group: 'service',
    drag: false,
  },
  { id: 'park', label: 'Park', glyph: '♠', cost: BUILDING_COST.park!, group: 'service', drag: false },
  {
    id: 'stadium',
    label: 'Stadium',
    glyph: '◉',
    cost: BUILDING_COST.stadium!,
    group: 'service',
    drag: false,
  },
  { id: 'zoo', label: 'Zoo', glyph: 'Z', cost: BUILDING_COST.zoo!, group: 'service', drag: false },
  {
    id: 'museum',
    label: 'Museum',
    glyph: 'M',
    cost: BUILDING_COST.museum!,
    group: 'service',
    drag: false,
  },
  {
    id: 'library',
    label: 'Library',
    glyph: 'L',
    cost: BUILDING_COST.library!,
    group: 'service',
    drag: false,
  },
  {
    id: 'prison',
    label: 'Prison',
    glyph: '▣',
    cost: BUILDING_COST.prison!,
    group: 'service',
    drag: false,
  },
  {
    id: 'reward_city_hall',
    label: 'Hall',
    glyph: '♛',
    cost: 0,
    group: 'reward',
    drag: false,
  },
  { id: 'reward_tv', label: 'TV', glyph: '▤', cost: 0, group: 'reward', drag: false },
  { id: 'reward_rocket', label: 'Rocket', glyph: '⇈', cost: 0, group: 'reward', drag: false },
];

export function getTool(id: ToolId): ToolDef {
  return TOOLS.find((t) => t.id === id)!;
}

export function toolUnitCost(id: ToolId): number {
  return getTool(id).cost;
}

export function formatToolCost(id: ToolId): string {
  return toolCostLabel(toolUnitCost(id));
}

export function zoneForTool(id: ToolId): ZoneType | null {
  switch (id) {
    case 'r_light':
      return 'r_light';
    case 'r_dense':
      return 'r_dense';
    case 'c_light':
      return 'c_light';
    case 'c_dense':
      return 'c_dense';
    case 'i_light':
      return 'i_light';
    case 'i_dense':
      return 'i_dense';
    case 'seaport':
      return 'seaport';
    case 'airport':
      return 'airport';
    default:
      return null;
  }
}

export function roadForTool(id: ToolId): RoadType | null {
  switch (id) {
    case 'road':
      return 'road';
    case 'rail':
      return 'rail';
    case 'highway':
      return 'highway';
    default:
      return null;
  }
}

export function buildingForTool(id: ToolId): BuildingKind | null {
  switch (id) {
    case 'coal_plant':
      return 'coal_plant';
    case 'oil_plant':
      return 'oil_plant';
    case 'nuclear_plant':
      return 'nuclear_plant';
    case 'pump':
      return 'pump';
    case 'water_tower':
      return 'water_tower';
    case 'treatment':
      return 'treatment';
    case 'police':
      return 'police';
    case 'fire':
      return 'fire';
    case 'hospital':
      return 'hospital';
    case 'school':
      return 'school';
    case 'college':
      return 'college';
    case 'park':
      return 'park';
    case 'stadium':
      return 'stadium';
    case 'zoo':
      return 'zoo';
    case 'museum':
      return 'museum';
    case 'library':
      return 'library';
    case 'prison':
      return 'prison';
    case 'reward_city_hall':
      return 'city_hall';
    case 'reward_tv':
      return 'tv_station';
    case 'reward_rocket':
      return 'rocket';
    default:
      return null;
  }
}

export function buildingFootprint(kind: BuildingKind): { w: number; h: number } {
  const def = BUILDINGS[kind];
  return { w: def.width, h: def.height };
}
