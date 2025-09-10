import React from 'react';
import type { KPIMetric } from '../types';
import { formatDelta, getDeltaIcon, getDeltaColor, getIntentColor, cn } from '../lib/format';

interface MetricCardProps {
  metric: KPIMetric;
  className?: string;
}

export function MetricCard({ metric, className }: MetricCardProps) {
  const { key, label, value, delta, intent } = metric;
  
  return (
    <div 
      className={cn(
        "rounded-2xl shadow-sm border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 transition-all duration-200 hover:shadow-md",
        className
      )}
      data-testid={`kpi-card-${key}`}
    >
      {/* Header */}
      <div className="flex justify-between items-start mb-4">
        <h3 className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          {label}
        </h3>
        {delta !== undefined && Math.abs(delta) > 0.1 && (
          <div className={cn(
            "flex items-center space-x-1 text-xs font-medium",
            getDeltaColor(delta)
          )}>
            <span>{getDeltaIcon(delta)}</span>
            <span>{formatDelta(Math.round(delta * 10) / 10)}</span>
          </div>
        )}
      </div>

      {/* Value */}
      <div className="mb-4">
        <div className="text-3xl font-bold text-zinc-900 dark:text-zinc-100">
          {Math.round(value)}
        </div>
        {metric.raw !== undefined && metric.raw !== value && (
          <div className="text-sm text-zinc-600 dark:text-zinc-400">
            {metric.raw.toLocaleString()}
          </div>
        )}
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-zinc-200 dark:bg-zinc-700 rounded-full h-2">
        <div 
          className={cn(
            "h-2 rounded-full transition-all duration-500 ease-out",
            getIntentColor(intent)
          )}
          style={{ width: `${Math.min(Math.max(value, 0), 100)}%` }}
        />
      </div>

      {/* Intent Indicator */}
      {intent && (
        <div className="mt-3 flex items-center space-x-2">
          <div className={cn(
            "w-2 h-2 rounded-full",
            getIntentColor(intent)
          )} />
          <span className={cn(
            "text-xs font-medium capitalize",
            intent === 'good' && 'text-green-700 dark:text-green-300',
            intent === 'warn' && 'text-yellow-700 dark:text-yellow-300',
            intent === 'bad' && 'text-red-700 dark:text-red-300'
          )}>
            {intent}
          </span>
        </div>
      )}
    </div>
  );
}
