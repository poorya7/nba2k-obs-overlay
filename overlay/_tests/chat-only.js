// Chat overlay JavaScript
const settings = {
    listX: 331,
    listY: 11,
    gap: 6,
    stageX: -65,
    stageY: 750,
    picStaged: 100,
    picList: 10,
    stageFontSize: 21,
    listFontSize: 18,
    entryGap: 6,
    bgPadding: 15,
    stageTime: 1918,
    bgAlpha: 0.88,
    bgColor: '#0a1428',
    maxHeight: 494,
    stageWidth: 260,
    listWidth: 290,
    bubbleDelay: 985
};

// Update CSS variables and canvas position
function updateStyles() {
    const canvas = document.getElementById('ghost-chat');
    canvas.style.right = settings.listX + 'px';
    canvas.style.top = settings.listY + 'px';

    document.documentElement.style.setProperty('--stage-x', settings.stageX + 'px');
    document.documentElement.style.setProperty('--stage-y', settings.stageY + 'px');
    document.documentElement.style.setProperty('--pic-staged', settings.picStaged + 'px');
    document.documentElement.style.setProperty('--pic-list', settings.picList + 'px');
    document.documentElement.style.setProperty('--stage-font-size', settings.stageFontSize + 'px');
    document.documentElement.style.setProperty('--list-font-size', settings.listFontSize + 'px');
    document.documentElement.style.setProperty('--entry-gap', settings.entryGap + 'px');
    document.documentElement.style.setProperty('--bg-padding', settings.bgPadding + 'px');
    document.documentElement.style.setProperty('--bg-alpha', settings.bgAlpha);

    const hex = settings.bgColor;
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    document.documentElement.style.setProperty('--bg-color-r', r);
    document.documentElement.style.setProperty('--bg-color-g', g);
    document.documentElement.style.setProperty('--bg-color-b', b);
    document.documentElement.style.setProperty('--stage-width', settings.stageWidth + 'px');
    document.documentElement.style.setProperty('--list-width', settings.listWidth + 'px');
    document.documentElement.style.setProperty('--bubble-delay', settings.bubbleDelay + 'ms');
    
    if (typeof updateListPositions === 'function') {
        updateListPositions();
    }
}

// Setup controls
function setupControls() {
    const controls = [
        { id: 'ctrl-list-x', key: 'listX', valId: 'val-list-x' },
        { id: 'ctrl-list-y', key: 'listY', valId: 'val-list-y' },
        { id: 'ctrl-gap', key: 'gap', valId: 'val-gap' },
        { id: 'ctrl-stage-x', key: 'stageX', valId: 'val-stage-x' },
        { id: 'ctrl-stage-y', key: 'stageY', valId: 'val-stage-y' },
        { id: 'ctrl-pic-staged', key: 'picStaged', valId: 'val-pic-staged' },
        { id: 'ctrl-pic-list', key: 'picList', valId: 'val-pic-list' },
        { id: 'ctrl-stage-font', key: 'stageFontSize', valId: 'val-stage-font' },
        { id: 'ctrl-list-font', key: 'listFontSize', valId: 'val-list-font' },
        { id: 'ctrl-entry-gap', key: 'entryGap', valId: 'val-entry-gap' },
        { id: 'ctrl-bg-padding', key: 'bgPadding', valId: 'val-bg-padding' },
        { id: 'ctrl-bg-alpha', key: 'bgAlpha', valId: 'val-bg-alpha', isFloat: true, scale: 0.01 },
        { id: 'ctrl-stage-time', key: 'stageTime', valId: 'val-stage-time' },
        { id: 'ctrl-max-height', key: 'maxHeight', valId: 'val-max-height' },
        { id: 'ctrl-stage-width', key: 'stageWidth', valId: 'val-stage-width' },
        { id: 'ctrl-list-width', key: 'listWidth', valId: 'val-list-width' },
        { id: 'ctrl-bubble-delay', key: 'bubbleDelay', valId: 'val-bubble-delay' },
    ];

    controls.forEach(ctrl => {
        const slider = document.getElementById(ctrl.id);
        const valDisplay = document.getElementById(ctrl.valId);
        
        if (slider && valDisplay) {
            // Initialize slider and display with settings value
            if (ctrl.isFloat) {
                slider.value = (settings[ctrl.key] / ctrl.scale).toString();
                valDisplay.textContent = settings[ctrl.key].toFixed(2);
            } else {
                slider.value = settings[ctrl.key].toString();
                valDisplay.textContent = settings[ctrl.key].toString();
            }
            
            slider.addEventListener('input', (e) => {
                if (ctrl.isFloat) {
                    settings[ctrl.key] = parseFloat(e.target.value) * ctrl.scale;
                    valDisplay.textContent = settings[ctrl.key].toFixed(2);
                } else {
                    settings[ctrl.key] = parseInt(e.target.value);
                    valDisplay.textContent = e.target.value;
                }
                updateStyles();
            });
        }
    });

    // Color picker
    const colorPicker = document.getElementById('ctrl-bg-color');
    const colorDisplay = document.getElementById('val-bg-color');
    if (colorPicker && colorDisplay) {
        // Initialize with settings value
        colorPicker.value = settings.bgColor;
        colorDisplay.textContent = settings.bgColor;
        
        colorPicker.addEventListener('input', (e) => {
            settings.bgColor = e.target.value;
            colorDisplay.textContent = e.target.value;
            updateStyles();
        });
    }

    // Pause toggle
    const pauseToggle = document.getElementById('ctrl-pause');
    if (pauseToggle) {
        pauseToggle.addEventListener('change', (e) => {
            isPaused = e.target.checked;
            
            if (isPaused) {
                if (currentStageTimeout) {
                    clearTimeout(currentStageTimeout);
                    currentStageTimeout = null;
                    
                    // Calculate remaining time
                    if (stageStartTime) {
                        // Stage timer has started (after bubble delay)
                        const elapsed = Date.now() - stageStartTime;
                        timeRemaining = Math.max(0, settings.stageTime - elapsed);
                    } else if (messageStagedTime) {
                        // Still in bubble delay phase
                        const elapsed = Date.now() - messageStagedTime;
                        const bubbleDelayRemaining = Math.max(0, settings.bubbleDelay - elapsed);
                        timeRemaining = bubbleDelayRemaining + settings.stageTime;
                    }
                }
            } else {
                // Resume functionality would need to be reimplemented with new structure
                // For now, pause/resume is disabled to fix the main transition issue
            }
        });
    }

    // Export button
    const exportBtn = document.getElementById('export-btn');
    if (exportBtn) {
        exportBtn.addEventListener('click', () => {
            const output = document.getElementById('export-output');
            const exportText = `Chat Overlay Settings:
─────────────────────
List X (right): ${settings.listX}px
List Y (top): ${settings.listY}px
Chat Gap: ${settings.gap}px
List Pic Size: ${settings.picList}px
List Width: ${settings.listWidth}px
List Font Size: ${settings.listFontSize}px
Max List Height: ${settings.maxHeight}px
─────────────────────
Stage X (left): ${settings.stageX}px
Stage Y (top): ${settings.stageY}px
Stage Pic Size: ${settings.picStaged}px
Stage Width: ${settings.stageWidth}px
Stage Font Size: ${settings.stageFontSize}px
Stage BG Padding: ${settings.bgPadding}px
Stage BG Alpha: ${settings.bgAlpha.toFixed(2)}
Stage BG Color: ${settings.bgColor}
Stage Time: ${settings.stageTime}ms
Bubble Delay: ${settings.bubbleDelay}ms
─────────────────────
Entry Gap: ${settings.entryGap}px`;
            
            output.textContent = exportText;
            output.style.display = 'block';
            
            navigator.clipboard.writeText(exportText).then(() => {
                exportBtn.textContent = '✅ Copied!';
                setTimeout(() => {
                    exportBtn.textContent = '📋 Export Values';
                }, 2000);
            });
        });
    }
}

// Nudge function for +/- buttons
function nudgeValue(key, delta) {
    settings[key] += delta;
    
    // Update the slider and display
    const ctrlMap = {
        'listX': 'ctrl-list-x',
        'listY': 'ctrl-list-y'
    };
    const valMap = {
        'listX': 'val-list-x',
        'listY': 'val-list-y'
    };
    
    const slider = document.getElementById(ctrlMap[key]);
    const valDisplay = document.getElementById(valMap[key]);
    
    if (slider) slider.value = settings[key];
    if (valDisplay) valDisplay.textContent = settings[key];
    
    updateStyles();
}

// Initialize after DOM loads
document.addEventListener('DOMContentLoaded', () => {
    updateStyles();
    setupControls();
    
    // Start chat after a short delay
    setTimeout(() => {
        addMessage();
        setInterval(addMessage, 3500);
    }, 500);
});

// Sample messages
const msgs = [
    { user: 'longtime_lurker', text: 'been watching for months and this is still the best asmr basketball content on the platform hands down', avatar: 'https://i.pravatar.cc/150?img=25' },
    { user: 'hoops_enthusiast', text: 'the way you handle those controls is just so smooth and satisfying to watch fr fr', avatar: 'https://i.pravatar.cc/150?img=30' },
    { user: 'midnight_viewer', text: 'this is literally perfect for falling asleep to thank you so much for this content seriously', avatar: 'https://i.pravatar.cc/150?img=33' },
    { user: 'hushswish_fan', text: 'so relaxing', avatar: 'https://i.pravatar.cc/150?img=1' },
    { user: 'bball_lover', text: 'love the vibes', avatar: 'https://i.pravatar.cc/150?img=3' },
    { user: 'nightowl23', text: 'whos winning?', avatar: 'https://i.pravatar.cc/150?img=5' },
    { user: 'silent_hoops', text: 'W stream', avatar: 'https://i.pravatar.cc/150?img=7' },
    { user: 'asmr_addict', text: 'keyboard sounds 🔥', avatar: 'https://i.pravatar.cc/150?img=8' },
    { user: 'chill_gamer', text: 'perfect vibes', avatar: 'https://i.pravatar.cc/150?img=11' },
    { user: 'zen_master', text: 'so peaceful', avatar: 'https://i.pravatar.cc/150?img=12' },
    { user: 'newbie_here', text: 'first time!', avatar: 'https://i.pravatar.cc/150?img=14' },
    { user: 'lol_master', text: 'lmaooo 💀', avatar: 'https://i.pravatar.cc/150?img=15' },
    { user: 'RTB_18', text: 'pullin up', avatar: 'https://i.pravatar.cc/150?img=18' },
    { user: 'KaponeONS', text: 'how to be 99 overall', avatar: 'https://i.pravatar.cc/150?img=20' },
    { user: 'Thatchy2k', text: 'YOUUUU', avatar: 'https://i.pravatar.cc/150?img=22' },
];

const userColors = ['#f472b6', '#fb923c', '#a78bfa', '#4ade80', '#60a5fa', '#fbbf24', '#f87171', '#2dd4bf', '#c084fc', '#fb7185', '#34d399', '#38bdf8'];

const canvas = document.getElementById('ghost-chat');
let msgIdx = 0;
const messagesList = [];
let isStaging = false;
let currentStageTimeout = null;
let stagedMessage = null;
let messageStagedTime = null; // When profile pic appears
let stageStartTime = null; // When stage timer starts (after bubble delay)
let transitionToListFunc = null;
let isPaused = false;
let timeRemaining = null;

function getTotalListHeight() {
    let total = 0;
    messagesList.forEach((el, index) => {
        if (!el.classList.contains('exiting')) {
            total += el.offsetHeight;
            if (index < messagesList.length - 1) {
                total += settings.gap;
            }
        }
    });
    return total;
}

function getGhostHTML(msg, color) {
    return `<img class="profile-pic" src="${msg.avatar}" alt="${msg.user}"><div class="content"><span class="user" style="color:${color}">${msg.user}</span>${msg.text}</div>`;
}

function updateListPositions() {
    let currentY = settings.listY;
    
    messagesList.forEach((el, index) => {
        if (!el.classList.contains('exiting')) {
            el.style.top = currentY + 'px';
            currentY += el.offsetHeight + settings.gap;
        }
    });
}

function addMessage() {
    if (isStaging || isPaused) {
        return;
    }
    
    const msg = msgs[msgIdx % msgs.length];
    const color = userColors[msgIdx % userColors.length];
    msgIdx++;

    const messageEl = document.createElement('div');
    messageEl.className = 'message entering ghost-style';
    messageEl.innerHTML = `<div class="entry">${getGhostHTML(msg, color)}</div>`;
    
    canvas.appendChild(messageEl);
    isStaging = true;
    stagedMessage = messageEl;

    // Create transition function that captures this specific message
    const transitionToList = () => {
        if (!messageEl || !messageEl.parentNode) return;
        
        // Clear staging flag immediately so new messages can appear
        isStaging = false;
        
        messagesList.push(messageEl);
        
        let targetY = settings.listY;
        for (let i = 0; i < messagesList.length - 1; i++) {
            targetY += messagesList[i].offsetHeight + settings.gap;
        }
        
        messageEl.style.top = targetY + 'px';
        messageEl.classList.add('in-list');
        messageEl.classList.remove('staged');
        
        updateListPositions();

        while (getTotalListHeight() > settings.maxHeight && messagesList.length > 1) {
            const oldest = messagesList.shift();
            oldest.classList.add('exiting');
            setTimeout(() => oldest.remove(), 1200);
            updateListPositions();
        }

        // Cleanup after animation completes
        setTimeout(() => {
            if (stagedMessage === messageEl) {
                stagedMessage = null;
            }
            currentStageTimeout = null;
            messageStagedTime = null;
            stageStartTime = null;
            timeRemaining = null;
        }, 1200);
    };

    setTimeout(() => {
        messageEl.classList.remove('entering');
        messageEl.classList.add('staged');
        messageStagedTime = Date.now(); // Track when profile pic appears
        
        // Start stage timer AFTER bubble delay
        // Sequence: Profile pic appears → wait bubbleDelay → text appears → wait stageTime → transition to list
        setTimeout(() => {
            stageStartTime = Date.now(); // Stage timer starts after bubble delay
            timeRemaining = settings.stageTime;
            currentStageTimeout = setTimeout(() => {
                transitionToList();
            }, settings.stageTime);
        }, settings.bubbleDelay);
    }, 50);
}
