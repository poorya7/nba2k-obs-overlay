/**
 * SpotlightController - Main orchestration for spotlight chat overlay
 * Single Responsibility: Coordinate between data sources, state, and views
 */

class SpotlightController {
    /**
     * @param {Object} dependencies - Dependency injection object
     * @param {SpotlightView} dependencies.view - View layer
     * @param {SpotlightStateManager} dependencies.stateManager - State management
     * @param {SpotlightDataFormatter} dependencies.dataFormatter - Data formatting
     * @param {Object} dependencies.config - Configuration object
     */
    constructor(dependencies) {
        if (!dependencies) {
            throw new Error('SpotlightController: dependencies object is required');
        }
        
        const required = ['view', 'stateManager', 'dataFormatter', 'config'];
        for (const dep of required) {
            if (!dependencies[dep]) {
                throw new Error(`SpotlightController: ${dep} dependency is required`);
            }
        }
        
        // Dependencies (injected for loose coupling)
        this.view = dependencies.view;
        this.stateManager = dependencies.stateManager;
        this.dataFormatter = dependencies.dataFormatter;
        this.config = dependencies.config;
    }
    
    /**
     * Start the overlay (call once on page load)
     */
    start() {
        // Initialize view with style number
        this.view.init(this.config.styleNum);
        
        // Pre-populate initial messages
        this.prePopulate();
        
        // Start server polling
        const interval = setInterval(() => {
            this.pollServerMessages();
        }, this.config.pollInterval);
        
        this.stateManager.setPollInterval(interval);
    }
    
    /**
     * Stop the overlay (cleanup)
     */
    stop() {
        this.stateManager.clearPollInterval();
        this.stateManager.clearActiveTimeout();
    }
    
    /**
     * Pre-populate with existing messages from server
     */
    async prePopulate() {
        // Reset state
        this.view.clearMessages();
        this.stateManager.reset();
        
        try {
            const response = await fetch(this.config.apiEndpoint);
            const data = await response.json();
            
            if (data.messages && data.messages.length > 0) {
                // Sort messages by timestamp (oldest first)
                // Use domOrder as tiebreaker when timestamps are equal
                const sortedMessages = this._sortMessages(data.messages);
                
                // Add ALL messages to queue (will be shown one at a time)
                sortedMessages.forEach(serverMsg => {
                    if (serverMsg.id) {
                        this.stateManager.markMessageDisplayed(serverMsg.id);
                    }
                    this.stateManager.enqueueMessage(serverMsg);
                });
                
                // Start processing queue
                this._startQueueProcessing();
            }
        } catch (error) {
            console.error('Error pre-populating messages from server:', error);
        }
    }
    
    /**
     * Poll server for new messages
     */
    async pollServerMessages() {
        try {
            const response = await fetch(this.config.apiEndpoint);
            const data = await response.json();
            
            // Check if refresh is triggered
            if (data.refreshTrigger && data.refreshTrigger !== this.stateManager.getLastRefreshTrigger()) {
                this.stateManager.setLastRefreshTrigger(data.refreshTrigger);
                await this.prePopulate();
                return;
            }
            
            if (data.messages && data.messages.length > 0) {
                // Filter out already displayed messages and sort
                const newMessages = data.messages
                    .filter(msg => !this.stateManager.hasDisplayedMessage(msg.id))
                    .sort((a, b) => this._compareMessages(a, b));
                
                // Add new messages to queue
                newMessages.forEach(serverMsg => {
                    this._addToQueue(serverMsg);
                });
            }
        } catch (error) {
            console.error('Error fetching messages from server:', error);
        }
    }
    
    // ========================================
    // Queue processing (one message at a time)
    // ========================================
    
    /**
     * Add message to queue and start processing
     */
    _addToQueue(serverMsg) {
        this.stateManager.enqueueMessage(serverMsg);
        this._startQueueProcessing();
    }
    
    /**
     * Start processing if not already
     */
    _startQueueProcessing() {
        if (!this.stateManager.getIsProcessing() && 
            !this.stateManager.getIsScheduled() && 
            this.stateManager.getQueueLength() > 0) {
            this.stateManager.setIsScheduled(true);
            this._processQueue();
        }
    }
    
    /**
     * Process message queue one at a time
     */
    _processQueue() {
        // Lock check - prevent race conditions
        if (this.stateManager.getLock()) {
            return;
        }
        
        // Set lock immediately
        this.stateManager.setLock(true);
        
        // Check other conditions
        if (this.stateManager.getIsProcessing() || this.stateManager.getQueueLength() === 0) {
            this.stateManager.setLock(false);
            return;
        }
        
        // Set processing flag
        this.stateManager.setIsProcessing(true);
        this.stateManager.setIsScheduled(false);
        
        const serverMsg = this.stateManager.dequeueMessage();
        
        if (!serverMsg) {
            this.stateManager.setIsProcessing(false);
            this.stateManager.setLock(false);
            return;
        }
        
        // Mark as displayed
        this.stateManager.markMessageDisplayed(serverMsg.id);
        
        // Show the message
        this._showMessage(serverMsg);
        
        // Clear any existing timeout
        this.stateManager.clearActiveTimeout();
        
        // Wait before showing next message (ASMR pace)
        const timeoutId = setTimeout(() => {
            this.stateManager.setActiveTimeout(null);
            this.stateManager.setIsProcessing(false);
            this.stateManager.setLock(false);
            
            // Process next if queue has more
            if (this.stateManager.getQueueLength() > 0 && !this.stateManager.getIsScheduled()) {
                this.stateManager.setIsScheduled(true);
                setTimeout(() => this._processQueue(), 0);
            }
        }, this.config.messageDelay);
        
        this.stateManager.setActiveTimeout(timeoutId);
    }
    
    /**
     * Show a single message
     */
    _showMessage(serverMsg) {
        // Format the message
        const formattedMsg = this.dataFormatter.formatMessage(serverMsg, this.stateManager);
        
        // Create and append element
        const messageEl = this.view.createMessageElement(formattedMsg);
        this.view.appendMessage(messageEl);
        
        // Fade in
        this.view.fadeInMessage(messageEl);
        
        // Smooth scroll
        this.view.smoothScrollToBottom(this.config.scrollDuration);
        
        // Remove old messages
        this.view.removeOldMessages(this.config.maxMessages);
    }
    
    // ========================================
    // Helpers
    // ========================================
    
    _sortMessages(messages) {
        return [...messages].sort((a, b) => this._compareMessages(a, b));
    }
    
    _compareMessages(a, b) {
        const timestampA = a.timestamp || 0;
        const timestampB = b.timestamp || 0;
        
        if (timestampA !== timestampB) {
            return timestampA - timestampB; // Oldest first
        }
        
        // Timestamps equal - use DOM order as tiebreaker
        const domOrderA = a.domOrder !== undefined ? a.domOrder : Infinity;
        const domOrderB = b.domOrder !== undefined ? b.domOrder : Infinity;
        return domOrderA - domOrderB;
    }
}

