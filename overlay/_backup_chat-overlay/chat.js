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
    bubbleDelay: 100,
    listBgPadding: 22,
    listBgAlpha: 0.45,
    fadeOutDuration: 350, // milliseconds
    fadeInDuration: 100, // milliseconds
    fadeInDelay: 50, // milliseconds - delay after scroll before fade-in starts
    moveUpAmount: 40, // pixels
    stageBgColor: '#0a1428', // Stage background color
    stageBgAlpha: 0.7, // Stage background transparency (0-1)
    listOffsetX: 30 // Horizontal offset for list only (not stage)
};

// Update CSS variables and canvas position
function updateStyles() {
    const canvas = document.getElementById('ghost-chat');
    // Canvas position is fixed - stage uses this
    canvas.style.right = settings.listX + 'px';
    canvas.style.top = settings.listY + 'px';
    
    // List offset is applied separately via CSS variable
    document.documentElement.style.setProperty('--list-offset-x', settings.listOffsetX + 'px');

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
    
    // Update stage background
    const stageBgHex = settings.stageBgColor;
    const stageBgR = parseInt(stageBgHex.slice(1, 3), 16);
    const stageBgG = parseInt(stageBgHex.slice(3, 5), 16);
    const stageBgB = parseInt(stageBgHex.slice(5, 7), 16);
    document.documentElement.style.setProperty('--stage-bg-r', stageBgR);
    document.documentElement.style.setProperty('--stage-bg-g', stageBgG);
    document.documentElement.style.setProperty('--stage-bg-b', stageBgB);
    document.documentElement.style.setProperty('--stage-bg-alpha', settings.stageBgAlpha);
    
    if (typeof updateListPositions === 'function') {
        updateListPositions();
    }
    if (typeof updateListBackground === 'function') {
        updateListBackground();
    }
}

// Update fade animation CSS based on settings
function updateFadeAnimations() {
    const style = document.documentElement.style;
    style.setProperty('--fade-out-duration', settings.fadeOutDuration + 'ms');
    style.setProperty('--fade-in-duration', settings.fadeInDuration + 'ms');
    style.setProperty('--move-up-amount', '-' + settings.moveUpAmount + 'px');
    style.setProperty('--move-down-amount', settings.moveUpAmount + 'px');
}

// Initialize after DOM loads
document.addEventListener('DOMContentLoaded', () => {
    updateStyles();
    updateFadeAnimations();
    
    // Listen for style changes from parent window
    window.addEventListener('message', (event) => {
        if (event.data && event.data.type === 'changeStyle') {
            const style = event.data.style;
            // Remove all style classes
            for (let i = 1; i <= 21; i++) {
                document.body.classList.remove(`chat-style-option-${i}`);
            }
            // Add selected style class
            if (style) {
                document.body.classList.add(`chat-style-${style}`);
            }
            // Pre-populate messages for the new style
            prePopulateMessages();
        }
    });
    
    // Pre-populate initial messages
    prePopulateMessages();
    
    // Start chat after a short delay
    setTimeout(() => {
        addMessage();
        setInterval(addMessage, 2000); // 2 seconds
    }, 500);
});

// Pre-populate chat list with sample messages
function prePopulateMessages() {
    // Clear existing list messages
    messagesList.forEach(msg => {
        if (msg.parentNode) {
            msg.remove();
        }
    });
    messagesList.length = 0;
    
    // Add 6 sample messages
    const sampleCount = 6;
    for (let i = 0; i < sampleCount; i++) {
        const msg = msgs[i % msgs.length];
        const color = userColors[i % userColors.length];
        
        const listMessageEl = document.createElement('div');
        listMessageEl.className = 'message in-list ghost-style';
        listMessageEl.style.top = (settings.listY + (i * (50 + settings.gap))) + 'px';
        listMessageEl.style.left = settings.listOffsetX + 'px';
        
        // Get current style
        const body = document.body;
        let currentStyle = 'default';
        for (let i = 1; i <= 21; i++) {
            if (body.classList.contains(`chat-style-option-${i}`)) {
                currentStyle = `option-${i}`;
                break;
            }
        }
        
        // Use getListHTML which handles different styles
        const html = getListHTML(msg, color, currentStyle);
        listMessageEl.innerHTML = `<div class="entry">${html}</div>`;
        
        canvas.appendChild(listMessageEl);
        messagesList.push(listMessageEl);
    }
    
    // Force reflow
    void canvas.offsetHeight;
    
    updateListPositions();
    updateListBackground();
}

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

function getListHTML(msg, color, styleOverride = null) {
    // Get current style to determine HTML structure
    const body = document.body;
    let style = styleOverride || 'default';
    
    if (!styleOverride) {
        for (let i = 1; i <= 14; i++) {
            if (body.classList.contains(`chat-style-option-${i}`)) {
                style = `option-${i}`;
                break;
            }
        }
    }
    
    // Different HTML structures for different styles
    switch(style) {
        case 'option-10': // Inline compact
            return `<div class="content inline"><span class="user" style="color:${color}">${msg.user}</span><span class="inline-text">${msg.text}</span></div>`;
        case 'option-11': // Vertical timeline
            return `<div class="content timeline-vertical"><div class="timeline-line"></div><span class="user" style="color:${color}">${msg.user}</span>${msg.text}</div>`;
        case 'option-21': // Vertical timeline with colored lines
            return `<div class="content timeline-vertical-colored"><div class="timeline-line-colored" style="background:linear-gradient(to bottom, ${color}, transparent)"></div><span class="user" style="color:${color}">${msg.user}</span>${msg.text}</div>`;
        case 'option-19': // Brackets style
            return `<div class="content brackets-style"><div class="bracket-user-wrapper"><span class="bracket-open" style="color:${color}">[</span><span class="bracket-user" style="color:${color}">${msg.user}</span><span class="bracket-close" style="color:${color}">]</span></div><span class="bracket-text">${msg.text}</span></div>`;
        default:
            return `<div class="content inline"><span class="user" style="color:${color}">${msg.user}</span><span class="inline-text">${msg.text}</span></div>`;
    }
}

function updateListPositions() {
    const body = document.body;
    
    let currentY = settings.listY;
    
    messagesList.forEach((el, index) => {
        if (!el.classList.contains('exiting')) {
            el.style.top = currentY + 'px';
            el.style.left = settings.listOffsetX + 'px';
            el.style.position = 'absolute';
            currentY += el.offsetHeight + settings.gap;
        }
    });
}

function updateListBackground() {
    const bgEl = document.getElementById('chat-list-bg');
    if (!bgEl) return;
    
    // Get all visible messages (not exiting)
    const visibleMessages = messagesList.filter(el => !el.classList.contains('exiting'));
    
    if (visibleMessages.length === 0) {
        bgEl.style.display = 'none';
        return;
    }
    
    // Get positions after animation completes - use exact positions
    const firstMessage = visibleMessages[0];
    const lastMessage = visibleMessages[visibleMessages.length - 1];
    
    const firstTop = parseFloat(firstMessage.style.top) || settings.listY;
    const lastTop = parseFloat(lastMessage.style.top) || settings.listY;
    const lastHeight = lastMessage.offsetHeight;
    
    // Calculate exact height: from first message top to last message bottom
    const totalHeight = visibleMessages.length === 1 
        ? firstMessage.offsetHeight 
        : (lastTop - firstTop) + lastHeight;
    
    if (totalHeight <= 0) {
        bgEl.style.display = 'none';
        return;
    }
    
    // Get background color values
    const hex = settings.bgColor;
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    
    // Show and size the background with padding and alpha
    bgEl.style.display = 'block';
    bgEl.style.top = (firstTop - settings.listBgPadding) + 'px';
    bgEl.style.left = (settings.listOffsetX - settings.listBgPadding) + 'px';
    bgEl.style.width = (settings.listWidth + (settings.listBgPadding * 2)) + 'px';
    bgEl.style.height = (totalHeight + (settings.listBgPadding * 2)) + 'px';
    bgEl.style.padding = settings.listBgPadding + 'px';
    bgEl.style.background = `rgba(${r}, ${g}, ${b}, ${settings.listBgAlpha})`;
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
    
    // Force layout calculation to ensure correct size before fade-in
    void messageEl.offsetWidth;
    void messageEl.offsetHeight;
    
    isStaging = true;
    stagedMessage = messageEl;

    // Create transition function that fades out staged and fades in new list message
    // Timing stays the same - message stays on stage for full duration, only animation changes
    const transitionToList = () => {
        if (!messageEl || !messageEl.parentNode) return;
        
        // Calculate position for new list message (before removing staged)
        let targetY = settings.listY;
        for (let i = 0; i < messagesList.length; i++) {
            targetY += messagesList[i].offsetHeight + settings.gap;
        }
        
        // Create new message element directly in list position (starts invisible)
        const listMessageEl = document.createElement('div');
        listMessageEl.className = 'message in-list ghost-style fading-in';
        listMessageEl.style.top = targetY + 'px';
        listMessageEl.style.left = settings.listOffsetX + 'px';
        listMessageEl.innerHTML = `<div class="entry">${getListHTML(msg, color)}</div>`;
        
        canvas.appendChild(listMessageEl);
        messagesList.push(listMessageEl);
        
        // Force reflow to ensure element is in DOM before starting fade
        void listMessageEl.offsetHeight;
        
        // Start fade out
        messageEl.classList.add('fading-out');
        
        // Wait for fade in delay before starting fade in
        setTimeout(() => {
            // Trigger fade in by removing fading-in class (CSS will handle the transition)
            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    listMessageEl.classList.remove('fading-in');
                });
            });
        }, settings.fadeInDelay);
        
        // Remove staged message after fade out completes
        setTimeout(() => {
            if (messageEl && messageEl.parentNode) {
                messageEl.remove();
            }
            if (stagedMessage === messageEl) {
                stagedMessage = null;
            }
        }, settings.fadeOutDuration);
        
        // Clear staging flag so new messages can appear (after fade completes)
        setTimeout(() => {
            isStaging = false;
            currentStageTimeout = null;
            messageStagedTime = null;
            stageStartTime = null;
            timeRemaining = null;
        }, settings.fadeOutDuration);

        // Update positions and background
        updateListPositions();

        // Remove old messages if list exceeds max height
        while (getTotalListHeight() > settings.maxHeight && messagesList.length > 1) {
            const oldest = messagesList.shift();
            oldest.classList.add('exiting');
            setTimeout(() => {
                oldest.remove();
                updateListPositions();
                // Update background after exit animation completes
                setTimeout(() => updateListBackground(), 50);
            }, 1200);
            updateListPositions();
        }

        // Update background after fade animations complete (fade out + fade in)
        setTimeout(() => {
            updateListBackground();
        }, settings.fadeOutDuration + settings.fadeInDuration);
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

