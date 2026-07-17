export interface BudgetState {
  funds: number;
  taxR: number;
  taxC: number;
  taxI: number;
  fundPolice: number;
  fundFire: number;
  fundHealth: number;
  fundEducation: number;
  fundTransit: number;
  lastIncome: number;
  lastExpenses: number;
  ordinances: {
    salesTax: boolean;
    legalizedGambling: boolean;
    pollutionControl: boolean;
    neighborhoodWatch: boolean;
  };
}

export function createBudget(funds: number): BudgetState {
  return {
    funds,
    taxR: 7,
    taxC: 7,
    taxI: 7,
    fundPolice: 100,
    fundFire: 100,
    fundHealth: 100,
    fundEducation: 100,
    fundTransit: 100,
    lastIncome: 0,
    lastExpenses: 0,
    ordinances: {
      salesTax: false,
      legalizedGambling: false,
      pollutionControl: false,
      neighborhoodWatch: false,
    },
  };
}

export interface CityTotals {
  rPop: number;
  cJobs: number;
  iJobs: number;
  policeCount: number;
  fireCount: number;
  hospitalCount: number;
  schoolCount: number;
  collegeCount: number;
  roadTiles: number;
  railTiles: number;
}

export function applyMonthlyBudget(budget: BudgetState, totals: CityTotals): void {
  const property =
    totals.rPop * budget.taxR * 0.08 +
    totals.cJobs * budget.taxC * 0.1 +
    totals.iJobs * budget.taxI * 0.09;

  let ordinanceIncome = 0;
  if (budget.ordinances.salesTax) ordinanceIncome += totals.cJobs * 0.15;
  if (budget.ordinances.legalizedGambling) ordinanceIncome += 20 + totals.rPop * 0.02;

  const income = property + ordinanceIncome;

  const policeCost = totals.policeCount * 12 * (budget.fundPolice / 100);
  const fireCost = totals.fireCount * 12 * (budget.fundFire / 100);
  const healthCost = totals.hospitalCount * 14 * (budget.fundHealth / 100);
  const eduCost =
    (totals.schoolCount * 8 + totals.collegeCount * 20) * (budget.fundEducation / 100);
  const transitCost =
    (totals.roadTiles * 0.05 + totals.railTiles * 0.12) * (budget.fundTransit / 100);

  let ordinanceCost = 0;
  if (budget.ordinances.pollutionControl) ordinanceCost += 30;
  if (budget.ordinances.neighborhoodWatch) ordinanceCost += 20;

  const expenses = policeCost + fireCost + healthCost + eduCost + transitCost + ordinanceCost;

  budget.lastIncome = Math.round(income);
  budget.lastExpenses = Math.round(expenses);
  budget.funds = Math.round(budget.funds + income - expenses);
}
