import React from 'react';
import { QuickActions } from './QuickActions';

interface ActionPanelProps {
  input: string;
  onInputChange: (value: string) => void;
  onSubmit: () => void;
  isLoading: boolean;
  className?: string;
}

export function ActionPanel({ 
  input, 
  onInputChange, 
  onSubmit, 
  isLoading,
  className = '' 
}: ActionPanelProps) {
  const handleQuickAction = (text: string) => {
    onInputChange(text);
  };

  const handleSubmit = () => {
    if (input.trim() && !isLoading) {
      onSubmit();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      handleSubmit();
    }
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* CEO Declaration Input */}
      <div className="space-y-3">
        <label htmlFor="ceo-declaration" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
          CEO Declaration
        </label>
        <textarea
          id="ceo-declaration"
          value={input}
          onChange={(e) => onInputChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Enter your strategic decision or declaration here..."
          className="w-full h-32 p-4 border border-zinc-300 dark:border-zinc-600 rounded-xl resize-none focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 transition-all duration-200"
          disabled={isLoading}
          data-testid="textarea"
        />
        
        {/* Help Text */}
        <div className="text-xs text-zinc-600 dark:text-zinc-400">
          <p>Examples: "Cut OpEx by 15%", "Launch new product line", "Hire 10 sales reps"</p>
          <p className="mt-1">Press ⌘+Enter (Mac) or Ctrl+Enter (Windows) to submit</p>
        </div>
      </div>

      {/* Submit Button */}
      <button
        onClick={handleSubmit}
        disabled={!input.trim() || isLoading}
        className="w-full bg-green-600 hover:bg-green-700 disabled:bg-zinc-400 dark:disabled:bg-zinc-600 text-white font-medium py-3 px-6 rounded-xl transition-all duration-200 disabled:cursor-not-allowed hover:shadow-lg disabled:shadow-none"
        data-testid="submit-btn"
      >
        {isLoading ? (
          <div className="flex items-center justify-center space-x-2">
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            <span>Processing...</span>
          </div>
        ) : (
          'Submit Declaration'
        )}
      </button>

      {/* Quick Actions */}
      <QuickActions onActionClick={handleQuickAction} />
    </div>
  );
}
