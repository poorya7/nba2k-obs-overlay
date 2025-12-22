/**
 * Analyze play-by-play data to find play type frequencies
 * Goal: Find a play type that occurs ~20-25% of the time (1 in 4-5 plays)
 */

const fs = require('fs');
const path = require('path');

const PBP_DIR = path.join(__dirname, '..', 'data', 'play-by-play');

// Play type detection patterns
const PLAY_PATTERNS = {
    'three_pointer': /three|3-?point|3-?pt/i,
    'two_pointer': /makes.*(?:jumper|shot|layup|dunk|hook)|scores/i,
    'free_throw': /free throw/i,
    'rebound': /rebound/i,
    'assist': /assist/i,
    'turnover': /turnover/i,
    'steal': /steal/i,
    'block': /block/i,
    'foul': /foul/i,
    'substitution': /enters the game/i,
    'timeout': /timeout/i,
    'miss': /misses/i,
    'jump_ball': /jump ball/i,
    'violation': /violation/i,
    'technical': /technical/i,
    'ejection': /ejected/i,
};

function categorizePlay(text) {
    const lowerText = text.toLowerCase();
    
    // Check each pattern in order of specificity
    if (PLAY_PATTERNS.substitution.test(lowerText)) return 'substitution';
    if (PLAY_PATTERNS.timeout.test(lowerText)) return 'timeout';
    if (PLAY_PATTERNS.three_pointer.test(lowerText)) return 'three_pointer';
    if (PLAY_PATTERNS.free_throw.test(lowerText)) return 'free_throw';
    if (PLAY_PATTERNS.rebound.test(lowerText)) return 'rebound';
    if (PLAY_PATTERNS.turnover.test(lowerText)) return 'turnover';
    if (PLAY_PATTERNS.steal.test(lowerText)) return 'steal';
    if (PLAY_PATTERNS.block.test(lowerText)) return 'block';
    if (PLAY_PATTERNS.foul.test(lowerText)) return 'foul';
    if (PLAY_PATTERNS.miss.test(lowerText)) return 'miss';
    if (PLAY_PATTERNS.two_pointer.test(lowerText)) return 'two_pointer';
    if (PLAY_PATTERNS.jump_ball.test(lowerText)) return 'jump_ball';
    if (PLAY_PATTERNS.violation.test(lowerText)) return 'violation';
    if (PLAY_PATTERNS.technical.test(lowerText)) return 'technical';
    if (PLAY_PATTERNS.ejection.test(lowerText)) return 'ejection';
    
    return 'other';
}

function analyzeFiles() {
    const files = fs.readdirSync(PBP_DIR)
        .filter(f => f.endsWith('.json') && !f.includes('.backup.'));
    
    const typeCounts = {};
    let totalPlays = 0;
    
    files.forEach(file => {
        const filePath = path.join(PBP_DIR, file);
        const content = fs.readFileSync(filePath, 'utf8');
        const plays = JSON.parse(content);
        
        plays.forEach(play => {
            const text = play.text || '';
            const type = categorizePlay(text);
            typeCounts[type] = (typeCounts[type] || 0) + 1;
            totalPlays++;
        });
    });
    
    // Sort by count descending
    const sorted = Object.entries(typeCounts)
        .sort((a, b) => b[1] - a[1]);
    
    console.log('🏀 Play Type Analysis\n');
    console.log('='.repeat(60));
    console.log(`Total plays analyzed: ${totalPlays}\n`);
    
    console.log('Play Type Frequency:\n');
    console.log('Type               | Count | Percentage | 1 in X plays');
    console.log('-'.repeat(60));
    
    sorted.forEach(([type, count]) => {
        const pct = ((count / totalPlays) * 100).toFixed(1);
        const oneIn = (totalPlays / count).toFixed(1);
        const typePadded = type.padEnd(18);
        const countPadded = String(count).padStart(5);
        const pctPadded = (pct + '%').padStart(7);
        console.log(`${typePadded}| ${countPadded} | ${pctPadded}    | 1 in ${oneIn}`);
    });
    
    // Find types that occur ~20-25% (1 in 4-5)
    console.log('\n' + '='.repeat(60));
    console.log('🎯 Types occurring ~1 in 4-5 plays (ideal for Ogre voice):\n');
    
    sorted.forEach(([type, count]) => {
        const oneIn = totalPlays / count;
        if (oneIn >= 3 && oneIn <= 6) {
            const pct = ((count / totalPlays) * 100).toFixed(1);
            console.log(`  ✅ ${type}: ${pct}% (1 in ${oneIn.toFixed(1)} plays)`);
        }
    });
    
    // Suggest combinations
    console.log('\n' + '='.repeat(60));
    console.log('💡 Possible combinations to hit ~20-25%:\n');
    
    // Try combining smaller categories
    const combinations = [
        ['rebound'],
        ['foul'],
        ['miss'],
        ['turnover', 'steal'],
        ['rebound', 'block'],
        ['foul', 'turnover'],
        ['substitution', 'timeout'],
        ['free_throw'],
    ];
    
    combinations.forEach(combo => {
        const comboCount = combo.reduce((sum, type) => sum + (typeCounts[type] || 0), 0);
        const pct = ((comboCount / totalPlays) * 100).toFixed(1);
        const oneIn = (totalPlays / comboCount).toFixed(1);
        if (comboCount > 0) {
            console.log(`  ${combo.join(' + ')}: ${pct}% (1 in ${oneIn})`);
        }
    });
}

analyzeFiles();
