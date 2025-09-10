import { describe, it, expect } from 'vitest'
import { Evaluator } from './evaluator'
import { StatePacket, RngEvent, Caps } from './contracts'

describe('Nonsense Penalty', () => {
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
    headroom: { ot_pct: 10, temps_allowed: true },
    recent_moves: []
  }
  
  const mockCaps: Caps = { morale: 3.0, credibility: 2.0, service_risk: 0.6, backlog_pressure: 1.0 }

  it('should apply penalty to nonsense declarations', async () => {
    const rngEvent: RngEvent = { roll: 50, event_type: 'none' }
    const nonsenseDeclaration = 'blah blah random test'
    
    const result = await evaluator.evaluate(nonsenseDeclaration, mockStatePacket, rngEvent, mockCaps)
    
    expect(result.penalties.nonsense_penalty).toBeGreaterThan(0)
    expect(result.penalties.nonsense_penalty).toBeLessThanOrEqual(1)
  })

  it('should not apply penalty to coherent declarations', async () => {
    const rngEvent: RngEvent = { roll: 50, event_type: 'none' }
    const coherentDeclaration = 'We need to improve team communication and operational efficiency.'
    
    const result = await evaluator.evaluate(coherentDeclaration, mockStatePacket, rngEvent, mockCaps)
    
    expect(result.penalties.nonsense_penalty).toBe(0)
  })
})
