import { describe, it, expect } from 'vitest'
import { Engine } from './engine'
import { State, EvaluatorOutput } from './contracts'

describe('Engine Caps', () => {
  const engine = new Engine()

  it('should respect caps when applying signals', () => {
    const state: State = {
      turn_no: 1,
      event: { category: 'market', tier: 'medium' },
      morale: 50,
      credibility: 60,
      backlog: 1000,
      service: 80,
      share: 100,
      cash_runway: 12,
      flags: { 
        supply_fragile: false, labor_tense: false, quality_watch: false, tail_risk: false,
        supply: 0.1, labor: 0.05, quality: 0.0, competition: 0.1, finance: 0.0, regulation: 0.0, tech: 0.05, weather: 0.05
      },
      pressures: { margin_push: false },
      headroom: { ot_pct: 0, temps_allowed: false },
      recent_moves: []
    }

    const signals: EvaluatorOutput['signals'] = {
      morale: { dir: 'up', strength: 1.0 },
      credibility: { dir: 'up', strength: 1.0 },
      backlog_pressure: { dir: 'up', strength: 1.0 },
      service_risk: { dir: 'up', strength: 1.0 }
    }

    const assessment: EvaluatorOutput['assessment'] = {
      intent: ['improve performance'],
      targets: ['morale', 'credibility'],
      tone: 'decisive',
      fit_reasons: ['addresses current challenges']
    }

    const event: EvaluatorOutput['event'] = {
      roll: 50,
      event_type: 'none',
      impact_channels: {},
      severity_note: 'No external events'
    }

    const integrated: EvaluatorOutput['integrated'] = {
      synergy: 'neutral',
      narrative_hook: 'Standard operational improvement'
    }

    const penalties: EvaluatorOutput['penalties'] = {
      nonsense_penalty: 0
    }

    const policy: EvaluatorOutput['policy'] = {
      oob: false,
      violations: []
    }

    const rationale = 'Standard improvement declaration'

    const evaluatorOutput: EvaluatorOutput = {
      assessment,
      signals,
      event,
      integrated,
      penalties,
      policy,
      rationale
    }

    const result = engine.resolveTurn(state, 'Test declaration', evaluatorOutput)
    
    // Check that deltas respect caps
    expect(result.applied_deltas.morale).toBeLessThanOrEqual(3.0) // morale cap
    expect(result.applied_deltas.credibility).toBeLessThanOrEqual(2.0) // credibility cap
    expect(result.applied_deltas.service).toBeLessThanOrEqual(0.6) // service_risk cap
    expect(result.applied_deltas.backlog).toBeLessThanOrEqual(250) // backlog_pressure cap * 250
  })

  it('should handle negative signals within caps', () => {
    const state: State = {
      turn_no: 1,
      event: { category: 'market', tier: 'medium' },
      morale: 80,
      credibility: 70,
      backlog: 1000,
      service: 90,
      share: 100,
      cash_runway: 12,
      flags: { 
        supply_fragile: false, labor_tense: false, quality_watch: false, tail_risk: false,
        supply: 0.1, labor: 0.05, quality: 0.0, competition: 0.1, finance: 0.0, regulation: 0.0, tech: 0.05, weather: 0.05
      },
      pressures: { margin_push: false },
      headroom: { ot_pct: 0, temps_allowed: false },
      recent_moves: []
    }

    const signals: EvaluatorOutput['signals'] = {
      morale: { dir: 'down', strength: 1.0 },
      credibility: { dir: 'down', strength: 1.0 },
      backlog_pressure: { dir: 'down', strength: 1.0 },
      service_risk: { dir: 'down', strength: 1.0 }
    }

    const assessment: EvaluatorOutput['assessment'] = {
      intent: ['reduce costs'],
      targets: ['efficiency'],
      tone: 'analytical',
      fit_reasons: ['cost optimization needed']
    }

    const event: EvaluatorOutput['event'] = {
      roll: 50,
      event_type: 'none',
      impact_channels: {},
      severity_note: 'No external events'
    }

    const integrated: EvaluatorOutput['integrated'] = {
      synergy: 'neutral',
      narrative_hook: 'Cost optimization focus'
    }

    const penalties: EvaluatorOutput['penalties'] = {
      nonsense_penalty: 0
    }

    const policy: EvaluatorOutput['policy'] = {
      oob: false,
      violations: []
    }

    const rationale = 'Cost optimization declaration'

    const evaluatorOutput: EvaluatorOutput = {
      assessment,
      signals,
      event,
      integrated,
      penalties,
      policy,
      rationale
    }

    const resultWithFlag = engine.resolveTurn(state, 'Test', evaluatorOutput)
    const resultWithoutFlag = engine.resolveTurn(state, 'Test', evaluatorOutput)
    
    // Both should respect caps
    expect(Math.abs(resultWithFlag.applied_deltas.morale)).toBeLessThanOrEqual(3.0)
    expect(Math.abs(resultWithoutFlag.applied_deltas.morale)).toBeLessThanOrEqual(3.0)
  })

  it('should apply context modifications correctly', () => {
    const state: State = {
      turn_no: 1,
      event: { category: 'market', tier: 'medium' },
      morale: 90, // High morale
      credibility: 70,
      backlog: 1000,
      service: 80,
      share: 100,
      cash_runway: 12,
      flags: { 
        supply_fragile: false, labor_tense: true, quality_watch: false, tail_risk: false,
        supply: 0.1, labor: 0.05, quality: 0.0, competition: 0.1, finance: 0.0, regulation: 0.0, tech: 0.05, weather: 0.05
      },
      pressures: { margin_push: false },
      headroom: { ot_pct: 0, temps_allowed: false },
      recent_moves: []
    }

    const signals: EvaluatorOutput['signals'] = {
      morale: { dir: 'up', strength: 0.5 },
      credibility: { dir: 'up', strength: 0.5 },
      backlog_pressure: { dir: 'none', strength: 0 },
      service_risk: { dir: 'none', strength: 0 }
    }

    const assessment: EvaluatorOutput['assessment'] = {
      intent: ['maintain performance'],
      targets: ['morale', 'credibility'],
      tone: 'supportive',
      fit_reasons: ['maintains current levels']
    }

    const event: EvaluatorOutput['event'] = {
      roll: 50,
      event_type: 'none',
      impact_channels: {},
      severity_note: 'No external events'
    }

    const integrated: EvaluatorOutput['integrated'] = {
      synergy: 'neutral',
      narrative_hook: 'Performance maintenance'
    }

    const penalties: EvaluatorOutput['penalties'] = {
      nonsense_penalty: 0
    }

    const policy: EvaluatorOutput['policy'] = {
      oob: false,
      violations: []
    }

    const rationale = 'Performance maintenance declaration'

    const evaluatorOutput: EvaluatorOutput = {
      assessment,
      signals,
      event,
      integrated,
      penalties,
      policy,
      rationale
    }

    const result = engine.resolveTurn(state, 'Test declaration', evaluatorOutput)
    
    // High morale should decay, labor_tense should affect morale and credibility
    expect(result.state_after.morale).toBeLessThan(state.morale)
    expect(result.state_after.credibility).toBeLessThan(state.credibility)
  })
})
