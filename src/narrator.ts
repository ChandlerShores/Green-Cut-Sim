import OpenAI from 'openai'
import { State, EvaluatorOutput, Caps, RngEvent } from './contracts'

export class Narrator {
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
   * Generate narrative and quotes for a turn
   */
  async narrate(
    stateBefore: State,
    stateAfter: State,
    rngEvent: RngEvent,
    assessment: EvaluatorOutput['assessment'],
    signals: EvaluatorOutput['signals'],
    integrated: EvaluatorOutput['integrated'],
    penalties: EvaluatorOutput['penalties'],
    caps: Caps
  ): Promise<{ narrative: string; quotes: string[] }> {
    if (this.hasApiKey && this.openai) {
      return this.narrateWithLLM(stateBefore, stateAfter, rngEvent, assessment, signals, integrated, penalties, caps)
    } else {
      return this.narrateWithTemplate(stateBefore, stateAfter, rngEvent, assessment, signals, integrated, penalties, caps)
    }
  }

  /**
   * LLM-based narration using OpenAI
   */
  private async narrateWithLLM(
    stateBefore: State,
    stateAfter: State,
    rngEvent: RngEvent,
    assessment: EvaluatorOutput['assessment'],
    signals: EvaluatorOutput['signals'],
    integrated: EvaluatorOutput['integrated'],
    penalties: EvaluatorOutput['penalties'],
    caps: Caps
  ): Promise<{ narrative: string; quotes: string[] }> {
    const systemPrompt = `You are the Narrator. Given state_before, state_after, RNG event (roll, type, impact_channels), assessment, signals, integrated analysis, penalties, and caps, produce 120–160 words of tense, grounded narrative and 2–3 short quotes (CFO, Chair, Ops, HR). Never propose numbers; describe impacts qualitatively. Reference the RNG event explicitly and whether it aligned with or undermined the CEO's move. If a nonsense penalty applied, acknowledge a small reputational drag without numbers.`

    const userPrompt = `Narrate this business turn:

RNG Event: ${rngEvent.event_type} (Roll: ${rngEvent.roll}) - ${this.getEventDescription(rngEvent)}

State Changes:
- Morale: ${stateBefore.morale} → ${stateAfter.morale} (${this.getChangeDescription(stateBefore.morale, stateAfter.morale)})
- Credibility: ${stateBefore.credibility} → ${stateAfter.credibility} (${this.getChangeDescription(stateBefore.credibility, stateAfter.credibility)})
- Backlog: ${stateBefore.backlog} → ${stateAfter.backlog} (${this.getChangeDescription(stateBefore.backlog, stateAfter.backlog)})
- Service: ${stateBefore.service} → ${stateAfter.service} (${this.getChangeDescription(stateBefore.service, stateAfter.service)})
- Share: ${stateBefore.share} → ${stateAfter.share} (${this.getChangeDescription(stateBefore.share, stateAfter.share)})
- Cash Runway: ${stateBefore.cash_runway} → ${stateAfter.cash_runway} months (${this.getChangeDescription(stateBefore.cash_runway, stateAfter.cash_runway)})

CEO Assessment: ${assessment.tone} tone, targeting ${assessment.targets.join(', ')}

Key Signals: ${Object.entries(signals).filter(([_, s]) => s.dir !== 'none').map(([k, s]) => `${k}: ${s.dir} (${s.strength})`).join(', ')}

Integration: ${integrated.synergy} synergy - ${integrated.narrative_hook}

Penalties: ${penalties.nonsense_penalty > 0 ? `Nonsense penalty applied (${penalties.nonsense_penalty})` : 'None'}

Flags: ${Object.entries(stateAfter.flags).filter(([_, v]) => v).map(([k, _]) => k).join(', ') || 'none'}

Return JSON:
{
  "narrative": "120-160 word narrative...",
  "quotes": ["CFO: quote", "Chair: quote", "Ops/HR: quote"]
}`

    try {
      const response = await this.openai!.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.7,
        response_format: { type: "json_object" }
      })

      const content = response.choices[0]?.message?.content
      if (!content) {
        throw new Error('No response content from OpenAI')
      }

      // Try to parse JSON, but handle cases where it's not valid JSON
      let parsed
      try {
        parsed = JSON.parse(content)
      } catch (parseError) {
        console.warn('LLM returned non-JSON content, using template fallback:', content.substring(0, 100))
        throw new Error('Invalid JSON response from LLM')
      }
      
      return {
        narrative: parsed.narrative || 'Narrative generation failed.',
        quotes: Array.isArray(parsed.quotes) ? parsed.quotes : ['CFO: Monitoring the situation.', 'Chair: Board is engaged.']
      }
    } catch (error) {
      console.error('LLM narration failed, falling back to template:', error)
      return this.narrateWithTemplate(stateBefore, stateAfter, rngEvent, assessment, signals, integrated, penalties, caps)
    }
  }

  /**
   * Template-based narration fallback
   */
  private async narrateWithTemplate(
    stateBefore: State,
    stateAfter: State,
    rngEvent: RngEvent,
    assessment: EvaluatorOutput['assessment'],
    signals: EvaluatorOutput['signals'],
    integrated: EvaluatorOutput['integrated'],
    penalties: EvaluatorOutput['penalties'],
    caps: Caps
  ): Promise<{ narrative: string; quotes: string[] }> {
    // Generate narrative based on the integrated analysis
    let narrative = `The CEO's ${assessment.tone} approach targeting ${assessment.targets.join(' and ')} `
    
    if (integrated.synergy === 'aligned') {
      narrative += `found favorable conditions as ${rngEvent.event_type} (roll ${rngEvent.roll}) supported the strategy. `
    } else if (integrated.synergy === 'undermined') {
      narrative += `faced headwinds from ${rngEvent.event_type} (roll ${rngEvent.roll}), which complicated execution. `
    } else {
      narrative += `maintained steady progress despite ${rngEvent.event_type} (roll ${rngEvent.roll}) creating mixed market conditions. `
    }
    
    // Add penalty context if applicable
    if (penalties.nonsense_penalty > 0) {
      narrative += `The unclear communication created minor reputational friction. `
    }
    
    // Add state change context
    const moraleChange = stateAfter.morale - stateBefore.morale
    const credibilityChange = stateAfter.credibility - stateBefore.credibility
    
    if (Math.abs(moraleChange) > 5) {
      narrative += moraleChange > 0 ? 'Team morale improved significantly. ' : 'Team morale declined noticeably. '
    }
    
    if (Math.abs(credibilityChange) > 5) {
      narrative += credibilityChange > 0 ? 'Leadership credibility strengthened. ' : 'Leadership credibility faced challenges. '
    }
    
    narrative += `The company navigates these dynamics while maintaining operational focus.`

    // Generate contextual quotes
    const quotes = [
      `CFO: ${this.generateCFOQuote(stateBefore, stateAfter, rngEvent)}`,
      `Chair: ${this.generateChairQuote(integrated.synergy, assessment.tone)}`,
      `Ops: ${this.generateOpsQuote(signals, penalties)}`
    ]

    return Promise.resolve({ narrative, quotes })
  }

  /**
   * Get event description for narration
   */
  private getEventDescription(rngEvent: RngEvent): string {
    const severity = rngEvent.roll <= 20 ? 'low' : rngEvent.roll <= 60 ? 'mid' : 'high'
    
    switch (rngEvent.event_type) {
      case 'supply_shock': return `${severity}-severity supply disruption`
      case 'labor_unrest': return `${severity}-severity labor tensions`
      case 'demand_spike': return `${severity}-severity demand surge`
      case 'reg_probe': return `${severity}-severity regulatory inquiry`
      case 'fx_move': return `${severity}-severity currency volatility`
      case 'credit_tightening': return `${severity}-severity credit constraints`
      case 'none': return 'stable market conditions'
      default: return 'external market event'
    }
  }

  /**
   * Generate CFO quote
   */
  private generateCFOQuote(stateBefore: State, stateAfter: State, rngEvent: RngEvent): string {
    const cashChange = stateAfter.cash_runway - stateBefore.cash_runway
    
    if (cashChange < -2) return 'Cash flow pressure requires careful monitoring.'
    if (cashChange > 2) return 'Financial position remains stable.'
    
    if (rngEvent.event_type === 'credit_tightening') return 'Credit markets are tightening, but we\'re well-positioned.'
    if (rngEvent.event_type === 'fx_move') return 'Currency volatility impacts our international operations.'
    
    return 'Financial metrics are within expected ranges.'
  }

  /**
   * Generate Chair quote
   */
  private generateChairQuote(synergy: string, tone: string): string {
    if (synergy === 'aligned') return 'The board supports this strategic alignment.'
    if (synergy === 'undermined') return 'We need to adapt to these market challenges.'
    
    if (tone === 'decisive') return 'Strong leadership in uncertain times.'
    if (tone === 'conciliatory') return 'Collaborative approach builds stakeholder confidence.'
    
    return 'The board is monitoring execution closely.'
  }

  /**
   * Generate Ops quote
   */
  private generateOpsQuote(signals: EvaluatorOutput['signals'], penalties: EvaluatorOutput['penalties']): string {
    const hasBacklogAction = signals.backlog_pressure.dir !== 'none'
    const hasServiceAction = signals.service_risk.dir !== 'none'
    
    if (hasBacklogAction && hasServiceAction) return 'Operations and quality initiatives are proceeding as planned.'
    if (hasBacklogAction) return 'Backlog management is on track.'
    if (hasServiceAction) return 'Service quality improvements are being implemented.'
    
    if (penalties.nonsense_penalty > 0) return 'Clear communication helps operational execution.'
    
    return 'Operations continue with business-as-usual focus.'
  }

  /**
   * Get change description for state transitions
   */
  private getChangeDescription(before: number, after: number): string {
    const change = after - before
    if (Math.abs(change) < 2) return 'stable'
    if (change > 10) return 'major increase'
    if (change > 5) return 'increase'
    if (change < -10) return 'major decrease'
    if (change < -5) return 'decrease'
    return change > 0 ? 'slight increase' : 'slight decrease'
  }
}
