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
        listFontSize: 15,
        entryGap: 8,
        bgPadding: 15,
        stageTime: 6000,
        bgAlpha: 0.88,
        bgColor: '#0a1428',
        maxHeight: 494,
        stageWidth: 260,
        listWidth: 324,
        bubbleDelay: 100,
        listBgPadding: 22,
        listBgAlpha: 0.45,
        fadeOutDuration: 350, // milliseconds
        fadeInDuration: 100, // milliseconds
        fadeInDelay: 50, // milliseconds - delay after scroll before fade-in starts
        moveUpAmount: 40, // pixels
        stageBgColor: '#0a1428', // Stage background color
        stageBgAlpha: 1, // Stage background transparency (0-1)
        listOffsetX: -1 // Horizontal offset for list only (not stage)
    },
    
    userColors: [
        "#22d3ee", // Cyan (Style 2)
        "#2dd4bf", // Teal (Style 2)
        "#60a5fa", // Blue (Style 2)
        "#a78bfa", // Purple (Style 2)
        "#f472b6"  // Pink (Style 2)
    ]
};

