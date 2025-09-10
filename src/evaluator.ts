import OpenAI from 'openai'
import {
  StatePacket,
  EvaluatorOutput,
  EvaluatorOutputSchema,
  RngEvent,
  Direction,
  DirStrength,
  Caps
} from './contracts'
import { buildEvaluatorPrompt } from './lib/prompt'

export class Evaluator {
  private openai: OpenAI | null = null
  private hasApiKey: boolean

  constructor() {
    const apiKey = process.env.OPENAI_API_KEY
    this.hasApiKey = !!apiKey
    
    if (this.hasApiKey) {
      this.openai = new OpenAI({
        apiKey: apiKey
      })
    }
  }

  /**
   * Evaluate a CEO declaration against the current state and RNG event
   */
  async evaluate(
    declaration: string, 
    statePacket: StatePacket, 
    rngEvent: RngEvent,
    caps: Caps
  ): Promise<EvaluatorOutput> {
    if (this.hasApiKey && this.openai) {
      return this.evaluateWithLLM(declaration, statePacket, rngEvent, caps)
    } else {
      return this.evaluateWithRules(declaration, statePacket, rngEvent, caps)
    }
  }

  /**
   * LLM-based evaluation using OpenAI
   */
  private async evaluateWithLLM(
    declaration: string, 
    statePacket: StatePacket, 
    rngEvent: RngEvent,
    caps: Caps
  ): Promise<EvaluatorOutput> {
    const { systemPrompt, userPrompt } = buildEvaluatorPrompt(
      declaration,
      statePacket,
      rngEvent
    )

    try {
      const response = await this.openai!.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0,
        response_format: { type: "json_object" }
      })

      const content = response.choices[0]?.message?.content
      if (!content) {
        throw new Error('No response content from OpenAI')
      }

      let parsed
      try {
        parsed = JSON.parse(content)
      } catch (parseError) {
        console.warn('LLM returned non-JSON content despite response_format, using fallback:', content.substring(0, 100))
        throw new Error('Invalid JSON response from LLM')
      }
      
      return EvaluatorOutputSchema.parse(parsed)
    } catch (error) {
      console.error('LLM evaluation failed, falling back to rules:', error)
      return this.evaluateWithRules(declaration, statePacket, rngEvent, caps)
    }
  }

  /**
   * Rule-based evaluation fallback
   */
  private evaluateWithRules(
    declaration: string, 
    statePacket: StatePacket, 
    rngEvent: RngEvent,
    caps: Caps
  ): Promise<EvaluatorOutput> {
    const lowerDecl = declaration.toLowerCase()
    
    // Check for out-of-bounds content
    const oobKeywords = ['million', 'billion', 'dollar', 'funding', 'investment', 'acquisition', 'merger', 'recession', 'crisis']
    const isOob = oobKeywords.some(keyword => lowerDecl.includes(keyword))
    
    // Check for nonsense/incoherent content
    const nonsenseKeywords = ['blah', 'random', 'nonsense', 'gibberish', 'test', 'placeholder']
    const isNonsense = nonsenseKeywords.some(keyword => lowerDecl.includes(keyword)) || 
                      declaration.length < 10 || 
                      /^[^a-zA-Z]*$/.test(declaration)
    
    // Generate CEO signals based on content and state
    const ceoSignals = this.generateCEOSignals(declaration, statePacket)
    
    // Generate event impact based on RNG event
    const eventImpact = this.generateEventImpact(rngEvent, statePacket)
    
    // Determine synergy between CEO and event
    const synergy = this.determineSynergy(ceoSignals, eventImpact)
    
    // Generate narrative hook
    const narrativeHook = this.generateNarrativeHook(ceoSignals, eventImpact, synergy, statePacket)
    
    // Determine nonsense penalty
    const nonsensePenalty = isNonsense ? this.getDeterministicPenalty(declaration, 0.1, 0.3) : 0.0
    
    // Generate assessment
    const assessment = this.generateAssessment(declaration, statePacket, ceoSignals)
    
    // Generate rationale
    const rationale = this.generateRationale(ceoSignals, eventImpact, statePacket, rngEvent)

    const result: EvaluatorOutput = {
      assessment,
      signals: ceoSignals,
      event: {
        roll: rngEvent.roll,
        event_type: rngEvent.event_type,
        impact_channels: eventImpact,
        severity_note: this.generateSeverityNote(rngEvent, statePacket)
      },
      integrated: {
        synergy,
        narrative_hook: narrativeHook
      },
      penalties: {
        nonsense_penalty: nonsensePenalty
      },
      policy: {
        oob: isOob,
        violations: isOob ? ['External financial commitments or crisis invention detected'] : []
      },
      rationale
    }

    return Promise.resolve(result)
  }

  /**
   * Generate CEO signals based on declaration content and state
   */
  private generateCEOSignals(declaration: string, statePacket: StatePacket): EvaluatorOutput['signals'] {
    const lowerDecl = declaration.toLowerCase()
    
    // Check for specific tone patterns first
    if (/clipboard|no talk|silent walk/.test(lowerDecl)) {
      return {
        morale: { dir: 'down', strength: statePacket.flags.labor_tense ? 0.8 : 0.7 },
        credibility: { dir: 'down', strength: statePacket.flags.labor_tense ? 0.4 : 0.3 },
        backlog_pressure: { dir: 'none', strength: 0.0 },
        service_risk: { dir: 'up', strength: statePacket.flags.labor_tense ? 0.3 : 0.2 }
      }
    } else if (/smile|chat|camaraderie|shout[- ]?outs/.test(lowerDecl)) {
      return {
        morale: { dir: 'up', strength: statePacket.flags.labor_tense ? 0.9 : 0.7 },
        credibility: { dir: 'up', strength: statePacket.flags.labor_tense ? 0.5 : 0.3 },
        backlog_pressure: { dir: 'none', strength: 0.0 },
        service_risk: { dir: 'down', strength: statePacket.flags.labor_tense ? 0.15 : 0.1 }
      }
    }

    // Fallback to keyword-based detection
    return {
      morale: this.generateSignalForMetric(declaration, statePacket, 'morale'),
      credibility: this.generateSignalForMetric(declaration, statePacket, 'credibility'),
      backlog_pressure: this.generateSignalForMetric(declaration, statePacket, 'backlog_pressure'),
      service_risk: this.generateSignalForMetric(declaration, statePacket, 'service_risk')
    }
  }

  /**
   * Generate event impact based on RNG event and state (enhanced for detailed events)
   */
  private generateEventImpact(rngEvent: RngEvent, statePacket: StatePacket): EvaluatorOutput['event']['impact_channels'] {
    const impact: EvaluatorOutput['event']['impact_channels'] = {}
    
    // Use detailed event effects if available
    if (rngEvent.effects) {
      const effects = rngEvent.effects
      
      // Convert financial deltas to impact channels
      if (effects.morale_delta !== 0) {
        impact.morale = {
          dir: effects.morale_delta > 0 ? 'up' : 'down',
          strength: Math.min(Math.abs(effects.morale_delta) / 10, 1.0) // Scale to 0-1
        }
      }
      
      if (effects.backlog_delta !== 0) {
        impact.backlog_pressure = {
          dir: effects.backlog_delta > 0 ? 'up' : 'down',
          strength: Math.min(Math.abs(effects.backlog_delta) / 2000, 1.0) // Scale to 0-1
        }
      }
      
      if (effects.nps_delta !== 0) {
        impact.service_risk = {
          dir: effects.nps_delta < 0 ? 'up' : 'down', // Negative NPS = higher service risk
          strength: Math.min(Math.abs(effects.nps_delta) / 20, 1.0) // Scale to 0-1
        }
      }
      
      // Credibility impact based on tier severity
      const tier = parseInt(rngEvent.tier || '0')
      if (tier > 0) {
        impact.credibility = {
          dir: 'down',
          strength: tier * 0.25 // Tier 1 = 0.25, Tier 2 = 0.5, Tier 3 = 0.75
        }
      }
      
      return impact
    }
    
    // Fallback to legacy event type mapping
    switch (rngEvent.event_type) {
      case 'supply_shock':
        impact.backlog_pressure = { dir: 'up', strength: Math.min(1.0, rngEvent.roll / 100 * 0.8) }
        impact.service_risk = { dir: 'up', strength: Math.min(1.0, rngEvent.roll / 100 * 0.6) }
        break
      case 'labor_unrest':
        impact.morale = { dir: 'down', strength: Math.min(1.0, rngEvent.roll / 100 * 0.9) }
        impact.credibility = { dir: 'down', strength: Math.min(1.0, rngEvent.roll / 100 * 0.7) }
        break
      case 'demand_spike':
        impact.backlog_pressure = { dir: 'up', strength: Math.min(1.0, rngEvent.roll / 100 * 0.7) }
        impact.morale = { dir: 'up', strength: Math.min(1.0, rngEvent.roll / 100 * 0.5) }
        break
      case 'reg_probe':
        impact.credibility = { dir: 'down', strength: Math.min(1.0, rngEvent.roll / 100 * 0.8) }
        impact.service_risk = { dir: 'up', strength: Math.min(1.0, rngEvent.roll / 100 * 0.4) }
        break
      case 'fx_move':
        impact.credibility = { dir: 'down', strength: Math.min(1.0, rngEvent.roll / 100 * 0.6) }
        break
      case 'credit_tightening':
        impact.credibility = { dir: 'down', strength: Math.min(1.0, rngEvent.roll / 100 * 0.7) }
        impact.service_risk = { dir: 'up', strength: Math.min(1.0, rngEvent.roll / 100 * 0.5) }
        break
      case 'none':
        // No impact
        break
      // Enhanced event types
      case 'supply':
        impact.backlog_pressure = { dir: 'up', strength: Math.min(1.0, rngEvent.roll / 100 * 0.8) }
        impact.service_risk = { dir: 'up', strength: Math.min(1.0, rngEvent.roll / 100 * 0.6) }
        break
      case 'labor':
        impact.morale = { dir: 'down', strength: Math.min(1.0, rngEvent.roll / 100 * 0.9) }
        impact.credibility = { dir: 'down', strength: Math.min(1.0, rngEvent.roll / 100 * 0.7) }
        break
      case 'quality':
        impact.service_risk = { dir: 'up', strength: Math.min(1.0, rngEvent.roll / 100 * 0.8) }
        impact.credibility = { dir: 'down', strength: Math.min(1.0, rngEvent.roll / 100 * 0.6) }
        break
      case 'competition':
        impact.credibility = { dir: 'down', strength: Math.min(1.0, rngEvent.roll / 100 * 0.5) }
        impact.service_risk = { dir: 'up', strength: Math.min(1.0, rngEvent.roll / 100 * 0.4) }
        break
      case 'finance':
        impact.credibility = { dir: 'down', strength: Math.min(1.0, rngEvent.roll / 100 * 0.7) }
        impact.service_risk = { dir: 'up', strength: Math.min(1.0, rngEvent.roll / 100 * 0.5) }
        break
      case 'regulation':
        impact.credibility = { dir: 'down', strength: Math.min(1.0, rngEvent.roll / 100 * 0.8) }
        impact.service_risk = { dir: 'up', strength: Math.min(1.0, rngEvent.roll / 100 * 0.4) }
        break
      case 'tech':
        impact.service_risk = { dir: 'up', strength: Math.min(1.0, rngEvent.roll / 100 * 0.6) }
        impact.credibility = { dir: 'down', strength: Math.min(1.0, rngEvent.roll / 100 * 0.4) }
        break
      case 'weather':
        impact.backlog_pressure = { dir: 'up', strength: Math.min(1.0, rngEvent.roll / 100 * 0.5) }
        break
    }

    return impact
  }

  /**
   * Determine synergy between CEO signals and event impact
   */
  private determineSynergy(
    ceoSignals: EvaluatorOutput['signals'], 
    eventImpact: EvaluatorOutput['event']['impact_channels']
  ): 'aligned' | 'undermined' | 'neutral' {
    let alignedCount = 0
    let underminedCount = 0
    
    // Check each metric for alignment
    const metrics: (keyof EvaluatorOutput['signals'])[] = ['morale', 'credibility', 'backlog_pressure', 'service_risk']
    
    metrics.forEach(metric => {
      const ceoSignal = ceoSignals[metric]
      const eventSignal = eventImpact[metric]
      
      if (eventSignal && ceoSignal.dir !== 'none') {
        if (ceoSignal.dir === eventSignal.dir) {
          alignedCount++
        } else {
          underminedCount++
        }
      }
    })
    
    if (alignedCount > underminedCount) return 'aligned'
    if (underminedCount > alignedCount) return 'undermined'
    return 'neutral'
  }

  /**
   * Generate narrative hook
   */
  private generateNarrativeHook(
    ceoSignals: EvaluatorOutput['signals'],
    eventImpact: EvaluatorOutput['event']['impact_channels'],
    synergy: 'aligned' | 'undermined' | 'neutral',
    statePacket: StatePacket
  ): string {
    const ceoFocus = Object.entries(ceoSignals)
      .filter(([_, s]) => s.dir !== 'none')
      .map(([k, s]) => `${k} (${s.dir})`)
      .join(', ')
    
    if (synergy === 'aligned') {
      return `CEO's focus on ${ceoFocus} aligns well with current market conditions.`
    } else if (synergy === 'undermined') {
      return `CEO's ${ceoFocus} strategy faces headwinds from external factors.`
    } else {
      return `CEO's ${ceoFocus} approach maintains steady course despite market volatility.`
    }
  }

  /**
   * Generate severity note for RNG event
   */
  private generateSeverityNote(rngEvent: RngEvent, statePacket: StatePacket): string {
    // Use detailed event information if available
    if (rngEvent.name && rngEvent.tier) {
      const tierNames = ['Minor', 'Moderate', 'Significant', 'Critical']
      const tier = parseInt(rngEvent.tier)
      return `${tierNames[tier]} impact: ${rngEvent.name}`
    } else if (rngEvent.name) {
      return `Event impact: ${rngEvent.name}`
    }
    
    // Fallback to legacy severity calculation
    const severity = rngEvent.roll <= 20 ? 'low' : rngEvent.roll <= 60 ? 'mid' : 'high'
    
    switch (rngEvent.event_type) {
      case 'supply_shock':
        return `${severity}-severity supply disruption; ${statePacket.flags.supply_fragile ? 'exacerbates existing fragility' : 'adds new pressure'}.`
      case 'labor_unrest':
        return `${severity}-severity labor tensions; ${statePacket.flags.labor_tense ? 'compounds current strain' : 'introduces workforce concerns'}.`
      case 'demand_spike':
        return `${severity}-severity demand surge; ${statePacket.backlog > 1200 ? 'strains already elevated backlog' : 'creates growth opportunity'}.`
      case 'reg_probe':
        return `${severity}-severity regulatory inquiry; ${statePacket.event.tier === 'critical' ? 'adds to critical event pressure' : 'increases compliance scrutiny'}.`
      case 'fx_move':
        return `${severity}-severity currency volatility; impacts international operations and pricing.`
      case 'credit_tightening':
        return `${severity}-severity credit constraints; ${statePacket.cash_runway < 12 ? 'pressures already tight liquidity' : 'reduces financial flexibility'}.`
      default:
        return 'Market conditions remain stable with minimal external pressure.'
    }
  }

  /**
   * Generate assessment
   */
  private generateAssessment(
    declaration: string, 
    statePacket: StatePacket, 
    signals: EvaluatorOutput['signals']
  ): EvaluatorOutput['assessment'] {
    const lowerDecl = declaration.toLowerCase()
    
    let tone = 'decisive'
    if (/panic|urgent|crisis/.test(lowerDecl)) tone = 'panicked'
    else if (/collaborate|team|together/.test(lowerDecl)) tone = 'conciliatory'
    else if (/optimize|efficiency|streamline/.test(lowerDecl)) tone = 'analytical'
    
    const targets = this.extractTargets(declaration)
    const fitReasons = this.generateFitReasons(declaration, statePacket, signals)
    
    return {
      intent: this.extractIntent(declaration),
      targets,
      tone,
      fit_reasons: fitReasons
    }
  }

  /**
   * Generate rationale
   */
  private generateRationale(
    signals: EvaluatorOutput['signals'],
    eventImpact: EvaluatorOutput['event']['impact_channels'],
    statePacket: StatePacket,
    rngEvent: RngEvent
  ): string {
    const ceoActions = Object.entries(signals)
      .filter(([_, s]) => s.dir !== 'none')
      .map(([k, s]) => `${k} ${s.dir}`)
      .join(', ')
    
    const eventEffects = Object.entries(eventImpact)
      .map(([k, s]) => `${k} ${s.dir}`)
      .join(', ')
    
    return `CEO targets ${ceoActions}. RNG event ${rngEvent.roll} (${rngEvent.event_type}) affects ${eventEffects || 'none'}. State shows ${statePacket.flags.labor_tense ? 'labor tension' : 'stable workforce'}, ${statePacket.flags.supply_fragile ? 'supply fragility' : 'robust supply'}.`
  }

  /**
   * Generate signal for a specific metric
   */
  private generateSignalForMetric(declaration: string, state: StatePacket, metric: string): DirStrength {
    const keywords = this.getKeywordsForMetric(metric)
    const relevantKeywords = keywords.filter(keyword => declaration.toLowerCase().includes(keyword))
    
    if (relevantKeywords.length === 0) {
      return { dir: 'none', strength: 0 }
    }

    let direction: Direction = 'none'
    let strength = 0.5

    if (metric === 'morale') {
      const negativeKeywords = ['layoff', 'cut', 'pressure', 'strict', 'reduce']
      const hasNegativeKeywords = negativeKeywords.some(keyword => declaration.toLowerCase().includes(keyword))
      
      if (hasNegativeKeywords) {
        direction = 'down'
        strength = 0.8
      } else if (declaration.toLowerCase().includes('team') || declaration.toLowerCase().includes('culture')) {
        direction = 'up'
        strength = 0.7
      }
    } else if (metric === 'credibility') {
      if (declaration.toLowerCase().includes('transparent') || declaration.toLowerCase().includes('honest')) {
        direction = 'up'
        strength = 0.6
      } else if (declaration.toLowerCase().includes('promise') || declaration.toLowerCase().includes('guarantee')) {
        direction = 'down'
        strength = 0.7
      }
    } else if (metric === 'backlog_pressure') {
      if (declaration.toLowerCase().includes('efficiency') || declaration.toLowerCase().includes('process')) {
        direction = 'down'
        strength = 0.6
      } else if (declaration.toLowerCase().includes('growth') || declaration.toLowerCase().includes('expand')) {
        direction = 'up'
        strength = 0.7
      }
    } else if (metric === 'service_risk') {
      if (declaration.toLowerCase().includes('quality') || declaration.toLowerCase().includes('customer')) {
        direction = 'down'
        strength = 0.6
      } else if (declaration.toLowerCase().includes('cut') || declaration.toLowerCase().includes('reduce')) {
        direction = 'up'
        strength = 0.7
      }
    }

    // Adjust strength based on state context
    if (state.flags.labor_tense && metric === 'morale') {
      strength = Math.min(1.0, strength * 1.2)
    }
    
    if (state.flags.supply_fragile && metric === 'backlog_pressure') {
      strength = Math.min(1.0, strength * 1.3)
    }

    return { dir: direction, strength }
  }

  /**
   * Get keywords relevant to a specific metric
   */
  private getKeywordsForMetric(metric: string): string[] {
    const keywordMap: Record<string, string[]> = {
      morale: ['team', 'culture', 'recognition', 'layoff', 'cut', 'pressure', 'workload', 'strict'],
      credibility: ['transparent', 'honest', 'clear', 'promise', 'guarantee', 'assure', 'strict', 'reduce'],
      backlog_pressure: ['capacity', 'efficiency', 'process', 'growth', 'expand', 'demand'],
      service_risk: ['quality', 'customer', 'support', 'cut', 'reduce', 'optimize']
    }
    return keywordMap[metric] || []
  }

  /**
   * Extract targets from declaration
   */
  private extractTargets(declaration: string): string[] {
    const targets: string[] = []
    
    if (declaration.toLowerCase().includes('team')) targets.push('Team Management')
    if (declaration.toLowerCase().includes('customer')) targets.push('Customer Experience')
    if (declaration.toLowerCase().includes('efficiency')) targets.push('Operational Efficiency')
    if (declaration.toLowerCase().includes('growth') || declaration.toLowerCase().includes('expand')) targets.push('Business Growth')
    if (declaration.toLowerCase().includes('quality')) targets.push('Quality Assurance')
    if (declaration.toLowerCase().includes('cost')) targets.push('Cost Management')
    
    return targets.length > 0 ? targets : ['General Operations']
  }

  /**
   * Extract intent from declaration
   */
  private extractIntent(declaration: string): string[] {
    const intents: string[] = []
    
    if (declaration.toLowerCase().includes('stabilize') || declaration.toLowerCase().includes('steady')) intents.push('stabilize operations')
    if (declaration.toLowerCase().includes('improve') || declaration.toLowerCase().includes('enhance')) intents.push('improve performance')
    if (declaration.toLowerCase().includes('grow') || declaration.toLowerCase().includes('expand')) intents.push('pursue growth')
    if (declaration.toLowerCase().includes('efficiency') || declaration.toLowerCase().includes('optimize')) intents.push('optimize processes')
    if (declaration.toLowerCase().includes('team') || declaration.toLowerCase().includes('culture')) intents.push('uplift morale')
    
    return intents.length > 0 ? intents : ['maintain current trajectory']
  }

  /**
   * Generate fit reasons based on declaration, state, and signals
   */
  private generateFitReasons(declaration: string, state: StatePacket, signals: any): string[] {
    const reasons: string[] = []
    
    if (state.flags.labor_tense && signals.morale.dir === 'down') {
      reasons.push('Addresses current labor tensions appropriately')
    }
    
    if (state.flags.supply_fragile && signals.backlog_pressure.dir === 'down') {
      reasons.push('Recognizes supply chain constraints')
    }
    
    if (state.event.tier === 'critical' && signals.credibility.dir === 'up') {
      reasons.push('Builds confidence during critical event')
    }
    
    if (reasons.length === 0) {
      reasons.push('Balanced approach to current challenges')
    }
    
    return reasons
  }

  /**
   * Get deterministic penalty within a range based on declaration hash
   */
  private getDeterministicPenalty(declaration: string, min: number, max: number): number {
    const hash = this.hashString(declaration)
    const range = max - min
    return min + (hash % 100) / 100 * range
  }

  /**
   * Simple hash function for deterministic penalty generation
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
}
