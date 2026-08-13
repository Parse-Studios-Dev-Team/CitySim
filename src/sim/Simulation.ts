import { BUILDINGS } from '../data/buildings';
import type { TileMap } from '../map/TileMap';
import { applyMonthlyBudget, type BudgetState, type CityTotals } from './budget';
import { createCoverage, updateCoverage, type CoverageMaps } from './coverage';
import { computeDemand, type DemandState } from './demand';
import {
  createDisasterState,
  tickDisasters,
  type DisasterState,
} from './disasters';
import { growZones, updateRoadAccess } from './growth';
import { computeHappiness } from './mood';
import { updatePower } from './power';
import {
  checkScenario,
  type ScenarioRuntime,
} from './scenarios';
import { updateWater } from './water';

export type GameSpeed = 0 | 1 | 2 | 3;

export interface RewardsState {
  cityHall: boolean;
  tvStation: boolean;
  rocket: boolean;
  stadium: boolean;
  pending: Array<'city_hall' | 'tv_station' | 'rocket' | 'stadium'>;
}

export interface SimStats {
  population: number;
  jobs: number;
  powerCapacity: number;
  powerUsed: number;
  waterCapacity: number;
  waterUsed: number;
  happiness: number;
  brownout: boolean;
  drought: boolean;
}

export class Simulation {
  year: number;
  month: number;
  speed: GameSpeed = 1;
  demand: DemandState = { r: 0, c: 0, i: 0 };
  coverage: CoverageMaps;
  disasters: DisasterState;
  rewards: RewardsState = {
    cityHall: false,
    tvStation: false,
    rocket: false,
    stadium: false,
    pending: [],
  };
  scenario: ScenarioRuntime = { def: null, won: false, lost: false, message: null };
  newspaper: string[] = [];
  stats: SimStats = {
    population: 0,
    jobs: 0,
    powerCapacity: 0,
    powerUsed: 0,
    waterCapacity: 0,
    waterUsed: 0,
    happiness: 55,
    brownout: false,
    drought: false,
  };

  private acc = 0;

  map: TileMap;
  budget: BudgetState;

  constructor(map: TileMap, budget: BudgetState, year = 1900) {
    this.map = map;
    this.budget = budget;
    this.year = year;
    this.month = 1;
    this.coverage = createCoverage(map.size);
    this.disasters = createDisasterState();
  }

  setMap(map: TileMap): void {
    this.map = map;
    this.coverage = createCoverage(map.size);
  }

  tick(dtMs: number): boolean {
    if (this.speed === 0) return false;
    const interval = this.speed === 1 ? 1600 : this.speed === 2 ? 700 : 280;
    this.acc += dtMs;
    let stepped = false;
    while (this.acc >= interval) {
      this.acc -= interval;
      this.stepMonth();
      stepped = true;
    }
    return stepped;
  }

  stepMonth(): void {
    updateRoadAccess(this.map);
    const power = updatePower(this.map);
    const water = updateWater(this.map);
    updateCoverage(this.map, this.coverage, this.budget);
    this.demand = computeDemand(this.map, this.budget);
    const growth = growZones(this.map, this.demand, this.coverage);

    const totals = this.collectTotals();
    applyMonthlyBudget(this.budget, totals);

    this.stats = {
      population: totals.rPop,
      jobs: totals.cJobs + totals.iJobs,
      powerCapacity: power.capacity,
      powerUsed: power.supplied,
      waterCapacity: water.capacity,
      waterUsed: water.used,
      happiness: 50,
      brownout: power.brownout,
      drought: water.drought,
    };
    this.stats.happiness = computeHappiness(this.map, this.coverage, this.budget, this.stats);

    if (power.brownout && Math.random() < 0.45) {
      this.pushNews('Blackouts sweep the grid — build more generating capacity.');
    }
    if (water.drought && Math.random() < 0.4) {
      this.pushNews('Taps run dry in the outer districts.');
    }

    this.disasters = tickDisasters(
      this.map,
      this.coverage,
      this.disasters,
      this.stats.population,
    );
    if (this.disasters.message) {
      this.pushNews(this.disasters.message);
    }

    this.checkRewards();
    this.scenario = checkScenario(this.scenario, this.stats.population, this.budget.funds);
    if (this.scenario.message) {
      this.pushNews(this.scenario.message);
    }

    if (growth.grew > 0 && Math.random() < 0.3) {
      this.pushNews(`Developers break ground on ${growth.grew} new sites.`);
    }
    if (growth.abandoned > 0) {
      this.pushNews(`${growth.abandoned} buildings abandoned this month.`);
    }

    this.month++;
    if (this.month > 12) {
      this.month = 1;
      this.year++;
      this.pushNews(
        `Year ${this.year} begins. Treasury: $${this.budget.funds.toLocaleString()}. Approval: ${this.stats.happiness}%.`,
      );
    }
  }

  collectTotals(): CityTotals {
    const totals: CityTotals = {
      rPop: 0,
      cJobs: 0,
      iJobs: 0,
      policeCount: 0,
      fireCount: 0,
      hospitalCount: 0,
      schoolCount: 0,
      collegeCount: 0,
      roadTiles: 0,
      railTiles: 0,
    };

    this.map.forEach((t) => {
      if (t.zone === 'r_light' || t.zone === 'r_dense') totals.rPop += t.population;
      if (t.zone === 'c_light' || t.zone === 'c_dense') totals.cJobs += t.population;
      if (t.zone === 'i_light' || t.zone === 'i_dense') totals.iJobs += t.population;
      if (t.footprint) {
        if (t.road === 'road' || t.road === 'highway') totals.roadTiles++;
        if (t.road === 'rail') totals.railTiles++;
        return;
      }
      if (t.building === 'police') totals.policeCount++;
      if (t.building === 'fire') totals.fireCount++;
      if (t.building === 'hospital') totals.hospitalCount++;
      if (t.building === 'school') totals.schoolCount++;
      if (t.building === 'college') totals.collegeCount++;
      if (t.road === 'road' || t.road === 'highway') totals.roadTiles++;
      if (t.road === 'rail') totals.railTiles++;
      const def = BUILDINGS[t.building];
      if (def.jobs > 0 && t.zone === 'none') {
        totals.cJobs += Math.round(def.jobs * 0.5);
      }
    });

    return totals;
  }

  checkRewards(): void {
    const pop = this.stats.population;
    if (!this.rewards.cityHall && pop >= 500) {
      this.rewards.cityHall = true;
      this.rewards.pending.push('city_hall');
      this.pushNews('Citizens demand a City Hall! Reward unlocked.');
    }
    if (!this.rewards.stadium && pop >= 1000) {
      this.rewards.stadium = true;
      this.rewards.pending.push('stadium');
      this.pushNews('A Stadium is available as a civic reward!');
    }
    if (!this.rewards.tvStation && pop >= 1500) {
      this.rewards.tvStation = true;
      this.rewards.pending.push('tv_station');
      this.pushNews('TV Station reward unlocked!');
    }
    if (!this.rewards.rocket && pop >= 2500) {
      this.rewards.rocket = true;
      this.rewards.pending.push('rocket');
      this.pushNews('Rocket Launch facility unlocked!');
    }
  }

  pushNews(line: string): void {
    this.newspaper.unshift(line);
    if (this.newspaper.length > 40) this.newspaper.length = 40;
  }

  dateLabel(): string {
    const months = [
      'Jan',
      'Feb',
      'Mar',
      'Apr',
      'May',
      'Jun',
      'Jul',
      'Aug',
      'Sep',
      'Oct',
      'Nov',
      'Dec',
    ];
    return `${months[this.month - 1]} ${this.year}`;
  }
}
