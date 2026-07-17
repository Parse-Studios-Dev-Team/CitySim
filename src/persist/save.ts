import { TileMap } from '../map/TileMap';
import { createBudget, type BudgetState } from '../sim/budget';
import type { DisasterState } from '../sim/disasters';
import type { RewardsState } from '../sim/Simulation';
import type { ScenarioRuntime } from '../sim/scenarios';
import { SCENARIOS } from '../sim/scenarios';

const SAVE_KEY = 'citysim.save.v1';

export interface SaveData {
  version: 1;
  cityName: string;
  year: number;
  month: number;
  map: ReturnType<TileMap['serialize']>;
  budget: BudgetState;
  disasters: DisasterState;
  rewards: RewardsState;
  newspaper: string[];
  scenarioId: string | null;
  scenarioWon: boolean;
  scenarioLost: boolean;
}

export function saveCity(data: SaveData): void {
  localStorage.setItem(SAVE_KEY, JSON.stringify(data));
}

export function loadCity(): SaveData | null {
  const raw = localStorage.getItem(SAVE_KEY);
  if (!raw) return null;
  try {
    const data = JSON.parse(raw) as SaveData;
    if (data.version !== 1) return null;
    return data;
  } catch {
    return null;
  }
}

export function hasSave(): boolean {
  return localStorage.getItem(SAVE_KEY) != null;
}

export function exportCity(data: SaveData): string {
  return JSON.stringify(data, null, 2);
}

export function importCity(json: string): SaveData | null {
  try {
    const data = JSON.parse(json) as SaveData;
    if (data.version !== 1) return null;
    return data;
  } catch {
    return null;
  }
}

export function hydrateFromSave(data: SaveData): {
  map: TileMap;
  budget: BudgetState;
  year: number;
  month: number;
  disasters: DisasterState;
  rewards: RewardsState;
  newspaper: string[];
  scenario: ScenarioRuntime;
  cityName: string;
} {
  const map = TileMap.deserialize(data.map as { size: number; tiles: never[] });
  const budget = { ...createBudget(0), ...data.budget };
  const scenarioDef = data.scenarioId
    ? SCENARIOS.find((s) => s.id === data.scenarioId) ?? null
    : null;
  return {
    map,
    budget,
    year: data.year,
    month: data.month,
    disasters: data.disasters,
    rewards: data.rewards,
    newspaper: data.newspaper ?? [],
    scenario: {
      def: scenarioDef,
      won: data.scenarioWon,
      lost: data.scenarioLost,
      message: null,
    },
    cityName: data.cityName,
  };
}
