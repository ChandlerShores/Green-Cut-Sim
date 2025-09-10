import type { RunState, Turn } from './types';
import { config } from './config';

export async function submitTurn(input: string): Promise<{ state: RunState; latest: Turn }> {
  const res = await fetch(`${config.api.baseUrl}${config.api.endpoints.turn}`, { 
    method: 'POST', 
    headers: { 'Content-Type': 'application/json' }, 
    body: JSON.stringify({ input }) 
  });
  
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error ?? 'Request failed');
  }
  
  const response = await res.json();
  
  // Transform server response to expected format
  const turnResult = response.turnResult;
  const turnWithFinancials = {
    ...turnResult,
    financials: turnResult.state_after.pnl ? {
      revenue: turnResult.state_after.pnl.revenue * 1000000, // Convert from millions to actual dollars
      cogs: turnResult.state_after.pnl.cogs * 1000000,
      opex: turnResult.state_after.pnl.opex * 1000000,
      ebit: turnResult.state_after.pnl.net * 1000000, // Using net as EBIT approximation
      cash: turnResult.state_after.pnl.cash * 1000000
    } : undefined
  };
  
  const state: RunState = {
    turn: turnResult.turn_no,
    kpis: [
      { key: 'morale', label: 'Morale', value: turnResult.state_after.morale, delta: turnResult.state_after.morale - turnResult.state_before.morale, intent: 'good' },
      { key: 'credibility', label: 'Credibility', value: turnResult.state_after.credibility, delta: turnResult.state_after.credibility - turnResult.state_before.credibility, intent: 'good' },
      { key: 'backlog', label: 'Backlog', value: turnResult.state_after.backlog, delta: turnResult.state_after.backlog - turnResult.state_before.backlog, intent: 'good' },
      { key: 'service', label: 'Service', value: turnResult.state_after.service, delta: turnResult.state_after.service - turnResult.state_before.service, intent: 'good' },
      { key: 'share', label: 'Market Share', value: turnResult.state_after.share, delta: turnResult.state_after.share - turnResult.state_before.share, intent: 'good' },
      { key: 'cashRunway', label: 'Cash Runway', value: turnResult.state_after.cash_runway, delta: turnResult.state_after.cash_runway - turnResult.state_before.cash_runway, intent: 'good' },
    ],
    turns: [turnWithFinancials]
  };
  
  return { state, latest: turnWithFinancials };
}

export async function getRunState(): Promise<RunState> {
  const res = await fetch(`${config.api.baseUrl}${config.api.endpoints.state}`);
  
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error ?? 'Failed to fetch run state');
  }
  
  return (await res.json()) as RunState;
}
