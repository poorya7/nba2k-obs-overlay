/**
 * Convert play-by-play JSON files from custom format to ESPN API format
 * 
 * Custom format:
 * {
 *   "timestamp": "...",
 *   "period": 1,
 *   "clock": "9:37",
 *   "playerName": "Shai Gilgeous",
 *   "action": "-Alexander makes 11-foot jumper",
 *   "homeScore": 7,
 *   "awayScore": 13,
 *   "isTimeout": false
 * }
 * 
 * ESPN format (what we parse in nbaApi.js):
 * {
 *   "id": "401810251001",
 *   "text": "Shai Gilgeous-Alexander makes 11-foot jumper",
 *   "shortText": "makes 11-foot jumper",
 *   "period": 1,
 *   "clock": "9:37",
 *   "homeScore": 7,
 *   "awayScore": 13,
 *   "isScoringPlay": false,
 *   "team": null,
 *   "participants": [{ "athlete": { "displayName": "Shai Gilgeous-Alexander" } }],
 *   "isTimeout": false
 * }
 */

const fs = require('fs');
const path = require('path');

const PBP_DIR = path.join(__dirname, '..', 'data', 'play-by-play');

/**
 * Fix hyphenated names that got split across playerName and action
 * e.g., playerName: "Shai Gilgeous", action: "-Alexander makes..."
 * => playerName: "Shai Gilgeous-Alexander", action: "makes..."
 */
function fixHyphenatedName(playerName, action) {
    if (!playerName || !action) {
        return { playerName, action };
    }
    
    // Check if action starts with -[A-Z] (hyphenated name continuation)
    if (/^-[A-Z]/.test(action)) {
        const hyphenMatch = action.match(/^(-[A-Za-z]+(?:-[A-Za-z]+)*)\s+(.*)$/);
        if (hyphenMatch) {
            return {
                playerName: playerName + hyphenMatch[1], // "Shai Gilgeous-Alexander"
                action: hyphenMatch[2] // "makes 11-foot jumper..."
            };
        }
    }
    
    return { playerName, action };
}

/**
 * Detect if a play is a scoring play based on action text
 */
function isScoringPlay(action) {
    if (!action) return false;
    const lowerAction = action.toLowerCase();
    return lowerAction.includes('makes') && 
           (lowerAction.includes('shot') || 
            lowerAction.includes('jumper') || 
            lowerAction.includes('layup') || 
            lowerAction.includes('dunk') || 
            lowerAction.includes('free throw') ||
            lowerAction.includes('three point') ||
            lowerAction.includes('3-point'));
}

/**
 * Convert a single play from custom format to ESPN format
 */
function convertPlay(play, gameId, playIndex) {
    // Fix hyphenated names
    const fixed = fixHyphenatedName(play.playerName, play.action);
    const playerName = fixed.playerName || '';
    const action = fixed.action || '';
    
    // Build the full text (what TTS will read)
    let text = '';
    if (playerName && action) {
        text = `${playerName} ${action}`;
    } else if (action) {
        text = action;
    } else if (playerName) {
        text = playerName;
    }
    
    // Create ESPN-formatted play
    return {
        id: `${gameId}-${String(playIndex).padStart(4, '0')}`,
        text: text,
        shortText: action,
        period: play.period,
        clock: play.clock,
        homeScore: play.homeScore,
        awayScore: play.awayScore,
        isScoringPlay: isScoringPlay(action),
        team: null,
        participants: playerName ? [{
            athlete: {
                displayName: playerName
            }
        }] : [],
        isTimeout: play.isTimeout || false,
        timestamp: play.timestamp
    };
}

/**
 * Convert an entire file
 */
function convertFile(filePath) {
    const fileName = path.basename(filePath);
    const gameId = fileName.replace('.json', '').replace('game-', '');
    
    console.log(`\n📄 Processing: ${fileName}`);
    
    // Read original file
    const content = fs.readFileSync(filePath, 'utf8');
    const plays = JSON.parse(content);
    
    console.log(`   Found ${plays.length} plays`);
    
    // Convert all plays
    const convertedPlays = plays.map((play, index) => convertPlay(play, gameId, index));
    
    // Count fixed hyphenated names
    let hyphenFixed = 0;
    plays.forEach(play => {
        if (play.action && /^-[A-Z]/.test(play.action)) {
            hyphenFixed++;
        }
    });
    
    if (hyphenFixed > 0) {
        console.log(`   🔧 Fixed ${hyphenFixed} hyphenated names`);
    }
    
    // Create backup
    const backupPath = filePath.replace('.json', '.backup.json');
    fs.writeFileSync(backupPath, content);
    console.log(`   💾 Backup saved: ${path.basename(backupPath)}`);
    
    // Write converted file
    fs.writeFileSync(filePath, JSON.stringify(convertedPlays, null, 2));
    console.log(`   ✅ Converted to ESPN format`);
    
    return { total: plays.length, hyphenFixed };
}

/**
 * Main function
 */
function main() {
    console.log('🏀 Converting play-by-play files to ESPN API format\n');
    console.log('=' .repeat(50));
    
    // Get all JSON files (excluding backups)
    const files = fs.readdirSync(PBP_DIR)
        .filter(f => f.endsWith('.json') && !f.includes('.backup.'))
        .map(f => path.join(PBP_DIR, f));
    
    if (files.length === 0) {
        console.log('❌ No JSON files found in', PBP_DIR);
        return;
    }
    
    console.log(`Found ${files.length} files to convert`);
    
    let totalPlays = 0;
    let totalHyphenFixed = 0;
    
    files.forEach(file => {
        const result = convertFile(file);
        totalPlays += result.total;
        totalHyphenFixed += result.hyphenFixed;
    });
    
    console.log('\n' + '='.repeat(50));
    console.log('📊 Summary:');
    console.log(`   Files converted: ${files.length}`);
    console.log(`   Total plays: ${totalPlays}`);
    console.log(`   Hyphenated names fixed: ${totalHyphenFixed}`);
    console.log('\n✅ All files converted to ESPN format!');
}

main();
