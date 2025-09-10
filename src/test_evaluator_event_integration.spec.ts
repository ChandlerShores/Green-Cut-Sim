import { describe, it, expect } from 'vitest'
import { Evaluator } from './evaluator'
import { StatePacket, RngEvent, Caps } from './contracts'

describe('Evaluator Event Integration', () => {
  const evaluator = new Evaluator()
  
  const mockStatePacket: StatePacket = {
    turn_no: 1,
    event: { category: 'market', tier: 'medium' },
    morale: 75,
    credibility: 70,
    backlog: 1200,
    service: 85,
    share: 125,
    cash_runway: 18,
    flags: {
      supply_fragile: true,
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
    headroom: { ot_pct: 10, temps_allowed: true },
    recent_moves: ['Previous declaration']
  }
  
  const mockCaps: Caps = {
    morale: 3.0,
    credibility: 2.0,
    service_risk: 0.6,
    backlog_pressure: 1.0
  }

  it('should generate consistent output for same inputs', async () => {
    const rngEvent: RngEvent = {
      roll: 73,
      event_type: 'reg_probe',
      hints: ['supply_fragile']
    }
    
    const declaration = 'We need to improve our operational efficiency and focus on quality.'
    
    const result1 = await evaluator.evaluate(declaration, mockStatePacket, rngEvent, mockCaps)
    const result2 = await evaluator.evaluate(declaration, mockStatePacket, rngEvent, mockCaps)
    
    expect(result1).toEqual(result2)
  })

  it('should handle RNG events correctly', async () => {
    const rngEvent: RngEvent = {
      roll: 25,
      event_type: 'supply_shock',
      hints: ['supply_fragile']
    }
    
    const declaration = 'Focus on maintaining quality standards.'
    
    const result = await evaluator.evaluate(declaration, mockStatePacket, rngEvent, mockCaps)
    
    expect(result.event.roll).toBe(25)
    expect(result.event.event_type).toBe('supply_shock')
    expect(result.event.impact_channels.backlog_pressure).toBeDefined()
    expect(result.event.impact_channels.service_risk).toBeDefined()
  })

  it('should detect nonsense and apply penalties', async () => {
    const rngEvent: RngEvent = {
      roll: 50,
      event_type: 'none',
      hints: []
    }
    
    const nonsenseDeclaration = 'blah blah random test'
    
    const result = await evaluator.evaluate(nonsenseDeclaration, mockStatePacket, rngEvent, mockCaps)
    
    expect(result.penalties.nonsense_penalty).toBeGreaterThan(0)
    expect(result.policy.oob).toBe(false)
  })

  it('should detect out-of-bounds content', async () => {
    const rngEvent: RngEvent = {
      roll: 50,
      event_type: 'none',
      hints: []
    }
    
    const oobDeclaration = 'We will invest $50 million in new technology.'
    
    const result = await evaluator.evaluate(oobDeclaration, mockStatePacket, rngEvent, mockCaps)
    
    expect(result.policy.oob).toBe(true)
    expect(result.policy.violations.length).toBeGreaterThan(0)
  })

  it('should generate integrated analysis', async () => {
    const rngEvent: RngEvent = {
      roll: 60,
      event_type: 'demand_spike',
      hints: []
    }
    
    const declaration = 'We need to increase production capacity to meet growing demand.'
    
    const result = await evaluator.evaluate(declaration, mockStatePacket, rngEvent, mockCaps)
    
    expect(result.integrated.synergy).toBeDefined()
    expect(['aligned', 'undermined', 'neutral']).toContain(result.integrated.synergy)
    expect(result.integrated.narrative_hook).toBeDefined()
    expect(result.integrated.narrative_hook.length).toBeGreaterThan(0)
  })

  it('should maintain deterministic behavior', async () => {
    const rngEvent: RngEvent = {
      roll: 42,
      event_type: 'labor_unrest',
      hints: ['labor_tense']
    }
    
    const declaration = 'We must address team concerns and improve communication.'
    
    // Run multiple times to ensure consistency
    const results: any[] = []
    for (let i = 0; i < 5; i++) {
      results.push(await evaluator.evaluate(declaration, mockStatePacket, rngEvent, mockCaps))
    }
    
    // All results should be identical
    results.forEach((result, index) => {
      if (index > 0) {
        expect(result).toEqual(results[0])
      }
    })
  })
})
