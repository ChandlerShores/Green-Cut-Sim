# GreenCut Sim - UI/UX Upgrade

## Overview

This upgrade transforms the GreenCut Sim into a polished, responsive strategy-sim dashboard that feels production-ready and easy to parse during rapid iteration.

## New Features

### 🎨 Modern Dashboard Layout
- **TopBar**: App title, theme toggle, and run controls
- **Two-column layout**: Left for actions, right for KPIs and narrative
- **Responsive design**: Works on desktop, tablet, and mobile

### 🎯 CEO Decision Center
- **Textarea**: Large input area for CEO declarations
- **Quick Actions**: 8 pre-built action templates (Cut OpEx, Boost Marketing, etc.)
- **Keyboard shortcuts**: ⌘+Enter (Mac) or Ctrl+Enter (Windows) to submit
- **Real-time validation**: Submit button disabled until input is provided

### 📊 KPI Dashboard
- **6 Key Metrics**: Morale, Credibility, Backlog, Service, Market Share, Cash Runway
- **Visual Indicators**: Progress bars with color-coded intent (good/warn/bad)
- **Delta Tracking**: Shows changes from previous turn with ▲/▼ icons
- **Responsive Grid**: 2-3 columns that adapt to screen size

### 📝 Narrative Feed
- **Latest Story**: Auto-scrolling narrative with tasteful typography
- **Key Quotes**: Highlighted pull-quotes from each turn
- **Turn Metadata**: Timestamp and turn number for context

### 💰 Financial Overview
- **Inline Stats**: Revenue, COGS, OpEx, EBIT, Cash with deltas
- **Right-aligned Numbers**: Clean, scannable financial data
- **Mini Deltas**: Small change indicators for quick analysis

### 📚 History Sidebar
- **Collapsible**: Toggle between 16px (collapsed) and 320px (expanded)
- **Turn Summary**: Shows turn number, time, input snippet, and KPI changes
- **Expandable Details**: Click to see drivers, financials, and narrative preview
- **Most Recent First**: Easy access to latest turns

### 🌓 Theme System
- **Light/Dark Mode**: Automatic detection with manual toggle
- **Persistent**: Saves preference in localStorage
- **Smooth Transitions**: All color changes are animated

## Component Architecture

```
src/
├── components/
│   ├── TopBar.tsx           # App header with theme toggle
│   ├── ActionPanel.tsx      # CEO input and submit
│   ├── QuickActions.tsx     # Pre-built action templates
│   ├── KPIGrid.tsx         # KPI metric cards
│   ├── MetricCard.tsx      # Individual KPI display
│   ├── NarrativeFeed.tsx   # Story and quotes
│   ├── HistorySidebar.tsx  # Turn history
│   ├── InlineStat.tsx      # Financial metrics
│   └── ThemeToggle.tsx     # Theme switcher
├── lib/
│   └── format.ts           # Utilities for numbers, deltas, etc.
├── types.ts                # Shared TypeScript types
├── api.ts                  # API wrapper functions
└── ui.tsx                  # Main dashboard component
```

## Quick Actions Available

1. **Cut OpEx by 10%** - Cost reduction template
2. **Boost Marketing 15%** - Growth strategy template
3. **Negotiate Supplier Terms** - Operations optimization
4. **Add Second Shift** - Capacity expansion
5. **Pilot Premium Service** - Revenue enhancement
6. **Hire Sales Team** - Team building
7. **Optimize Inventory** - Supply chain improvement
8. **Customer Retention** - Loyalty program

## Getting Started

### Development
```bash
npm run dev:ui          # Start UI dev server (port 3001)
npm run dev:server      # Start backend server (port 3000)
npm run dev             # Start both servers
```

### Building
```bash
npm run build           # Build UI for production
npm run build:server    # Build backend
npm run build:all       # Build everything
```

## API Integration

The UI is designed to work with these API endpoints:

- `POST /api/turn` - Submit CEO declaration
- `GET /api/state` - Get current run state

Currently using mock data for development. Replace the mock calls in `ui.tsx` with actual API calls when ready.

## Styling & Design

### Color Scheme
- **Light Mode**: Clean whites with zinc accents
- **Dark Mode**: Deep zinc backgrounds with light text
- **Accents**: Green for primary actions, semantic colors for KPIs

### Typography
- **Headings**: Semibold weights for hierarchy
- **Body**: Regular weights for readability
- **Numbers**: Monospace for financial data

### Animations
- **Micro-interactions**: Hover effects, focus states
- **Transitions**: Smooth color and size changes
- **Loading**: Skeleton screens and spinners

## Testing

All components include `data-testid` attributes for easy testing:

- `textarea` - CEO input field
- `submit-btn` - Submit button
- `kpi-card-{key}` - Individual KPI cards
- `narrative` - Narrative content
- `history-item-{id}` - History sidebar items
- `quick-action-{index}` - Quick action buttons

## Browser Support

- Modern browsers with ES2022 support
- Responsive design for mobile and tablet
- Touch-friendly interactions

## Future Enhancements

- Mini line chart sparklines for KPIs
- Export functionality for turn data
- Command palette (⌘K) for quick actions
- Real-time collaboration features
- Advanced analytics and reporting

## Troubleshooting

### Common Issues

1. **Theme not persisting**: Check localStorage permissions
2. **Components not loading**: Verify all imports are correct
3. **Styling issues**: Ensure Tailwind CSS is loaded
4. **TypeScript errors**: Check type definitions in `types.ts`

### Development Tips

- Use browser dev tools to inspect component hierarchy
- Check console for any JavaScript errors
- Verify API endpoints are accessible
- Test responsive behavior at different screen sizes
