# Game Overlay Features & Requirements

This document tracks planned features and improvements for the game overlay display.

## Game State Display Requirements

The overlay needs to handle three different game states, each with unique UI elements:

### 1. Pre-Game (Scheduled - Not Started)

**Status:** Game hasn't started yet

**Display Requirements:**
- Show countdown timer: "Starts in 23:45" (MM:SS format)
  - Updates every second (live countdown)
  - Simple text, no badge/pill background
  - Orange/amber color (#FFA726) to distinguish from live games
- Show team logos only (no names, no records)
- "vs" between logos
- No scores displayed
- **Box must be same size as live mode** for smooth transitions

**Visual Style (Minimal Text):**
- Same pill container as live mode
- Team logos with "vs" divider
- Plain text countdown (no background pill)
- Orange color scheme (#FFA726)
- Clean and minimal

**Layout:**
```
[Status: "Starts in 23:45"] [Logo] vs [Logo] [Empty space where time would be]
```

**Implementation Notes:**
- Use same container dimensions as live mode
- Reserve space where scores/time will appear (keep layout stable)
- Text replaces the LIVE badge position
- Countdown updates every second via setInterval

---

### 2. Live Game (In Progress)

**Status:** Game currently being played

**Display Requirements:**
- **Red pulsing indicator** for "LIVE" status 🔴
  - Animated pulse effect (breathing animation)
  - Draws attention to live status
- Show current quarter (Q1, Q2, Q3, Q4, OT)
- Show game clock (e.g., "8:32" remaining in quarter)
- Display current scores (updating every 10 seconds)
- Team logos, names, records

**Visual Style:**
- High energy, attention-grabbing
- Red accent color for live indicator
- Bold, prominent scores
- Pulsing/glowing effects

**Example:**
```
[LAL Logo] Los Angeles Lakers     82
           🔴 LIVE - Q3 8:32
[GSW Logo] Golden State Warriors  78
```

---

### 3. Post-Game (Final)

**Status:** Game has finished

**Display Requirements:**
- Show final scores
- Display "FINAL" status
- **Time elapsed since game ended:** "Ended 45 minutes ago"
  - Updates every minute
  - Shows how long ago the game finished
  - Format: "X minutes ago" or "X hours ago"
- Team logos, names, records
- Maybe highlight winning team?

**Visual Style:**
- Subdued/completed feel
- Green checkmark or "FINAL" badge ✅
- Less emphasis than live games
- Winning team could be highlighted (brighter, bold, etc.)

**Example:**
```
[LAL Logo] Los Angeles Lakers     112 ✅
           FINAL
           Ended 45 minutes ago
[GSW Logo] Golden State Warriors  108
```

---

## Technical Implementation Notes

### Countdown Timer (Pre-Game)
- Calculate time difference between now and game start time
- Use `setInterval(1000)` for per-second updates
- Convert to MM:SS or HH:MM:SS format
- Consider timezone handling

### Time Since End (Post-Game)
- Calculate time difference between game end time and now
- Update every minute (no need for second precision)
- Format as relative time:
  - "Just ended" (< 1 minute)
  - "X minutes ago" (< 60 minutes)
  - "X hours ago" (>= 60 minutes)
  - "Yesterday" or date (if > 24 hours)

### Pulsing Effect (Live Game)
- CSS animation with `@keyframes`
- Opacity or glow effect
- 2-second cycle for smooth pulse
- Red color (#ff4757 or similar)

### Performance Considerations
- Countdown timer should be separate from main data refresh
- Don't fetch new data every second (too much load)
- Use local timer that counts down, refresh actual game data every 10-30 seconds
- Clear intervals when switching games or unmounting

---

## Future Enhancements

### Additional Ideas to Consider:

1. **Winner Highlight**
   - When game is final, make winning team more prominent
   - Add trophy icon 🏆 next to winner
   - Maybe flash/celebrate animation when game ends

2. **Score Change Animation**
   - When score updates during live game, briefly highlight the change
   - Flash the new score or add +2, +3 indicator
   - Optional sound effect

3. **Close Game Indicator**
   - If score difference is small (< 5 points), show "CLOSE GAME" indicator
   - Add extra visual emphasis for exciting moments

4. **Overtime Handling**
   - Special styling for OT, 2OT, etc.
   - Maybe different color or badge

5. **Halftime Detection**
   - Show "HALFTIME" during break
   - Different status than regular live game

6. **Starting Soon Alert**
   - When countdown < 5 minutes, change color/style
   - More urgent feel

7. **Team on Scoring Run**
   - Track if one team scoring rapidly
   - Show "🔥 On fire!" or scoring streak indicator

---

## Chosen Design

**Final Design:** Pill Style (Horizontal) - Classic Green

**Layout:**
- Pill-shaped container with rounded edges (border-radius: 50px)
- Horizontal layout with all elements in a single row
- Background: `rgba(0, 0, 0, 0.7)` with blur effect
- Border: `1px solid rgba(255, 255, 255, 0.15)` (barely visible)

**Elements (left to right):**
1. **Status Pill** - Red "🔴 LIVE" indicator
   - Background: `rgba(255, 71, 87, 0.3)`
   - Color: `#ff4757`
   - Rounded pill shape
2. **Team 1** - Logo + Score
   - Logo: 22px circular
   - Score: Green `#4CAF50`, Poppins font, 20px, bold
3. **Divider** - Simple dash "-"
4. **Team 2** - Score + Logo
   - Same styling as Team 1
5. **Time Pill** - Quarter and time
   - Background: `rgba(0, 150, 136, 0.25)`
   - Color: `#26A69A` (teal/cyan)
   - Shows "Q3 8:32" format

**Color Scheme:**
- Scores: Green `#4CAF50`
- Live indicator: Red `#ff4757`
- Time: Teal/Cyan `#26A69A`
- Background: Dark with blur
- Border: Subtle white

---

## Animation Specifications

### Score Change Animation - "Glow Pulse"

When a score increases, trigger this animation on the score element:

```css
@keyframes glowPulse {
  0%, 100% { 
    transform: scale(1);
    text-shadow: 0 0 5px #4CAF50;
  }
  50% { 
    transform: scale(1.2);
    text-shadow: 0 0 20px #4CAF50, 0 0 30px #4CAF50, 0 0 40px #4CAF50;
  }
}

.score.anim-glow {
  animation: glowPulse 0.6s ease-out;
}
```

**Behavior:**
- Triggers only when score value increases
- Duration: 0.6 seconds
- Effect: Score scales up to 1.2x with intense green glow, then returns to normal
- Subtle and smooth - fits ASMR aesthetic

**Implementation:**
- Compare previous score with new score
- If increased, add `anim-glow` class to score element
- Remove class after animation completes (600ms)

**Fixed Width for Scores:**
- Score containers must have fixed width: `35px`
- Prevents pill from changing size when scores go from 1 digit to 2-3 digits
- Text centered within fixed width

### Timer/Clock Animation - "None"

The game clock updates naturally without animation, just like a real game timer.

**Behavior:**
- Updates every second during live games
- No transition effects - instant text replacement
- Keeps it clean and non-distracting
- Format: "Q3 8:32" (quarter + MM:SS)

**Implementation:**
- Use `setInterval(1000)` for per-second updates
- Simply update text content, no CSS animations
- Countdown from 12:00 to 0:00 per quarter
- Handle quarter transitions (Q1 → Q2 → Q3 → Q4 → OT)

---

## Current Status

- ✅ Basic game display working
- ✅ Shows live/scheduled/final states
- ✅ Final design chosen (Pill Style - Classic Green)
- ✅ Score animation selected (Glow Pulse)
- ✅ Timer animation decided: **No animation** - updates naturally every second like a real game clock
- ✅ Pre-game countdown style chosen: **Minimal Text Only** (Option 4)
- ⏳ **Need to design:** Post-game/final state display
- ⏳ **Need to add:** State transition animations (pre-game → live → post-game)
- ⏳ **Need to add:** Per-second countdown updates
- ⏳ **Need to implement:** Score change detection and animation trigger
- ⏳ **Need to ensure:** All three states use identical container dimensions for smooth transitions

---

## Questions to Resolve

1. Should countdown show hours for games >1 hour away?
2. What happens if game is scheduled for tomorrow but shows in today's list?
3. Should we show "Starting soon" badge when < 5 minutes?
4. For ended games, at what point do we stop tracking time? (e.g., don't show "ended 3 days ago")
5. Should final games show which team won with visual emphasis?

