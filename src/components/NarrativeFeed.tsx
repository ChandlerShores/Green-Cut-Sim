import React, { useEffect, useRef } from 'react';
import type { Turn } from '../types';

interface NarrativeFeedProps {
  latestTurn?: Turn;
  isLoading?: boolean;
  className?: string;
}

export function NarrativeFeed({ latestTurn, isLoading = false, className = '' }: NarrativeFeedProps) {
  const narrativeRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to top on new turn
  useEffect(() => {
    if (narrativeRef.current && latestTurn) {
      narrativeRef.current.scrollTop = 0;
    }
  }, [latestTurn?.id]);

  if (isLoading) {
    return (
      <div className={`space-y-4 ${className}`}>
        <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
          Narrative
        </h3>
        <div className="space-y-3 animate-pulse">
          <div className="h-4 bg-zinc-200 dark:bg-zinc-700 rounded w-full"></div>
          <div className="h-4 bg-zinc-200 dark:bg-zinc-700 rounded w-3/4"></div>
          <div className="h-4 bg-zinc-200 dark:bg-zinc-700 rounded w-5/6"></div>
          <div className="h-4 bg-zinc-200 dark:bg-zinc-700 rounded w-2/3"></div>
        </div>
      </div>
    );
  }

  if (!latestTurn?.narrative) {
    return (
      <div className={`space-y-4 ${className}`}>
        <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
          Narrative
        </h3>
        <div className="text-center py-8 text-zinc-500 dark:text-zinc-400">
          <p>Submit your first declaration to see the narrative</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
        Narrative
      </h3>
      
      <div 
        ref={narrativeRef}
        className="max-h-96 overflow-y-auto space-y-4"
        aria-live="polite"
        aria-label="Latest narrative"
      >
        {/* Main Narrative */}
        <div className="bg-white dark:bg-zinc-800 rounded-xl p-6 border border-zinc-200 dark:border-zinc-700">
          <p className="text-zinc-700 dark:text-zinc-300 leading-relaxed text-base">
            {latestTurn.narrative}
          </p>
        </div>

        {/* Quotes */}
        {latestTurn.quotes && latestTurn.quotes.length > 0 && (
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
              Key Quotes
            </h4>
            {latestTurn.quotes.map((quote, index) => (
              <blockquote 
                key={index}
                className="bg-zinc-50 dark:bg-zinc-900/50 border-l-4 border-green-500 pl-4 py-3 italic text-zinc-700 dark:text-zinc-300"
                data-testid="narrative"
              >
                "{quote}"
              </blockquote>
            ))}
          </div>
        )}

        {/* Turn Meta */}
        <div className="text-xs text-zinc-500 dark:text-zinc-400 text-center">
          Turn {latestTurn.id} • {new Date(latestTurn.timestamp).toLocaleString()}
        </div>
      </div>
    </div>
  );
}
