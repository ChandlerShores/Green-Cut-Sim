# GreenCut Sim — V2 Lite (CEO + RNG Event Driven)

## Core loop (NEVER break)
Player text → Evaluator (CEO analysis + RNG event integration) → Deterministic Engine (CEO + Event + Penalty deltas) → Narrator (story only).

## Constraints
- Single process. No DB/queues/Docker. Persist to `run.jsonl`.
- Deterministic math: same state + same declaration + same RNG roll ⇒ same result.
- Evaluator returns ONLY normalized strengths (0..1) per KPI; Engine computes numbers.
- Narrator never changes numbers.
- RNG events are generated deterministically by engine, never invented by LLMs.

## Files that matter
- /src/engine.(ts|py): state, RNG event generation, CEO + Event + Penalty deltas, applySignals().
- /src/evaluator.(ts|py): LLM API that reads State Context Packet + RNG Event; returns dual-layer analysis.
- /src/narrator.(ts|py): LLM API for prose (no numbers), references RNG events and penalties.
- /src/ui.(tsx|html): one page, text box → resolve turn → show CEO vs Event vs Integrated vs Penalty.
- /src/contracts.(ts|py): shared types/schemas including RNG events and expanded evaluator output.
- /run.jsonl: append-only snapshots.

## Contracts
- EvaluatorInput = { declaration: string, state_packet: {...}, caps: {...}, rng_event: {...} }
- RngEvent = { roll: 1-100, event_type: supply_shock|labor_unrest|demand_spike|reg_probe|fx_move|credit_tightening|none, hints?: string[] }
- EvaluatorOutput (STRICT JSON): 
  { 
    assessment: { intent[], targets[], tone, fit_reasons[] },
    signals: { morale:{dir, strength}, credibility:{dir, strength}, backlog_pressure:{dir, strength}, service_risk:{dir, strength} },
    event: { roll, event_type, impact_channels: {...}, severity_note },
    integrated: { synergy: aligned|undermined|neutral, narrative_hook },
    penalties: { nonsense_penalty: 0-1 },
    policy: { oob: boolean, violations: [] },
    rationale: string 
  }
- Engine formula: ΔKPI = CAP[KPI] * strength * sign * context_mods(state) applied in layers:
  1. CEO signals (primary)
  2. Event impact channels (secondary, 80% strength)
  3. Nonsense penalty (small negative, primarily credibility)
- Caps (default): morale ±3.0, credibility ±2.0, service_risk ±0.6, backlog_pressure → units via fixed scale.

## RNG Event Mapping
- 1-20: supply_shock (backlog_pressure ↑, service_risk ↑)
- 21-40: labor_unrest (morale ↓, credibility ↓)
- 41-60: demand_spike (backlog_pressure ↑, morale ↑)
- 61-80: reg_probe (credibility ↓, service_risk ↑)
- 81-90: fx_move (credibility ↓)
- 91-100: credit_tightening (credibility ↓, service_risk ↑)

## Always do
- Plan → Tests → Code → Docs.
- Keep diffs tiny; touch only the files above.
- Evaluator/Narrator in JSON mode; Evaluator temp=0.
- Generate RNG events deterministically in engine (state hash + turn index).
- Apply CEO + Event + Penalty layers in sequence, respect caps.

## Never do
- Add new infra, persistence, or background jobs.
- Let LLMs emit final numeric deltas or invent external shocks.
- Use RNG events not provided by engine.
- Apply penalties without deterministic calculation.
