# QA Engine Code Map

## Responsibility
The QA Engine is responsible for:
- Managing robot player behavior models for automated testing
- Executing QA tests (automated testing, regression testing) based on contracts
- Generating comprehensive QA reports including reproduction steps, stack traces, performance data, and severity levels
- Integrating instruction budget tracking and memory leak detection
- Providing deterministic time control via a virtual clock scheduler for reproducible test runs

## Design Patterns
- **Virtual Clock Pattern**: Encapsulated in the `VirtualClock` class, providing deterministic time control with pause/resume, time scaling, tick-based advancement, and subscription mechanisms for synchronous simulation updates.
- **Behavior Tree Pattern**: Used in `BotController` to drive AI behavior through composable nodes (selector, sequence, action, condition) enabling complex decision-making for test bots.
- **Factory Pattern**: Implemented via `createBotConfig()` method to generate bot configurations with randomized skills, latency, and default behavior trees.
- **Observer Pattern**: Utilized through `EventEmitter` inheritance in `QAEngine` to emit `'finding'` events when bugs or issues are detected during simulation.
- **Dependency Injection**: The `VirtualClock` is instantiated internally and made accessible via getter, while bot controllers are created and managed by the engine.

## Data & Control Flow
QA test execution follows this flow:
1. **runContract()**: Entry point that accepts a `QAContract`, initializes run state, and creates bot controllers.
2. **create bots**: For each bot specified in `qaConfig.botPlayers`, a `BotController` is instantiated with a generated `BotConfig` and added to the engine's bot map.
3. **injectBugs()**: Configures fault injection by wrapping each bot's `tick` method to check trigger conditions and emit findings when matched.
4. **runSimulation()**: Runs the simulation loop for the configured duration:
   - Advances the virtual clock by fixed tick intervals (60 TPS)
   - For each bot, calls `tick()` which executes its behavior tree
   - Records performance metrics (frame time, instruction counts, memory samples)
   - Yields control to maintain target frame rate
5. **tick() → executeBehaviorTree()**: Each bot's tick processes its behavior tree recursively:
   - Selector nodes: Succeed if any child succeeds
   - Sequence nodes: Succeed only if all children succeed
   - Condition nodes: Evaluate their condition function on current bot state
   - Action nodes: Perform specific actions (idle, findTarget, moveTo, attack, flee, interact)
6. **generateReport()**: After simulation completion, compiles:
   - Performance summary from collected metrics
   - Passed/failed acceptance criteria based on findings severity
   - Overall verdict and severity level
   - Detailed findings with reproduction steps and suggested fixes

## Integration Points
### Dependencies
- **Node.js `events` module**: Used for `EventEmitter` base class to enable event-driven communication.
- **Browser/Node.js timing API**: Utilizes `performance.now()` for high-resolution frame timing measurements.
- **Internal systems**: 
  - Instruction Budget (referenced in comments for performance tracking)
  - Memory detection mechanisms (referenced in comments)

### Exported Interfaces & Classes
- **Classes**: `QAEngine`, `VirtualClock`, `BotController` (internal)
- **Interfaces**: 
  - Configuration: `BotConfig`, `BehaviorNode`, `BotState`, `QAContract`, `AcceptanceCriterion`, `NonFunctionalRequirement`, `QAConfig`, `BugInjection`
  - Results: `QAReport`, `Finding`, `PerformanceSummary`, `BotMetrics`
- **Events**: `'finding'` emitted when a bug or issue is detected during simulation

### Consumers
- Test orchestration systems that define and execute QA contracts
- Game integration layers that provide bot behavior implementations
- Reporting dashboards that visualize QA reports and trends
- CI/CD pipelines that gate releases based on QA verdict