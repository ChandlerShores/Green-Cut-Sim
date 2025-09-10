import { State, StatePacket, Caps, EvaluatorOutput, TurnResult, DEFAULT_CAPS, RngEvent, RngEventType, EventTier, ActiveEvent } from './contracts'
import { computeFinancials } from "./finance";
import {
  FinanceInput,
  FinancialDrivers,
  FinancialParams,
  FinancialSnapshot,
  MiniBalanceSheet
} from "./contracts";

export class Engine {
  private caps: Caps

  constructor(caps: Caps = DEFAULT_CAPS) {
    this.caps = caps
  }

  /**
   * Create initial state for a new run (enhanced with Python prototype fields)
   */
  createInitialState(seed: string): State {
    // Simple deterministic seed-based state generation
    const hash = this.hashString(seed)
    
    return {
      turn_no: 0,
      period: "Sep 2025",
      // Financial metrics (from Python prototype)
      pnl: {
        revenue: 12.0,
        cogs: 7.2,
        gm_percent: 40.0,
        opex: 3.8,
        net: 1.0,
        cash: 7.5
      },
      // KPIs (enhanced)
      kpis: {
        share_percent: 8.4,
        service_nps: 74,
        morale: 66,
        backlog_units: 6000
      },
      // Legacy event field
      event: {
        category: (['market', 'operational', 'financial', 'regulatory', 'competitive'] as const)[hash % 5],
        tier: (['low', 'medium', 'high', 'critical'] as const)[hash % 4]
      },
      // Legacy state fields (maintained for backward compatibility)
      morale: 75 + (hash % 20),
      credibility: 70 + (hash % 25),
      backlog: 1000 + (hash % 500),
      service: 85 + (hash % 15),
      share: 100 + (hash % 50),
      cash_runway: 18 + (hash % 12),
      // Enhanced flags system
      flags: {
        // Legacy boolean flags
        supply_fragile: (hash % 3) === 0,
        labor_tense: (hash % 4) === 0,
        quality_watch: (hash % 5) === 0,
        tail_risk: (hash % 6) === 0,
        // Enhanced pressure system (0-1 scale)
        supply: 0.10,
        labor: 0.05,
        quality: 0.00,
        competition: 0.10,
        finance: 0.00,
        regulation: 0.00,
        tech: 0.05,
        weather: 0.05
      },
      pressures: {
        margin_push: (hash % 3) === 0
      },
      headroom: {
        ot_pct: (hash % 20),
        temps_allowed: (hash % 2) === 0
      },
      recent_moves: [],
      // Enhanced fields from Python prototype
      tail_risk: 5,
      shock_decay: 0.10,
      reward_decay: 0.50,
      ceo_credibility: 72,
      active_shocks: [],
      active_rewards: [],
      notes: []
    }
  }

  /**
   * Generate enhanced RNG event with shock pressure and tier system (from Python prototype)
   */
  generateEnhancedRngEvent(state: State, turnIndex: number): RngEvent {
    // Compute shock pressure from flags and company health (like Python prototype)
    const flagSum = Object.entries(state.flags)
      .filter(([key]) => ['supply', 'labor', 'quality', 'competition', 'finance', 'regulation', 'tech', 'weather'].includes(key))
      .reduce((sum, [_, value]) => sum + (typeof value === 'number' ? value : 0), 0)
    
    let shockPressure = Math.round(flagSum * 20) // 0-20 scale
    
    // Add pressure based on company health
    const morale = state.kpis?.morale || state.morale
    const backlog = state.kpis?.backlog_units || state.backlog
    const cash = state.pnl?.cash || (state.cash_runway * 0.5) // Rough conversion
    
    if (morale < 60) shockPressure += 5
    if (backlog > 8000) shockPressure += 5
    if (cash < 5.0) shockPressure += 5
    
    shockPressure = Math.min(shockPressure, 20)
    
    // Generate deterministic rolls
    const seed = this.hashString(JSON.stringify(state) + turnIndex.toString())
    const shockRollRaw = (seed % 100) + 1
    const rewardRollRaw = ((seed * 7) % 100) + 1 // Different seed for reward
    
    const rollWithPressure = Math.min(100, shockRollRaw + shockPressure)
    
    // Determine tier from roll
    const shockTier = this.tierFromRoll(rollWithPressure)
    const rewardTier = this.tierFromRoll(rewardRollRaw)
    
    // Choose categories
    const categories = ['supply', 'labor', 'quality', 'competition', 'finance', 'regulation', 'tech', 'weather']
    const shockCat = categories[seed % categories.length]
    const rewardCat = categories[(seed * 3) % categories.length]
    
    // Generate shock event
    const shockEvent = this.applyShock(shockCat, shockTier, state)
    const rewardEvent = this.applyReward(rewardCat, rewardTier)
    
    // Return the shock event (primary event for this turn)
    return {
      roll: shockRollRaw,
      event_type: shockCat as RngEventType,
      tier: shockTier.toString() as EventTier,
      name: shockEvent.name,
      effects: shockEvent.effects,
      flag_bump: shockEvent.flag_bump,
      tail_risk_bump: shockEvent.tail_risk_bump,
      hints: this.generateHints(state, shockCat, shockTier)
    }
  }

  /**
   * Convert roll to tier (0-3) like Python prototype
   */
  private tierFromRoll(roll: number): number {
    if (roll <= 40) return 0
    else if (roll <= 80) return 1
    else if (roll <= 96) return 2
    else return 3
  }

  /**
   * Apply shock effects (ported from Python prototype)
   */
  private applyShock(cat: string, tier: number, state: State): { name: string; effects: any; flag_bump: number; tail_risk_bump: number } {
    const effects = {
      revenue_delta: 0.0,
      cogs_delta: 0.0,
      opex_delta: 0.0,
      cash_delta: 0.0,
      share_delta: 0.0,
      nps_delta: 0,
      morale_delta: 0,
      backlog_delta: 0,
      notes: ""
    }
    
    let name = ""
    let flag_bump = 0.0
    let tail_risk_bump = 0
    
    if (tier === 0) {
      name = `Thin ice (${cat})`
      effects.notes = "No immediate hit, but jitters build."
      tail_risk_bump = 1
      flag_bump = 0.02
    } else if (cat === "supply") {
      if (tier === 1) {
        name = "Port delay on batteries"
        effects.revenue_delta = -0.6
        effects.cogs_delta = 0.1
        effects.backlog_delta = 1200
        effects.morale_delta = -2
        flag_bump = 0.08
        tail_risk_bump = 5
      } else if (tier === 2) {
        name = "Tier-2 vendor outage (motors)"
        effects.revenue_delta = -1.5
        effects.cogs_delta = 0.4
        effects.backlog_delta = 3000
        effects.morale_delta = -4
        flag_bump = 0.15
        tail_risk_bump = 10
      } else if (tier === 3) {
        name = "Factory shutdown (safety inspection)"
        effects.revenue_delta = -3.0
        effects.cogs_delta = 0.8
        effects.backlog_delta = 6000
        effects.morale_delta = -8
        flag_bump = 0.25
        tail_risk_bump = 15
      }
    } else if (cat === "labor") {
      if (tier === 1) {
        name = "Skilled assembler attrition tick up"
        effects.opex_delta = 0.1
        effects.cogs_delta = 0.2
        effects.morale_delta = -3
        effects.backlog_delta = 500
        flag_bump = 0.07
        tail_risk_bump = 5
      } else if (tier === 2) {
        name = "Shift walkouts"
        effects.revenue_delta = -1.0
        effects.cogs_delta = 0.3
        effects.morale_delta = -8
        effects.backlog_delta = 2500
        flag_bump = 0.12
        tail_risk_bump = 10
      } else if (tier === 3) {
        name = "Union strike notice"
        effects.revenue_delta = -2.0
        effects.opex_delta = 0.3
        effects.morale_delta = -12
        effects.backlog_delta = 5000
        flag_bump = 0.2
        tail_risk_bump = 15
      }
    } else if (cat === "quality") {
      if (tier === 1) {
        name = "Spike in warranty claims (starter cord)"
        effects.opex_delta = 0.2
        effects.nps_delta = -4
        effects.share_delta = -0.2
        flag_bump = 0.06
        tail_risk_bump = 4
      } else if (tier === 2) {
        name = "Limited recall (blade hub)"
        effects.revenue_delta = -0.7
        effects.opex_delta = 0.6
        effects.nps_delta = -8
        effects.share_delta = -0.6
        flag_bump = 0.12
        tail_risk_bump = 9
      } else if (tier === 3) {
        name = "Major recall (battery fire risk)"
        effects.revenue_delta = -2.5
        effects.opex_delta = 1.2
        effects.nps_delta = -15
        effects.share_delta = -1.5
        flag_bump = 0.25
        tail_risk_bump = 16
      }
    } else if (cat === "competition") {
      if (tier === 1) {
        name = "Rival promo blitz at big-box"
        effects.share_delta = -0.4
        effects.revenue_delta = -0.5
        flag_bump = 0.06
        tail_risk_bump = 5
      } else if (tier === 2) {
        name = "Competitor exclusive shelf at key retailer"
        effects.share_delta = -0.9
        effects.revenue_delta = -1.2
        flag_bump = 0.1
        tail_risk_bump = 9
      } else if (tier === 3) {
        name = "New entrant undercuts with ultra-low price"
        effects.share_delta = -1.5
        effects.revenue_delta = -2.0
        flag_bump = 0.16
        tail_risk_bump = 12
      }
    } else if (cat === "finance") {
      if (tier === 1) {
        name = "Credit insurer tightens terms"
        effects.cash_delta = -0.5
        effects.opex_delta = 0.1
        flag_bump = 0.05
        tail_risk_bump = 6
      } else if (tier === 2) {
        name = "Working capital squeeze"
        effects.cash_delta = -1.0
        effects.opex_delta = 0.2
        effects.revenue_delta = -0.4
        flag_bump = 0.1
        tail_risk_bump = 10
      } else if (tier === 3) {
        name = "Credit line cap reduced"
        effects.cash_delta = -2.0
        effects.revenue_delta = -0.8
        flag_bump = 0.15
        tail_risk_bump = 14
      }
    } else if (cat === "regulation") {
      if (tier === 1) {
        name = "Noise standard scrutiny"
        effects.opex_delta = 0.1
        flag_bump = 0.04
        tail_risk_bump = 5
      } else if (tier === 2) {
        name = "New emissions testing backlog"
        effects.revenue_delta = -0.6
        effects.opex_delta = 0.2
        flag_bump = 0.08
        tail_risk_bump = 10
      } else if (tier === 3) {
        name = "Sudden compliance rule change"
        effects.revenue_delta = -1.5
        effects.opex_delta = 0.7
        flag_bump = 0.15
        tail_risk_bump = 15
      }
    } else if (cat === "tech") {
      if (tier === 1) {
        name = "Firmware bug causing false error codes"
        effects.opex_delta = 0.2
        effects.nps_delta = -3
        flag_bump = 0.06
        tail_risk_bump = 6
      } else if (tier === 2) {
        name = "Connectivity outage in smart models"
        effects.revenue_delta = -0.5
        effects.opex_delta = 0.3
        effects.nps_delta = -6
        flag_bump = 0.1
        tail_risk_bump = 10
      } else if (tier === 3) {
        name = "Cyber incident at supplier"
        effects.revenue_delta = -1.5
        effects.cash_delta = -0.5
        effects.opex_delta = 0.4
        flag_bump = 0.18
        tail_risk_bump = 14
      }
    } else if (cat === "weather") {
      if (tier === 1) {
        name = "Mild week reduces weekend traffic"
        effects.revenue_delta = -0.3
        flag_bump = 0.04
        tail_risk_bump = 3
      } else if (tier === 2) {
        name = "Unseasonal rains dampen sales"
        effects.revenue_delta = -0.9
        flag_bump = 0.08
        tail_risk_bump = 7
      } else if (tier === 3) {
        name = "Storm disrupts regional distribution"
        effects.revenue_delta = -1.6
        effects.backlog_delta = 1000
        flag_bump = 0.12
        tail_risk_bump = 10
      }
    }
    
    return { name, effects, flag_bump, tail_risk_bump }
  }

  /**
   * Apply reward effects (ported from Python prototype)
   */
  private applyReward(cat: string, tier: number): { name: string; effects: any } {
    const effects = {
      revenue_delta: 0.0,
      cogs_delta: 0.0,
      opex_delta: 0.0,
      cash_delta: 0.0,
      share_delta: 0.0,
      nps_delta: 0,
      morale_delta: 0,
      backlog_delta: 0,
      notes: ""
    }
    
    let name = ""
    
    if (tier === 0) {
      name = `Quiet tailwind (${cat})`
      effects.notes = "No obvious bump, but teams feel a breeze."
    } else if (cat === "supply") {
      if (tier === 1) {
        name = "Vendor early shipment"
        effects.revenue_delta = 0.4
        effects.backlog_delta = -800
      } else if (tier === 2) {
        name = "Bulk buy discount"
        effects.cogs_delta = -0.4
        effects.cash_delta = -0.4
      } else if (tier === 3) {
        name = "Windfall allocation ahead of rivals"
        effects.revenue_delta = 1.2
        effects.cogs_delta = -0.3
        effects.backlog_delta = -1500
      }
    } else if (cat === "labor") {
      if (tier === 1) {
        name = "Productivity surge"
        effects.cogs_delta = -0.2
        effects.morale_delta = 3
      } else if (tier === 2) {
        name = "Referral hiring wave"
        effects.opex_delta = 0.1
        effects.backlog_delta = -1200
        effects.morale_delta = 4
      } else if (tier === 3) {
        name = "Breakthrough training effect"
        effects.cogs_delta = -0.5
        effects.backlog_delta = -2000
        effects.morale_delta = 6
      }
    } else if (cat === "quality") {
      if (tier === 1) {
        name = "Glowing third-party review"
        effects.share_delta = 0.3
        effects.nps_delta = 4
      } else if (tier === 2) {
        name = "Warranty claims drop"
        effects.opex_delta = -0.3
        effects.nps_delta = 5
      } else if (tier === 3) {
        name = "Industry award for reliability"
        effects.share_delta = 0.8
        effects.nps_delta = 8
      }
    } else if (cat === "competition") {
      if (tier === 1) {
        name = "Rival stumbles on logistics"
        effects.share_delta = 0.3
        effects.revenue_delta = 0.4
      } else if (tier === 2) {
        name = "Exclusive endcap placement"
        effects.share_delta = 0.7
        effects.revenue_delta = 0.9
      } else if (tier === 3) {
        name = "Retailer co-op funds bonus"
        effects.opex_delta = -0.5
        effects.revenue_delta = 1.0
        effects.cash_delta = 0.3
      }
    } else if (cat === "finance") {
      if (tier === 1) {
        name = "FX tailwind"
        effects.revenue_delta = 0.3
      } else if (tier === 2) {
        name = "Tax credit approval"
        effects.cash_delta = 0.8
      } else if (tier === 3) {
        name = "Favorable credit facility"
        effects.cash_delta = 1.5
      }
    } else if (cat === "regulation") {
      if (tier === 1) {
        name = "Grant for electrification"
        effects.cash_delta = 0.5
      } else if (tier === 2) {
        name = "Certification fast-track"
        effects.revenue_delta = 0.6
        effects.backlog_delta = -800
      } else if (tier === 3) {
        name = "Tariff relief"
        effects.cogs_delta = -0.6
      }
    } else if (cat === "tech") {
      if (tier === 1) {
        name = "Firmware optimization"
        effects.cogs_delta = -0.1
        effects.nps_delta = 2
      } else if (tier === 2) {
        name = "Manufacturing automation tweak"
        effects.cogs_delta = -0.3
      } else if (tier === 3) {
        name = "Breakthrough battery yield"
        effects.revenue_delta = 0.8
        effects.cogs_delta = -0.4
      }
    } else if (cat === "weather") {
      if (tier === 1) {
        name = "Sunny weekend surge"
        effects.revenue_delta = 0.3
      } else if (tier === 2) {
        name = "Early growth season"
        effects.revenue_delta = 0.8
      } else if (tier === 3) {
        name = "Prolonged mowing season"
        effects.revenue_delta = 1.2
      }
    }
    
    return { name, effects }
  }

  /**
   * Generate hints based on state and event
   */
  private generateHints(state: State, category: string, tier: number): string[] {
    const hints: string[] = []
    
    // Add category-specific hints
    const flagValue = state.flags[category as keyof typeof state.flags]
    if (typeof flagValue === 'number' && flagValue > 0.1) {
      hints.push(`${category}_pressure`)
    }
    
    // Add general state hints
    if (state.kpis?.morale && state.kpis.morale < 60) hints.push('morale_low')
    if (state.kpis?.backlog_units && state.kpis.backlog_units > 8000) hints.push('backlog_high')
    if (state.pnl?.cash && state.pnl.cash < 5.0) hints.push('cash_tight')
    if (state.tail_risk && state.tail_risk > 20) hints.push('tail_risk_elevated')
    
    return hints.length > 0 ? hints : []
  }

  /**
   * Generate a deterministic RNG event for a turn (legacy method for backward compatibility)
   */
  generateRngEvent(state: State, turnIndex: number): RngEvent {
    // Use enhanced method by default, but fall back to legacy if needed
    return this.generateEnhancedRngEvent(state, turnIndex)
  }

  /**
   * Apply context modifications based on flags
   */
  private applyContextMods(state: State): State {
    const modded = { ...state }

    // Labor tense affects morale and credibility
    if (state.flags.labor_tense) {
      modded.morale = Math.min(100, modded.morale * 1.2)
      modded.credibility = Math.max(0, modded.credibility * 0.9)
    }

    // Supply fragile affects service risk (handled in applySignals)
    // High morale decay
    if (modded.morale > 85) {
      modded.morale = Math.max(0, modded.morale * 0.8)
    }

    return modded
  }

  /**
   * Apply CEO signals to state and return deltas
   */
  private applyCEOSignals(signals: EvaluatorOutput['signals'], state: State, caps: Caps): Record<string, number> {
    const deltas: Record<string, number> = {}
    
    // Map new signal structure to legacy structure for compatibility
    const legacySignals = {
      morale: { direction: signals.morale.dir, strength: signals.morale.strength },
      credibility: { direction: signals.credibility.dir, strength: signals.credibility.strength },
      backlog: { direction: signals.backlog_pressure.dir, strength: signals.backlog_pressure.strength },
      service: { direction: signals.service_risk.dir, strength: signals.service_risk.strength }
    }
    
    // Apply each signal
    Object.entries(legacySignals).forEach(([key, signal]) => {
      if (signal.direction === 'none') {
        deltas[key] = 0
        return
      }

      const sign = signal.direction === 'up' ? 1 : -1
      let strength = signal.strength

      // Special handling for backlog pressure
      if (key === 'backlog') {
        const unitsDelta = Math.round(strength * 250) * sign
        const supplyMod = state.flags.supply_fragile ? 1.2 : 1.0
        deltas[key] = unitsDelta * supplyMod
      } else {
        // Standard signal application
        const cap = caps[key as keyof Caps] || 1.0
        deltas[key] = strength * cap * sign
      }
    })

    return deltas
  }

  /**
   * Apply event impact channels to state and return deltas
   */
  private applyEventImpact(eventImpact: EvaluatorOutput['event']['impact_channels'], state: State, caps: Caps): Record<string, number> {
    const deltas: Record<string, number> = {}
    
    // Apply event impact channels
    Object.entries(eventImpact).forEach(([key, signal]) => {
      if (!signal || signal.dir === 'none') return
      
      const sign = signal.dir === 'up' ? 1 : -1
      let strength = signal.strength

      // Map event impact keys to state keys
      let stateKey = key
      if (key === 'backlog_pressure') stateKey = 'backlog'
      if (key === 'service_risk') stateKey = 'service'

      // Special handling for backlog
      if (stateKey === 'backlog') {
        const unitsDelta = Math.round(strength * 200) * sign // Event impact is typically smaller than CEO actions
        const supplyMod = state.flags.supply_fragile ? 1.3 : 1.0
        deltas[stateKey] = (deltas[stateKey] || 0) + unitsDelta * supplyMod
      } else {
        // Standard event impact application
        const cap = caps[key as keyof Caps] || 1.0
        deltas[stateKey] = (deltas[stateKey] || 0) + strength * cap * sign * 0.8 // Event impact is 80% of CEO impact
      }
    })

    return deltas
  }

  /**
   * Apply nonsense penalty as a small negative impact
   */
  private applyNonsensePenalty(nonsensePenalty: number, state: State, caps: Caps): Record<string, number> {
    if (nonsensePenalty <= 0) return {}
    
    // Apply penalty primarily to credibility, with some to morale
    const penaltyCap = caps.credibility * 0.2 // Small penalty cap
    const credibilityPenalty = -nonsensePenalty * penaltyCap
    
    // Distribute some penalty to morale if credibility is already low
    let moralePenalty = 0
    if (state.credibility < 50) {
      moralePenalty = -nonsensePenalty * caps.morale * 0.1
    }
    
    return {
      credibility: credibilityPenalty,
      morale: moralePenalty
    }
  }

  /**
   * Apply signals to state and return deltas
   */
  applySignals(evaluatorOutput: EvaluatorOutput, state: State, caps: Caps): Record<string, number> {
    // Apply CEO signals first
    const ceoDeltas = this.applyCEOSignals(evaluatorOutput.signals, state, caps)
    
    // Apply event impact second
    const eventDeltas = this.applyEventImpact(evaluatorOutput.event.impact_channels, state, caps)
    
    // Apply nonsense penalty third
    const penaltyDeltas = this.applyNonsensePenalty(evaluatorOutput.penalties.nonsense_penalty, state, caps)
    
    // Combine all deltas
    const combinedDeltas = { ...ceoDeltas }
    
    Object.entries(eventDeltas).forEach(([key, delta]) => {
      combinedDeltas[key] = (combinedDeltas[key] || 0) + delta
    })
    
    Object.entries(penaltyDeltas).forEach(([key, delta]) => {
      combinedDeltas[key] = (combinedDeltas[key] || 0) + delta
    })
    
    return combinedDeltas
  }

  /**
   * Clamp deltas to caps and return applied deltas
   */
  private clampDeltas(deltas: Record<string, number>, state: State, caps: Caps): { morale: number; credibility: number; backlog: number; service: number; share: number; cash_runway: number } {
    const applied: { morale: number; credibility: number; backlog: number; service: number; share: number; cash_runway: number } = {
      morale: 0,
      credibility: 0,
      backlog: 0,
      service: 0,
      share: 0,
      cash_runway: 0
    }
    
    Object.entries(deltas).forEach(([key, delta]) => {
      let cap = 1.0
      
      // Map metrics to appropriate caps
      if (key === 'morale') cap = caps.morale
      else if (key === 'credibility') cap = caps.credibility
      else if (key === 'service') cap = caps.service_risk
      else if (key === 'backlog') cap = caps.backlog_pressure * 250 // Backlog is unit-based, not percentage-based
      else if (key === 'share') cap = caps.backlog_pressure
      else if (key === 'cash_runway') cap = caps.backlog_pressure
      
      // Clamp to caps
      const clamped = Math.max(-cap, Math.min(cap, delta))
      if (key in applied) {
        (applied as any)[key] = clamped
      }
    })

    return applied
  }

  /**
   * Resolve a turn and return the result
   */
  resolveTurn(
    state: State,
    declaration: string,
    evaluatorOutput: EvaluatorOutput
  ): TurnResult {
    // Apply context modifications
    const moddedState = this.applyContextMods(state)
    
    // Apply signals to get deltas (now handles CEO + Event + Penalty)
    const rawDeltas = this.applySignals(evaluatorOutput, moddedState, this.caps)
    
    // Clamp deltas to caps
    const appliedDeltas = this.clampDeltas(rawDeltas, moddedState, this.caps)
    
    // Create new state
    const newState: State = {
      ...moddedState,
      turn_no: moddedState.turn_no + 1,
      morale: Math.max(0, Math.min(100, moddedState.morale + (appliedDeltas.morale || 0))),
      credibility: Math.max(0, Math.min(100, moddedState.credibility + (appliedDeltas.credibility || 0))),
      backlog: Math.max(0, moddedState.backlog + (appliedDeltas.backlog || 0)),
      service: Math.max(0, Math.min(100, moddedState.service + (appliedDeltas.service || 0))),
      share: Math.max(0, moddedState.share + (appliedDeltas.share || 0)),
      cash_runway: Math.max(0, moddedState.cash_runway + (appliedDeltas.cash_runway || 0)),
      recent_moves: [...moddedState.recent_moves.slice(-1), declaration].slice(-2)
    }

    // Generate placeholder narrative and quotes (will be replaced by narrator)
    const narrative = `Turn ${newState.turn_no} completed. The CEO's declaration "${declaration}" has been processed.`
    const quotes = [
      "CFO: We're monitoring the impact closely.",
      "Chair: The board is aligned with this direction.",
      "Ops: Execution is proceeding as planned."
    ]

    // --- Compute financials for this turn ---
    const prevBalance = this.getPrevBalanceFromState(state);
    
    // Start from stable baselines
    let drivers: FinancialDrivers = { ...BASELINE_DRIVERS };
    let params: FinancialParams = { ...FINANCE_PARAMS_DEFAULT };
    const explainers: string[] = [];

    // 3.1 CEO signals → demand/price/ops adjustments
    if (evaluatorOutput.signals?.morale) {
      const m = sgn(evaluatorOutput.signals.morale.dir) * (evaluatorOutput.signals.morale.strength || 0);
      if (m !== 0) {
        drivers.units_sold *= (1 + COEF.morale_to_units * m);
        explainers.push(m > 0 ? "Higher morale lifted throughput/demand" : "Lower morale softened throughput");
      }
    }
    if (evaluatorOutput.signals?.credibility) {
      const c = sgn(evaluatorOutput.signals.credibility.dir) * (evaluatorOutput.signals.credibility.strength || 0);
      if (c !== 0) {
        drivers.avg_price *= (1 + COEF.cred_to_price * c);
        explainers.push(c > 0 ? "Rising credibility supported ASP" : "Credibility strain pressured pricing");
      }
    }
    if (evaluatorOutput.signals?.backlog_pressure) {
      const b = sgn(evaluatorOutput.signals.backlog_pressure.dir) * (evaluatorOutput.signals.backlog_pressure.strength || 0);
      if (b !== 0) {
        drivers.units_sold *= (1 + COEF.backlog_to_units * b);
        // backlog also ties up inventory days (handled below)
        explainers.push(b > 0 ? "Backlog pressure constrained fulfilled units" : "Easing backlog improved fulfillment");
      }
    }
    if (evaluatorOutput.signals?.service_risk) {
      const s = sgn(evaluatorOutput.signals.service_risk.dir) * (evaluatorOutput.signals.service_risk.strength || 0);
      if (s !== 0) {
        // proxy returns/scrap via cost or scrap_rate (we'll use params.scrap_rate to keep cost comp explicit in finance.ts)
        params.scrap_rate = clamp((params.scrap_rate ?? 0) + COEF.service_to_returns * Math.max(0, s), 0, 0.25);
        explainers.push(s > 0 ? "Service risk increased scrap/returns" : "Lower service risk reduced scrap/returns");
      }
    }

    // Working capital effects (days)
    // Start from baseline days
    let dso = drivers.dso;
    let dpo = drivers.dpo;
    let dio = drivers.dio;

    // Service risk → DSO
    if (evaluatorOutput.signals?.service_risk) {
      const s = sgn(evaluatorOutput.signals.service_risk.dir) * (evaluatorOutput.signals.service_risk.strength || 0);
      if (s > 0) { dso += COEF.service_to_dso_days * s; }
    }

    // Backlog pressure → DIO
    if (evaluatorOutput.signals?.backlog_pressure) {
      const b = sgn(evaluatorOutput.signals.backlog_pressure.dir) * (evaluatorOutput.signals.backlog_pressure.strength || 0);
      if (b > 0) { dio += COEF.backlog_to_dio_days * b; }
    }

    // State flags (example: supply fragility boosts DIO)
    if (state?.flags?.supply_fragile) {
      dio += COEF.supplyFragile_to_dio;
      explainers.push("Supply fragility extended inventory days");
    }

    // RNG event nudges (if present)
    if (evaluatorOutput.event?.event_type === "reg_probe") {
      dso += COEF.regProbe_to_dso;
      explainers.push("Regulatory scrutiny stretched receivables");
    }

    // clamp within bounds
    drivers.dso = clamp(dso, DRIVER_BOUNDS.dso_min, DRIVER_BOUNDS.dso_max);
    drivers.dpo = clamp(dpo, DRIVER_BOUNDS.dpo_min, DRIVER_BOUNDS.dpo_max);
    drivers.dio = clamp(dio, DRIVER_BOUNDS.dio_min, DRIVER_BOUNDS.dio_max);

    // Nonsense penalty → small credibility/demand drag (deterministic split)
    const pen = Math.max(0, evaluatorOutput.penalties?.nonsense_penalty || 0);
    if (pen > 0) {
      // split penalty between price or units via deterministic hash of declaration
      const h = hashStr(declaration || "");
      const splitToUnits = (h % 2) === 0;
      if (splitToUnits) {
        drivers.units_sold *= (1 - 0.01 * pen); // up to -1%
        explainers.push("Minor reputational drag softened demand");
      } else {
        drivers.avg_price *= (1 - 0.01 * pen); // up to -1%
        explainers.push("Minor reputational drag trimmed pricing power");
      }
    }

    // Event impact channels (if your Evaluator returns them already)
    if (evaluatorOutput.event?.impact_channels) {
      const ic = evaluatorOutput.event.impact_channels;
      // If event increases service risk, nudge scrap_rate (already handled via signals, but event can add)
      if (ic.service_risk?.dir === "up") {
        params.scrap_rate = clamp((params.scrap_rate ?? 0) + COEF.service_to_returns * (ic.service_risk.strength || 0), 0, 0.25);
        explainers.push("Event pressure raised service friction");
      }
      if (ic.backlog_pressure?.dir === "up") {
        drivers.units_sold *= (1 + COEF.backlog_to_units * (ic.backlog_pressure.strength || 0));
        dio = clamp(dio + COEF.backlog_to_dio_days * (ic.backlog_pressure.strength || 0), DRIVER_BOUNDS.dio_min, DRIVER_BOUNDS.dio_max);
        drivers.dio = dio;
        explainers.push("Event constraints limited fulfillment and inventory turns");
      }
    }

    // Final clamping for core drivers
    drivers.units_sold = clamp(Math.round(drivers.units_sold), DRIVER_BOUNDS.units_min, DRIVER_BOUNDS.units_max);
    drivers.avg_price = clamp(drivers.avg_price, DRIVER_BOUNDS.price_min, DRIVER_BOUNDS.price_max);
    drivers.unit_cost = clamp(drivers.unit_cost, DRIVER_BOUNDS.cost_min, DRIVER_BOUNDS.cost_max);
    // capex policy: modestly invest when morale up & backlog easing (purely deterministic signal gate)
    if (evaluatorOutput.signals?.morale?.dir === "up" && evaluatorOutput.signals?.backlog_pressure?.dir !== "up") {
      drivers.capex_base = clamp(drivers.capex_base * 1.05, DRIVER_BOUNDS.capex_min, DRIVER_BOUNDS.capex_max);
    }

    const financeInput: FinanceInput = {
      prev_balance: prevBalance,
      drivers,
      params,
      policy: { dividend: false, repay_debt: false } // deterministic policy for now
    };

    const financials: FinancialSnapshot = computeFinancials(financeInput);

    // Check for direct cash spending declarations and apply AFTER normal financial calculation
    const cashSpending = this.detectCashSpending(declaration, evaluatorOutput);
    if (cashSpending > 0) {
      let directCashSpending: number;
      if (cashSpending <= 1) {
        // Percentage-based spending (0-1 range) - use ORIGINAL cash balance, not post-operations
        directCashSpending = prevBalance.cash * cashSpending;
      } else {
        // Absolute amount spending
        directCashSpending = cashSpending;
      }
      explainers.push(`Direct cash expenditure: $${(directCashSpending / 1000000).toFixed(1)}M`);
      
      // Apply direct cash spending as additional outflow after normal operations
      financials.balance.cash = Math.max(0, financials.balance.cash - directCashSpending);
    }

    // Update the newState with computed financials
    newState.pnl = {
      revenue: financials.pnl.revenue / 1000000, // Convert back to millions for consistency
      cogs: financials.pnl.cogs / 1000000,
      gm_percent: (financials.pnl.gross_profit / financials.pnl.revenue) * 100, // Calculate GM%
      opex: financials.pnl.opex / 1000000,
      net: financials.pnl.net_income / 1000000,
      cash: financials.balance.cash / 1000000
    };

    return {
      turn_no: newState.turn_no,
      state_before: state,
      state_after: newState,
      declaration,
      assessment: evaluatorOutput.assessment,
      signals: evaluatorOutput.signals,
      event: evaluatorOutput.event,
      integrated: evaluatorOutput.integrated,
      penalties: evaluatorOutput.penalties,
      policy: evaluatorOutput.policy,
      deltas: {
        morale: rawDeltas.morale || 0,
        credibility: rawDeltas.credibility || 0,
        backlog: rawDeltas.backlog_pressure || 0,
        service: rawDeltas.service_risk || 0,
        share: rawDeltas.share || 0,
        cash_runway: rawDeltas.cash_runway || 0
      },
      applied_deltas: appliedDeltas,
      financials,
      explainers: { finance: explainers },
      narrative,
      quotes
    }
  }

  /**
   * Simple hash function for deterministic state generation
   */
  private hashString(str: string): number {
    let hash = 0
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash // Convert to 32-bit integer
    }
    return Math.abs(hash)
  }

  /**
   * Get current caps
   */
  getCaps(): Caps {
    return { ...this.caps }
  }

  /**
   * Update caps
   */
  updateCaps(newCaps: Partial<Caps>): void {
    this.caps = { ...this.caps, ...newCaps }
  }

  /**
   * Detect direct cash spending declarations
   */
  private detectCashSpending(declaration: string, evaluatorOutput: EvaluatorOutput): number {
    const lowerDecl = declaration.toLowerCase();
    
    // Check for specific cash spending patterns (order matters - more specific first)
    const cashPatterns = [
      // Direct amount patterns (most specific first)
      { pattern: /(\d+(?:\.\d+)?)\s*(?:million|m)\s*(?:in|on|for|to)\s*(?:employee|staff|bonus|bonuses)/, multiplier: 1000000 },
      { pattern: /(\d+(?:\.\d+)?)\s*(?:thousand|k)\s*(?:in|on|for|to)\s*(?:employee|staff|bonus|bonuses)/, multiplier: 1000 },
      { pattern: /(\d+(?:\.\d+)?)\s*(?:billion|b)\s*(?:in|on|for|to)\s*(?:employee|staff|bonus|bonuses)/, multiplier: 1000000000 },
      
      // Percentage of cash patterns (less specific, should come after amount patterns)
      { pattern: /(?:spend|use|give)\s*(\d+(?:\.\d+)?)%\s*(?:of\s*)?(?:our\s*)?(?:cash|money)/, multiplier: 1, isPercentage: true },
      { pattern: /(?:spend|use|give)\s*(?:all|100%)\s*(?:of\s*)?(?:our\s*)?(?:cash|money)/, multiplier: 1, isPercentage: true },
    ];
    
    for (const pattern of cashPatterns) {
      const match = lowerDecl.match(pattern.pattern);
      if (match) {
        if (pattern.isPercentage) {
          const percentage = match[1] ? parseFloat(match[1]) / 100 : 1.0;
          return percentage; // Return as percentage (0-1)
        } else {
          const amount = parseFloat(match[1]);
          return amount * pattern.multiplier;
        }
      }
    }
    
    return 0;
  }

  /**
   * Helper to get previous balance from state or use starting balance
   */
  private getPrevBalanceFromState(state: any): MiniBalanceSheet {
    // If prior financials exist, prefer them; else starting balance.
    return state?.financials?.balance ?? STARTING_BALANCE;
  }
}

// --- Finance defaults (deterministic, conservative) ---
const FINANCE_PARAMS_DEFAULT: FinancialParams = {
  period_days: 30,
  min_cash_buffer: 250_000,           // small operating buffer
  depreciation_life_years: 5,         // straight-line
  price_to_units: 0,                  // elasticities wired later
  morale_to_units: 0,
  credibility_to_price: 0,
  scrap_rate: 0.00                    // service_risk→scrap tuned later
};

// Deterministic starting balance if absent in state
const STARTING_BALANCE: MiniBalanceSheet = {
  cash: 1_000_000,
  ar: 250_000,
  inventory: 300_000,
  ppe: 2_000_000,
  ap: 200_000,
  debt: 0,
  retained_earnings: 1_350_000,
  other_equity: 1_700_000
};

// Conservative baseline drivers; will be adjusted from signals in a later step.
const BASELINE_DRIVERS: FinancialDrivers = {
  units_sold: 10_000,
  avg_price: 100,
  unit_cost: 60,
  opex_base: 300_000,
  capex_base: 50_000,
  dso: 30,  // days
  dpo: 30,  // days
  dio: 45   // days
};

// clamp and signed helpers
const clamp = (x: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, x));
const sgn = (dir: "up" | "down" | "none") => dir === "up" ? +1 : dir === "down" ? -1 : 0;

// deterministic hash (simple) to split penalty across KPIs if needed
function hashStr(s: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

// KPI → Driver elasticities (per unit of normalized strength 0..1)
const COEF = {
  morale_to_units: 0.06,  // +6% units at strength 1 up
  cred_to_price: 0.02,  // +2% ASP at strength 1 up
  backlog_to_units: -0.08,  // -8% units when backlog_pressure up
  service_to_returns: 0.03,  // +3% scrap/returns proxy via unit_cost or scrap_rate
  // Working capital effects (days)
  service_to_dso_days: 3,  // +3 days DSO at strength 1 up
  backlog_to_dio_days: 4,  // +4 days DIO at strength 1 up
  supplyFragile_to_dio: 3,  // +3 DIO if supply fragile flag
  regProbe_to_dso: 2,  // +2 DSO if event is reg probe
};

// Floors/ceilings for the drivers we'll compute each turn
const DRIVER_BOUNDS = {
  units_min: 100, units_max: 1_000_000,
  price_min: 10, price_max: 10_000,
  cost_min: 5, cost_max: 9_999,
  dso_min: 5, dso_max: 90,
  dpo_min: 5, dpo_max: 90,
  dio_min: 5, dio_max: 120,
  capex_min: 0, capex_max: 5_000_000,
};
