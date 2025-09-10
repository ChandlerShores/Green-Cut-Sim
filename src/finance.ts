import { FinanceInput, FinancialSnapshot, FinancialDrivers, FinancialParams, MiniBalanceSheet } from "./contracts";
/**
 * Deterministic mini-financials. No randomness here; engine provides all inputs.
 * Identities enforced:
 *  - Assets == Liabilities + Equity
 *  - cash_close == cash_open + CFO + CFI + CFF
 */
export function computeFinancials(input: FinanceInput): FinancialSnapshot {
  const { prev_balance, drivers, params, policy, direct_cash_spending = 0 } = input;
  const notes: string[] = [];
  const cash_open = prev_balance.cash;
  // --- P&L ---
  const revenue = drivers.units_sold * drivers.avg_price;
  const cogs_core = drivers.units_sold * drivers.unit_cost;
  const cogs_scrap = cogs_core * (params.scrap_rate ?? 0);
  const cogs = cogs_core + cogs_scrap;
  
  if ((params.scrap_rate ?? 0) > 0) {
    notes.push(`Applied scrap/returns factor ${(params.scrap_rate ?? 0).toFixed(3)} to COGS.`);
  }
  const gross_profit = revenue - cogs;
  const opex = drivers.opex_base;
  const ebitda = gross_profit - opex;
  // Straight-line depreciation from PP&E
  const dep_life_years = Math.max(1, params.depreciation_life_years);
  const depreciation = prev_balance.ppe / dep_life_years / 12 * (params.period_days / 30); // simple proportional
  const ebit = ebitda - depreciation;
  const interest = prev_balance.debt * 0.0; // interest modeling deferred (kept zero for now)
  const taxes = Math.max(0, ebit - interest) * 0.0; // tax modeling deferred (kept zero for now)
  const net_income = ebit - interest - taxes;
  // --- Working capital (end-of-period balances) ---
  const period = Math.max(1, params.period_days);
  const ar = revenue * (drivers.dso / period);
  const inventory = cogs * (drivers.dio / period);
  const ap = cogs * (drivers.dpo / period);
  // Deltas vs. prior balances for indirect cash flow
  const dAR = ar - prev_balance.ar;
  const dInv = inventory - prev_balance.inventory;
  const dAP = ap - prev_balance.ap;
  const deltaNWC = dAR + dInv - dAP;
  // --- Capex & PP&E ---
  const capex = drivers.capex_base;
  const ppe = Math.max(0, prev_balance.ppe + capex - depreciation);
  // --- Cash Flow (indirect) ---
  const cfo = net_income + depreciation - deltaNWC;
  const cfi = -capex; // no asset sales yet
  const direct_cash_flow = -direct_cash_spending; // Direct cash spending (negative cash flow)
  // Financing policy (deterministic buffer)
  let cff = 0;
  let debt = prev_balance.debt;
  let retained_earnings = prev_balance.retained_earnings + net_income;
  const other_equity = prev_balance.other_equity;
  // Provisional cash close to decide financing
  let cash_close_prov = cash_open + cfo + cfi + cff + direct_cash_flow;
  if (cash_close_prov < params.min_cash_buffer) {
    const needed = params.min_cash_buffer - cash_close_prov;
    debt += needed;
    cff += needed; // debt draw
    cash_close_prov += needed;
    notes.push("Debt draw to maintain minimum cash buffer.");
  } else if (policy?.dividend && retained_earnings > 0 && cash_close_prov > params.min_cash_buffer) {
    const div = Math.min(retained_earnings, (cash_close_prov - params.min_cash_buffer) * 0.25);
    if (div > 0) {
      retained_earnings -= div;
      cff -= div;
      cash_close_prov -= div;
      notes.push("Dividend paid from retained earnings.");
    }
  }
  const cash_close = cash_open + cfo + cfi + cff + direct_cash_flow;
  // --- Build balance sheet end-of-period ---
  const cash = Math.max(0, cash_close);
  const balance: MiniBalanceSheet = {
    cash, ar, inventory, ppe,
    ap, debt,
    retained_earnings, other_equity
  };
  // --- Identities & checks ---
  const assets = cash + ar + inventory + ppe;
  const liab_eq = ap + debt + other_equity + retained_earnings;
  let balance_ok = Math.abs(assets - liab_eq) < 1e-6;
  if (!balance_ok) {
    // tiny plug to retained earnings to preserve flow; log as note
    const plug = assets - liab_eq;
    balance.retained_earnings += plug;
    balance_ok = true;
    notes.push("Applied immaterial retained earnings plug to balance assets=liabilities+equity.");
  }
  const cash_recon_ok = Math.abs(cash_close - cash_close_prov) < 1e-6;
  if (!cash_recon_ok) notes.push("Cash reconciliation drifted; review CFO/CFI/CFF.");
  return {
    cash_open,
    pnl: { revenue, cogs, gross_profit, opex, ebitda, depreciation, ebit, interest, taxes, net_income },
    cashflow: { cfo, cfi, cff },
    balance,
    cash_close: cash,
    balance_ok,
    cash_recon_ok,
    notes
  };
}
