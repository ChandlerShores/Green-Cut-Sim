import { describe, it, expect } from 'vitest'
import { Engine } from './engine'
import { Evaluator } from './evaluator'
import { State, StatePacket, Caps, RngEvent } from './contracts'

describe('Determinism', () => {
  const engine = new Engine()
  const evaluator = new Evaluator()
  const caps: Caps = { morale: 3.0, credibility: 2.0, service_risk: 0.6, backlog_pressure: 1.0 }

  it('should produce identical results for identical inputs', async () => {
    const seed = 'test-seed-123'
    const state1 = engine.createInitialState(seed)
    const state2 = engine.createInitialState(seed)
    
    expect(state1).toEqual(state2)
    
    const declaration = 'We need to improve team morale and operational efficiency.'
    
    // Create RNG events for both evaluations
    const rngEvent1: RngEvent = { roll: 42, event_type: 'labor_unrest' }
    const rngEvent2: RngEvent = { roll: 42, event_type: 'labor_unrest' }
    
    const evaluation1 = await evaluator.evaluate(declaration, state1, rngEvent1, caps)
    const evaluation2 = await evaluator.evaluate(declaration, state2, rngEvent2, caps)
    
    expect(evaluation1).toEqual(evaluation2)
    
    const result1 = engine.resolveTurn(state1, declaration, evaluation1)
    const result2 = engine.resolveTurn(state2, declaration, evaluation2)
    
    expect(result1.state_after).toEqual(result2.state_after)
    expect(result1.deltas).toEqual(result2.deltas)
  })

  it('should produce identical results for identical inputs across multiple runs', async () => {
    const seed = 'deterministic-seed-456'
    const state = engine.createInitialState(seed)
    const declaration = 'Focus on quality improvement and customer satisfaction.'
    
    const rngEvent: RngEvent = { roll: 73, event_type: 'reg_probe' }
    
    // Run multiple times
    const results: any[] = []
    for (let i = 0; i < 5; i++) {
      const evaluation = await evaluator.evaluate(declaration, state, rngEvent, caps)
      const result = engine.resolveTurn(state, declaration, evaluation)
      results.push(result)
    }
    
    // All results should be identical
    results.forEach((result, index) => {
      if (index > 0) {
        expect(result.state_after).toEqual(results[0].state_after)
        expect(result.deltas).toEqual(results[0].deltas)
      }
    })
  })

  it('should produce different results for different seeds', async () => {
    const seed1 = 'seed-1'
    const seed2 = 'seed-2'
    
    const state1 = engine.createInitialState(seed1)
    const state2 = engine.createInitialState(seed2)
    
    expect(state1).not.toEqual(state2)
    
    const declaration = 'Standard operational improvement declaration.'
    const rngEvent: RngEvent = { roll: 50, event_type: 'none' }
    
    const evaluation1 = await evaluator.evaluate(declaration, state1, rngEvent, caps)
    const evaluation2 = await evaluator.evaluate(declaration, state2, rngEvent, caps)
    
    const result1 = engine.resolveTurn(state1, declaration, evaluation1)
    const result2 = engine.resolveTurn(state2, declaration, evaluation2)
    
    // Results should be different due to different initial states
    expect(result1.state_after).not.toEqual(result2.state_after)
  })

  it('should produce different results for different RNG events', async () => {
    const seed = 'rng-test-seed'
    const state = engine.createInitialState(seed)
    const declaration = 'Focus on operational excellence.'
    
    const rngEvent1: RngEvent = { roll: 25, event_type: 'supply_shock' }
    const rngEvent2: RngEvent = { roll: 75, event_type: 'reg_probe' }
    
    const evaluation1 = await evaluator.evaluate(declaration, state, rngEvent1, caps)
    const evaluation2 = await evaluator.evaluate(declaration, state, rngEvent2, caps)
    
    const result1 = engine.resolveTurn(state, declaration, evaluation1)
    const result2 = engine.resolveTurn(state, declaration, evaluation2)
    
    // Results should be different due to different RNG events
    expect(result1.state_after).not.toEqual(result2.state_after)
  })
})
