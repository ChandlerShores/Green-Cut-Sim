import React from 'react';
import { MetricCard } from './MetricCard';
import type { KPIMetric } from '../types';

interface KPIGridProps {
  kpis: KPIMetric[];
  isLoading?: boolean;
}

export function KPIGrid({ kpis, isLoading = false }: KPIGridProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {Array.from({ length: 6 }).map((_, index) => (
          <div 
            key={index}
            className="rounded-2xl shadow-sm border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 animate-pulse"
          >
            <div className="h-4 bg-zinc-200 dark:bg-zinc-700 rounded mb-4 w-3/4"></div>
            <div className="h-8 bg-zinc-200 dark:bg-zinc-700 rounded mb-4"></div>
            <div className="h-2 bg-zinc-200 dark:bg-zinc-700 rounded"></div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {kpis.map((kpi) => (
        <MetricCard key={kpi.key} metric={kpi} />
      ))}
    </div>
  );
}
