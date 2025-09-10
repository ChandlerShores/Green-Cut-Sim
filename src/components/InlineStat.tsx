import React from 'react';
import { formatCurrency, formatDelta, getDeltaIcon, getDeltaColor } from '../lib/format';

interface InlineStatProps {
  label: string;
  value: number;
  delta?: number;
  format?: 'currency' | 'number' | 'percent';
  className?: string;
}

export function InlineStat({ 
  label, 
  value, 
  delta, 
  format = 'number',
  className = '' 
}: InlineStatProps) {
  const formatValue = (val: number) => {
    switch (format) {
      case 'currency':
        return formatCurrency(val);
      case 'percent':
        return `${val.toFixed(1)}%`;
      default:
        return val.toLocaleString();
    }
  };

  return (
    <div className={`flex justify-between items-center py-2 ${className}`}>
      <span className="text-sm text-zinc-700 dark:text-zinc-300">
        {label}
      </span>
      <div className="flex items-center space-x-2">
        {delta !== undefined && Math.abs(delta) > 0.1 && (
          <div className={cn(
            "flex items-center space-x-1 text-xs font-medium",
            getDeltaColor(delta)
          )}>
            <span>{getDeltaIcon(delta)}</span>
            <span>{formatDelta(Math.round(delta * 10) / 10, format === 'percent' ? 1 : 0)}</span>
          </div>
        )}
        <span className="text-sm font-mono text-zinc-900 dark:text-zinc-100">
          {formatValue(value)}
        </span>
      </div>
    </div>
  );
}

// Helper function for classnames
function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(' ');
}
