import express from 'express'
import cors from 'cors'
import path from 'path'
import fs from 'fs'
import { randomUUID } from 'crypto'
import dotenv from 'dotenv'

import { Engine } from './engine'
import { Evaluator } from './evaluator'
import { Narrator } from './narrator'
import { 
  NewRunRequestSchema, 
  TurnRequestSchema, 
  Run, 
  TurnResult,
  StatePacketSchema 
} from './contracts'

// Load environment variables
dotenv.config()

const app = express()
const PORT = process.env.PORT || 3000

// Middleware
app.use(cors())
app.use(express.json({ 
  limit: '10mb',
  verify: (req, res, buf) => {
    try {
      JSON.parse(buf.toString());
    } catch (e) {
      console.error('Invalid JSON received:', buf.toString().substring(0, 200));
      throw new Error('Invalid JSON');
    }
  }
}))
app.use(express.static(path.join(__dirname, '../dist/public')))

// Initialize services
const engine = new Engine()
const evaluator = new Evaluator()
const narrator = new Narrator()

// In-memory storage for runs
const runs = new Map<string, Run>()

// Helper function to write to run.jsonl
function writeToRunLog(data: any): void {
  try {
    const line = JSON.stringify(data) + '\n'
    fs.appendFileSync('./run.jsonl', line)
  } catch (error) {
    console.error('Failed to write to run.jsonl:', error)
  }
}

// Helper function to read from run.jsonl
function readRunLog(): any[] {
  try {
    if (!fs.existsSync('./run.jsonl')) {
      return []
    }
    const content = fs.readFileSync('./run.jsonl', 'utf-8')
    return content.trim().split('\n').filter(line => line.trim()).map(line => JSON.parse(line))
  } catch (error) {
    console.error('Failed to read run.jsonl:', error)
    return []
  }
}

// API Routes

/**
 * POST /api/run/new
 * Creates a new run and writes turn 0 snapshot to run.jsonl
 */
app.post('/api/run/new', async (req, res) => {
  try {
    const { seed } = NewRunRequestSchema.parse(req.body)
    const runSeed = seed || randomUUID()
    
    // Create initial state
    const initialState = engine.createInitialState(runSeed)
    
    // Create run
    const run: Run = {
      id: randomUUID(),
      seed: runSeed,
      created_at: Date.now(),
      turns: []
    }
    
    // Store in memory
    runs.set(run.id, run)
    
    // Write turn 0 snapshot to run.jsonl
    const snapshot = {
      timestamp: Date.now(),
      runId: run.id,
      turn_no: 0,
      type: 'snapshot',
      state: initialState
    }
    writeToRunLog(snapshot)
    
    res.json({
      success: true,
      runId: run.id,
      seed: runSeed,
      initialState
    })
  } catch (error) {
    console.error('Error creating new run:', error)
    res.status(400).json({
      success: false,
      error: 'Invalid request data'
    })
  }
})

/**
 * POST /api/turn
 * Processes a turn and returns TurnResult
 */
app.post('/api/turn', async (req, res) => {
  try {
    const raw = req.body ?? {};
    let normalized: any;

    // Handle both payload shapes
    if (raw.input && !raw.declaration) {
      // Legacy: { input: "..." } -> { declaration: "...", runId: undefined }
      normalized = { declaration: raw.input };
    } else {
      // Current: { runId: "...", declaration: "..." }
      normalized = raw;
    }

    // Auto-create run if missing runId
    if (!normalized.runId) {
      const newRunId = randomUUID();
      const initialState = engine.createInitialState(newRunId);
      
      // Store in memory (reuse your existing logic)
      const run: Run = {
        id: newRunId,
        seed: newRunId,
        created_at: Date.now(),
        turns: []
      };
      runs.set(run.id, run);
      
      // Write to run.jsonl (reuse your existing logic)
      const snapshot = {
        timestamp: Date.now(),
        runId: run.id,
        turn_no: 0,
        type: 'snapshot',
        state: initialState
      };
      writeToRunLog(snapshot);
      
      normalized.runId = newRunId;
    }

    const { runId, declaration } = TurnRequestSchema.parse(normalized)
    
    // Get run
    const run = runs.get(runId)
    if (!run) {
      return res.status(404).json({
        success: false,
        error: 'Run not found'
      })
    }
    
    // Get current state (last turn or initial state)
    const currentState = run.turns.length > 0 
      ? run.turns[run.turns.length - 1].state_after
      : engine.createInitialState(run.seed)
    
    // Generate RNG event for this turn
    const rngEvent = engine.generateRngEvent(currentState, run.turns.length)
    
    // Create state packet for evaluator
    const statePacket = StatePacketSchema.parse({
      turn_no: currentState.turn_no,
      period: currentState.period,
      pnl: currentState.pnl,
      kpis: currentState.kpis,
      event: currentState.event,
      morale: currentState.morale,
      credibility: currentState.credibility,
      backlog: currentState.backlog,
      service: currentState.service,
      share: currentState.share,
      cash_runway: currentState.cash_runway,
      flags: currentState.flags,
      pressures: currentState.pressures,
      headroom: currentState.headroom,
      recent_moves: currentState.recent_moves,
      tail_risk: currentState.tail_risk,
      shock_decay: currentState.shock_decay,
      reward_decay: currentState.reward_decay,
      ceo_credibility: currentState.ceo_credibility,
      active_shocks: currentState.active_shocks,
      active_rewards: currentState.active_rewards,
      notes: currentState.notes
    })
    
    // Get current caps
    const caps = engine.getCaps()
    
    // Evaluate declaration with RNG event
    const evaluation = await evaluator.evaluate(declaration, statePacket, rngEvent, caps)
    
    // Resolve turn in engine
    const turnResult = engine.resolveTurn(
      currentState,
      declaration,
      evaluation
    )
    
    // Generate narrative
    const { narrative, quotes } = await narrator.narrate(
      turnResult.state_before,
      turnResult.state_after,
      rngEvent,
      evaluation.assessment,
      evaluation.signals,
      evaluation.integrated,
      evaluation.penalties,
      engine.getCaps()
    )
    
    // Update turn result with narrative
    turnResult.narrative = narrative
    turnResult.quotes = quotes
    
    // Add to run
    run.turns.push(turnResult)
    
    // Write to run.jsonl
    const logEntry = {
      timestamp: Date.now(),
      runId: run.id,
      turn_no: turnResult.turn_no,
      type: 'turn_result',
      result: turnResult
    }
    writeToRunLog(logEntry)
    
    res.json({
      success: true,
      turnResult
    })
  } catch (error) {
    console.error('Error processing turn:', error)
    res.status(400).json({
      success: false,
      error: 'Invalid request data or processing failed'
    })
  }
})

/**
 * GET /api/run/:id
 * Returns snapshots array for a specific run
 */
app.get('/api/run/:id', (req, res) => {
  try {
    const { id } = req.params
    const run = runs.get(id)
    
    if (!run) {
      return res.status(404).json({
        success: false,
        error: 'Run not found'
      })
    }
    
    // Read snapshots from run.jsonl
    const snapshots = readRunLog().filter(entry => entry.runId === id)
    
    res.json({
      success: true,
      run,
      snapshots
    })
  } catch (error) {
    console.error('Error retrieving run:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve run data'
    })
  }
})

/**
 * GET /api/runs
 * Returns list of all runs
 */
app.get('/api/runs', (req, res) => {
  try {
    const runList = Array.from(runs.values()).map(run => ({
      id: run.id,
      seed: run.seed,
      created_at: run.created_at,
      turn_count: run.turns.length
    }))
    
    res.json({
      success: true,
      runs: runList
    })
  } catch (error) {
    console.error('Error retrieving runs:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve runs'
    })
  }
})

/**
 * GET /api/state
 * Returns the current run state for the frontend
 */
app.get('/api/state', (req, res) => {
  try {
    // Get the most recent run or create a new one
    let currentRun = Array.from(runs.values()).sort((a, b) => b.created_at - a.created_at)[0];
    
    if (!currentRun) {
      // Create a new run if none exists
      const newRunId = randomUUID();
      const initialState = engine.createInitialState(newRunId);
      
      currentRun = {
        id: newRunId,
        seed: newRunId,
        created_at: Date.now(),
        turns: []
      };
      runs.set(currentRun.id, currentRun);
    }
    
    // Get current state (last turn or initial state)
    const currentState = currentRun.turns.length > 0 
      ? currentRun.turns[currentRun.turns.length - 1].state_after
      : engine.createInitialState(currentRun.seed)
    
    // Transform to frontend format
    const state = {
      turn: currentState.turn_no,
      kpis: [
        { key: 'morale', label: 'Morale', value: currentState.morale, delta: 0, intent: 'good' },
        { key: 'credibility', label: 'Credibility', value: currentState.credibility, delta: 0, intent: 'good' },
        { key: 'backlog', label: 'Backlog', value: currentState.backlog, delta: 0, intent: 'good' },
        { key: 'service', label: 'Service', value: currentState.service, delta: 0, intent: 'good' },
        { key: 'share', label: 'Market Share', value: currentState.share, delta: 0, intent: 'good' },
        { key: 'cashRunway', label: 'Cash Runway', value: currentState.cash_runway, delta: 0, intent: 'good' },
      ],
      turns: currentRun.turns.map(turn => ({
        ...turn,
        financials: turn.state_after.pnl ? {
          revenue: turn.state_after.pnl.revenue * 1000000, // Convert from millions to actual dollars
          cogs: turn.state_after.pnl.cogs * 1000000,
          opex: turn.state_after.pnl.opex * 1000000,
          ebit: turn.state_after.pnl.net * 1000000, // Using net as EBIT approximation
          cash: turn.state_after.pnl.cash * 1000000
        } : undefined
      }))
    };
    
    res.json(state);
  } catch (error) {
    console.error('Error retrieving state:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve state'
    });
  }
});

/**
 * GET /api/download
 * Downloads the run.jsonl file
 */
app.get('/api/download', (req, res) => {
  try {
    if (!fs.existsSync('./run.jsonl')) {
      return res.status(404).json({
        success: false,
        error: 'No run data available'
      })
    }
    
    res.download('./run.jsonl', 'run.jsonl')
  } catch (error) {
    console.error('Error downloading run data:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to download run data'
    })
  }
})

// Global error handler
app.use((error: any, req: any, res: any, next: any) => {
  console.error('Global error handler:', error.message);
  if (error.message === 'Invalid JSON') {
    res.status(400).json({
      success: false,
      error: 'Invalid JSON format'
    });
  } else {
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Serve React app for all other routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../dist/public/index.html'))
})

// Start server
app.listen(PORT, () => {
  console.log(`GreenCut V2 Lite server running on port ${PORT}`)
  console.log(`Frontend available at http://localhost:${PORT}`)
  console.log(`API available at http://localhost:${PORT}/api`)
  
  if (!process.env.OPENAI_API_KEY) {
    console.log('⚠️  No OpenAI API key found. Using rule-based fallback for evaluation and narration.')
  }
})
