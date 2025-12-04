// YouTube Live Chat Reader - Content Script
// Reads chat messages from YouTube live stream DOM

(function() {
    'use strict';
    
    // IMMEDIATE log that should show up before any filtering
    console.log('🎬 CHAT READER: Extension script starting...');

    // ==================== CONSOLE FILTERING (RUNS FIRST) ====================
    // Intercept console methods immediately to filter YouTube noise
    const originalError = console.error;
    const originalWarn = console.warn;
    const originalLog = console.log;

    function isYouTubeNoise(message, stackTrace) {
        const lowerMessage = message.toLowerCase();
        const fullText = (message + ' ' + (stackTrace || '')).toLowerCase();
        
        // Specific YouTube warning patterns
        const patterns = [
            'postmessage',
            'target origin',
            'content-security-policy',
            'require-trusted-types-for',
            'performance.now precision',
            'legacydatamixin',
            'legacy elements',
            'unreachable code after return',
            'mouseevent.mozpressure',
            'mouseevent.mozinputsource',
            'bug1842437',
            'bugzilla.mozilla.org',
            'youtube.com-performance-now-precision',
            'rs=agkmyw',
            'ht-avvw7qb0xdbuyrhr9rotmuek4ginmb6eoqe6pefu.js',
            'googlevideo.com',
            'videoplayback',
            'http/3 403',
            'http/3 404',
            'xhrget'
        ];

        if (patterns.some(pattern => fullText.includes(pattern))) {
            return true;
        }

        // Filter messages from YouTube script files
        if (fullText.includes('www.youtube.com') || 
            fullText.includes('youtube.com') ||
            fullText.includes('googlevideo.com') ||
            message.match(/[a-zA-Z0-9_-]{15,}\.js(:\d+)?(:\d+)?(\s|$)/i) ||
            message.match(/[a-zA-Z0-9_-]{10,}-[a-zA-Z0-9_-]{10,}\.js/i)) {
            return true;
        }

        return false;
    }

    // Override console methods to filter YouTube noise
    console.error = function(...args) {
        const message = args.join(' ');
        if (!message.includes('YouTube Live Chat Reader')) {
            const stackTrace = new Error().stack || '';
            if (isYouTubeNoise(message, stackTrace)) {
                return; // Suppress
            }
        }
        originalError.apply(console, args);
    };

    console.warn = function(...args) {
        const message = args.join(' ');
        if (!message.includes('YouTube Live Chat Reader')) {
            const stackTrace = new Error().stack || '';
            if (isYouTubeNoise(message, stackTrace)) {
                return; // Suppress
            }
        }
        originalWarn.apply(console, args);
    };

    console.log = function(...args) {
        const message = args.join(' ');
        // ALWAYS allow messages with our extension prefix
        if (message.includes('🎬') || message.includes('🔍') || message.includes('✅') || 
            message.includes('❌') || message.includes('💬') || message.includes('💡') ||
            message.includes('🔬') || message.includes('📦') || message.includes('🛑') ||
            message.includes('YouTube Live Chat Reader') || message.includes('CHAT READER')) {
            originalLog.apply(console, args);
            return;
        }
        // Filter YouTube noise
        if (message.includes('Content-Security-Policy') || 
            message.includes('CSP') ||
            isYouTubeNoise(message)) {
            return; // Suppress
        }
        originalLog.apply(console, args);
    };
    // ==================== END CONSOLE FILTERING ====================

    // Check if we're on a YouTube watch page
    function isYouTubeWatchPage() {
        return window.location.hostname === 'www.youtube.com' && 
               window.location.pathname.startsWith('/watch');
    }

    // Check if this is a live stream (has live indicator)
    function isLiveStream() {
        try {
            // Check for live indicator in page
            const liveIndicator = document.querySelector('ytd-badge-supported-renderer[badge-style="BADGE_STYLE_TYPE_LIVE_NOW"]') ||
                                 document.querySelector('.ytp-live-badge') ||
                                 document.querySelector('[aria-label*="LIVE"]');
            return !!liveIndicator;
        } catch (e) {
            return false;
        }
    }

    // Only initialize if we're on a YouTube watch page
    if (!isYouTubeWatchPage()) {
        console.log('🎬 CHAT READER: Not a YouTube watch page, exiting');
        return;
    }

    console.log('🎬 CHAT READER: YouTube Live Chat Reader loaded on', window.location.href);

    class YouTubeChatReader {
        constructor() {
            this.processedMessageIds = new Set();
            this.addedToOverlayIds = new Set(); // Track messages added to overlay
            this.recentMessagesByContent = new Map(); // Track recent messages by username+text to detect optimistic duplicates
            this.isActive = false;
            this.observer = null;
            this.initAttempts = 0;
            this.maxInitAttempts = 30; // Stop trying after 30 seconds
            this.isInitialScan = true; // Track if this is the first scan
            this.overlay = null;
            this.messageCount = 0;
            this.init();
        }

        init() {
            try {
                // Wait for page to load, then start watching
                if (document.readyState === 'loading') {
                    document.addEventListener('DOMContentLoaded', () => this.start());
                } else {
                    // Small delay to let page settle
                    setTimeout(() => this.start(), 1000);
                }
            } catch (error) {
                console.error('❌ CHAT READER: Error initializing chat reader:', error);
            }
        }

    start() {
        if (this.isActive) return;
        
        try {
            // Always try to activate - will work for both live and past streams with chat
            const hasLiveBadge = isLiveStream();
            
            if (hasLiveBadge) {
                console.log('🔍 CHAT READER: Starting to watch for YouTube live chat (currently live)...');
            } else {
                console.log('🔍 CHAT READER: Starting to watch for YouTube chat (past stream or scheduled)...');
            }
            this.isActive = true;
            
            // Create overlay UI
            this.createOverlay();
            
            // Try to find chat container
            this.setupChatObserver();
            
            // Also watch for initial chat load
            this.watchForChatContainer();
            } catch (error) {
                console.error('❌ CHAT READER: Error starting chat reader:', error);
                this.isActive = false;
            }
    }

    diagnosePage() {
        console.log('🔬 CHAT READER: === DIAGNOSTIC: Scanning page for chat elements ===');
        
        // Look for any elements with "chat" in ID or class
        const chatElements = document.querySelectorAll('[id*="chat"], [class*="chat"], [id*="Chat"], [class*="Chat"]');
        console.log(`🔬 CHAT READER: Found ${chatElements.length} elements with "chat" in ID/class:`);
        chatElements.forEach((el, idx) => {
            if (idx < 10) { // Only show first 10
                console.log(`🔬 CHAT READER:   ${idx + 1}. Tag: ${el.tagName}, ID: ${el.id || '(none)'}, Class: ${el.className?.substring(0, 50) || '(none)'}`);
            }
        });
        
        // Look for iframes
        const allIframes = document.querySelectorAll('iframe');
        console.log(`🔬 CHAT READER: Found ${allIframes.length} iframes on page:`);
        allIframes.forEach((iframe, idx) => {
            const id = iframe.id || '(no id)';
            const src = iframe.src?.substring(0, 80) || '(no src)';
            console.log(`🔬 CHAT READER:   ${idx + 1}. ID: ${id}, Src: ${src}...`);
        });
        
        // Look for YouTube-specific chat components in main document
        const ytChatElements = document.querySelectorAll('yt-live-chat-app, yt-live-chat-renderer, ytd-live-chat-frame, ytd-live-chat-renderer, yt-live-chat-text-message-renderer');
        console.log(`🔬 CHAT READER: Found ${ytChatElements.length} YouTube chat components in main document:`);
        ytChatElements.forEach((el, idx) => {
            console.log(`🔬 CHAT READER:   ${idx + 1}. ${el.tagName}, ID: ${el.id || '(none)'}`);
        });
        
        // Try to access chat iframe
        const chatIframe = document.querySelector('iframe#chatframe');
        if (chatIframe) {
            console.log(`🔬 CHAT READER: Found iframe#chatframe with src: ${chatIframe.src?.substring(0, 100) || '(no src)'}`);
            try {
                const iframeDoc = chatIframe.contentDocument || chatIframe.contentWindow?.document;
                if (iframeDoc) {
                    console.log(`🔬 CHAT READER: ✅ Can access iframe document!`);
                    
                    // Check for messages with different selectors
                    const selectors = [
                        'yt-live-chat-text-message-renderer',
                        'yt-live-chat-replay-text-message-renderer', // For replay/archived streams
                        '#chat-messages',
                        'yt-live-chat-renderer',
                        'yt-live-chat-app',
                        '[id*="message"]',
                        '[class*="message"]'
                    ];
                    
                    console.log(`🔬 CHAT READER: Trying different selectors...`);
                    selectors.forEach(selector => {
                        try {
                            const elements = iframeDoc.querySelectorAll(selector);
                            if (elements.length > 0) {
                                console.log(`🔬 CHAT READER: ✅ Found ${elements.length} elements with selector: "${selector}"`);
                                if (elements.length <= 3) {
                                    elements.forEach((el, idx) => {
                                        console.log(`🔬 CHAT READER:   Element ${idx + 1}:`, el.tagName, el.id, el.className?.substring(0, 50));
                                    });
                                }
                            }
                        } catch (e) {
                            // Skip this selector
                        }
                    });
                    
                    // Check if there's shadow DOM
                    const body = iframeDoc.body;
                    if (body) {
                        console.log(`🔬 CHAT READER: Iframe body exists with ${body.children.length} direct children`);
                        
                        // Log all top-level elements
                        Array.from(body.children).slice(0, 5).forEach((child, idx) => {
                            console.log(`🔬 CHAT READER:   Body child ${idx + 1}: ${child.tagName}, id="${child.id}", shadowRoot=${!!child.shadowRoot}`);
                            if (child.shadowRoot) {
                                console.log(`🔬 CHAT READER:     ⚠️ HAS SHADOW DOM! This is why we can't find elements!`);
                                // Try to access shadow DOM
                                try {
                                    const shadowMessages = child.shadowRoot.querySelectorAll('yt-live-chat-text-message-renderer');
                                    console.log(`🔬 CHAT READER:     Found ${shadowMessages.length} messages in shadow DOM`);
                                } catch (e) {
                                    console.log(`🔬 CHAT READER:     Cannot access shadow DOM content`);
                                }
                            }
                        });
                    }
                    
                    // Try the original message selector
                    const iframeMessages = iframeDoc.querySelectorAll('yt-live-chat-text-message-renderer');
                    console.log(`🔬 CHAT READER: Found ${iframeMessages.length} messages with yt-live-chat-text-message-renderer`);
                    if (iframeMessages.length > 0) {
                        console.log(`🔬 CHAT READER: First message element:`, iframeMessages[0]);
                    }
                } else {
                    console.log(`🔬 CHAT READER: ❌ Cannot access iframe content (CORS restriction)`);
                }
            } catch (e) {
                console.log(`🔬 CHAT READER: ❌ Error accessing iframe: ${e.message}`);
                console.log(`🔬 CHAT READER: Error stack:`, e.stack);
            }
        } else {
            console.log(`🔬 CHAT READER: No iframe#chatframe found`);
        }
        
        console.log('🔬 CHAT READER: === END DIAGNOSTIC ===\n');
    }

    watchForChatContainer() {
        // YouTube chat can load dynamically, so we need to watch for it
        let attemptCount = 0;
        const maxAttempts = 30; // 30 seconds
        
        console.log('🔍 CHAT READER: Searching for chat container...');
        
        // Run diagnostic on first attempt
        setTimeout(() => this.diagnosePage(), 2000);
        
        // Also watch for iframe load events
        const chatIframe = document.querySelector('iframe#chatframe');
        if (chatIframe) {
            chatIframe.addEventListener('load', () => {
                console.log('📦 CHAT READER: Chat iframe loaded, trying to access content...');
                setTimeout(() => {
                    const container = this.findChatContainer();
                    if (container && !this.observer) {
                        console.log('✅ CHAT READER: Found chat container after iframe load!');
                        this.setupChatObserver();
                    }
                }, 500);
            });
        }
        
        const checkInterval = setInterval(() => {
            try {
                attemptCount++;
                const chatContainer = this.findChatContainer();
                if (chatContainer && !this.observer) {
                    console.log('✅ CHAT READER: Found chat container, setting up observer');
                    this.setupChatObserver();
                    clearInterval(checkInterval);
                } else if (attemptCount >= maxAttempts) {
                    clearInterval(checkInterval);
                    if (!this.observer) {
                        console.log('❌ CHAT READER: Chat container not found after 30 seconds.');
                        console.log('💡 CHAT READER: The chat is likely in a cross-origin iframe that we cannot access due to CORS restrictions.');
                        console.log('💡 CHAT READER: We may need to use a different approach (e.g., inject script into iframe or use postMessage)');
                    }
                } else if (attemptCount % 5 === 0) {
                    // Log progress every 5 seconds
                    console.log(`🔍 CHAT READER: Still searching for chat... (${attemptCount}/${maxAttempts} attempts)`);
                }
            } catch (error) {
                console.error('❌ CHAT READER: Error checking for chat container:', error);
                if (attemptCount >= maxAttempts) {
                    clearInterval(checkInterval);
                }
            }
        }, 1000);
    }

    findChatContainer() {
        try {
            // Step 1: Find the chat iframe
            const chatIframe = document.querySelector('iframe#chatframe');
            if (!chatIframe) {
                return null;
            }
            
            // Step 2: Try to access iframe content (may have CORS restrictions)
            try {
                const iframeDoc = chatIframe.contentDocument || chatIframe.contentWindow?.document;
                if (!iframeDoc) {
                    // CORS blocked - we can't access this iframe
                    return null;
                }
                
                // Step 3: Check if we can find ANY chat-related elements (messages or containers)
                // This helps us verify the iframe is loaded even if messages aren't there yet
                const hasAnyChatElements = iframeDoc.querySelector('yt-live-chat-text-message-renderer, #chat-messages, yt-live-chat-renderer, yt-live-chat-app');
                
                // Step 4: Try to find the chat messages container inside iframe
                const chatMessagesContainer = iframeDoc.querySelector('#chat-messages');
                if (chatMessagesContainer) {
                    console.log('✅ CHAT READER: Found chat messages container (#chat-messages) inside iframe');
                    return chatMessagesContainer;
                }
                
                // Fallback: try to find yt-live-chat-renderer
                const chatRenderer = iframeDoc.querySelector('yt-live-chat-renderer');
                if (chatRenderer) {
                    console.log('✅ CHAT READER: Found yt-live-chat-renderer inside iframe');
                    return chatRenderer;
                }
                
                // Fallback: try yt-live-chat-app
                const chatApp = iframeDoc.querySelector('yt-live-chat-app');
                if (chatApp) {
                    console.log('✅ CHAT READER: Found yt-live-chat-app inside iframe');
                    return chatApp;
                }
                
                // If we can access the iframe but no chat elements found yet, return null to keep checking
                // But log that we CAN access it (good sign)
                if (hasAnyChatElements === null) {
                    // No chat elements at all - iframe might still be loading
                    return null;
                }
                
                return null;
                
            } catch (e) {
                // CORS error - we can't access iframe content
                // This is expected for cross-origin iframes
                if (e.message && e.message.includes('cross-origin')) {
                    console.log('💡 CHAT READER: Cannot access iframe - cross-origin restriction');
                }
                return null;
            }
        } catch (error) {
            return null;
        }
    }

    setupChatObserver() {
        try {
            const chatContainer = this.findChatContainer();
            if (!chatContainer) {
                return; // Silently return - chat not available
            }

            // Don't create duplicate observers
            if (this.observer) {
                return;
            }

            // Use MutationObserver to watch for new chat messages
            this.observer = new MutationObserver((mutations) => {
                try {
                    console.log(`📝 CHAT READER: MutationObserver triggered (${mutations.length} mutations)`);
                    this.scanForNewMessages();
                } catch (error) {
                    console.error('❌ CHAT READER: Error scanning for messages:', error);
                }
            });

            // Observe the chat container for changes
            this.observer.observe(chatContainer, {
                childList: true,
                subtree: true
            });

            // Also do an initial scan
            setTimeout(() => {
                try {
                    console.log('🔍 CHAT READER: Running initial scan of existing messages...');
                    this.scanForNewMessages();
                    this.isInitialScan = false; // After first scan, mark as done
                } catch (error) {
                    console.error('❌ CHAT READER: Error in initial message scan:', error);
                }
            }, 1000);
        } catch (error) {
            console.error('❌ CHAT READER: Error setting up chat observer:', error);
        }
    }

    scanForNewMessages() {
        try {
            // Find all chat message elements
            const messages = this.findChatMessages();
            console.log(`🔍 CHAT READER: Scanning ${messages.length} messages for new ones...`);
            
            let newCount = 0;
            let processedCount = 0;
            let skippedInScan = 0;
            
            // Track which message IDs we see during this scan (to detect duplicates in same scan)
            const idsSeenInThisScan = new Set();
            
            messages.forEach((messageEl, index) => {
                try {
                    const messageData = this.extractMessageData(messageEl);
                    if (!messageData) {
                        // Log all extraction failures for debugging (especially for messages with emojis)
                        const usernameEl = messageEl.querySelector('#author-name');
                        const username = usernameEl?.textContent?.trim() || 'Unknown';
                        const textEl = messageEl.querySelector('#message');
                        const emojiImages = textEl ? textEl.querySelectorAll('img') : [];
                        const hasEmojis = emojiImages.length > 0;
                        
                        // Always log failures for messages with emojis or from specific users
                        if (hasEmojis || username.includes('JohnStephenson') || username.includes('NehaJadhav') || index < 10) {
                            const logMsg = `⚠️ CHAT READER: Message ${index} from ${username} extraction FAILED:`;
                            const logData = {
                                hasEmojis,
                                emojiCount: emojiImages.length,
                                hasTextEl: !!textEl,
                                messageElementId: messageEl.id || '(no id)',
                                messageElementClasses: messageEl.className || '(no classes)',
                                textElContent: textEl ? textEl.textContent?.substring(0, 100) : '(no textEl)'
                            };
                            console.warn(logMsg, logData);
                            console.warn(`📋 COPY TO LOG.TXT: ${logMsg}`, JSON.stringify(logData, null, 2));
                        }
                        return;
                    }
                    
                    // Enhanced logging for user's own messages to debug duplicates
                    const isUserMessage = messageData.username && messageData.username.toLowerCase().includes('retrohead');
                    
                    // Check if we've already seen this ID in this scan (duplicate in DOM)
                    if (idsSeenInThisScan.has(messageData.id)) {
                        skippedInScan++;
                        console.warn(`⚠️ CHAT READER: Duplicate message ID "${messageData.id}" found in same scan (username: ${messageData.username}, index ${index}). Skipping duplicate.`);
                        if (isUserMessage) {
                            console.warn(`🔍 CHAT READER: [DUPLICATE DEBUG] User's message "${messageData.text}" with ID "${messageData.id}" already seen in this scan. Element:`, {
                                elementId: messageEl.id,
                                elementIndex: index,
                                elementClasses: messageEl.className,
                                elementParent: messageEl.parentElement?.tagName
                            });
                        }
                        return;
                    }
                    idsSeenInThisScan.add(messageData.id);
                    
                    // Check if we've already processed this ID in a previous scan
                    if (!this.processedMessageIds.has(messageData.id)) {
                        this.processedMessageIds.add(messageData.id);
                        newCount++;
                        if (isUserMessage) {
                            console.log(`🔍 CHAT READER: [USER MESSAGE] Processing NEW message - ID: "${messageData.id}", Text: "${messageData.text}", Element index: ${index}`);
                        }
                        this.onNewMessage(messageData);
                    } else {
                        processedCount++;
                        if (isUserMessage) {
                            console.warn(`⚠️ CHAT READER: [USER MESSAGE DUPLICATE] Message ID "${messageData.id}" already processed earlier. Text: "${messageData.text}", Element index: ${index}`);
                            console.warn(`🔍 CHAT READER: [DUPLICATE DEBUG] Checking why it's appearing again...`, {
                                elementId: messageEl.id,
                                elementIndex: index,
                                elementClasses: messageEl.className,
                                elementParent: messageEl.parentElement?.tagName,
                                alreadyInOverlay: this.addedToOverlayIds.has(messageData.id),
                                messageId: messageData.id
                            });
                        }
                        // Only log duplicates for debugging if it's the user's own message
                        const isEmojiOnly = (!messageData.text || messageData.text.trim() === '') && 
                                           messageData.textHtml && 
                                           messageData.textHtml.includes('<img');
                        if (isEmojiOnly) {
                            console.log(`🔄 CHAT READER: Emoji-only message ${messageData.id} (${messageData.username}) already processed, skipping`);
                        }
                    }
                } catch (error) {
                    // Skip this message if there's an error extracting it
                    console.error(`❌ CHAT READER: Error processing message ${index}:`, error);
                }
            });
            
            if (newCount > 0 || skippedInScan > 0) {
                const skipMsg = skippedInScan > 0 ? `, ${skippedInScan} duplicates in same scan` : '';
                console.log(`✅ CHAT READER: Found ${newCount} new messages (${processedCount} already processed${skipMsg})`);
                if (this.isInitialScan && newCount > 0) {
                    console.log(`📋 CHAT READER: Initial scan processed ${newCount} existing messages. Waiting for new ones...`);
                }
            } else if (this.isInitialScan && processedCount === 0) {
                console.log(`⚠️ CHAT READER: Initial scan found ${messages.length} messages but none were extracted. Check extraction logic.`);
            }
        } catch (error) {
            console.error('❌ CHAT READER: Error scanning for new messages:', error);
        }
    }

    findChatMessages() {
        try {
            const messages = [];
            
            const selectors = [
                'yt-live-chat-text-message-renderer', // Regular text messages
                'yt-live-chat-paid-message-renderer', // Super chat / paid messages
                'yt-live-chat-membership-item-renderer', // Membership messages
            ];
            
            // Chat messages are always inside the iframe, so only search there
            const chatIframe = document.querySelector('iframe#chatframe');
            if (chatIframe) {
                try {
                    const iframeDoc = chatIframe.contentDocument || chatIframe.contentWindow?.document;
                    if (iframeDoc) {
                        for (const selector of selectors) {
                            try {
                                const elements = iframeDoc.querySelectorAll(selector);
                                if (elements.length > 0) {
                                    console.log(`🔍 CHAT READER: Found ${elements.length} messages with selector "${selector}" inside iframe`);
                                }
                                elements.forEach(el => {
                                    if (el && !messages.includes(el)) {
                                        messages.push(el);
                                    }
                                });
                            } catch (e) {
                                continue;
                            }
                        }
                    } else {
                        console.log('💡 CHAT READER: Cannot access iframe content (CORS restriction)');
                    }
                } catch (e) {
                    console.log('💡 CHAT READER: Error accessing iframe:', e.message);
                }
            } else {
                console.log('🔍 CHAT READER: No iframe#chatframe found');
            }

            // Only log total if we found messages
            if (messages.length > 0) {
                console.log(`🔍 CHAT READER: Total messages found: ${messages.length}`);
            }
            return messages;
        } catch (error) {
            console.error('❌ CHAT READER: Error finding chat messages:', error);
            return [];
        }
    }

    extractMessageData(messageElement) {
        try {
            // Extract message ID (YouTube uses data attributes or IDs)
            // Extract YouTube's actual message ID - try multiple locations
            let id = messageElement.getAttribute('id');
            let idSource = 'element.id';
            
            // If element ID doesn't look like a YouTube message ID, try other attributes
            if (!id || (!id.startsWith('message-') && !id.startsWith('ChwKGk') && id.length < 10)) {
                id = messageElement.getAttribute('data-id');
                if (id) idSource = 'element.data-id';
            }
            
            // Check internal data attributes that YouTube might use
            if (!id || id.length < 10) {
                // YouTube stores message IDs in various places - check __data or similar
                if (messageElement.__data && messageElement.__data.id) {
                    id = messageElement.__data.id;
                    idSource = '__data.id';
                } else if (messageElement.__data && messageElement.__data.messageId) {
                    id = messageElement.__data.messageId;
                    idSource = '__data.messageId';
                } else if (messageElement.__data && messageElement.__data.clientId) {
                    id = messageElement.__data.clientId;
                    idSource = '__data.clientId';
                }
            }
            
            // Check for message ID in child elements (like the message content area)
            if (!id || id.length < 10) {
                const messageContent = messageElement.querySelector('[id*="message"], [data-id*="message"]');
                if (messageContent) {
                    id = messageContent.getAttribute('id') || messageContent.getAttribute('data-id');
                    if (id) idSource = 'childElement';
                }
            }
            
            // If we still can't find YouTube's ID, skip this message
            if (!id || id.length < 10) {
                console.warn(`⚠️ CHAT READER: Could not find YouTube message ID, skipping message. Element:`, {
                    elementId: messageElement.id,
                    elementClasses: messageElement.className,
                    hasData: !!messageElement.__data
                });
                return null; // Skip messages without YouTube ID
            }
            
            // Extract username early for user message detection
            const usernameEl = messageElement.querySelector('#author-name');
            const username = usernameEl?.textContent?.trim() || 'Unknown';
            const isUserMessage = username && username.toLowerCase().includes('retrohead');
            
            // Log ID extraction details for user messages to debug duplicates
            if (isUserMessage) {
                console.log(`🔍 CHAT READER: [ID EXTRACTION] Extracted ID: "${id}" from source: "${idSource}"`, {
                    elementId: messageElement.id,
                    elementClasses: messageElement.className,
                    hasData: !!messageElement.__data,
                    dataKeys: messageElement.__data ? Object.keys(messageElement.__data) : []
                });
            }

            // Extract message text - exact selector from DOM inspection (span#message)
            // YouTube renders emojis as <img> tags, so we need to extract them properly
            const textEl = messageElement.querySelector('span#message');
            let text = '';
            let textHtml = ''; // HTML version with emoji images preserved
            
            if (textEl) {
                // Build HTML by traversing all child nodes to preserve emoji images
                const htmlParts = [];
                
                const processNode = (node) => {
                    if (node.nodeType === Node.TEXT_NODE) {
                        const textContent = node.textContent || '';
                        htmlParts.push(this.escapeHtml(textContent));
                    } else if (node.nodeType === Node.ELEMENT_NODE) {
                        if (node.tagName === 'IMG') {
                            // Emoji image - preserve the image tag
                            // Priority: src attribute > data-src > src property > currentSrc
                            let imgSrc = node.getAttribute('src') || '';
                            
                            // If src attribute exists but is empty or invalid, try other sources
                            if (!imgSrc || imgSrc.trim() === '' || imgSrc === 'undefined' || imgSrc === 'null') {
                                imgSrc = node.getAttribute('data-src') || '';
                            }
                            if (!imgSrc || imgSrc.trim() === '') {
                                imgSrc = (node.src && node.src !== 'undefined') ? node.src : '';
                            }
                            if (!imgSrc || imgSrc.trim() === '' || imgSrc === 'about:blank') {
                                imgSrc = (node.currentSrc && node.currentSrc !== 'undefined') ? node.currentSrc : '';
                            }
                            
                            const imgAlt = node.getAttribute('alt') || 
                                         node.getAttribute('title') || 
                                         node.getAttribute('aria-label') ||
                                         node.getAttribute('shared-tooltip-text') ||
                                         '';
                            
                            // Clean up src - remove whitespace and check if it's a valid URL
                            imgSrc = imgSrc.trim();
                            const isValidSrc = imgSrc && 
                                              imgSrc !== '' && 
                                              imgSrc !== 'undefined' && 
                                              imgSrc !== 'null' &&
                                              imgSrc !== 'about:blank' &&
                                              (imgSrc.startsWith('http://') || imgSrc.startsWith('https://') || imgSrc.startsWith('data:') || imgSrc.startsWith('/'));
                            
                            if (isValidSrc) {
                                // Create emoji image HTML with proper attributes
                                htmlParts.push(`<img src="${this.escapeHtml(imgSrc)}" alt="${this.escapeHtml(imgAlt)}" class="chat-reader-emoji" style="width: auto; height: auto; max-width: 24px; max-height: 24px; vertical-align: middle;">`);
                            } else {
                                // Fallback: use alt text if it's a Unicode emoji, otherwise use default
                                const emojiText = imgAlt && /[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/u.test(imgAlt) ? imgAlt : (imgAlt || '😀');
                                htmlParts.push(emojiText);
                                console.warn(`⚠️ CHAT READER: Emoji image has invalid src: "${imgSrc}", using alt: "${imgAlt || '😀'}"`);
                            }
                        } else {
                            // Process all child nodes recursively
                            for (let child = node.firstChild; child; child = child.nextSibling) {
                                processNode(child);
                            }
                        }
                    }
                };
                
                // Process all children of textEl
                for (let child = textEl.firstChild; child; child = child.nextSibling) {
                    processNode(child);
                }
                
                textHtml = htmlParts.join('').trim();
                
                // Debug: Log if we found emoji images
                const emojiImages = textEl.querySelectorAll('img');
                if (emojiImages.length > 0) {
                    console.log(`😀 CHAT READER: Found ${emojiImages.length} emoji image(s) in message, textHtml length: ${textHtml.length}`);
                    emojiImages.forEach((img, idx) => {
                        const srcAttr = img.getAttribute('src');
                        const dataSrc = img.getAttribute('data-src');
                        const actualSrc = img.src;
                        const currentSrc = img.currentSrc;
                        console.log(`😀 CHAT READER:   Emoji ${idx + 1}:`, {
                            srcAttr: srcAttr?.substring(0, 80),
                            dataSrc: dataSrc?.substring(0, 80),
                            actualSrc: actualSrc?.substring(0, 80),
                            currentSrc: currentSrc?.substring(0, 80),
                            alt: img.getAttribute('alt'),
                            tooltip: img.getAttribute('shared-tooltip-text'),
                            classes: img.className,
                            width: img.width || img.style.width,
                            height: img.height || img.style.height
                        });
                    });
                    
                    // If we found emoji images but textHtml is empty, something went wrong
                    if (!textHtml || textHtml.trim().length === 0) {
                        console.error(`❌ CHAT READER: Found ${emojiImages.length} emoji images but textHtml is empty! htmlParts length: ${htmlParts.length}`);
                    }
                }
                
                // Get plain text version (excluding img alt text to avoid duplication)
                // Build text by extracting only from text nodes, not from images
                const textParts = [];
                const extractTextOnly = (node) => {
                    if (node.nodeType === Node.TEXT_NODE) {
                        textParts.push(node.textContent);
                    } else if (node.nodeType === Node.ELEMENT_NODE && node.tagName !== 'IMG') {
                        for (let child = node.firstChild; child; child = child.nextSibling) {
                            extractTextOnly(child);
                        }
                    }
                };
                for (let child = textEl.firstChild; child; child = child.nextSibling) {
                    extractTextOnly(child);
                }
                text = textParts.join('').trim();
                
                // If no HTML was built but we have text, use escaped text as HTML
                if (!textHtml && text) {
                    textHtml = this.escapeHtml(text);
                }
                // For emoji-only messages, text will remain empty - that's fine, we use textHtml for the actual content
                // No need to create placeholder text - validation already checks for textHtml
                // Ensure textHtml is never empty if we have content
                if (!textHtml) {
                    textHtml = text ? this.escapeHtml(text) : '';
                }
            } else {
                // No textEl found - this shouldn't happen but handle gracefully
                text = '';
                textHtml = '';
            }

            // Extract avatar/image - exact selector from DOM inspection
            const avatarEl = messageElement.querySelector('#author-photo img') ||
                            messageElement.querySelector('#author-photo yt-img-shadow img');
            const avatar = avatarEl?.src || avatarEl?.getAttribute('src') || '';

            // Extract timestamp display text from DOM (just for display purposes)
            const timestampEl = messageElement.querySelector('#timestamp');
            const timestampText = timestampEl?.textContent?.trim() || '';
            
            // Extract YouTube's actual numeric timestamp (for duplicate detection)
            let timestamp = Date.now(); // Fallback to current time
            if (messageElement.__data) {
                // Try various timestamp properties YouTube might use
                if (messageElement.__data.timestamp) {
                    timestamp = messageElement.__data.timestamp;
                } else if (messageElement.__data.timestampUsec) {
                    timestamp = messageElement.__data.timestampUsec / 1000; // Convert microseconds to milliseconds
                } else if (messageElement.__data.timeUsec) {
                    timestamp = messageElement.__data.timeUsec / 1000; // Convert microseconds to milliseconds
                } else if (messageElement.__data.createdTimestamp) {
                    timestamp = messageElement.__data.createdTimestamp;
                } else if (messageElement.__data.timestampSeconds) {
                    timestamp = messageElement.__data.timestampSeconds * 1000; // Convert seconds to milliseconds
                }
            }
            
            // Also check for timestamp in data attributes
            if (timestamp === Date.now() || !timestamp) { // Only if we still have fallback value
                const dataTimestamp = messageElement.getAttribute('data-timestamp') || 
                                    messageElement.getAttribute('data-time') ||
                                    timestampEl?.getAttribute('data-timestamp');
                if (dataTimestamp) {
                    const parsed = parseInt(dataTimestamp, 10);
                    if (!isNaN(parsed)) {
                        timestamp = parsed > 1000000000000 ? parsed : parsed * 1000; // Handle both seconds and milliseconds
                    }
                }
            }

            // Extract badges - get all badge images/icons next to the username
            const badges = {
                membershipTier: null,  // e.g., "#1", "#2" (crown badge) - extracted separately for special styling
                badgeImages: []        // All other badge images (wrench, hexagon, verified, etc.)
            };

            // Find author chip - this is where badges appear
            const authorChip = messageElement.querySelector('yt-live-chat-author-chip');
            
            // Look for membership tier badge - exact selector from DOM inspection
            // The badge is: <div class="yt-spec-button-shape-next__button-text-content">#1</div>
            const tierBadgeEl = messageElement.querySelector('.yt-spec-button-shape-next__button-text-content');
            if (tierBadgeEl) {
                const tierText = tierBadgeEl.textContent?.trim() || '';
                const tierMatch = tierText.match(/#(\d+)/);
                if (tierMatch) {
                    badges.membershipTier = tierMatch[1];
                }
            }
            
            // Fallback: Search for "#1", "#2" pattern in author area
            if (!badges.membershipTier && usernameEl && usernameEl.parentElement) {
                const authorArea = usernameEl.parentElement;
                const authorAreaText = authorArea.textContent || '';
                const tierMatch = authorAreaText.match(/#(\d+)/);
                if (tierMatch) {
                    badges.membershipTier = tierMatch[1];
                }
            }
            
            // Extract all badge images/icons from the author chip - SIMPLE APPROACH!
            // Skip avatar container (#author-photo) and membership tier - everything else is a badge
            const seenBadgeSrcs = new Set(); // Track to prevent duplicates
            const avatarContainer = messageElement.querySelector('#author-photo');
            
            if (authorChip) {
                // Helper function to extract badge source from an element
                const extractBadgeSource = (el) => {
                    let badgeSrc = '';
                    let badgeAlt = '';
                    
                    // For IMG elements
                    if (el.tagName === 'IMG') {
                        badgeSrc = el.src || el.getAttribute('src') || el.getAttribute('data-src') || el.currentSrc || '';
                        badgeAlt = el.alt || el.getAttribute('aria-label') || '';
                    }
                    // For SVG elements
                    else if (el.tagName === 'SVG') {
                        badgeSrc = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(el.outerHTML)));
                        badgeAlt = el.getAttribute('aria-label') || el.getAttribute('title') || '';
                    }
                    // For yt-icon elements (like wrench badge)
                    else if (el.tagName === 'YT-ICON') {
                        badgeAlt = el.getAttribute('aria-label') || el.getAttribute('title') || '';
                        
                        // Try to find SVG - could be nested deep inside (e.g., yt-icon > span > div > svg)
                        let svg = el.querySelector('svg');
                        if (svg) {
                            try {
                                badgeSrc = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svg.outerHTML)));
                                // Also get alt from SVG if available
                                if (!badgeAlt) {
                                    badgeAlt = svg.getAttribute('aria-label') || svg.getAttribute('title') || '';
                                }
                            } catch (e) {
                                console.warn(`⚠️ CHAT READER: Failed to convert SVG to base64 for ${username}:`, e);
                            }
                        }
                        
                        // Try img inside
                        if (!badgeSrc) {
                            const img = el.querySelector('img');
                            if (img) {
                                badgeSrc = img.src || img.getAttribute('src') || img.getAttribute('data-src') || img.currentSrc || '';
                                if (!badgeAlt) {
                                    badgeAlt = img.alt || img.getAttribute('aria-label') || '';
                                }
                            }
                        }
                        
                        // Try shadow DOM
                        if (!badgeSrc && el.shadowRoot) {
                            try {
                                const shadowSvg = el.shadowRoot.querySelector('svg');
                                const shadowImg = el.shadowRoot.querySelector('img');
                                if (shadowSvg) {
                                    badgeSrc = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(shadowSvg.outerHTML)));
                                } else if (shadowImg) {
                                    badgeSrc = shadowImg.src || shadowImg.getAttribute('src') || '';
                                }
                            } catch (e) {
                                // Shadow DOM access might fail
                            }
                        }
                        
                        // If we still don't have a source, log for debugging
                        if (!badgeSrc) {
                            console.log(`⚠️ CHAT READER: yt-icon found for ${username} but couldn't extract image. aria-label="${badgeAlt}"`);
                        }
                    }
                    
                    return { src: badgeSrc, alt: badgeAlt };
                };
                
                // Get ALL images/icons/SVG from author chip
                // Process yt-icon FIRST (before SVGs) so we extract from the icon element itself
                const allYtIcons = authorChip.querySelectorAll('yt-icon');
                const allImages = authorChip.querySelectorAll('img');
                const allSvgs = authorChip.querySelectorAll('svg');
                
                // Helper to check if element should be skipped
                const shouldSkip = (el) => {
                    // Skip if inside avatar container
                    if (avatarContainer && avatarContainer.contains(el)) {
                        return true;
                    }
                    // Skip if inside membership tier container
                    if (badges.membershipTier && el.closest('.yt-spec-button-shape-next__button-text-content')) {
                        return true;
                    }
                    // Skip if SVG is inside a yt-icon (we'll extract from yt-icon itself)
                    if (el.tagName === 'SVG' && el.closest('yt-icon')) {
                        return true;
                    }
                    return false;
                };
                
                // Process yt-icon elements first
                allYtIcons.forEach(iconEl => {
                    const ariaLabel = iconEl.getAttribute('aria-label') || '';
                    
                    // Debug: log all yt-icon elements found
                    console.log(`🔍 CHAT READER: Found yt-icon for ${username}: aria-label="${ariaLabel}", inside avatar? ${avatarContainer && avatarContainer.contains(iconEl)}`);
                    
                    if (shouldSkip(iconEl)) {
                        console.log(`⏭️ CHAT READER: Skipping yt-icon for ${username} (filtered out)`);
                        return;
                    }
                    
                    const { src: badgeSrc, alt: badgeAlt } = extractBadgeSource(iconEl);
                    
                    if (!badgeSrc) {
                        console.log(`❌ CHAT READER: yt-icon for ${username} found but no badge source extracted. aria-label="${badgeAlt}"`);
                        return;
                    }
                    
                    if (badgeSrc.includes('data:image/gif;base64') || seenBadgeSrcs.has(badgeSrc)) {
                        console.log(`⏭️ CHAT READER: Skipping yt-icon for ${username} (duplicate or placeholder)`);
                        return;
                    }
                    
                    seenBadgeSrcs.add(badgeSrc);
                    badges.badgeImages.push({
                        src: badgeSrc,
                        alt: badgeAlt,
                        element: iconEl
                    });
                    console.log(`✅ CHAT READER: Extracted yt-icon badge for ${username}: src="${badgeSrc.substring(0, 100)}", alt="${badgeAlt}"`);
                });
                
                // Process regular images
                allImages.forEach(imgEl => {
                    if (shouldSkip(imgEl)) return;
                    
                    const { src: badgeSrc, alt: badgeAlt } = extractBadgeSource(imgEl);
                    
                    if (!badgeSrc || 
                        badgeSrc.includes('data:image/gif;base64') ||
                        seenBadgeSrcs.has(badgeSrc)) {
                        return;
                    }
                    
                    seenBadgeSrcs.add(badgeSrc);
                    badges.badgeImages.push({
                        src: badgeSrc,
                        alt: badgeAlt,
                        element: imgEl
                    });
                    console.log(`🏷️ CHAT READER: Extracted image badge for ${username}: src="${badgeSrc.substring(0, 100)}", alt="${badgeAlt}"`);
                });
                
                // Process standalone SVG elements (not inside yt-icon)
                allSvgs.forEach(svgEl => {
                    if (shouldSkip(svgEl)) return;
                    
                    const { src: badgeSrc, alt: badgeAlt } = extractBadgeSource(svgEl);
                    
                    if (!badgeSrc || 
                        badgeSrc.includes('data:image/gif;base64') ||
                        seenBadgeSrcs.has(badgeSrc)) {
                        return;
                    }
                    
                    seenBadgeSrcs.add(badgeSrc);
                    badges.badgeImages.push({
                        src: badgeSrc,
                        alt: badgeAlt,
                        element: svgEl
                    });
                    console.log(`🎨 CHAT READER: Extracted SVG badge for ${username}: src="${badgeSrc.substring(0, 100)}", alt="${badgeAlt}"`);
                });
            }

            // Log total badges found for debugging
            if (badges.badgeImages.length > 0) {
                console.log(`📊 CHAT READER: Found ${badges.badgeImages.length} badge(s) for ${username}:`, badges.badgeImages.map(b => ({ src: b.src.substring(0, 50) + '...', alt: b.alt })));
            }
            
            // Ensure textHtml is set (should already be set from extraction)
            if (!textHtml && text) {
                textHtml = this.escapeHtml(text);
            }
            
            // If we have text but textHtml is empty or failed, recreate it from text
            // This handles cases where emoji extraction might have failed but we still have text
            if (text && text.trim().length > 0 && (!textHtml || textHtml.trim().length === 0)) {
                console.warn(`⚠️ CHAT READER: Message ${id} from ${username} has text but empty textHtml, recreating from text`, {
                    text: text.substring(0, 50),
                    hasTextEl: !!messageElement.querySelector('#message'),
                    emojiCount: messageElement.querySelectorAll('#message img').length
                });
                textHtml = this.escapeHtml(text);
            }
            
            // For emoji-only messages, ensure textHtml has content even if text is empty
            if (!textHtml || textHtml.trim().length === 0) {
                // If we have no HTML content at all, check if we should still accept it
                console.warn(`⚠️ CHAT READER: Message ${id} from ${username} has empty textHtml!`, {
                    text: text?.substring(0, 50),
                    textHtml: textHtml?.substring(0, 50),
                    username,
                    hasTextEl: !!messageElement.querySelector('#message')
                });
            }
            
            // Validate: message must have ID and either text content or HTML content (for emoji-only messages)
            // Allow messages with only HTML content (emoji-only messages)
            if (!id) {
                console.warn(`⚠️ CHAT READER: Message from ${username} rejected - no ID found`);
                return null; // Invalid message - no ID
            }
            
            // More lenient validation - accept if we have text OR textHtml with any content
            const hasText = text && text.trim().length > 0;
            const hasHtml = textHtml && textHtml.trim().length > 0;
            
            if (!hasText && !hasHtml) {
                console.warn(`⚠️ CHAT READER: Message ${id} from ${username} rejected - no text or HTML content`, {
                    text: text || '(empty)',
                    textLength: text?.length || 0,
                    textHtmlLength: textHtml?.length || 0,
                    textHtmlPreview: textHtml?.substring(0, 100) || '(empty)',
                    hasTextEl: !!messageElement.querySelector('#message'),
                    messageElementClasses: messageElement.className
                });
                return null; // Invalid message - no content
            }
            
            // Log successful extraction for debugging
            if (hasText && hasHtml) {
                console.log(`✅ CHAT READER: Extracted message ${id} from ${username}: text="${text.substring(0, 50)}", html has ${(textHtml.match(/<img/g) || []).length} emoji(s)`);
            }
            
            const messageData = {
                id,
                username,
                text: text || '', // Plain text version (for search/filtering) - allow empty for emoji-only
                textHtml: textHtml || '', // HTML version with emoji images
                avatar,
                timestamp,
                timestampText,
                badges
            };
            
            // Debug: Log successful extraction for emoji-only messages
            if ((!text || text.trim().length === 0) && textHtml && textHtml.includes('<img')) {
                console.log(`✅ CHAT READER: Successfully extracted emoji-only message ${id} from ${username} with ${(textHtml.match(/<img/g) || []).length} emoji(s)`);
            }
            
            // Only log extraction details for debugging (commented out to reduce noise)
            // console.log('💬 CHAT READER: Extracted message:', messageData);
            return messageData;
        } catch (error) {
            console.error('❌ CHAT READER: Error extracting message data:', error);
            return null;
        }
    }

    onNewMessage(messageData) {
        // For now, just log it - later we'll send to server
        console.log('💬 CHAT READER: ===== NEW CHAT MESSAGE =====');
        console.log('💬 CHAT READER: User:', messageData.username);
        console.log('💬 CHAT READER: Message:', messageData.text);
        console.log('💬 CHAT READER: Full data:', messageData);
        
        // Update overlay UI
        this.addMessageToOverlay(messageData);
        
        // TODO: Send to server
        // TODO: Format for overlay display
    }

    createOverlay() {
        try {
            // Remove existing overlay if it exists
            const existing = document.getElementById('chat-reader-overlay');
            if (existing) {
                existing.remove();
            }

            // Create overlay container
            const overlay = document.createElement('div');
            overlay.id = 'chat-reader-overlay';
            overlay.innerHTML = `
                <div class="chat-reader-header">
                    <h3>📺 Chat Reader</h3>
                    <div class="chat-reader-stats">
                        <span id="chat-reader-count">0</span> messages
                    </div>
                    <button id="chat-reader-toggle" class="chat-reader-btn">−</button>
                    <button id="chat-reader-clear" class="chat-reader-btn">Clear</button>
                </div>
                <div id="chat-reader-messages" class="chat-reader-messages"></div>
            `;

            // Add styles
            const style = document.createElement('style');
            style.textContent = `
                #chat-reader-overlay {
                    position: fixed;
                    top: 80px;
                    left: 20px;
                    width: 400px;
                    max-height: 600px;
                    background: rgba(15, 15, 15, 0.95);
                    border: 2px solid #ff0000;
                    border-radius: 8px;
                    z-index: 999999;
                    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                    color: #fff;
                    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
                    display: flex;
                    flex-direction: column;
                }
                #chat-reader-overlay.collapsed {
                    height: auto;
                }
                #chat-reader-overlay.collapsed #chat-reader-messages {
                    display: none;
                }
                .chat-reader-header {
                    background: rgba(255, 0, 0, 0.2);
                    padding: 12px;
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    border-bottom: 1px solid #333;
                    flex-shrink: 0;
                }
                .chat-reader-header h3 {
                    margin: 0;
                    font-size: 16px;
                    font-weight: bold;
                }
                .chat-reader-stats {
                    font-size: 12px;
                    color: #aaa;
                }
                .chat-reader-btn {
                    background: rgba(255, 255, 255, 0.1);
                    border: 1px solid #555;
                    color: #fff;
                    padding: 4px 8px;
                    border-radius: 4px;
                    cursor: pointer;
                    font-size: 12px;
                    margin-left: 5px;
                }
                .chat-reader-btn:hover {
                    background: rgba(255, 255, 255, 0.2);
                }
                #chat-reader-messages {
                    overflow-y: auto;
                    max-height: 520px;
                    padding: 8px;
                    flex: 1;
                }
                .chat-reader-message {
                    padding: 8px;
                    margin-bottom: 8px;
                    background: rgba(255, 255, 255, 0.05);
                    border-left: 3px solid #ff0000;
                    border-radius: 4px;
                    font-size: 13px;
                }
                .chat-reader-message:hover {
                    background: rgba(255, 255, 255, 0.1);
                }
                .chat-reader-message-content {
                    display: flex;
                    gap: 10px;
                }
                .chat-reader-avatar {
                    width: 32px;
                    height: 32px;
                    border-radius: 50%;
                    flex-shrink: 0;
                    object-fit: cover;
                }
                .chat-reader-avatar-placeholder {
                    width: 32px;
                    height: 32px;
                    border-radius: 50%;
                    background: rgba(255, 255, 255, 0.1);
                    flex-shrink: 0;
                }
                .chat-reader-message-body {
                    flex: 1;
                    min-width: 0;
                }
                .chat-reader-message-header {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    margin-bottom: 4px;
                }
                .chat-reader-username {
                    color: #ff6b6b;
                    font-weight: bold;
                }
                .chat-reader-text {
                    color: #fff;
                    word-wrap: break-word;
                    line-height: 1.4;
                }
                .chat-reader-emoji {
                    display: inline-block;
                    vertical-align: middle;
                    width: 24px !important;
                    height: 24px !important;
                    margin: 0 2px;
                    object-fit: contain;
                }
                .chat-reader-meta {
                    font-size: 11px;
                    color: #888;
                    margin-top: 4px;
                }
                .chat-reader-meta-inline {
                    font-size: 11px;
                    color: #888;
                    margin-left: auto;
                }
                .chat-reader-badge {
                    display: inline-block;
                    font-size: 11px;
                    padding: 2px 8px;
                    margin-left: 6px;
                    font-weight: 500;
                }
                .chat-reader-badge-tier {
                    background: #E0D9F7;
                    color: #000;
                    border: 1px solid #000;
                    border-radius: 16px;
                    font-size: 11px;
                    padding: 3px 10px;
                    display: inline-flex;
                    align-items: center;
                    gap: 4px;
                    height: 18px;
                    line-height: 1;
                }
                .chat-reader-badge-owner {
                    display: inline-flex;
                    align-items: center;
                    font-size: 14px;
                    margin-left: 6px;
                    padding: 0;
                }
                .chat-reader-badge-image {
                    display: inline-block;
                    width: 16px;
                    height: 16px;
                    margin-left: 6px;
                    vertical-align: middle;
                    object-fit: contain;
                }
            `;
            document.head.appendChild(style);
            document.body.appendChild(overlay);

            this.overlay = overlay;

            // Add event listeners
            document.getElementById('chat-reader-toggle').addEventListener('click', () => {
                overlay.classList.toggle('collapsed');
                const btn = document.getElementById('chat-reader-toggle');
                btn.textContent = overlay.classList.contains('collapsed') ? '+' : '−';
            });

            document.getElementById('chat-reader-clear').addEventListener('click', () => {
                document.getElementById('chat-reader-messages').innerHTML = '';
                this.messageCount = 0;
                document.getElementById('chat-reader-count').textContent = '0';
            });

            console.log('✅ CHAT READER: Overlay UI created');
        } catch (error) {
            console.error('❌ CHAT READER: Error creating overlay:', error);
        }
    }

    addMessageToOverlay(messageData) {
        if (!this.overlay) return;

        try {
            // Enhanced logging for user's own messages to debug duplicates
            const isUserMessage = messageData.username && messageData.username.toLowerCase().includes('retrohead');
            
            // Check if we've already added this message ID to overlay
            if (this.addedToOverlayIds.has(messageData.id)) {
                console.log(`⚠️ CHAT READER: Message ${messageData.id} already tracked as added to overlay, skipping duplicate`);
                if (isUserMessage) {
                    console.warn(`🔍 CHAT READER: [USER MESSAGE] ID "${messageData.id}" already in addedToOverlayIds Set. Text: "${messageData.text}"`);
                }
                return;
            }
            
            // Debug: Log emoji-only messages for troubleshooting
            const isEmojiOnly = (!messageData.text || messageData.text.trim() === '') && 
                               messageData.textHtml && 
                               messageData.textHtml.includes('<img');
            if (isEmojiOnly) {
                console.log(`🔍 CHAT READER: Processing emoji-only message - ID: ${messageData.id}, username: ${messageData.username}`);
            }
            
            const messagesContainer = document.getElementById('chat-reader-messages');
            if (!messagesContainer) return;
            
            // Check if message already exists in overlay DOM (prevent duplicates by ID only)
            // NOTE: We only check by message ID, NOT by content. This means if someone
            // sends the same message multiple times, each will show up (they have different IDs).
            const existingById = messagesContainer.querySelector(`[data-message-id="${messageData.id}"]`);
            if (existingById) {
                console.log(`⚠️ CHAT READER: Message ${messageData.id} already in overlay DOM, skipping duplicate`);
                if (isUserMessage) {
                    console.warn(`🔍 CHAT READER: [USER MESSAGE] Found existing DOM element with ID "${messageData.id}". Text: "${messageData.text}"`);
                    console.warn(`🔍 CHAT READER: [DUPLICATE DEBUG] Existing element:`, existingById);
                }
                this.addedToOverlayIds.add(messageData.id); // Track it even though we're skipping
                return;
            }
            
            // Content-based duplicate detection for optimistic updates (YouTube shows your messages twice)
            // Check if a message with the same username and content was added recently (within 1 second)
            // Uses YouTube's actual timestamps to detect optimistic duplicates
            // Use the actual message content - text if available, otherwise textHtml (which contains the actual emoji images)
            let contentForKey = messageData.text && messageData.text.trim().length > 0 
                ? messageData.text 
                : (messageData.textHtml || ''); // For emoji-only messages, use textHtml which has the actual emoji image URLs
            const contentKey = `${messageData.username}:${contentForKey}`;
            const recentMessage = this.recentMessagesByContent.get(contentKey);
            const messageTimestamp = messageData.timestamp; // Use YouTube's actual timestamp
            const TIME_WINDOW = 1000; // 1 second - if timestamps are >1s apart, show both
            
            if (recentMessage && (messageTimestamp - recentMessage.timestamp) < TIME_WINDOW) {
                // Found a duplicate within time window
                const isPlaceholderAvatar = messageData.avatar && (
                    messageData.avatar.includes('data:image/gif;base64') ||
                    messageData.avatar.includes('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7')
                );
                const existingIsPlaceholder = recentMessage.avatar && (
                    recentMessage.avatar.includes('data:image/gif;base64') ||
                    recentMessage.avatar.includes('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7')
                );
                
                if (isPlaceholderAvatar && !existingIsPlaceholder) {
                    // New message has placeholder avatar but existing has real avatar - skip the new one
                    console.log(`⚠️ CHAT READER: Content duplicate detected (placeholder avatar), skipping. Text: "${messageData.text}", Username: ${messageData.username}`);
                    if (isUserMessage) {
                        console.log(`🔍 CHAT READER: [USER MESSAGE] Skipping duplicate with placeholder avatar - keeping existing message with real avatar`);
                    }
                    return;
                } else if (!isPlaceholderAvatar && existingIsPlaceholder) {
                    // New message has real avatar but existing has placeholder - replace the old one
                    console.log(`🔄 CHAT READER: Content duplicate detected (real avatar), replacing placeholder. Text: "${messageData.text}", Username: ${messageData.username}`);
                    if (isUserMessage) {
                        console.log(`🔍 CHAT READER: [USER MESSAGE] Replacing placeholder message with confirmed message (real avatar)`);
                    }
                    
                    // Remove the old message from overlay
                    const oldMessageEl = messagesContainer.querySelector(`[data-message-id="${recentMessage.id}"]`);
                    if (oldMessageEl) {
                        oldMessageEl.remove();
                        this.addedToOverlayIds.delete(recentMessage.id);
                        this.messageCount = Math.max(0, this.messageCount - 1);
                        document.getElementById('chat-reader-count').textContent = this.messageCount;
                    }
                    
                    // Update the recent message entry with the new one
                    this.recentMessagesByContent.set(contentKey, {
                        id: messageData.id,
                        username: messageData.username,
                        text: messageData.text,
                        avatar: messageData.avatar,
                        timestamp: messageTimestamp
                    });
                } else {
                    // Both have same avatar type or both are real - skip the duplicate
                    const logMsg = `⚠️ CHAT READER: Content duplicate detected (same type), skipping. Text: "${messageData.text}", Username: ${messageData.username}`;
                    console.log(logMsg);
                    console.log(`📋 COPY TO LOG.TXT: ${logMsg} - Message ID: ${messageData.id}, Content: "${messageData.text}", HTML: ${messageData.textHtml ? messageData.textHtml.substring(0, 100) : 'none'}`);
                    if (isUserMessage) {
                        console.log(`🔍 CHAT READER: [USER MESSAGE] Skipping duplicate message - already added recently`);
                    }
                    return;
                }
            } else {
                // No recent duplicate - add to tracking using YouTube's timestamp
                this.recentMessagesByContent.set(contentKey, {
                    id: messageData.id,
                    username: messageData.username,
                    text: messageData.text,
                    avatar: messageData.avatar,
                    timestamp: messageTimestamp
                });
                
                // Clean up old entries from the map (older than 10 seconds)
                const now = Date.now();
                for (const [key, value] of this.recentMessagesByContent.entries()) {
                    if (now - value.timestamp > 10000) {
                        this.recentMessagesByContent.delete(key);
                    }
                }
            }
            
            if (isUserMessage) {
                console.log(`✅ CHAT READER: [USER MESSAGE] Adding to overlay - ID: "${messageData.id}", Text: "${messageData.text}"`);
            }

            // Create message element
            const messageEl = document.createElement('div');
            messageEl.className = 'chat-reader-message';
            messageEl.setAttribute('data-message-id', messageData.id);
            
            // Use avatar if available, otherwise show a default placeholder
            const avatarUrl = messageData.avatar || '';
            const avatarHtml = avatarUrl 
                ? `<img src="${this.escapeHtml(avatarUrl)}" alt="Avatar" class="chat-reader-avatar" onerror="this.style.display='none'">`
                : '<div class="chat-reader-avatar-placeholder"></div>';
            
            // Build badge indicators - maintain YouTube's order (hexagon first, then crown)
            let badgeHtml = '';
            if (messageData.badges) {
                // All other badge images (wrench, hexagon, verified, etc.) - show first to match YouTube order
                if (messageData.badges.badgeImages && messageData.badges.badgeImages.length > 0) {
                    messageData.badges.badgeImages.forEach((badge, index) => {
                        if (badge.src) {
                            console.log(`🔖 CHAT READER: Adding badge ${index + 1} for ${messageData.username}: src="${badge.src.substring(0, 100)}", alt="${badge.alt}"`);
                            badgeHtml += `<img src="${this.escapeHtml(badge.src)}" alt="${this.escapeHtml(badge.alt || '')}" class="chat-reader-badge-image" title="${this.escapeHtml(badge.alt || '')}" onerror="console.error('❌ CHAT READER: Badge image failed to load:', this.src); this.style.display='none';">`;
                        }
                    });
                }
                
                // Membership tier badge (crown + number) - shown after other badges to match YouTube order
                if (messageData.badges.membershipTier) {
                    badgeHtml += `<span class="chat-reader-badge chat-reader-badge-tier">👑 #${messageData.badges.membershipTier}</span>`;
                }
            }

            messageEl.innerHTML = `
                <div class="chat-reader-message-content">
                    ${avatarHtml}
                    <div class="chat-reader-message-body">
                        <div class="chat-reader-message-header">
                            <span class="chat-reader-username">${this.escapeHtml(messageData.username)}</span>
                            ${badgeHtml}
                            <span class="chat-reader-meta-inline">
                                ${messageData.timestampText || new Date(messageData.timestamp).toLocaleTimeString()}
                            </span>
                        </div>
                        <div class="chat-reader-text">${messageData.textHtml || this.escapeHtml(messageData.text)}</div>
                    </div>
                </div>
            `;

            // Add to bottom of list (newest messages at bottom)
            messagesContainer.appendChild(messageEl);
            
            // Auto-scroll to bottom to show new message
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
            
            // Mark this message as added to prevent duplicates
            this.addedToOverlayIds.add(messageData.id);

            // Keep only last 50 messages (remove oldest from top)
            while (messagesContainer.children.length > 50) {
                const removedMsg = messagesContainer.firstChild;
                const removedId = removedMsg?.getAttribute('data-message-id');
                if (removedId) {
                    this.addedToOverlayIds.delete(removedId);
                }
                messagesContainer.removeChild(removedMsg);
            }

            // Update counter
            this.messageCount++;
            document.getElementById('chat-reader-count').textContent = this.messageCount;
        } catch (error) {
            console.error('❌ CHAT READER: Error adding message to overlay:', error);
        }
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    stop() {
        if (this.observer) {
            this.observer.disconnect();
            this.observer = null;
        }
        this.isActive = false;
        console.log('🛑 CHAT READER: Stopped watching chat');
    }
}

    // Wrap in try-catch to handle any initialization errors
    let chatReader;
    try {
        chatReader = new YouTubeChatReader();
        
        // Expose diagnostic function globally for manual inspection
        window.chatReaderDiagnostic = () => {
            if (chatReader) {
                chatReader.diagnosePage();
            } else {
                console.log('🔬 CHAT READER: Chat reader not initialized yet');
            }
        };
        
        // Helper function to inspect badge elements in a message
        window.inspectMessageBadges = (messageElement) => {
            if (!messageElement) {
                console.log('❌ Please provide a message element. Usage: inspectMessageBadges(messageElement)');
                return;
            }
            
            console.log('🔬 CHAT READER: Inspecting badges in message element...');
            console.log('Message element:', messageElement);
            
            // Find author chip
            const authorChip = messageElement.querySelector('yt-live-chat-author-chip');
            console.log('Author chip:', authorChip);
            
            if (authorChip) {
                console.log('Author chip HTML:', authorChip.innerHTML.substring(0, 500));
                console.log('Author chip classes:', authorChip.className);
                
                // Find all child elements
                const allChildren = authorChip.querySelectorAll('*');
                console.log(`Found ${allChildren.length} child elements in author chip:`);
                allChildren.forEach((child, idx) => {
                    if (idx < 20) {
                        console.log(`  ${idx + 1}. ${child.tagName}, classes: ${child.className}, text: "${child.textContent?.substring(0, 30)}"`);
                    }
                });
            }
            
            // Search for badge-like elements
            const badgeSelectors = [
                '[class*="badge"]',
                '[class*="sponsor"]',
                '[class*="member"]',
                '[class*="tier"]',
                '[class*="crown"]',
                '[id*="badge"]',
                '[id*="sponsor"]'
            ];
            
            badgeSelectors.forEach(selector => {
                const elements = messageElement.querySelectorAll(selector);
                if (elements.length > 0) {
                    console.log(`Found ${elements.length} elements with selector "${selector}":`);
                    elements.forEach((el, idx) => {
                        if (idx < 5) {
                            console.log(`  ${idx + 1}. ${el.tagName}, classes: ${el.className}, id: ${el.id}, text: "${el.textContent?.trim()}"`);
                        }
                    });
                }
            });
            
            // Check for "#1", "#2" pattern in text
            const allText = messageElement.textContent || '';
            const tierMatches = allText.match(/#(\d+)/g);
            if (tierMatches) {
                console.log('Found tier patterns in text:', tierMatches);
            }
        };
        
        // Cleanup on page unload
        window.addEventListener('beforeunload', () => {
            try {
                if (chatReader) {
                    chatReader.stop();
                }
            } catch (e) {
                // Ignore cleanup errors
            }
        });
    } catch (error) {
        console.error('❌ CHAT READER: Failed to initialize chat reader:', error);
    }

})();

