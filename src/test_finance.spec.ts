import { describe, it, expect } from 'vitest'
import { computeFinancials } from './finance'
import { FinanceInput, FinancialDrivers, FinancialParams, MiniBalanceSheet } from './contracts'

describe('computeFinancials', () => {
  // Test fixtures
  const baseBalance: MiniBalanceSheet = {
    cash: 1_000_000,
    ar: 250_000,
    inventory: 300_000,
    ppe: 2_000_000,
    ap: 200_000,
    debt: 0,
    retained_earnings: 1_350_000,
    other_equity: 1_700_000
  }

  const baseDrivers: FinancialDrivers = {
    units_sold: 10_000,
    avg_price: 100,
    unit_cost: 60,
    opex_base: 300_000,
    capex_base: 50_000,
    dso: 30,
    dpo: 30,
    dio: 45
  }

  const baseParams: FinancialParams = {
    period_days: 30,
    min_cash_buffer: 250_000,
    depreciation_life_years: 5,
    price_to_units: 0,
    morale_to_units: 0,
    credibility_to_price: 0,
    scrap_rate: 0.00
  }

  it('should calculate basic P&L correctly', () => {
    const input: FinanceInput = {
      prev_balance: baseBalance,
      drivers: baseDrivers,
      params: baseParams
    }

    const result = computeFinancials(input)

    // Revenue = units × price
    expect(result.pnl.revenue).toBe(10_000 * 100)
    
    // COGS = units × cost (no scrap)
    expect(result.pnl.cogs).toBe(10_000 * 60)
    
    // Gross profit = revenue - COGS
    expect(result.pnl.gross_profit).toBe(result.pnl.revenue - result.pnl.cogs)
    
    // EBITDA = gross profit - opex
    expect(result.pnl.ebitda).toBe(result.pnl.gross_profit - 300_000)
    
    // Net income should flow through correctly
    expect(result.pnl.net_income).toBe(result.pnl.ebit - result.pnl.interest - result.pnl.taxes)
  })

  it('should apply scrap rate to COGS when present', () => {
    const paramsWithScrap = { ...baseParams, scrap_rate: 0.05 }
    const input: FinanceInput = {
      prev_balance: baseBalance,
      drivers: baseDrivers,
      params: paramsWithScrap
    }

    const result = computeFinancials(input)

    // COGS should include scrap
    const expectedCogs = 10_000 * 60 * (1 + 0.05)
    expect(result.pnl.cogs).toBe(expectedCogs)
    
    // Should have scrap rate note
    expect(result.notes).toContain('Applied scrap/returns factor 0.050 to COGS.')
  })

  it('should calculate working capital balances correctly', () => {
    const input: FinanceInput = {
      prev_balance: baseBalance,
      drivers: baseDrivers,
      params: baseParams
    }

    const result = computeFinancials(input)

    // AR = revenue × (DSO / period)
    const expectedAR = (10_000 * 100) * (30 / 30)
    expect(result.balance.ar).toBe(expectedAR)
    
    // Inventory = COGS × (DIO / period)
    const expectedInventory = (10_000 * 60) * (45 / 30)
    expect(result.balance.inventory).toBe(expectedInventory)
    
    // AP = COGS × (DPO / period)
    const expectedAP = (10_000 * 60) * (30 / 30)
    expect(result.balance.ap).toBe(expectedAP)
  })

  it('should calculate depreciation correctly', () => {
    const input: FinanceInput = {
      prev_balance: baseBalance,
      drivers: baseDrivers,
      params: baseParams
    }

    const result = computeFinancials(input)

    // Depreciation = PP&E / life / 12 × (period / 30)
    const expectedDep = 2_000_000 / 5 / 12 * (30 / 30)
    expect(result.pnl.depreciation).toBe(expectedDep)
  })

  it('should maintain balance sheet identity', () => {
    const input: FinanceInput = {
      prev_balance: baseBalance,
      drivers: baseDrivers,
      params: baseParams
    }

    const result = computeFinancials(input)

    // Assets = Liabilities + Equity
    const assets = result.balance.cash + result.balance.ar + result.balance.inventory + result.balance.ppe
    const liabEq = result.balance.ap + result.balance.debt + result.balance.other_equity + result.balance.retained_earnings
    
    expect(assets).toBeCloseTo(liabEq, 0)
    expect(result.balance_ok).toBe(true)
  })

  it('should maintain cash flow identity', () => {
    const input: FinanceInput = {
      prev_balance: baseBalance,
      drivers: baseDrivers,
      params: baseParams
    }

    const result = computeFinancials(input)

    // Cash close = cash open + CFO + CFI + CFF
    const expectedCashClose = result.cash_open + result.cashflow.cfo + result.cashflow.cfi + result.cashflow.cff
    expect(result.cash_close).toBeCloseTo(expectedCashClose, 0)
    expect(result.cash_recon_ok).toBe(true)
  })

  it('should handle debt draws when cash buffer is insufficient', () => {
    const lowCashBalance = { ...baseBalance, cash: 100_000 }
    const input: FinanceInput = {
      prev_balance: lowCashBalance,
      drivers: baseDrivers,
      params: baseParams
    }

    const result = computeFinancials(input)

    // Should have debt draw note
    expect(result.notes).toContain('Debt draw to maintain minimum cash buffer.')
    
    // Should have debt
    expect(result.balance.debt).toBeGreaterThan(0)
    
    // Cash should be at least min buffer
    expect(result.balance.cash).toBeGreaterThanOrEqual(250_000)
  })

  it('should handle dividend payments when policy allows', () => {
    const highCashBalance = { ...baseBalance, cash: 2_000_000, retained_earnings: 5_000_000 }
    const input: FinanceInput = {
      prev_balance: highCashBalance,
      drivers: baseDrivers,
      params: baseParams,
      policy: { dividend: true, repay_debt: false }
    }

    const result = computeFinancials(input)

    // Should have dividend note
    expect(result.notes).toContain('Dividend paid from retained earnings.')
    
    // CFF should be negative (cash outflow)
    expect(result.cashflow.cff).toBeLessThan(0)
  })

  it('should handle zero units edge case', () => {
    const zeroUnitsDrivers = { ...baseDrivers, units_sold: 0 }
    const input: FinanceInput = {
      prev_balance: baseBalance,
      drivers: zeroUnitsDrivers,
      params: baseParams
    }

    const result = computeFinancials(input)

    // Revenue and COGS should be zero
    expect(result.pnl.revenue).toBe(0)
    expect(result.pnl.cogs).toBe(0)
    
    // Working capital should be zero
    expect(result.balance.ar).toBe(0)
    expect(result.balance.inventory).toBe(0)
    expect(result.balance.ap).toBe(0)
  })

  it('should handle very high working capital days', () => {
    const highDaysDrivers = { ...baseDrivers, dso: 90, dio: 120, dpo: 90 }
    const input: FinanceInput = {
      prev_balance: baseBalance,
      drivers: highDaysDrivers,
      params: baseParams
    }

    const result = computeFinancials(input)

    // Should still maintain balance sheet identity
    expect(result.balance_ok).toBe(true)
    
    // Working capital should be proportionally higher
    expect(result.balance.ar).toBeGreaterThan(baseBalance.ar)
    expect(result.balance.inventory).toBeGreaterThan(baseBalance.inventory)
    expect(result.balance.ap).toBeGreaterThan(baseBalance.ap)
  })
})
