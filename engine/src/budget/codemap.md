# engine/src/budget/

## Responsibility
The InstructionBudget module manages Luau code execution instruction budgets, providing soft/hard budget enforcement, performance monitoring, and worker-based execution isolation. Its primary role is to track and limit computational resources used by game logic scripts to prevent runaway execution and maintain consistent frame rates.

## Design Patterns
- **Observer Pattern**: The InstructionBudget class extends EventEmitter to emit budget-related events (hardOver, softOverPenalty, sample, etc.) allowing decoupled consumers to react to budget states.
- **Singleton Pattern**: The getInstructionBudget()/setInstructionBudget() functions provide a global instance for system-wide budget management while allowing testability through instance replacement.
- **State Pattern**: Internal budget state transitions (normal → softOver → hardOver) trigger different behaviors (warnings, penalties, termination) based on configured thresholds.
- **Worker Isolation Pattern**: The createExecutionWorker() method encapsulates user code in separate threads with timeout-based termination for hard budget enforcement.

## Data & Control Flow
1. **Frame Start**: `frameStart()` resets instruction counter and records frame start timestamp
2. **Instruction Tracking**: During frame execution, `addInstructions(count)` accumulates Luau instruction count
3. **Frame End**: `frameEnd()` calculates frame time, updates state with instruction count, calls `checkBudget()`, records frame metrics to history
4. **Budget Check**: `checkBudget()` evaluates current instructions against hard/soft limits:
   - Hard over: emits 'hardOver' and 'terminate' events if enableHardTerminate=true
   - Soft over: increments consecutiveSoftFrames; when exceeding threshold, emits 'softOverPenalty' and reduces rewardMultiplier
5. **Sampling**: Periodic `sample()` (via setInterval) records frame metrics to history and emits 'sample' event for monitoring
6. **History**: Frame metrics are retained in circular buffer (last 600 frames) for trend analysis

## Integration Points
### Dependencies
- Node.js `events` module (EventEmitter base class)
- Node.js `worker_threads` module (for isolated code execution)
- Browser/Node.js `performance` API (for timing measurements)

### Consumers
- **QAEngine**: Uses budget state for performance monitoring and frame budget visualization
- **GameState**: Potentially consumes rewardMultiplier and techDebt for dynamic difficulty adjustment and progression systems
- **Worker System**: Execution workers created via createExecutionWorker() for sandboxed script execution
- **Debugging Tools**: Budget snapshots and history accessed via getSnapshot()/getHistory() for performance profiling

### Key Exports
- `InstructionBudget` class (EventEmitter subclass)
- `BudgetConfig` interface (hardLimit, softLimit, softFramesThreshold, sampleIntervalMs, enableHardTerminate, enableSoftWarning)
- `BudgetState` interface (currentInstructions, frameTimeMs, memoryBytes, networkBytes, isSoftOver, isHardOver, consecutiveSoftFrames, rewardMultiplier, techDebt)
- `FrameMetrics` and `BudgetSnapshot` interfaces
- `DEFAULT_BUDGET_CONFIG` constant
- `getInstructionBudget(config?)` - singleton getter
- `setInstructionBudget(budget)` - singleton setter (for testing)

### Key Methods
- Lifecycle: `start()`, `stop()`, `destroy()`
- Frame tracking: `frameStart()`, `frameEnd()`, `addInstructions()`
- Budget checking: `checkBudget()`, `isOverBudget()`
- Sampling: `sample()`, `getHistory()`, `getSnapshot()`
- Configuration: `updateConfig()`, `getConfig()`
- Worker execution: `createExecutionWorker(userCode)`
- State queries: `getState()`, `getRewardMultiplier()`, `getTechDebt()`, `getCurrentInstructions()`, `getFrameTimeMs()`
- Utilities: `reset()`, `clearHistory()`

### Events Emitted
- `'hardOver'` - Hard budget limit exceeded
- `'terminate'` - Request to terminate execution (hard budget)
- `'softOverPenalty'` - Consecutive soft over threshold exceeded
- `'sample'` - Periodic budget sampling
- `'workerTimeout'` - Worker execution timeout
- `'executionError'` - Error during worker code execution
- `'workerError'` - Worker thread error
- `'change'` - Generic state change (backward compatibility)