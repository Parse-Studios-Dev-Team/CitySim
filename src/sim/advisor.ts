import type { Simulation } from './Simulation';

export function advise(sim: Simulation): string {
  if (sim.scenario.won) return 'Victory! The papers will remember this administration.';
  if (sim.scenario.lost) return 'Bankruptcy. Cut spending, raise taxes, or start a new city.';

  if (sim.disasters.active === 'monster') {
    return 'A monster is loose! It will pass — then rebuild the wreckage.';
  }
  if (sim.disasters.active === 'fire') {
    return 'Fire in the city! Powered fire stations and funding put it out.';
  }
  if (sim.disasters.active === 'flood') {
    return 'The waterfront is flooding. Raise land or wait for the waters to recede.';
  }

  if (sim.stats.population === 0) {
    if (sim.stats.powerCapacity === 0) {
      return 'Start with a power plant, then zone land and pave roads.';
    }
    return 'Zone Residential next to roads and power — houses will follow demand.';
  }

  if (sim.stats.brownout) {
    return 'Blackouts! Build another plant or the city will stall.';
  }
  if (sim.stats.drought && sim.stats.population > 80) {
    return 'Water shortage. Place pumps by the river and run underground pipes.';
  }
  if (sim.budget.funds < 400) {
    return 'The treasury is thin. Pause building and watch the tax rates.';
  }
  if (sim.stats.happiness < 30) {
    return 'Citizens are furious. Cut pollution, fund police, and plant parks.';
  }

  if (sim.demand.r > 40 && sim.demand.r >= sim.demand.c && sim.demand.r >= sim.demand.i) {
    return 'Housing demand is booming — paint more Residential.';
  }
  if (sim.demand.c > 40) {
    return 'Shops want storefronts. Zone Commercial near your homes.';
  }
  if (sim.demand.i > 40) {
    return 'Industry is hiring. Zone Industrial downwind of houses.';
  }
  if (sim.demand.r < -25) {
    return 'Too many empty homes. Add jobs or lower residential tax.';
  }

  if (sim.stats.population > 200 && sim.stats.waterCapacity === 0) {
    return 'Dense growth needs water. Pumps, pipes, then towers.';
  }
  if (sim.stats.happiness >= 80) {
    return 'The city is thriving. Aim for the next civic reward.';
  }
  if (sim.rewards.pending.length) {
    return 'A civic reward is ready — place it from the toolbar.';
  }

  return 'Keep power, roads, and taxes in balance. The newspaper tells the rest.';
}
