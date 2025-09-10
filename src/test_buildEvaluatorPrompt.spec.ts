import { describe, it, expect } from 'vitest'
import { buildEvaluatorPrompt } from './lib/prompt'
import { StatePacket, RngEvent } from './contracts'

describe('buildEvaluatorPrompt', () => {
  const baseState: StatePacket = {
    turn_no: 1,
    event: { category: 'market', tier: 'low' },
    morale: 50,
    credibility: 40,
    backlog: 100,
    service: 80,
    share: 110,
    cash_runway: 12,
    flags: {
      supply_fragile: false,
      labor_tense: false,
      quality_watch: false,
      tail_risk: false,
      supply: 0,
      labor: 0,
      quality: 0,
      competition: 0,
      finance: 0,
      regulation: 0,
      tech: 0,
      weather: 0
    },
    pressures: { margin_push: false },
    headroom: { ot_pct: 0, temps_allowed: false },
    recent_moves: []
  }

  it('builds prompts with minimal state', () => {
    const rng: RngEvent = { roll: 42, event_type: 'none' }
    const { systemPrompt, userPrompt } = buildEvaluatorPrompt('hello world', baseState, rng)
    expect(systemPrompt).toContain('You are the Evaluator')
    expect(userPrompt).toContain('Current state:')
    expect(userPrompt).toContain('- Flags: none')
    expect(userPrompt).toContain('RNG Event: Roll 42, Type: none')
  })

  it('includes detailed sections when provided', () => {
    const state: StatePacket = {
      ...baseState,
      pnl: { revenue: 10, cogs: 5, gm_percent: 50, opex: 3, net: 2, cash: 8 },
      kpis: { share_percent: 15, service_nps: 70, morale: 60, backlog_units: 500 },
      tail_risk: 20,
      ceo_credibility: 80,
      active_shocks: [
        {
          category: 'supply',
          tier: 1,
          name: 'Shock',
          effects: {
            revenue_delta: -1,
            cogs_delta: 2,
            opex_delta: 0,
            cash_delta: -1,
            share_delta: 0,
            nps_delta: -1,
            morale_delta: -2,
            backlog_delta: 3,
            notes: 'note'
          },
          decay: 'slow'
        }
      ],
      active_rewards: [
        {
          category: 'demand',
          tier: 1,
          name: 'Reward',
          effects: {
            revenue_delta: 2,
            cogs_delta: -1,
            opex_delta: 0,
            cash_delta: 1,
            share_delta: 1,
            nps_delta: 1,
            morale_delta: 2,
            backlog_delta: -2,
            notes: 'bonus'
          },
          decay: 'fast'
        }
      ]
    }

    const event: RngEvent = {
      roll: 10,
      event_type: 'supply_shock',
      tier: '2',
      name: 'Snow',
      effects: {
        revenue_delta: 1,
        cogs_delta: -2,
        opex_delta: 0,
        cash_delta: 3,
        share_delta: 1,
        nps_delta: -1,
        morale_delta: 2,
        backlog_delta: -5,
        notes: 'severe'
      },
      hints: ['supply']
    }

    const { userPrompt } = buildEvaluatorPrompt('hi', state, event)
    expect(userPrompt).toContain('Financial metrics:')
    expect(userPrompt).toContain('Enhanced KPIs:')
    expect(userPrompt).toContain('Risk metrics:')
    expect(userPrompt).toContain('Active Shocks:')
    expect(userPrompt).toContain('Active Rewards:')
    expect(userPrompt).toContain('Event Effects:')
    expect(userPrompt).toContain('Hints: supply')
  })
})

