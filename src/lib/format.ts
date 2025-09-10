import type { KPIMetric } from '../types';

// Number formatting
export function formatNumber(value: number, decimals: number = 0): string {
  return value.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatPercent(value: number, decimals: number = 1): string {
  return `${value >= 0 ? '+' : ''}${value.toFixed(decimals)}%`;
}

// Delta formatting
export function formatDelta(value: number, decimals: number = 1): string {
  if (value === 0) return '0';
  const sign = value > 0 ? '+' : '';
  return `${sign}${value.toFixed(decimals)}`;
}

export function getDeltaIcon(value: number): string {
  if (value > 0) return '▲';
  if (value < 0) return '▼';
  return '—';
}

export function getDeltaColor(value: number): string {
  if (value > 0) return 'text-green-600 dark:text-green-400';
  if (value < 0) return 'text-red-600 dark:text-red-400';
  return 'text-gray-500 dark:text-gray-400';
}

// KPI intent colors
export function getIntentColor(intent: KPIMetric['intent']): string {
  switch (intent) {
    case 'good':
      return 'bg-green-500';
    case 'warn':
      return 'bg-yellow-500';
    case 'bad':
      return 'bg-red-500';
    default:
      return 'bg-gray-300 dark:bg-gray-600';
  }
}

export function getIntentTextColor(intent: KPIMetric['intent']): string {
  switch (intent) {
    case 'good':
      return 'text-green-700 dark:text-green-300';
    case 'warn':
      return 'text-yellow-700 dark:text-yellow-300';
    case 'bad':
      return 'text-red-700 dark:text-red-300';
    default:
      return 'text-gray-700 dark:text-gray-300';
  }
}

// Classnames helper
export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(' ');
}

// Time formatting
export function formatTime(timestamp: string): string {
  const date = new Date(timestamp);
  return date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

export function formatRelativeTime(timestamp: string): string {
  const now = new Date();
  const date = new Date(timestamp);
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  
  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}
