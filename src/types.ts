export type KPIMetric = {
  key: 'morale' | 'credibility' | 'backlog' | 'service' | 'share' | 'cashRunway';
  label: string;
  value: number;    // normalized 0–100 for bars when possible
  raw?: number;     // e.g., cash days, backlog units
  delta?: number;   // last turn change
  intent?: 'good' | 'warn' | 'bad';
};

export type Turn = {
  id: number;                // 1-based turn index
  timestamp: string;         // ISO
  input: string;             // CEO declaration
  drivers?: Record<string, number>;   // generated
  params?: Record<string, number>;    // generated
  financials?: {
    revenue: number;
    cogs: number;
    opex: number;
    ebit: number;
    cash: number;
  };
  kpis?: KPIMetric[];
  narrative?: string;        // model-generated
  quotes?: string[];         // optional punchy quotes
  errors?: string[];         // any errors from engine
};

export type RunState = {
  turn: number;
  kpis: KPIMetric[];
  turns: Turn[]; // most recent first for easy rendering
};

export type Theme = 'light' | 'dark';
