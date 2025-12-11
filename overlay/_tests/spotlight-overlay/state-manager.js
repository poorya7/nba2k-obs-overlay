/**
 * SpotlightStateManager - Manages spotlight overlay state
 * Single Responsibility: Track queue, display state, user colors
 */

class SpotlightStateManager {
    constructor() {
        // Message tracking
        this.displayedMessageIds = new Set();
        this.lastRefreshTrigger = null;
        
        // User color mapping
        this.userColorMap = new Map();
        this.userColorIndex = 0;
        
        // Message queue for one-at-a-time display
        this.messageQueue = [];
        
        // Processing state flags
        this.isProcessingQueue = false;
        this.processingScheduled = false;
        this.processMessageQueueLock = false;
        
        // Active timeout tracking
        this.activeTimeoutId = null;
        
        // Server polling
        this.serverPollInterval = null;
    }
    
    // ========================================
    // Message ID tracking
    // ========================================
    
    hasDisplayedMessage(id) {
        return this.displayedMessageIds.has(id);
    }
    
    markMessageDisplayed(id) {
        if (id) {
            this.displayedMessageIds.add(id);
            
            // Keep displayed IDs manageable (only last 500)
            if (this.displayedMessageIds.size > 500) {
                const idsArray = Array.from(this.displayedMessageIds);
                this.displayedMessageIds = new Set(idsArray.slice(-500));
            }
        }
    }
    
    clearDisplayedMessages() {
        this.displayedMessageIds.clear();
    }
    
    // ========================================
    // Refresh trigger
    // ========================================
    
    getLastRefreshTrigger() {
        return this.lastRefreshTrigger;
    }
    
    setLastRefreshTrigger(trigger) {
        this.lastRefreshTrigger = trigger;
    }
    
    // ========================================
    // User colors
    // ========================================
    
    getUserColor(username, colors) {
        // Normalize to lowercase for case-insensitive matching
        // This ensures @Mike and @mike get the same color as user "Mike"
        const normalizedUsername = (username || '').toLowerCase();
        
        if (!this.userColorMap.has(normalizedUsername)) {
            this.userColorMap.set(normalizedUsername, colors[this.userColorIndex % colors.length]);
            this.userColorIndex++;
        }
        return this.userColorMap.get(normalizedUsername);
    }
    
    clearUserColors() {
        this.userColorMap.clear();
        this.userColorIndex = 0;
    }
    
    // ========================================
    // Message queue
    // ========================================
    
    getQueueLength() {
        return this.messageQueue.length;
    }
    
    enqueueMessage(message) {
        this.messageQueue.push(message);
    }
    
    dequeueMessage() {
        return this.messageQueue.shift();
    }
    
    clearQueue() {
        this.messageQueue.length = 0;
    }
    
    // ========================================
    // Processing flags
    // ========================================
    
    getIsProcessing() {
        return this.isProcessingQueue;
    }
    
    setIsProcessing(value) {
        this.isProcessingQueue = value;
    }
    
    getIsScheduled() {
        return this.processingScheduled;
    }
    
    setIsScheduled(value) {
        this.processingScheduled = value;
    }
    
    getLock() {
        return this.processMessageQueueLock;
    }
    
    setLock(value) {
        this.processMessageQueueLock = value;
    }
    
    // ========================================
    // Timeout tracking
    // ========================================
    
    getActiveTimeout() {
        return this.activeTimeoutId;
    }
    
    setActiveTimeout(id) {
        this.activeTimeoutId = id;
    }
    
    clearActiveTimeout() {
        if (this.activeTimeoutId !== null) {
            clearTimeout(this.activeTimeoutId);
            this.activeTimeoutId = null;
        }
    }
    
    // ========================================
    // Server polling
    // ========================================
    
    getPollInterval() {
        return this.serverPollInterval;
    }
    
    setPollInterval(interval) {
        this.serverPollInterval = interval;
    }
    
    clearPollInterval() {
        if (this.serverPollInterval) {
            clearInterval(this.serverPollInterval);
            this.serverPollInterval = null;
        }
    }
    
    // ========================================
    // Full reset
    // ========================================
    
    reset() {
        this.clearDisplayedMessages();
        this.clearUserColors();
        this.clearQueue();
        this.isProcessingQueue = false;
        this.processingScheduled = false;
        this.processMessageQueueLock = false;
        this.clearActiveTimeout();
    }
}

