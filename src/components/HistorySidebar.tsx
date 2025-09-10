import React, { useState } from 'react';
import type { Turn } from '../types';
import { formatRelativeTime, formatDelta, getDeltaIcon, getDeltaColor } from '../lib/format';

interface HistorySidebarProps {
  turns: Turn[];
  isOpen: boolean;
  onToggle: () => void;
  className?: string;
}

export function HistorySidebar({ turns, isOpen, onToggle, className = '' }: HistorySidebarProps) {
  const [expandedTurns, setExpandedTurns] = useState<Set<number>>(new Set());

  const toggleTurnExpansion = (turnId: number) => {
    const newExpanded = new Set(expandedTurns);
    if (newExpanded.has(turnId)) {
      newExpanded.delete(turnId);
    } else {
      newExpanded.add(turnId);
    }
    setExpandedTurns(newExpanded);
  };

  const getKPIChangeSummary = (turn: Turn) => {
    if (!turn.kpis) return null;
    
    const changes = turn.kpis
      .filter(kpi => kpi.delta && Math.abs(kpi.delta) > 0.01)
      .slice(0, 3); // Show max 3 changes
    
    if (changes.length === 0) return null;
    
    return (
      <div className="flex flex-wrap gap-1 mt-2">
        {changes.map((kpi) => (
          <span 
            key={kpi.key}
            className={cn(
              "text-xs px-2 py-1 rounded-full",
              kpi.delta! > 0 
                ? "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300"
                : "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300"
            )}
          >
            {kpi.label}: {getDeltaIcon(kpi.delta!)} {formatDelta(Math.round(kpi.delta! * 10) / 10)}
          </span>
        ))}
      </div>
    );
  };

  return (
    <div className={`${className} ${isOpen ? 'w-80' : 'w-16'} transition-all duration-300 ease-in-out`}>
      {/* Toggle Button */}
      <button
        onClick={onToggle}
        className="w-full p-3 bg-zinc-100 dark:bg-zinc-800 border-b border-zinc-200 dark:border-zinc-700 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
        aria-label={isOpen ? 'Collapse history' : 'Expand history'}
      >
        {isOpen ? (
          <svg className="w-5 h-5 mx-auto text-zinc-600 dark:text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        ) : (
          <svg className="w-5 h-5 mx-auto text-zinc-600 dark:text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        )}
      </button>

      {isOpen && (
        <div className="h-full bg-white dark:bg-zinc-900 border-r border-zinc-200 dark:border-zinc-700 overflow-y-auto">
          <div className="p-4">
            <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-4">
              Turn History
            </h3>
            
            {turns.length === 0 ? (
              <div className="text-center py-8 text-zinc-500 dark:text-zinc-400">
                <p>No turns yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {turns.map((turn) => (
                  <div 
                    key={turn.id}
                    className="border border-zinc-200 dark:border-zinc-700 rounded-lg overflow-hidden"
                    data-testid={`history-item-${turn.id}`}
                  >
                    {/* Turn Header */}
                    <button
                      onClick={() => toggleTurnExpansion(turn.id)}
                      className="w-full p-3 text-left hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="font-medium text-zinc-900 dark:text-zinc-100">
                            Turn {turn.id}
                          </div>
                          <div className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                            {formatRelativeTime(turn.timestamp)}
                          </div>
                          <div className="text-sm text-zinc-700 dark:text-zinc-300 mt-2 line-clamp-2">
                            {turn.input}
                          </div>
                        </div>
                        <svg 
                          className={cn(
                            "w-4 h-4 text-zinc-400 transition-transform",
                            expandedTurns.has(turn.id) && "rotate-180"
                          )} 
                          fill="none" 
                          stroke="currentColor" 
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                      
                      {/* KPI Changes Summary */}
                      {getKPIChangeSummary(turn)}
                    </button>

                    {/* Expanded Details */}
                    {expandedTurns.has(turn.id) && (
                      <div className="border-t border-zinc-200 dark:border-zinc-700 p-3 bg-zinc-50 dark:bg-zinc-800/50 space-y-3">
                        {/* Drivers */}
                        {turn.drivers && Object.keys(turn.drivers).length > 0 && (
                          <div>
                            <h4 className="text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-2">Drivers</h4>
                                                          <div className="grid grid-cols-2 gap-2 text-xs">
                                {Object.entries(turn.drivers).map(([key, value]) => (
                                  <div key={key} className="flex justify-between">
                                    <span className="text-zinc-700 dark:text-zinc-300">{key}</span>
                                    <span className="font-mono text-zinc-600 dark:text-zinc-400">{Math.round(value * 10) / 10}</span>
                                  </div>
                                ))}
                              </div>
                          </div>
                        )}

                        {/* Financials */}
                        {turn.financials && (
                          <div>
                            <h4 className="text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-2">Financials</h4>
                            <div className="space-y-1 text-xs">
                              <div className="flex justify-between">
                                <span className="text-zinc-700 dark:text-zinc-300">Revenue</span>
                                <span className="font-mono text-zinc-600 dark:text-zinc-400">
                                  ${Math.round(turn.financials.revenue / 1000)}k
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-zinc-700 dark:text-zinc-300">EBIT</span>
                                <span className="font-mono text-zinc-600 dark:text-zinc-400">
                                  ${Math.round(turn.financials.ebit / 1000)}k
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-zinc-700 dark:text-zinc-300">Cash</span>
                                <span className="font-mono text-zinc-600 dark:text-zinc-400">
                                  ${Math.round(turn.financials.cash / 1000)}k
                                </span>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Narrative Preview */}
                        {turn.narrative && (
                          <div>
                            <h4 className="text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-2">Narrative</h4>
                            <p className="text-xs text-zinc-700 dark:text-zinc-300 line-clamp-3">
                              {turn.narrative}
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// Helper function for classnames
function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(' ');
}
