/**
 * ChatConfig - Configuration and constants for chat overlay
 * Single Responsibility: Centralized configuration
 */

const ChatConfig = {
    settings: {
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
        stageTime: 6000,
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
    },
    
    userColors: ['#f472b6', '#fb923c', '#a78bfa', '#4ade80', '#60a5fa', '#fbbf24', '#f87171', '#2dd4bf', '#c084fc', '#fb7185', '#34d399', '#38bdf8']
};

