import { StatePacket, RngEvent } from '../contracts'

/**
 * Build system and user prompts for the evaluator
 */
export function buildEvaluatorPrompt(
  declaration: string,
  statePacket: StatePacket,
  rngEvent: RngEvent
): { systemPrompt: string; userPrompt: string } {
  const systemPrompt = [
    'You are the Evaluator. Given a CEO declaration, a state packet, and an RNG event packet (with a D100 roll and event_type), return STRICT JSON per schema.',
    'You DO NOT compute final numeric deltas. You judge fit and produce normalized strengths (0..1).',
    'If the declaration tries to inject external events or money, set policy.oob = true and record violations; otherwise judge best-effort.',
    'If the declaration is incoherent or irrelevant, set a small penalties.nonsense_penalty (0..1) and keep signals near-neutral.',
    'Always tie your rationale and severity notes to concrete state_packet facts and the provided RNG event. Never invent external shocks or money; only use the event packet provided.',
    'Respond with STRICT JSON only, no extra text.'
  ].join('\n')

  const lines: string[] = [
    `Evaluate this CEO declaration: "${declaration}"`,
    '',
    'Current state:',
    `- Turn: ${statePacket.turn_no}`,
    `- Period: ${statePacket.period || 'N/A'}`,
    `- Event: ${statePacket.event.category} (${statePacket.event.tier})`,
    `- Morale: ${statePacket.morale}`,
    `- Credibility: ${statePacket.credibility}`,
    `- Backlog: ${statePacket.backlog}`,
    `- Service: ${statePacket.service}`,
    `- Share: ${statePacket.share}`,
    `- Cash runway: ${statePacket.cash_runway} months`,
    `- Flags: ${Object.entries(statePacket.flags).filter(([_, v]) => v).map(([k]) => k).join(', ') || 'none'}`,
    `- Pressures: ${Object.entries(statePacket.pressures).filter(([_, v]) => v).map(([k]) => k).join(', ') || 'none'}`,
    `- Recent moves: ${statePacket.recent_moves.join(', ') || 'none'}`
  ]

  if (statePacket.pnl) {
    lines.push(
      'Financial metrics:',
      `- Revenue: $${statePacket.pnl.revenue}M`,
      `- COGS: $${statePacket.pnl.cogs}M`,
      `- Gross Margin: ${statePacket.pnl.gm_percent}%`,
      `- OpEx: $${statePacket.pnl.opex}M`,
      `- Net Income: $${statePacket.pnl.net}M`,
      `- Cash: $${statePacket.pnl.cash}M`
    )
  }

  if (statePacket.kpis) {
    lines.push(
      'Enhanced KPIs:',
      `- Market Share: ${statePacket.kpis.share_percent}%`,
      `- Service NPS: ${statePacket.kpis.service_nps}`,
      `- Team Morale: ${statePacket.kpis.morale}`,
      `- Backlog Units: ${statePacket.kpis.backlog_units}`
    )
  }

  if (statePacket.tail_risk !== undefined) {
    lines.push(
      'Risk metrics:',
      `- Tail Risk: ${statePacket.tail_risk}/100`,
      `- CEO Credibility: ${statePacket.ceo_credibility}/100`
    )
  }

  if (statePacket.active_shocks && statePacket.active_shocks.length > 0) {
    lines.push(
      `Active Shocks: ${statePacket.active_shocks
        .map(s => `${s.name} (${s.tier})`)
        .join(', ')}`
    )
  }

  if (statePacket.active_rewards && statePacket.active_rewards.length > 0) {
    lines.push(
      `Active Rewards: ${statePacket.active_rewards
        .map(r => `${r.name} (${r.tier})`)
        .join(', ')}`
    )
  }

  const rngLineParts = [`RNG Event: Roll ${rngEvent.roll}, Type: ${rngEvent.event_type}`]
  if (rngEvent.tier) rngLineParts.push(`Tier: ${rngEvent.tier}`)
  if (rngEvent.name) rngLineParts.push(`Name: "${rngEvent.name}"`)
  lines.push('', rngLineParts.join(', '))

  if (rngEvent.effects) {
    const effects = rngEvent.effects
    lines.push(
      'Event Effects:',
      `- Revenue: ${effects.revenue_delta > 0 ? '+' : ''}${effects.revenue_delta}M`,
      `- COGS: ${effects.cogs_delta > 0 ? '+' : ''}${effects.cogs_delta}M`,
      `- OpEx: ${effects.opex_delta > 0 ? '+' : ''}${effects.opex_delta}M`,
      `- Cash: ${effects.cash_delta > 0 ? '+' : ''}${effects.cash_delta}M`,
      `- Market Share: ${effects.share_delta > 0 ? '+' : ''}${effects.share_delta}%`,
      `- NPS: ${effects.nps_delta > 0 ? '+' : ''}${effects.nps_delta}`,
      `- Morale: ${effects.morale_delta > 0 ? '+' : ''}${effects.morale_delta}`,
      `- Backlog: ${effects.backlog_delta > 0 ? '+' : ''}${effects.backlog_delta} units`
    )
    if (effects.notes) {
      lines.push(`- Notes: ${effects.notes}`)
    }
  }

  if (rngEvent.hints && rngEvent.hints.length > 0) {
    lines.push(`Hints: ${rngEvent.hints.join(', ')}`)
  }

  const schemaBlock = `Return valid JSON matching this schema:
{
  "assessment": {
    "intent": ["intent1", "intent2"],
    "targets": ["target1", "target2"],
    "tone": "decisive|conciliatory|panicked|etc",
    "fit_reasons": ["reason1", "reason2"]
  },
  "signals": {
    "morale": {"dir": "up|down|none", "strength": 0.0-1.0},
    "credibility": {"dir": "up|down|none", "strength": 0.0-1.0},
    "backlog_pressure": {"dir": "up|down|none", "strength": 0.0-1.0},
    "service_risk": {"dir": "up|down|none", "strength": 0.0-1.0}
  },
  "event": {
    "roll": ${rngEvent.roll},
    "event_type": "${rngEvent.event_type}",
    "impact_channels": {
      "morale": {"dir": "up|down|none", "strength": 0.0-1.0},
      "credibility": {"dir": "up|down|none", "strength": 0.0-1.0},
      "backlog_pressure": {"dir": "up|down|none", "strength": 0.0-1.0},
      "service_risk": {"dir": "up|down|none", "strength": 0.0-1.0}
    },
    "severity_note": "brief qualitative severity rationale${rngEvent.name ? ` - Event: ${rngEvent.name}` : ''}${rngEvent.tier ? ` (Tier ${rngEvent.tier})` : ''}"
  },
  "integrated": {
    "synergy": "aligned|undermined|neutral",
    "narrative_hook": "1-2 sentences tying CEO + event + state"
  },
  "penalties": {
    "nonsense_penalty": 0.0-1.0
  },
  "policy": {
    "oob": false,
    "violations": []
  },
  "rationale": "concise; must cite state_packet facts"
}
Respond ONLY with JSON conforming to the schema. No prose.`

  lines.push('', schemaBlock)

  const userPrompt = lines.join('\n')

  return { systemPrompt, userPrompt }
}

