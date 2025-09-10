# GreenCut V2 Lite

A business simulation game where CEOs make strategic declarations that are evaluated by AI and processed through a deterministic engine. Built with Node.js, TypeScript, React, and optional OpenAI integration.

## Features

- **Deterministic Engine**: Same inputs always produce same outputs
- **AI Evaluation**: LLM-powered assessment of CEO declarations (with rule-based fallback)
- **Dynamic State Management**: Tracks morale, credibility, backlog, service quality, market share, and cash runway
- **Flag System**: Supply chain fragility, labor tensions, quality concerns, and tail risks
- **Caps & Constraints**: Configurable limits on state changes
- **Narrative Generation**: AI-generated business narratives and executive quotes
- **Persistent Logging**: All game data saved to `run.jsonl` for analysis

## Tech Stack

- **Backend**: Node.js 20 + TypeScript + Express
- **Frontend**: React + Vite + Tailwind CSS
- **AI**: OpenAI GPT-4 (optional) with rule-based fallback
- **Validation**: Zod schemas for runtime type safety
- **Testing**: Vitest for comprehensive test coverage
- **Data**: Append-only JSONL logging (no database required)

## Quick Start

### Prerequisites

- Node.js 20+
- npm or yarn

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. (Optional) Set up OpenAI API key:
   ```bash
   cp env.example .env
   # Edit .env and add your OPENAI_API_KEY
   ```

### Development

```bash
# Start both server and frontend in development mode
npm run dev

# Server runs on http://localhost:3000
# Frontend runs on http://localhost:3001
```

### Production

```bash
# Build the project
npm run build

# Start production server
npm start
```

### Testing

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch
```

### Utilities

```bash
# Clear run data
npm run reset

# View available scripts
npm run
```

## Keyword Configuration

The rule-based evaluator checks declarations against keyword lists for
out-of-bounds claims and incoherent statements. These lists live in
`src/rules/evaluatorKeywords.ts`. To handle new scenarios, add keywords
to `OOB_KEYWORDS` or `NONSENSE_KEYWORDS`, then restart the server or
rebuild the project.

## API Reference

### Create New Run

```bash
curl -X POST http://localhost:3000/api/run/new \
  -H "Content-Type: application/json" \
  -d '{"seed": "optional-custom-seed"}'
```

**Response:**
```json
{
  "success": true,
  "runId": "uuid",
  "seed": "seed-value",
  "initialState": { ... }
}
```

### Process Turn

```bash
curl -X POST http://localhost:3000/api/turn \
  -H "Content-Type: application/json" \
  -d '{
    "runId": "your-run-id",
    "declaration": "We will improve team morale and optimize processes"
  }'
```

**Response:**
```json
{
  "success": true,
  "turnResult": {
    "turn_no": 1,
    "state_before": { ... },
    "state_after": { ... },
    "declaration": "...",
    "assessment": { ... },
    "signals": { ... },
    "deltas": { ... },
    "applied_deltas": { ... },
    "narrative": "...",
    "quotes": [...]
  }
}
```

### Get Run Data

```bash
curl http://localhost:3000/api/run/{run-id}
```

### Download Run Data

```bash
curl -O http://localhost:3000/api/download
```

## Game Mechanics

### State Metrics

- **Morale** (0-100): Team spirit and engagement
- **Credibility** (0-100): Leadership trust and reputation
- **Backlog** (0+): Work in progress and capacity pressure
- **Service** (0-100): Customer satisfaction and quality
- **Share** (0+): Market position and competitive standing
- **Cash Runway** (months): Financial sustainability

### Flags

- **Supply Fragile**: Affects backlog pressure calculations
- **Labor Tense**: Boosts morale but reduces credibility
- **Quality Watch**: Indicates quality concerns
- **Tail Risk**: High-impact risk exposure

### Caps

Default limits on state changes:
- **Morale**: ±3.0
- **Credibility**: ±2.0
- **Service Risk**: ±0.6
- **Backlog Pressure**: ±1.0

### Context Modifications

- **Labor Tense**: Morale ×1.2, Credibility ×0.9
- **Supply Fragile**: Service Risk ×1.3
- **High Morale**: Decay to ×0.8 if >85

## AI Integration

### OpenAI (Optional)

When `OPENAI_API_KEY` is set:
- **Evaluator**: Uses GPT-4 for declaration assessment
- **Narrator**: Generates contextual business narratives

### Rule-Based Fallback

When no API key is available:
- **Evaluator**: Keyword-based signal detection
- **Narrator**: Template-based narrative generation

## Development

### Project Structure

```
src/
├── contracts.ts      # Zod schemas and types
├── engine.ts         # Deterministic state engine
├── evaluator.ts      # AI/rule-based evaluation
├── narrator.ts       # AI/template-based narration
├── server.ts         # Express server + API
├── ui.tsx           # React frontend
└── test_*.spec.ts   # Test suites
```

### Adding New Metrics

1. Update schemas in `contracts.ts`
2. Add logic in `engine.ts`
3. Update evaluation rules in `evaluator.ts`
4. Add UI components in `ui.tsx`
5. Update tests

### Testing Strategy

- **Determinism**: Same inputs → same outputs
- **Caps**: Deltas respect configured limits
- **Fallback**: Rule-based evaluation works without API
- **Integration**: End-to-end turn processing

## Contributing

1. Fork the repository
2. Create a feature branch
3. Add tests for new functionality
4. Ensure all tests pass
5. Submit a pull request

## License

MIT License - see LICENSE file for details.

## Support

For issues and questions:
1. Check existing issues
2. Review test coverage
3. Test with rule-based fallback
4. Create detailed bug report
