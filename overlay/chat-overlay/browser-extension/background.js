// Background script for YouTube Live Chat Reader
// Handles server communication (Firefox requires background script for cross-origin requests)

console.log('🔧 Background script loaded and ready');

// Test that we can log to console
browser.runtime.onInstalled.addListener(() => {
    console.log('✅ Extension installed/updated');
});

browser.runtime.onStartup.addListener(() => {
    console.log('✅ Extension started');
});

/**
 * Send chat message to server
 */
async function sendChatToServer(messageData) {
    console.log('📤 Background: Sending chat to server', messageData.id);
    try {
        const response = await fetch('http://localhost:3000/api/chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                id: messageData.id,
                username: messageData.username,
                text: messageData.text || '',
                textHtml: messageData.textHtml || '',
                avatar: messageData.avatar || '',
                timestamp: messageData.timestamp,
                timestampText: messageData.timestampText || '',
                badges: messageData.badges || null
            })
        });
        
        if (!response.ok) {
            const errorText = await response.text().catch(() => response.statusText);
            return {
                success: false,
                error: {
                    type: 'HTTP_ERROR',
                    status: response.status,
                    statusText: response.statusText,
                    body: errorText,
                    message: `HTTP ${response.status}: ${response.statusText}`
                }
            };
        }
        
        console.log('✅ Background: Chat sent successfully');
        return { success: true };
    } catch (error) {
        console.error('❌ Background: Error sending chat', error);
        // Determine error type
        let errorType = error.name || 'NETWORK_ERROR';
        let errorMessage = error.message || 'Connection failed';
        let diagnosticInfo = '';
        
        if (error.name === 'AbortError') {
            errorType = 'TIMEOUT_ERROR';
            errorMessage = 'Request timed out (server may not be running)';
            diagnosticInfo = 'Server did not respond within 5 seconds. Is the server running on port 3000?';
        } else if (error.message && error.message.includes('NetworkError')) {
            errorType = 'CORS_OR_NETWORK_ERROR';
            diagnosticInfo = 'Background script fetch failed. This could mean: 1) Server not running on port 3000, 2) Firewall blocking, 3) Extension permission issue. Check browser console (about:debugging) for background script logs.';
        } else if (error.message && error.message.includes('Failed to fetch')) {
            errorType = 'FETCH_FAILED';
            diagnosticInfo = 'Browser blocked the request. Could be: CORS, server down, or network issue.';
        }
        
        return {
            success: false,
            error: {
                type: errorType,
                message: errorMessage,
                diagnostic: diagnosticInfo,
                stack: error.stack || ''
            }
        };
    }
}

/**
 * Test server connection
 */
async function testServerConnection() {
    console.log('🔌 Background: Testing server connection');
    try {
        const startTime = Date.now();
        const response = await fetch('http://localhost:3000/api/chat', {
            method: 'GET'
        });
        const responseTime = Date.now() - startTime;
        console.log('📡 Background: GET response', response.status, responseTime + 'ms');
        
        if (response.ok) {
            // Test POST as well
            try {
                const postResponse = await fetch('http://localhost:3000/api/chat', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ id: 'test', username: 'test', text: 'test' })
                });
                
                if (postResponse.ok) {
                    return {
                        success: true,
                        message: `GET & POST working (${responseTime}ms)`,
                        responseTime: responseTime
                    };
                } else {
                    return {
                        success: false,
                        message: `GET OK, POST failed: ${postResponse.status}`,
                        responseTime: responseTime
                    };
                }
            } catch (postError) {
                return {
                    success: false,
                    message: `GET OK, POST blocked (likely CORS)`,
                    responseTime: responseTime
                };
            }
        } else {
            return {
                success: false,
                message: `Server returned ${response.status}`,
                responseTime: responseTime
            };
        }
    } catch (error) {
        console.error('❌ Background: Connection test failed', error);
        let errorMsg = 'Connection failed';
        if (error.name === 'AbortError') {
            errorMsg = 'Timeout - Server not responding';
        } else if (error.message && error.message.includes('NetworkError')) {
            errorMsg = 'NetworkError: Server may not be running or firewall blocking. Check: 1) Is server.js running? 2) Check browser console (about:debugging)';
        }
        
        return {
            success: false,
            message: errorMsg,
            error: error.message
        };
    }
}

// Listen for messages from content script
browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log('📨 Background: Received message', message.action);
    if (message.action === 'sendChat') {
        // Send chat to server
        sendChatToServer(message.data)
            .then(result => {
                sendResponse(result);
            })
            .catch(error => {
                sendResponse({
                    success: false,
                    error: {
                        type: 'UNEXPECTED_ERROR',
                        message: error.message || 'Unexpected error',
                        stack: error.stack || ''
                    }
                });
            });
        return true; // Indicates we will send a response asynchronously
    }
    
    if (message.action === 'testConnection') {
        // Test server connection
        testServerConnection()
            .then(result => {
                sendResponse(result);
            })
            .catch(error => {
                sendResponse({
                    success: false,
                    message: 'Test failed',
                    error: error.message
                });
            });
        return true; // Indicates we will send a response asynchronously
    }
    
    return false;
});

