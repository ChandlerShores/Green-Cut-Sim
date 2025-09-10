import { describe, it, expect } from 'vitest'
import { Engine } from './engine'
import { State, EvaluatorOutput } from './contracts'

describe('Engine Financial Integration', () => {
  const engine = new Engine()

  // Test fixtures
  const baseState: State = {
    turn_no: 1,
    event: { category: 'market', tier: 'medium' },
    morale: 75,
    credibility: 80,
    backlog: 1000,
    service: 85,
    share: 100,
    cash_runway: 18,
    flags: { 
      supply_fragile: false, 
      labor_tense: false, 
      quality_watch: false, 
      tail_risk: false,
      supply: 0.1,
      labor: 0.05,
      quality: 0.0,
      competition: 0.1,
      finance: 0.0,
      regulation: 0.0,
      tech: 0.05,
      weather: 0.05
    },
    pressures: { margin_push: false },
    headroom: { ot_pct: 0, temps_allowed: false },
    recent_moves: []
  }

  const createEvaluatorOutput = (overrides: Partial<EvaluatorOutput> = {}): EvaluatorOutput => ({
    assessment: {
      intent: ['test'],
      targets: ['test'],
      tone: 'neutral',
      fit_reasons: ['test']
    },
    signals: {
      morale: { dir: 'none', strength: 0 },
      credibility: { dir: 'none', strength: 0 },
      backlog_pressure: { dir: 'none', strength: 0 },
      service_risk: { dir: 'none', strength: 0 }
    },
    event: {
      roll: 50,
      event_type: 'none',
      impact_channels: {},
      severity_note: 'No event'
    },
    integrated: {
      synergy: 'neutral',
      narrative_hook: 'Test'
    },
    penalties: {
      nonsense_penalty: 0
    },
    policy: {
      oob: false,
      violations: []
    },
    rationale: 'Test',
    ...overrides
  })

  it('should include financials in turn result', () => {
    const evaluatorOutput = createEvaluatorOutput()
    const result = engine.resolveTurn(baseState, 'Test declaration', evaluatorOutput)

    expect(result.financials).toBeDefined()
    expect(result.financials.pnl).toBeDefined()
    expect(result.financials.balance).toBeDefined()
    expect(result.financials.cashflow).toBeDefined()
    expect(result.explainers).toBeDefined()
    expect(result.explainers.finance).toBeDefined()
  })

  it('should map morale signals to units adjustment', () => {
    const evaluatorOutput = createEvaluatorOutput({
      signals: {
        morale: { dir: 'up', strength: 1.0 },
        credibility: { dir: 'none', strength: 0 },
        backlog_pressure: { dir: 'none', strength: 0 },
        service_risk: { dir: 'none', strength: 0 }
      }
    })

    const result = engine.resolveTurn(baseState, 'Test declaration', evaluatorOutput)
    
    // Should have explainer for morale impact
    expect(result.explainers.finance).toContain('Higher morale lifted throughput/demand')
    
    // Financials should be present
    expect(result.financials).toBeDefined()
  })

  it('should map credibility signals to price adjustment', () => {
    const evaluatorOutput = createEvaluatorOutput({
      signals: {
        morale: { dir: 'none', strength: 0 },
        credibility: { dir: 'up', strength: 0.8 },
        backlog_pressure: { dir: 'none', strength: 0 },
        service_risk: { dir: 'none', strength: 0 }
      }
    })

    const result = engine.resolveTurn(baseState, 'Test declaration', evaluatorOutput)
    
    expect(result.explainers.finance).toContain('Rising credibility supported ASP')
  })

  it('should map backlog pressure to units and inventory days', () => {
    const evaluatorOutput = createEvaluatorOutput({
      signals: {
        morale: { dir: 'none', strength: 0 },
        credibility: { dir: 'none', strength: 0 },
        backlog_pressure: { dir: 'up', strength: 0.6 },
        service_risk: { dir: 'none', strength: 0 }
      }
    })

    const result = engine.resolveTurn(baseState, 'Test declaration', evaluatorOutput)
    
    expect(result.explainers.finance).toContain('Backlog pressure constrained fulfilled units')
  })

  it('should map service risk to scrap rate and DSO', () => {
    const evaluatorOutput = createEvaluatorOutput({
      signals: {
        morale: { dir: 'none', strength: 0 },
        credibility: { dir: 'none', strength: 0 },
        backlog_pressure: { dir: 'none', strength: 0 },
        service_risk: { dir: 'up', strength: 0.7 }
      }
    })

    const result = engine.resolveTurn(baseState, 'Test declaration', evaluatorOutput)
    
    expect(result.explainers.finance).toContain('Service risk increased scrap/returns')
  })

  it('should handle supply fragile flag impact on inventory days', () => {
    const fragileState = { ...baseState, flags: { ...baseState.flags, supply_fragile: true } }
    const evaluatorOutput = createEvaluatorOutput()

    const result = engine.resolveTurn(fragileState, 'Test declaration', evaluatorOutput)
    
    expect(result.explainers.finance).toContain('Supply fragility extended inventory days')
  })

  it('should handle regulatory probe events', () => {
    const evaluatorOutput = createEvaluatorOutput({
      event: {
        roll: 25,
        event_type: 'reg_probe',
        impact_channels: {},
        severity_note: 'Regulatory scrutiny'
      }
    })

    const result = engine.resolveTurn(baseState, 'Test declaration', evaluatorOutput)
    
    expect(result.explainers.finance).toContain('Regulatory scrutiny stretched receivables')
  })

  it('should handle nonsense penalties deterministically', () => {
    const evaluatorOutput = createEvaluatorOutput({
      penalties: {
        nonsense_penalty: 0.5
      }
    })

    const result1 = engine.resolveTurn(baseState, 'Declaration A', evaluatorOutput)
    const result2 = engine.resolveTurn(baseState, 'Declaration B', evaluatorOutput)
    
    // Both should have penalty explainers
    expect(result1.explainers.finance.some(e => e.includes('reputational drag'))).toBe(true)
    expect(result2.explainers.finance.some(e => e.includes('reputational drag'))).toBe(true)
    
    // But the specific impact might differ due to hash-based splitting
    expect(result1.financials).toBeDefined()
    expect(result2.financials).toBeDefined()
  })

  it('should handle event impact channels', () => {
    const evaluatorOutput = createEvaluatorOutput({
      event: {
        roll: 60,
        event_type: 'demand_spike',
        impact_channels: {
          service_risk: { dir: 'up', strength: 0.4 },
          backlog_pressure: { dir: 'up', strength: 0.3 }
        },
        severity_note: 'Demand spike'
      }
    })

    const result = engine.resolveTurn(baseState, 'Test declaration', evaluatorOutput)
    
    expect(result.explainers.finance).toContain('Event pressure raised service friction')
    expect(result.explainers.finance).toContain('Event constraints limited fulfillment and inventory turns')
  })

  it('should enforce driver bounds', () => {
    const extremeSignals = createEvaluatorOutput({
      signals: {
        morale: { dir: 'up', strength: 2.0 }, // Very high strength
        credibility: { dir: 'up', strength: 2.0 },
        backlog_pressure: { dir: 'up', strength: 2.0 },
        service_risk: { dir: 'up', strength: 2.0 }
      }
    })

    const result = engine.resolveTurn(baseState, 'Test declaration', extremeSignals)
    
    // Should still have valid financials despite extreme signals
    expect(result.financials).toBeDefined()
    expect(result.financials.balance_ok).toBe(true)
    expect(result.financials.cash_recon_ok).toBe(true)
  })

  it('should handle capex policy based on signals', () => {
    const capexSignals = createEvaluatorOutput({
      signals: {
        morale: { dir: 'up', strength: 0.8 },
        credibility: { dir: 'none', strength: 0 },
        backlog_pressure: { dir: 'down', strength: 0.3 }, // Backlog easing
        service_risk: { dir: 'none', strength: 0 }
      }
    })

    const result = engine.resolveTurn(baseState, 'Test declaration', capexSignals)
    
    // Should have financials with potentially adjusted capex
    expect(result.financials).toBeDefined()
  })

  it('should maintain determinism across identical inputs', () => {
    const evaluatorOutput = createEvaluatorOutput({
      signals: {
        morale: { dir: 'up', strength: 0.5 },
        credibility: { dir: 'down', strength: 0.3 },
        backlog_pressure: { dir: 'none', strength: 0 },
        service_risk: { dir: 'up', strength: 0.4 }
      }
    })

    const result1 = engine.resolveTurn(baseState, 'Test declaration', evaluatorOutput)
    const result2 = engine.resolveTurn(baseState, 'Test declaration', evaluatorOutput)
    
    // Financials should be identical
    expect(result1.financials).toEqual(result2.financials)
    expect(result1.explainers.finance).toEqual(result2.explainers.finance)
  })

  it('should handle negative signals correctly', () => {
    const negativeSignals = createEvaluatorOutput({
      signals: {
        morale: { dir: 'down', strength: 0.6 },
        credibility: { dir: 'down', strength: 0.4 },
        backlog_pressure: { dir: 'down', strength: 0.5 },
        service_risk: { dir: 'down', strength: 0.3 }
      }
    })

    const result = engine.resolveTurn(baseState, 'Test declaration', negativeSignals)
    
    expect(result.explainers.finance).toContain('Lower morale softened throughput')
    expect(result.explainers.finance).toContain('Credibility strain pressured pricing')
    expect(result.explainers.finance).toContain('Easing backlog improved fulfillment')
    expect(result.explainers.finance).toContain('Lower service risk reduced scrap/returns')
  })
})
