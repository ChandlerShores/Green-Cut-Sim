import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import { TopBar } from './components/TopBar';
import { ActionPanel } from './components/ActionPanel';
import { KPIGrid } from './components/KPIGrid';
import { NarrativeFeed } from './components/NarrativeFeed';
import { HistorySidebar } from './components/HistorySidebar';
import { InlineStat } from './components/InlineStat';
import { submitTurn, getRunState } from './api';
import type { RunState, Turn, Theme, KPIMetric } from './types';

// Fallback data if API fails
const FALLBACK_KPIS: KPIMetric[] = [
  { key: 'morale', label: 'Morale', value: 75, delta: 0, intent: 'good' },
  { key: 'credibility', label: 'Credibility', value: 68, delta: 0, intent: 'warn' },
  { key: 'backlog', label: 'Backlog', value: 45, delta: 0, intent: 'good' },
  { key: 'service', label: 'Service', value: 82, delta: 0, intent: 'good' },
  { key: 'share', label: 'Market Share', value: 23, delta: 0, intent: 'good' },
  { key: 'cashRunway', label: 'Cash Runway', value: 18, delta: 0, intent: 'bad' },
];

const FALLBACK_FINANCIALS = {
  revenue: 2500000,
  cogs: 1800000,
  opex: 1200000,
  ebit: -500000,
  cash: 1800000,
};

function App() {
  const [theme, setTheme] = useState<Theme>('light');
  const [runState, setRunState] = useState<RunState>({
    turn: 1,
    kpis: FALLBACK_KPIS,
    turns: []
  });
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);

  // Theme management
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') as Theme;
    if (savedTheme) {
      setTheme(savedTheme);
    } else {
      // Auto-detect theme preference
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      setTheme(prefersDark ? 'dark' : 'light');
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('theme', theme);
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  // Load initial state
  useEffect(() => {
    loadRunState();
  }, []);

  const loadRunState = async () => {
    try {
      const state = await getRunState();
      setRunState(state);
    } catch (err) {
      console.error('Failed to load run state:', err);
      // Fall back to fallback data if API fails
      setRunState({
        turn: 1,
        kpis: FALLBACK_KPIS,
        turns: []
      });
    }
  };

  const handleSubmit = async () => {
    if (!input.trim() || isLoading) return;

    setIsLoading(true);
    setError(null);

    try {
      const result = await submitTurn(input.trim());
      setRunState(result.state);
      setInput('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit turn');
    } finally {
      setIsLoading(false);
    }
  };

  const handleThemeChange = (newTheme: Theme) => {
    setTheme(newTheme);
  };

  const handleHistoryToggle = () => {
    setHistoryOpen(!historyOpen);
  };

  const clearError = () => {
    setError(null);
  };

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-900 transition-colors duration-200">
      {/* Top Bar */}
      <TopBar
        theme={theme}
        onThemeChange={handleThemeChange}
        currentTurn={runState.turn}
        lastUpdate={runState.turns[0]?.timestamp}
      />

      {/* Error Banner */}
      {error && (
        <div className="bg-red-100 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 px-6 py-3">
          <div className="max-w-7xl mx-auto flex justify-between items-center">
            <span>{error}</span>
            <button
              onClick={clearError}
              className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-200"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex">
        {/* History Sidebar */}
        <HistorySidebar
          turns={runState.turns}
          isOpen={historyOpen}
          onToggle={handleHistoryToggle}
          className="flex-shrink-0"
        />

        {/* Main Dashboard */}
        <div className="flex-1 p-6">
          <div className="max-w-7xl mx-auto">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Left Column - Action Panel */}
              <div className="space-y-6">
                <div className="bg-white dark:bg-zinc-800 rounded-2xl shadow-sm border border-zinc-200 dark:border-zinc-700 p-6">
                  <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100 mb-6">
                    CEO Decision Center
                  </h2>
                  <ActionPanel
                    input={input}
                    onInputChange={setInput}
                    onSubmit={handleSubmit}
                    isLoading={isLoading}
                  />
                </div>

                {/* Financial Summary */}
                <div className="bg-white dark:bg-zinc-800 rounded-2xl shadow-sm border border-zinc-200 dark:border-zinc-700 p-6">
                  <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-4">
                    Financial Overview
                  </h3>
                  <div className="space-y-1">
                    {runState.turns[0]?.financials ? (
                      <>
                        <InlineStat label="Revenue" value={runState.turns[0].financials.revenue} format="currency" />
                        <InlineStat label="COGS" value={runState.turns[0].financials.cogs} format="currency" />
                        <InlineStat label="OpEx" value={runState.turns[0].financials.opex} format="currency" />
                        <InlineStat label="EBIT" value={runState.turns[0].financials.ebit} format="currency" />
                        <InlineStat label="Cash" value={runState.turns[0].financials.cash} format="currency" />
                      </>
                    ) : (
                      <>
                        <InlineStat label="Revenue" value={FALLBACK_FINANCIALS.revenue} format="currency" />
                        <InlineStat label="COGS" value={FALLBACK_FINANCIALS.cogs} format="currency" />
                        <InlineStat label="OpEx" value={FALLBACK_FINANCIALS.opex} format="currency" />
                        <InlineStat label="EBIT" value={FALLBACK_FINANCIALS.ebit} format="currency" />
                        <InlineStat label="Cash" value={FALLBACK_FINANCIALS.cash} format="currency" />
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Right Column - KPIs and Narrative */}
              <div className="space-y-6">
                {/* KPI Grid */}
                <div className="bg-white dark:bg-zinc-800 rounded-2xl shadow-sm border border-zinc-200 dark:border-zinc-700 p-6">
                  <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-4">
                    Key Performance Indicators
                  </h3>
                  <KPIGrid kpis={runState.kpis} isLoading={isLoading} />
                </div>

                {/* Narrative Feed */}
                <div className="bg-white dark:bg-zinc-800 rounded-2xl shadow-sm border border-zinc-200 dark:border-zinc-700 p-6">
                  <NarrativeFeed
                    latestTurn={runState.turns[0]}
                    isLoading={isLoading}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Render the app
const root = ReactDOM.createRoot(document.getElementById('root') as HTMLElement);
root.render(<App />);
