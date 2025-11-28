# NBA Live Overlay

Unified, modular overlay for displaying live NBA game stats with automatic mode switching. Built with clean architecture following SOLID/DRY principles.

## Overview

Single overlay that automatically switches between two display modes:
- **Current Game Mode**: Shows selected game with live stats, animations, and MVP overlays
- **Other Games Mode**: Shows scores from other NBA games (cycles through all games once per quarter at 60s mark)

## Architecture

Feature-based organization following modern best practices:

```
nba-live-overlay/
├── game/                          # Current game feature
│   └── game-view.js              # - Renders current game display
│                                  # - Handles pregame/live/halftime/final states
│                                  # - Score animations (slide effect)
│
├── other-games/                   # Other games feature
│   ├── other-games-view.js       # - Renders other games (3 per page)
│   └── other-games-controller.js # - Cycles through games
│                                  # - Sorting and timing logic
│
├── mvp/                           # MVP feature (self-contained)
│   ├── mvp-view.js               # - MVP section animations
│   ├── mvp-controller.js         # - Automatic display timing
│   └── mvp-integration.js        # - Data fetching and caching
│
├── utils/                         # Utility functions
│   ├── game-utils.js             # - Game state detection
│   │                              # - Time formatting (MM:SS)
│   │                              # - Countdown calculations
│   ├── state-manager.js          # - Centralized state tracking
│   │                              # - Mode management
│   │                              # - Quarter timing
│   ├── simulation-manager.js     # - Fake data for testing
│   └── game-data-formatter.js    # - Data transformation
│                                  # - ESPN API → View format
│
├── app-controller.js              # Main orchestrator
│                                  # - Coordinates all components
│                                  # - API polling (3s interval)
│                                  # - State detection and updates
│
├── mode-coordinator.js            # Mode switching logic
│                                  # - Transitions between modes
│                                  # - Cleanup and show logic
│
├── index.html                     # Single entry point
├── styles.css                     # All visual styling
└── README.md                      # This file
```

## Key Features

### Automatic Mode Switching
- **Q1**: Hidden first 10s, shows current game, switches to other games at 60s
- **Q2/Q3/Q4**: Shows current game immediately, switches to other games at 60s
- **Other games show once per quarter only** (cycles through all, then returns)

### Smart Animations
- **Score Changes**: Smooth slide animation (slot-machine effect)
- **State Transitions**: Instant switching (no unnecessary blinking)
- **MVP Display**: Automatic timing during halftime/final (17s duration, up to 3x)

### Game States
1. **Pregame**: Countdown timer with team matchup
2. **Live**: Real-time scores, quarter, time remaining (Q1-Q4, OT)
3. **Halftime**: Halftime indicator with current scores
4. **Final**: Final scores display

### MVP Feature
- Automatically displays during game breaks
- Shows leading player (highest PTS + REB + AST)
- Smooth expand/fade animations
- Data caching to prevent API spam

## Architecture Principles

**SOLID Design:**
- **Single Responsibility**: Each class has one clear purpose
- **Open/Closed**: Easy to extend without modifying existing code
- **Loose Coupling**: Components interact through well-defined interfaces
- **Dependency Injection**: All dependencies injected in constructors

**DRY (Don't Repeat Yourself):**
- Shared utilities in `shared/` folder
- No code duplication
- Reusable formatting functions

**Feature-Based Organization:**
- Self-contained feature folders
- Easy to find code by feature
- Scales well for future additions

## Usage

### Access the Overlay
```
http://localhost:3000/overlay/nba-live
```

### Select a Game
1. Open dashboard: `http://localhost:3000/dashboard`
2. Choose mode:
   - **Live Game**: Select from today's NBA games
   - **Simulation**: Test with fake data
3. Use quarter buttons to track game progress
4. Overlay updates automatically

### In OBS Studio
1. Add Browser Source
2. URL: `http://localhost:3000/overlay/nba-live`
3. Width: 1920, Height: 1080
4. Check "Shutdown source when not visible"

## Technical Details

### Dependencies
- **External APIs**: ESPN NBA Scoreboard & Summary APIs
- **Shared Config/API**: `overlay/_shared/` (config, nbaApi, apiClient)
- **Internal Utils**: `utils/` (game-utils, state-manager, formatters)
- **Framework**: Vanilla JavaScript (no frameworks)

### Data Flow
```
ESPN API → AppController → GameDataFormatter → Views → DOM
            ↓
         StateManager (centralized state)
            ↓
         ModeCoordinator (mode switching)
```

### Refresh Strategy
- **Normal mode**: 3-second polling
- **Simulation mode**: 300ms polling (responsive testing)
- **Smart updates**: Only animates what changes

### State Management
All state centralized in `StateManager`:
- Game tracking (ID, scores, state)
- Mode tracking (CURRENT_GAME vs OTHER_GAMES)
- Quarter timing and virtual time
- Overlay visibility flags

## Development

### Class Responsibilities

**AppController (427 lines)**
- Main orchestration
- API polling and error handling
- Delegates to specialized components

**GameView**
- Current game display
- State transitions (pregame/live/halftime/final)
- Score animations

**ModeCoordinator**
- Switches between current game ↔ other games
- Cleanup and transition logic

**StateManager**
- Centralized state storage
- Getters/setters for all state
- Quarter tracking logic

**GameDataFormatter**
- Transforms ESPN API data
- Prepares data for views
- Handles animation flags

### Simulation Mode
- Test overlay without live games
- Control game state with quarter buttons
- Fast forward (10x speed) for rapid testing
- Simulated MVP and other games

## Design Specifications

- **Position**: Fixed bottom-left (370px from bottom, 20px from left)
- **Size**: 190px wide, auto height
- **Theme**: Blue neon with dark background
- **Opacity**: 0.7 (semi-transparent)
- **Animations**: Smooth, ASMR-friendly
- **Font**: Inter (body), Russo One (branding)

## Refactoring History

This overlay was refactored from 2 separate overlays into a unified system:
- **Before**: 617 lines in AppController, scattered state
- **After**: 427 lines, modular architecture (30% reduction)
- **Improvements**: SOLID principles, feature-based folders, better maintainability

## Related Documentation

- **API Reference**: `docs/API.md`
- **Architecture**: `docs/ARCHITECTURE.md`
- **Development Guide**: `docs/DEVELOPMENT.md`
- **MVP Integration**: `docs/MVP_INTEGRATION.md`
