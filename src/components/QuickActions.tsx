import React from 'react';

interface QuickActionsProps {
  onActionClick: (text: string) => void;
}

const QUICK_ACTIONS = [
  {
    label: "Cut OpEx by 10%",
    text: "Cut OpEx by 10% across non-critical functions; protect Customer Support.",
    category: "cost"
  },
  {
    label: "Boost Marketing 15%",
    text: "Increase Marketing by 15% targeting pro-sumer segment; expect lagged payoff.",
    category: "growth"
  },
  {
    label: "Negotiate Supplier Terms",
    text: "Negotiate supplier terms: +15 days DPO; trade-off: +2% COGS.",
    category: "operations"
  },
  {
    label: "Add Second Shift",
    text: "Add second shift in Assembly for 8 weeks to clear backlog.",
    category: "operations"
  },
  {
    label: "Pilot Premium Service",
    text: "Pilot premium service tier with 24h response SLA; price +12%.",
    category: "revenue"
  },
  {
    label: "Hire Sales Team",
    text: "Hire 5 senior sales reps in region West; spiff comp plan for Q4.",
    category: "growth"
  },
  {
    label: "Optimize Inventory",
    text: "Reduce safety stock levels by 20%; implement JIT for key components.",
    category: "operations"
  },
  {
    label: "Customer Retention",
    text: "Launch customer loyalty program with 5% discount for 12-month contracts.",
    category: "revenue"
  }
];

const CATEGORY_COLORS = {
  cost: "bg-red-100 text-red-800 border-red-200 dark:bg-red-900/20 dark:text-red-300 dark:border-red-800",
  growth: "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-800",
  operations: "bg-green-100 text-green-800 border-green-200 dark:bg-green-900/20 dark:text-green-300 dark:border-green-800",
  revenue: "bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-900/20 dark:text-purple-300 dark:border-purple-800"
};

export function QuickActions({ onActionClick }: QuickActionsProps) {
  return (
    <div className="space-y-3">
      <h3 className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
        Quick Actions
      </h3>
      <div className="flex flex-wrap gap-2">
        {QUICK_ACTIONS.map((action, index) => (
          <button
            key={index}
            onClick={() => onActionClick(action.text)}
            className={cn(
              "px-3 py-1.5 text-xs font-medium rounded-full border transition-all duration-200 hover:scale-105",
              CATEGORY_COLORS[action.category as keyof typeof CATEGORY_COLORS]
            )}
            data-testid={`quick-action-${index}`}
          >
            {action.label}
          </button>
        ))}
      </div>
    </div>
  );
}

// Helper function for classnames
function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(' ');
}
