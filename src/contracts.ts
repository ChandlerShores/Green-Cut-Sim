import { z } from 'zod'

// Core Caps schema with default values
export const CapsSchema = z.object({
  morale: z.number().default(3.0),
  credibility: z.number().default(2.0),
  service_risk: z.number().default(0.6),
  backlog_pressure: z.number().default(1.0)
})

export type Caps = z.infer<typeof CapsSchema>

// RNG Event types for market events (enhanced with Python prototype categories)
export const RngEventTypeSchema = z.enum([
  'supply_shock', 'labor_unrest', 'demand_spike', 
  'reg_probe', 'fx_move', 'credit_tightening', 'none',
  // Enhanced categories from Python prototype
  'supply', 'labor', 'quality', 'competition', 'finance', 'regulation', 'tech', 'weather'
])

export type RngEventType = z.infer<typeof RngEventTypeSchema>

// Event tier system (0-3 severity levels)
export const EventTierSchema = z.enum(['0', '1', '2', '3'])
export type EventTier = z.infer<typeof EventTierSchema>

// Enhanced RNG Event packet with tier and detailed effects
export const RngEventSchema = z.object({
  roll: z.number().min(1).max(100),
  event_type: RngEventTypeSchema,
  tier: EventTierSchema.optional(), // 0-3 severity level
  name: z.string().optional(), // Human-readable event name
  effects: z.object({
    revenue_delta: z.number().default(0),
    cogs_delta: z.number().default(0),
    opex_delta: z.number().default(0),
    cash_delta: z.number().default(0),
    share_delta: z.number().default(0),
    nps_delta: z.number().default(0),
    morale_delta: z.number().default(0),
    backlog_delta: z.number().default(0),
    notes: z.string().default("")
  }).optional(),
  flag_bump: z.number().default(0).optional(), // Flag pressure increase
  tail_risk_bump: z.number().default(0).optional(), // Tail risk increase
  hints: z.array(z.string()).optional()
})

export type RngEvent = z.infer<typeof RngEventSchema>

// Event schema (keeping existing for backward compatibility)
export const EventSchema = z.object({
  category: z.enum(['market', 'operational', 'financial', 'regulatory', 'competitive']),
  tier: z.enum(['low', 'medium', 'high', 'critical'])
})

export type Event = z.infer<typeof EventSchema>

// Enhanced flags schema with pressure levels (0-1 scale like Python prototype)
export const FlagsSchema = z.object({
  // Legacy boolean flags (maintained for backward compatibility)
  supply_fragile: z.boolean().default(false),
  labor_tense: z.boolean().default(false),
  quality_watch: z.boolean().default(false),
  tail_risk: z.boolean().default(false),
  // Enhanced pressure system (0-1 scale)
  supply: z.number().min(0).max(1).default(0.1),
  labor: z.number().min(0).max(1).default(0.05),
  quality: z.number().min(0).max(1).default(0.0),
  competition: z.number().min(0).max(1).default(0.1),
  finance: z.number().min(0).max(1).default(0.0),
  regulation: z.number().min(0).max(1).default(0.0),
  tech: z.number().min(0).max(1).default(0.05),
  weather: z.number().min(0).max(1).default(0.05)
})

export type Flags = z.infer<typeof FlagsSchema>

// Pressures schema
export const PressuresSchema = z.object({
  margin_push: z.boolean().default(false)
})

export type Pressures = z.infer<typeof PressuresSchema>

// Headroom schema
export const HeadroomSchema = z.object({
  ot_pct: z.number().default(0.0),
  temps_allowed: z.boolean().default(false)
})

export type Headroom = z.infer<typeof HeadroomSchema>

// Active event tracking (from Python prototype)
export const ActiveEventSchema = z.object({
  category: z.string(),
  tier: z.number(),
  name: z.string(),
  effects: z.object({
    revenue_delta: z.number(),
    cogs_delta: z.number(),
    opex_delta: z.number(),
    cash_delta: z.number(),
    share_delta: z.number(),
    nps_delta: z.number(),
    morale_delta: z.number(),
    backlog_delta: z.number(),
    notes: z.string()
  }),
  decay: z.enum(['slow', 'fast'])
})

export type ActiveEvent = z.infer<typeof ActiveEventSchema>

// Enhanced state schema with financial metrics and active events
export const StateSchema = z.object({
  turn_no: z.number(),
  period: z.string().optional(), // e.g., "Sep 2025"
  // Financial metrics (from Python prototype)
  pnl: z.object({
    revenue: z.number().default(12.0),
    cogs: z.number().default(7.2),
    gm_percent: z.number().default(40.0),
    opex: z.number().default(3.8),
    net: z.number().default(1.0),
    cash: z.number().default(7.5)
  }).optional(),
  // KPIs (enhanced)
  kpis: z.object({
    share_percent: z.number().default(8.4),
    service_nps: z.number().default(74),
    morale: z.number().default(66),
    backlog_units: z.number().default(6000)
  }).optional(),
  // Legacy state fields (maintained for backward compatibility)
  event: EventSchema,
  morale: z.number().min(0).max(100),
  credibility: z.number().min(0).max(100),
  backlog: z.number().min(0),
  service: z.number().min(0).max(100),
  share: z.number().min(0),
  cash_runway: z.number().min(0),
  flags: FlagsSchema,
  pressures: PressuresSchema,
  headroom: HeadroomSchema,
  recent_moves: z.array(z.string()),
  // Enhanced fields from Python prototype
  tail_risk: z.number().min(0).max(100).default(5).optional(),
  shock_decay: z.number().default(0.10).optional(),
  reward_decay: z.number().default(0.50).optional(),
  ceo_credibility: z.number().min(0).max(100).default(72).optional(),
  active_shocks: z.array(ActiveEventSchema).default([]).optional(),
  active_rewards: z.array(ActiveEventSchema).default([]).optional(),
  notes: z.array(z.string()).default([]).optional()
})

export type State = z.infer<typeof StateSchema>

// StatePacket for Evaluator (subset of State with enhanced fields)
export const StatePacketSchema = z.object({
  turn_no: z.number(),
  period: z.string().optional(),
  // Financial metrics
  pnl: z.object({
    revenue: z.number(),
    cogs: z.number(),
    gm_percent: z.number(),
    opex: z.number(),
    net: z.number(),
    cash: z.number()
  }).optional(),
  // KPIs
  kpis: z.object({
    share_percent: z.number(),
    service_nps: z.number(),
    morale: z.number(),
    backlog_units: z.number()
  }).optional(),
  // Legacy fields
  event: EventSchema,
  morale: z.number(),
  credibility: z.number(),
  backlog: z.number(),
  service: z.number(),
  share: z.number(),
  cash_runway: z.number(),
  flags: FlagsSchema,
  pressures: PressuresSchema,
  headroom: HeadroomSchema,
  recent_moves: z.array(z.string()),
  // Enhanced fields
  tail_risk: z.number().default(5).optional(),
  shock_decay: z.number().default(0.10).optional(),
  reward_decay: z.number().default(0.50).optional(),
  ceo_credibility: z.number().default(72).optional(),
  active_shocks: z.array(ActiveEventSchema).default([]).optional(),
  active_rewards: z.array(ActiveEventSchema).default([]).optional(),
  notes: z.array(z.string()).default([]).optional()
})

export type StatePacket = z.infer<typeof StatePacketSchema>

// Signal direction and strength
export const DirectionSchema = z.enum(['up', 'down', 'none'])
export type Direction = z.infer<typeof DirectionSchema>

export const DirStrengthSchema = z.object({
  dir: DirectionSchema,
  strength: z.number().min(0).max(1)
})

export type DirStrength = z.infer<typeof DirStrengthSchema>

// Legacy Signal schema (keeping for backward compatibility)
export const SignalSchema = z.object({
  direction: z.enum(['up', 'down', 'none']),
  strength: z.number().min(0).max(1)
})

export type Signal = z.infer<typeof SignalSchema>

// New comprehensive Evaluator output schema
export const EvaluatorOutputSchema = z.object({
  assessment: z.object({
    intent: z.array(z.string()),
    targets: z.array(z.string()),
    tone: z.string(),
    fit_reasons: z.array(z.string())
  }),
  signals: z.object({
    morale: DirStrengthSchema,
    credibility: DirStrengthSchema,
    backlog_pressure: DirStrengthSchema,
    service_risk: DirStrengthSchema
  }),
  event: z.object({
    roll: z.number(),
    event_type: z.string(),
    impact_channels: z.object({
      morale: DirStrengthSchema.optional(),
      credibility: DirStrengthSchema.optional(),
      backlog_pressure: DirStrengthSchema.optional(),
      service_risk: DirStrengthSchema.optional()
    }),
    severity_note: z.string()
  }),
  integrated: z.object({
    synergy: z.enum(['aligned', 'undermined', 'neutral']),
    narrative_hook: z.string()
  }),
  penalties: z.object({
    nonsense_penalty: z.number().min(0).max(1)
  }),
  policy: z.object({
    oob: z.boolean(),
    violations: z.array(z.string())
  }),
  rationale: z.string()
})

export type EvaluatorOutput = z.infer<typeof EvaluatorOutputSchema>


// Turn schema
export const TurnSchema = z.object({
  runId: z.string(),
  declaration: z.string(),
  timestamp: z.number()
})

export type Turn = z.infer<typeof TurnSchema>

// New EvaluatorInput interface with RNG event
export const EvaluatorInputSchema = z.object({
  declaration: z.string(),
  state_packet: StatePacketSchema,
  caps: CapsSchema,
  rng_event: RngEventSchema
})

export type EvaluatorInput = z.infer<typeof EvaluatorInputSchema>

// Turn result schema
export const TurnResultSchema = z.object({
  turn_no: z.number(),
  state_before: StateSchema,
  state_after: StateSchema,
  declaration: z.string(),
  assessment: z.object({
    intent: z.array(z.string()),
    targets: z.array(z.string()),
    tone: z.string(),
    fit_reasons: z.array(z.string())
  }),
  signals: z.object({
    morale: DirStrengthSchema,
    credibility: DirStrengthSchema,
    backlog_pressure: DirStrengthSchema,
    service_risk: DirStrengthSchema
  }),
  event: z.object({
    roll: z.number(),
    event_type: z.string(),
    impact_channels: z.object({
      morale: DirStrengthSchema.optional(),
      credibility: DirStrengthSchema.optional(),
      backlog_pressure: DirStrengthSchema.optional(),
      service_risk: DirStrengthSchema.optional()
    }),
    severity_note: z.string()
  }),
  integrated: z.object({
    synergy: z.enum(['aligned', 'undermined', 'neutral']),
    narrative_hook: z.string()
  }),
  penalties: z.object({
    nonsense_penalty: z.number()
  }),
  policy: z.object({
    oob: z.boolean(),
    violations: z.array(z.string())
  }),
  deltas: z.object({
    morale: z.number(),
    credibility: z.number(),
    backlog: z.number(),
    service: z.number(),
    share: z.number(),
    cash_runway: z.number()
  }),
  applied_deltas: z.object({
    morale: z.number(),
    credibility: z.number(),
    backlog: z.number(),
    service: z.number(),
    share: z.number(),
    cash_runway: z.number()
  }),
  financials: z.object({
    cash_open: z.number(),
    pnl: z.object({
      revenue: z.number(),
      cogs: z.number(),
      gross_profit: z.number(),
      opex: z.number(),
      ebitda: z.number(),
      depreciation: z.number(),
      ebit: z.number(),
      interest: z.number(),
      taxes: z.number(),
      net_income: z.number()
    }),
    cashflow: z.object({
      cfo: z.number(),
      cfi: z.number(),
      cff: z.number()
    }),
    balance: z.object({
      cash: z.number(),
      ar: z.number(),
      inventory: z.number(),
      ppe: z.number(),
      ap: z.number(),
      debt: z.number(),
      retained_earnings: z.number(),
      other_equity: z.number()
    }),
    cash_close: z.number(),
    balance_ok: z.boolean(),
    cash_recon_ok: z.boolean(),
    notes: z.array(z.string()).optional()
  }),
  explainers: z.object({
    finance: z.array(z.string())
  }),
  narrative: z.string(),
  quotes: z.array(z.string())
})

export type TurnResult = z.infer<typeof TurnResultSchema>

// Run schema
export const RunSchema = z.object({
  id: z.string(),
  seed: z.string(),
  created_at: z.number(),
  turns: z.array(TurnResultSchema).default([])
})

export type Run = z.infer<typeof RunSchema>

// New run request schema
export const NewRunRequestSchema = z.object({
  seed: z.string().optional()
})

export type NewRunRequest = z.infer<typeof NewRunRequestSchema>

// Turn request schema
export const TurnRequestSchema = z.object({
  runId: z.string(),
  declaration: z.string()
})

export type TurnRequest = z.infer<typeof TurnRequestSchema>

// Default caps
export const DEFAULT_CAPS: Caps = {
  morale: 3.0,
  credibility: 2.0,
  service_risk: 0.6,
  backlog_pressure: 1.0
}

// Financial types
export interface FinancialDrivers {
  units_sold: number;
  avg_price: number;
  unit_cost: number;
  opex_base: number;
  capex_base: number;
  dso: number;
  dpo: number;
  dio: number;
}

export interface FinancialParams {
  period_days: number;
  min_cash_buffer: number;
  depreciation_life_years: number;
  price_to_units: number;
  morale_to_units: number;
  credibility_to_price: number;
  scrap_rate: number;
}

export interface MiniPnL {
  revenue: number;
  cogs: number;
  gross_profit: number;
  opex: number;
  ebitda: number;
  depreciation: number;
  ebit: number;
  interest: number;
  taxes: number;
  net_income: number;
}

export interface MiniBalanceSheet {
  cash: number;
  ar: number;
  inventory: number;
  ppe: number;
  ap: number;
  debt: number;
  retained_earnings: number;
  other_equity: number;
}

export interface MiniCashFlow {
  cfo: number;
  cfi: number;
  cff: number;
}

export interface FinancialSnapshot {
  cash_open: number;
  pnl: MiniPnL;
  cashflow: MiniCashFlow;
  balance: MiniBalanceSheet;
  cash_close: number;
  balance_ok: boolean;
  cash_recon_ok: boolean;
  notes?: string[];
}

export interface FinanceInput {
  prev_balance: MiniBalanceSheet;
  drivers: FinancialDrivers;
  params: FinancialParams;
  policy?: { dividend: boolean; repay_debt: boolean };
  direct_cash_spending?: number; // Direct cash spending declarations (e.g., bonuses, dividends)
}
