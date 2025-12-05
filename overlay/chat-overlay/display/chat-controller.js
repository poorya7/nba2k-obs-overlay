/**
 * ChatController - Main orchestration for the chat overlay
 * Single Responsibility: Coordinate between data sources, state, and views
 * 
 * @class
 * @param {Object} dependencies - Dependency injection object
 * @param {ChatView} dependencies.chatView - Chat display view
 * @param {ChatStateManager} dependencies.stateManager - State management
 * @param {ChatDataFormatter} dependencies.dataFormatter - Data formatter
 * @param {StageAnimator} dependencies.stageAnimator - Stage animations
 * @param {Object} dependencies.config - Configuration object
 */

class ChatController {
    /**
     * @param {Object} dependencies - Dependency injection object
     */
    constructor(dependencies) {
        // Validate dependencies
        if (!dependencies) {
            throw new Error('ChatController: dependencies object is required');
        }
        
        const required = ['chatView', 'stateManager', 'dataFormatter', 'stageAnimator', 'config'];
        
        for (const dep of required) {
            if (!dependencies[dep]) {
                throw new Error(`ChatController: ${dep} dependency is required`);
            }
        }
        
        // Dependencies (injected for loose coupling)
        this.chatView = dependencies.chatView;
        this.stateManager = dependencies.stateManager;
        this.dataFormatter = dependencies.dataFormatter;
        this.stageAnimator = dependencies.stageAnimator;
        this.config = dependencies.config;
        
        // Sample messages for testing (will be replaced with API data)
        this.sampleMessages = [
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
        
        // Auto-add interval (for testing with sample messages)
        this.autoAddInterval = null;
    }
    
    /**
     * Start the chat overlay (call once on page load)
     * @returns {void}
     */
    start() {
        this.updateStyles();
        this.updateFadeAnimations();
        
        // Pre-populate initial messages
        this.prePopulate();
        
        // Start auto-adding messages for testing (will be replaced with API polling)
        setTimeout(() => {
            const firstMsg = this.sampleMessages[this.stateManager.getMsgIdx() % this.sampleMessages.length];
            this.displayNewChat({
                username: firstMsg.user,
                text: firstMsg.text,
                avatar: firstMsg.avatar
            });
            this.autoAddInterval = setInterval(() => {
                const msg = this.sampleMessages[this.stateManager.getMsgIdx() % this.sampleMessages.length];
                this.displayNewChat({
                    username: msg.user,
                    text: msg.text,
                    avatar: msg.avatar
                });
            }, 2000); // 2 seconds
        }, 500);
    }
    
    /**
     * Stop the chat overlay (cleanup all timers and resources)
     * @returns {void}
     */
    stop() {
        // Stop auto-add interval
        if (this.autoAddInterval) {
            clearInterval(this.autoAddInterval);
            this.autoAddInterval = null;
        }
        
        // Clear stage timeout
        const stageTimeout = this.stateManager.getCurrentStageTimeout();
        if (stageTimeout) {
            clearTimeout(stageTimeout);
            this.stateManager.clearCurrentStageTimeout();
        }
    }
    
    /**
     * Display a new chat message (main public API)
     * @param {Object} chatData - {username, text, avatar} or {user, text, avatar}
     * @returns {void}
     */
    displayNewChat(chatData) {
        // Normalize chat data (support both 'username' and 'user')
        const msg = {
            user: chatData.username || chatData.user,
            text: chatData.text,
            avatar: chatData.avatar
        };
        
        if (this.stateManager.getIsStaging() || this.stateManager.getIsPaused()) {
            return;
        }
        
        // Get user color
        const color = this.dataFormatter.getUserColor(this.stateManager.getMsgIdx());
        this.stateManager.incrementMsgIdx();
        
        // Create stage message element
        const stageHTML = this.dataFormatter.formatStageHTML(msg, color);
        const messageEl = this.chatView.createStageMessageElement(stageHTML);
        
        this.chatView.appendToCanvas(messageEl);
        
        // Set staging state
        this.stateManager.setIsStaging(true);
        this.stateManager.setStagedMessage(messageEl);
        
        // Animate entry - callback will be called after bubble delay
        this.stageAnimator.animateEntry(messageEl, () => {
            // Set up transition timeout (after bubble delay, wait stageTime, then transition)
            const timeout = setTimeout(() => {
                // Format list HTML
                const listHTML = this.dataFormatter.formatListHTML(msg, color);
                
                // Transition to list
                this.stageAnimator.transitionToList(messageEl, listHTML, (listMessageEl) => {
                    // Update positions and background
                    this.chatView.updatePositions(this.stateManager.getMessagesList());
                    
                    // Remove old messages if list exceeds max height
                    while (this.chatView.calculateTotalListHeight(this.stateManager.getMessagesList()) > this.config.settings.maxHeight && this.stateManager.getMessagesList().length > 1) {
                        const oldest = this.stateManager.shiftMessagesList();
                        this.chatView.addClass(oldest, 'exiting');
                        setTimeout(() => {
                            this.chatView.removeElement(oldest);
                            this.chatView.updatePositions(this.stateManager.getMessagesList());
                            // Update background after exit animation completes
                            setTimeout(() => {
                                this.chatView.updateBackground(this.stateManager.getMessagesList());
                            }, 50);
                        }, 1200);
                        this.chatView.updatePositions(this.stateManager.getMessagesList());
                    }
                    
                    // Update background
                    this.chatView.updateBackground(this.stateManager.getMessagesList());
                });
            }, this.config.settings.stageTime);
            this.stateManager.setCurrentStageTimeout(timeout);
        });
    }
    
    /**
     * Pre-populate chat list with sample messages
     * @returns {void}
     */
    prePopulate() {
        // Clear existing list messages
        const messagesList = this.stateManager.getMessagesList();
        messagesList.forEach(msg => {
            this.chatView.removeElement(msg);
        });
        this.stateManager.clearMessagesList();
        
        // Add 6 sample messages
        const sampleCount = 6;
        for (let i = 0; i < sampleCount; i++) {
            const msg = this.sampleMessages[i % this.sampleMessages.length];
            const color = this.dataFormatter.getUserColor(i);
            
            // Get current style
            const body = document.body;
            let currentStyle = 'default';
            for (let j = 1; j <= 21; j++) {
                if (body.classList.contains(`chat-style-option-${j}`)) {
                    currentStyle = `option-${j}`;
                    break;
                }
            }
            
            // Format HTML
            const html = this.dataFormatter.formatListHTML(msg, color, currentStyle);
            
            // Create list message element
            const listMessageEl = this.chatView.createListMessageElement(
                html,
                this.config.settings.listY + (i * (50 + this.config.settings.gap))
            );
            this.chatView.removeClass(listMessageEl, 'fading-in'); // Make visible immediately
            
            this.chatView.appendToCanvas(listMessageEl);
            this.stateManager.addToMessagesList(listMessageEl);
        }
        
        // Force reflow
        void this.chatView.getCanvas().offsetHeight;
        
        this.chatView.updatePositions(this.stateManager.getMessagesList());
        this.chatView.updateBackground(this.stateManager.getMessagesList());
    }
    
    /**
     * Update CSS variables and canvas position
     * @returns {void}
     */
    updateStyles() {
        const canvas = this.chatView.getCanvas();
        // Canvas position is fixed - stage uses this
        canvas.style.right = this.config.settings.listX + 'px';
        canvas.style.top = this.config.settings.listY + 'px';
        
        // List offset is applied separately via CSS variable
        document.documentElement.style.setProperty('--list-offset-x', this.config.settings.listOffsetX + 'px');
        
        document.documentElement.style.setProperty('--stage-x', this.config.settings.stageX + 'px');
        document.documentElement.style.setProperty('--stage-y', this.config.settings.stageY + 'px');
        document.documentElement.style.setProperty('--pic-staged', this.config.settings.picStaged + 'px');
        document.documentElement.style.setProperty('--pic-list', this.config.settings.picList + 'px');
        document.documentElement.style.setProperty('--stage-font-size', this.config.settings.stageFontSize + 'px');
        document.documentElement.style.setProperty('--list-font-size', this.config.settings.listFontSize + 'px');
        document.documentElement.style.setProperty('--entry-gap', this.config.settings.entryGap + 'px');
        document.documentElement.style.setProperty('--bg-padding', this.config.settings.bgPadding + 'px');
        document.documentElement.style.setProperty('--bg-alpha', this.config.settings.bgAlpha);
        
        const hex = this.config.settings.bgColor;
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        document.documentElement.style.setProperty('--bg-color-r', r);
        document.documentElement.style.setProperty('--bg-color-g', g);
        document.documentElement.style.setProperty('--bg-color-b', b);
        document.documentElement.style.setProperty('--stage-width', this.config.settings.stageWidth + 'px');
        document.documentElement.style.setProperty('--list-width', this.config.settings.listWidth + 'px');
        document.documentElement.style.setProperty('--bubble-delay', this.config.settings.bubbleDelay + 'ms');
        
        // Update stage background
        const stageBgHex = this.config.settings.stageBgColor;
        const stageBgR = parseInt(stageBgHex.slice(1, 3), 16);
        const stageBgG = parseInt(stageBgHex.slice(3, 5), 16);
        const stageBgB = parseInt(stageBgHex.slice(5, 7), 16);
        document.documentElement.style.setProperty('--stage-bg-r', stageBgR);
        document.documentElement.style.setProperty('--stage-bg-g', stageBgG);
        document.documentElement.style.setProperty('--stage-bg-b', stageBgB);
        document.documentElement.style.setProperty('--stage-bg-alpha', this.config.settings.stageBgAlpha);
        
        // Update positions and background if messages exist
        if (this.stateManager.getMessagesList().length > 0) {
            this.chatView.updatePositions(this.stateManager.getMessagesList());
            this.chatView.updateBackground(this.stateManager.getMessagesList());
        }
    }
    
    /**
     * Update fade animation CSS based on settings
     * @returns {void}
     */
    updateFadeAnimations() {
        const style = document.documentElement.style;
        style.setProperty('--fade-out-duration', this.config.settings.fadeOutDuration + 'ms');
        style.setProperty('--fade-in-duration', this.config.settings.fadeInDuration + 'ms');
        style.setProperty('--move-up-amount', '-' + this.config.settings.moveUpAmount + 'px');
        style.setProperty('--move-down-amount', this.config.settings.moveUpAmount + 'px');
    }
}

