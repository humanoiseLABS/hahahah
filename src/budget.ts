export type BudgetSpec = {
  target: number;
  hardCap: number;
};

export type BudgetStatus = 'ok' | 'warning' | 'error';

export type BudgetResult = BudgetSpec & {
  tokens: number;
  status: BudgetStatus;
};

export function evaluateBudget(spec: BudgetSpec, tokens: number): BudgetResult {
  let status: BudgetStatus = 'ok';
  if (tokens > spec.hardCap) {
    status = 'error';
  } else if (tokens > spec.target) {
    status = 'warning';
  }
  return { ...spec, tokens, status };
}
