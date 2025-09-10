import React from 'react';
import { ThemeToggle } from './ThemeToggle';
import type { Theme } from '../types';
import { formatTime } from '../lib/format';
import { config } from '../config';

interface TopBarProps {
  theme: Theme;
  onThemeChange: (theme: Theme) => void;
  currentTurn: number;
  lastUpdate?: string;
}

export function TopBar({ theme, onThemeChange, currentTurn, lastUpdate }: TopBarProps) {
  return (
    <header className="bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 px-6 py-4">
      <div className="max-w-7xl mx-auto flex justify-between items-center">
        {/* Left: Logo/Title */}
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-green-600 rounded-lg flex items-center justify-center">
            <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
            </svg>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
              {config.app.title}
            </h1>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              {config.app.description} v{config.app.version}
            </p>
          </div>
        </div>

        {/* Right: Theme Toggle and Run Meta */}
        <div className="flex items-center space-x-4">
          {/* Run Meta */}
          <div className="text-right">
            <div className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
              Turn {currentTurn}
            </div>
            {lastUpdate && (
              <div className="text-xs text-zinc-600 dark:text-zinc-400">
                Last update: {formatTime(lastUpdate)}
              </div>
            )}
          </div>
          
          {/* Theme Toggle */}
          <ThemeToggle theme={theme} onThemeChange={onThemeChange} />
        </div>
      </div>
    </header>
  );
}
