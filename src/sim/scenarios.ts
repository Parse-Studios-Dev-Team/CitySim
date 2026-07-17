import { STARTING_FUNDS } from '../data/costs';
import { TileMap } from '../map/TileMap';
import { createBudget, type BudgetState } from './budget';

export interface ScenarioDef {
  id: string;
  title: string;
  description: string;
  year: number;
  funds: number;
  goal: string;
  winPop?: number;
  winFunds?: number;
  winMonths?: number;
  loseFunds?: number;
  prepare: (map: TileMap, budget: BudgetState) => void;
}

export const SCENARIOS: ScenarioDef[] = [
  {
    id: 'training',
    title: 'Training',
    description: 'Learn the ropes. Grow a small town to 500 citizens.',
    year: 1900,
    funds: STARTING_FUNDS,
    goal: 'Reach 500 population',
    winPop: 500,
    prepare: (map) => {
      map.generateTerrain(42);
    },
  },
  {
    id: 'megalopolis',
    title: 'Megalopolis',
    description: 'Build a true metropolis — 5,000 residents.',
    year: 1950,
    funds: 30000,
    goal: 'Reach 5,000 population',
    winPop: 5000,
    prepare: (map) => {
      map.generateTerrain(99);
    },
  },
  {
    id: 'global_warming',
    title: 'Global Warming',
    description: 'Flooding is worse. Keep the city afloat and hit 2,000 pop.',
    year: 2000,
    funds: 25000,
    goal: 'Reach 2,000 population despite floods',
    winPop: 2000,
    prepare: (map) => {
      map.generateTerrain(7);
      map.forEach((t) => {
        if (t.height <= 1 && Math.random() < 0.2) {
          t.water = true;
          t.height = 0;
        }
      });
    },
  },
  {
    id: 'retirement',
    title: 'Retirement City',
    description: 'A quiet community — reach 1,500 pop with strong land value.',
    year: 1975,
    funds: 22000,
    goal: 'Reach 1,500 population',
    winPop: 1500,
    prepare: (map) => {
      map.generateTerrain(1234);
    },
  },
  {
    id: 'space',
    title: 'Space',
    description: 'Fund the future. Unlock the rocket and keep 3,000 citizens.',
    year: 1999,
    funds: 40000,
    goal: 'Reach 3,000 population (rocket unlocks at 2,500)',
    winPop: 3000,
    prepare: (map) => {
      map.generateTerrain(2001);
    },
  },
];

export interface ScenarioRuntime {
  def: ScenarioDef | null;
  won: boolean;
  lost: boolean;
  message: string | null;
}

export function startScenario(id: string): {
  map: TileMap;
  budget: BudgetState;
  year: number;
  runtime: ScenarioRuntime;
} | null {
  const def = SCENARIOS.find((s) => s.id === id);
  if (!def) return null;
  const map = new TileMap();
  const budget = createBudget(def.funds);
  def.prepare(map, budget);
  return {
    map,
    budget,
    year: def.year,
    runtime: { def, won: false, lost: false, message: null },
  };
}

export function checkScenario(
  runtime: ScenarioRuntime,
  population: number,
  funds: number,
): ScenarioRuntime {
  if (!runtime.def || runtime.won || runtime.lost) return runtime;
  const d = runtime.def;
  if (d.loseFunds !== undefined && funds < d.loseFunds) {
    return { ...runtime, lost: true, message: 'The city went bankrupt. Scenario failed.' };
  }
  if (d.winPop !== undefined && population >= d.winPop) {
    return { ...runtime, won: true, message: `Victory! ${d.title} complete.` };
  }
  if (d.winFunds !== undefined && funds >= d.winFunds) {
    return { ...runtime, won: true, message: `Victory! ${d.title} complete.` };
  }
  return runtime;
}
