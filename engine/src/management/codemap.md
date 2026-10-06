# GameState Management System - Code Map

## Responsibility
The GameState class is responsible for centralized management of the game's global state, including player progression, studio management (finances, team, events), skill tree progression, and user settings. It provides a reactive state management system with subscription-based updates, persistence through serialization/deserialization, state migration for version compatibility, and automatic saving functionality. The system ensures thread-safe state access and modification while maintaining a single source of truth for all game data.

## Design Patterns
- **Singleton Pattern**: The globalGameState instance and getGameState()/setGameState() functions implement a singleton pattern for global state access.
- **Observer Pattern**: The EventEmitter base class and subscribe()/notifySubscribers() mechanisms implement the observer pattern for reactive state updates.
- **State Pattern**: While not explicitly a state machine, the system manages complex state transitions through controlled updates and migrations.
- **Memento Pattern**: The serialize()/deserialize() methods implement memento pattern for saving and restoring state.
- **Migration Pattern**: The registerMigrations()/migrateState() system implements a version-based migration pattern for backward compatibility.
- **Facade Pattern**: The public API (get, set, update, subscribe, etc.) provides a simplified interface to the complex internal state management.

## Data & Control Flow
1. **Initialization**: Constructor calls getDefaultState() to establish initial state structure
2. **Migration**: registerMigrations() sets up version migration functions; migrateState() applies migrations during deserialization
3. **State Access**: 
   - get()/getAll() for reading state values
   - set()/update() for modifying state (with optional silent flag)
4. **Subscription System**:
   - subscribe() registers callbacks for specific state keys
   - notifySubscribers() triggers callbacks when state changes
   - change events emitted via EventEmitter
5. **Persistence**:
   - serialize()/deserialize() convert state to/from JSON
   - save()/load() handle async persistence with event emission
6. **Auto-save**:
   - startAutoSave()/stopAutoSave() manage periodic saving via setInterval
7. **Specialized Operations**:
   - Domain-specific methods (addMoney, advanceDay, unlockSkill, etc.) use update() internally
   - triggerRandomEvents() called during day advancement
8. **Cleanup**: destroy() stops auto-save, removes listeners, clears subscribers

## Integration Points
### Dependencies
- Node.js 'events' module (EventEmitter base class)
- No external dependencies beyond core TypeScript/JavaScript

### Consumer Modules
- **app.js**: Main application entry point, likely initializes and uses global game state
- **skills.js**: Skill system UI and logic, consumes skill tree data and unlocks skills
- **gamejam.js**: Game jam event handling, uses management state for events and resources
- **QAEngine** (potential): Quality assurance systems that may monitor state for testing

### Exported Interface
- **Class**: GameState (extends EventEmitter)
- **Functions**: 
  - getGameState(): Async singleton initializer/loader
  - setGameState(state): Singleton replacement (primarily for testing)
- **Type Interfaces** (all exported):
  - PlayerState, ManagementState, TeamMember, RandomEvent, EventChoice, EventEffect
  - SkillsState, SkillNode, SettingsState, GameSettings
  - GameStateKey (union of GameSettings keys)

### Key Methods Summary
- **State Access**: get(key), getAll(), set(key, value, silent), update(key, updater)
- **Subscription**: subscribe(key, callback) → unsubscribe function
- **Persistence**: serialize(), deserialize(json), save() (async), load() (async)
- **Auto-save**: startAutoSave(intervalMinutes), stopAutoSave()
- **Management**: addMoney(), addReputation(), addTechDebt(), advanceDay()
- **Skills**: unlockSkill(skillId), getSkillPoints(), addSkillPoints(), getManagementSummary(), getAvailableSkills(), getSkillTree()
- **Settings**: updateSetting(key, value)
- **Lifecycle**: destroy()

### Events Emitted
- 'change': Fired on state modification (key, oldValue, newValue)
- 'load': Fired after state is loaded from persistence
- 'save': Fired before state is saved to persistence
- 'skillUnlocked': Fired when a skill is successfully unlocked (skill data)

### Private Methods (Internal Mechanics)
- getDefaultState(): Returns initial state structure
- getDefaultEventPool(): Returns predefined random events
- getDefaultSkillTree(): Returns predefined skill progression tree
- registerMigrations(): Sets up version migration functions
- migrateState(): Applies migrations to loaded state
- mergeState(): Deep merges partial state updates
- notifySubscribers(): Internal subscription notification
- triggerRandomEvents(): Determines which random events fire each day