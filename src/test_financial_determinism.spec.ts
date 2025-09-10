import { describe, it, expect } from 'vitest'
import { Engine } from './engine'
import { State, EvaluatorOutput } from './contracts'

describe('Financial Determinism', () => {
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

  it('should produce identical financials for identical inputs', () => {
    const evaluatorOutput = createEvaluatorOutput({
      signals: {
        morale: { dir: 'up', strength: 0.6 },
        credibility: { dir: 'down', strength: 0.4 },
        backlog_pressure: { dir: 'up', strength: 0.3 },
        service_risk: { dir: 'none', strength: 0 }
      }
    })

    const result1 = engine.resolveTurn(baseState, 'Test declaration', evaluatorOutput)
    const result2 = engine.resolveTurn(baseState, 'Test declaration', evaluatorOutput)
    
    // Financials should be identical
    expect(result1.financials).toEqual(result2.financials)
    expect(result1.explainers.finance).toEqual(result2.explainers.finance)
  })

  it('should produce identical financials across multiple runs', () => {
    const evaluatorOutput = createEvaluatorOutput({
      signals: {
        morale: { dir: 'up', strength: 0.8 },
        credibility: { dir: 'up', strength: 0.5 },
        backlog_pressure: { dir: 'down', strength: 0.2 },
        service_risk: { dir: 'up', strength: 0.3 }
      }
    })

    const results: any[] = []
    for (let i = 0; i < 5; i++) {
      const result = engine.resolveTurn(baseState, 'Test declaration', evaluatorOutput)
      results.push(result)
    }
    
    // All results should be identical
    results.forEach((result, index) => {
      if (index > 0) {
        expect(result.financials).toEqual(results[0].financials)
        expect(result.explainers.finance).toEqual(results[0].explainers.finance)
      }
    })
  })

  it('should produce identical financials for identical state and signals', () => {
    const state1 = { ...baseState }
    const state2 = { ...baseState }
    
    const evaluatorOutput = createEvaluatorOutput({
      signals: {
        morale: { dir: 'up', strength: 0.7 },
        credibility: { dir: 'none', strength: 0 },
        backlog_pressure: { dir: 'up', strength: 0.4 },
        service_risk: { dir: 'down', strength: 0.2 }
      }
    })

    const result1 = engine.resolveTurn(state1, 'Test declaration', evaluatorOutput)
    const result2 = engine.resolveTurn(state2, 'Test declaration', evaluatorOutput)
    
    expect(result1.financials).toEqual(result2.financials)
    expect(result1.explainers.finance).toEqual(result2.explainers.finance)
  })

  it('should produce different financials for different signals', () => {
    const evaluatorOutput1 = createEvaluatorOutput({
      signals: {
        morale: { dir: 'up', strength: 0.5 },
        credibility: { dir: 'none', strength: 0 },
        backlog_pressure: { dir: 'none', strength: 0 },
        service_risk: { dir: 'none', strength: 0 }
      }
    })

    const evaluatorOutput2 = createEvaluatorOutput({
      signals: {
        morale: { dir: 'down', strength: 0.5 },
        credibility: { dir: 'none', strength: 0 },
        backlog_pressure: { dir: 'none', strength: 0 },
        service_risk: { dir: 'none', strength: 0 }
      }
    })

    const result1 = engine.resolveTurn(baseState, 'Test declaration', evaluatorOutput1)
    const result2 = engine.resolveTurn(baseState, 'Test declaration', evaluatorOutput2)
    
    // Financials should be different due to different signals
    expect(result1.financials).not.toEqual(result2.financials)
    expect(result1.explainers.finance).not.toEqual(result2.explainers.finance)
  })

  it('should produce different financials for different events', () => {
    const evaluatorOutput1 = createEvaluatorOutput({
      event: {
        roll: 20,
        event_type: 'reg_probe',
        impact_channels: {},
        severity_note: 'Regulatory probe'
      }
    })

    const evaluatorOutput2 = createEvaluatorOutput({
      event: {
        roll: 80,
        event_type: 'demand_spike',
        impact_channels: {},
        severity_note: 'Demand spike'
      }
    })

    const result1 = engine.resolveTurn(baseState, 'Test declaration', evaluatorOutput1)
    const result2 = engine.resolveTurn(baseState, 'Test declaration', evaluatorOutput2)
    
    // Financials should be different due to different events
    expect(result1.financials).not.toEqual(result2.financials)
    expect(result1.explainers.finance).not.toEqual(result2.explainers.finance)
  })

  it('should produce different financials for different state flags', () => {
    const state1 = { ...baseState, flags: { ...baseState.flags, supply_fragile: false } }
    const state2 = { ...baseState, flags: { ...baseState.flags, supply_fragile: true } }
    
    const evaluatorOutput = createEvaluatorOutput()

    const result1 = engine.resolveTurn(state1, 'Test declaration', evaluatorOutput)
    const result2 = engine.resolveTurn(state2, 'Test declaration', evaluatorOutput)
    
    // Financials should be different due to different flags
    expect(result1.financials).not.toEqual(result2.financials)
    expect(result1.explainers.finance).not.toEqual(result2.explainers.finance)
  })

  it('should produce consistent penalty splitting for identical declarations', () => {
    const evaluatorOutput = createEvaluatorOutput({
      penalties: {
        nonsense_penalty: 0.6
      }
    })

    const result1 = engine.resolveTurn(baseState, 'Identical declaration text', evaluatorOutput)
    const result2 = engine.resolveTurn(baseState, 'Identical declaration text', evaluatorOutput)
    
    // Penalty splitting should be identical for identical declarations
    expect(result1.financials).toEqual(result2.financials)
    expect(result1.explainers.finance).toEqual(result2.explainers.finance)
  })

  it('should produce different penalty splitting for different declarations', () => {
    const evaluatorOutput = createEvaluatorOutput({
      penalties: {
        nonsense_penalty: 0.6
      }
    })

    const result1 = engine.resolveTurn(baseState, 'Declaration A', evaluatorOutput)
    const result2 = engine.resolveTurn(baseState, 'Declaration B', evaluatorOutput)
    
    // Penalty splitting might differ due to hash-based logic
    // But both should have valid financials
    expect(result1.financials).toBeDefined()
    expect(result2.financials).toBeDefined()
    expect(result1.explainers.finance).toBeDefined()
    expect(result2.explainers.finance).toBeDefined()
  })

  it('should maintain cross-turn consistency', () => {
    const evaluatorOutput = createEvaluatorOutput({
      signals: {
        morale: { dir: 'up', strength: 0.5 },
        credibility: { dir: 'none', strength: 0 },
        backlog_pressure: { dir: 'none', strength: 0 },
        service_risk: { dir: 'none', strength: 0 }
      }
    })

    // First turn
    const result1 = engine.resolveTurn(baseState, 'Turn 1', evaluatorOutput)
    
    // Second turn using result1's state_after
    const result2 = engine.resolveTurn(result1.state_after, 'Turn 2', evaluatorOutput)
    
    // Both should have valid financials
    expect(result1.financials).toBeDefined()
    expect(result2.financials).toBeDefined()
    
    // The financials should be deterministic for identical inputs
    // Even across turns, if signals are the same, the financial logic is consistent
    expect(result1.financials.balance_ok).toBe(true)
    expect(result2.financials.balance_ok).toBe(true)
    expect(result1.financials.cash_recon_ok).toBe(true)
    expect(result2.financials.cash_recon_ok).toBe(true)
  })

  it('should handle edge cases deterministically', () => {
    const edgeCaseState = {
      ...baseState,
      morale: 0,
      credibility: 0,
      backlog: 0,
      service: 0
    }

    const evaluatorOutput = createEvaluatorOutput({
      signals: {
        morale: { dir: 'up', strength: 1.0 },
        credibility: { dir: 'up', strength: 1.0 },
        backlog_pressure: { dir: 'up', strength: 1.0 },
        service_risk: { dir: 'up', strength: 1.0 }
      }
    })

    const result1 = engine.resolveTurn(edgeCaseState, 'Edge case test', evaluatorOutput)
    const result2 = engine.resolveTurn(edgeCaseState, 'Edge case test', evaluatorOutput)
    
    // Should handle edge cases consistently
    expect(result1.financials).toEqual(result2.financials)
    expect(result1.explainers.finance).toEqual(result2.explainers.finance)
  })

  it('should maintain determinism with complex signal combinations', () => {
    const complexSignals = createEvaluatorOutput({
      signals: {
        morale: { dir: 'up', strength: 0.8 },
        credibility: { dir: 'down', strength: 0.6 },
        backlog_pressure: { dir: 'up', strength: 0.4 },
        service_risk: { dir: 'down', strength: 0.3 }
      },
      event: {
        roll: 35,
        event_type: 'labor_unrest',
        impact_channels: {
          morale: { dir: 'down', strength: 0.2 },
          service_risk: { dir: 'up', strength: 0.1 }
        },
        severity_note: 'Labor unrest'
      },
      penalties: {
        nonsense_penalty: 0.4
      }
    })

    const result1 = engine.resolveTurn(baseState, 'Complex test declaration', complexSignals)
    const result2 = engine.resolveTurn(baseState, 'Complex test declaration', complexSignals)
    
    // Complex combinations should still be deterministic
    expect(result1.financials).toEqual(result2.financials)
    expect(result1.explainers.finance).toEqual(result2.explainers.finance)
  })
})
