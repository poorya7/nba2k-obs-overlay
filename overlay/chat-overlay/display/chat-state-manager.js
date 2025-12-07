/**
 * ChatStateManager - Manages chat overlay state
 * Single Responsibility: Track staging state, message list, timers
 */

class ChatStateManager {
    constructor() {
        // Message tracking
        this.messagesList = [];
        this.msgIdx = 0;
        
        // User color mapping (username -> color)
        this.userColorMap = new Map();
        
        // Staging state
        this.isStaging = false;
        this.stagedMessage = null;
        this.messageStagedTime = null; // When profile pic appears
        this.stageStartTime = null; // When stage timer starts (after bubble delay)
        this.timeRemaining = null;
        
        // Timers
        this.currentStageTimeout = null;
        this.transitionToListFunc = null;
        
        // Pause state
        this.isPaused = false;
    }
    
    // Message list management
    getMessagesList() {
        return this.messagesList;
    }
    
    addToMessagesList(messageEl) {
        this.messagesList.push(messageEl);
    }
    
    removeFromMessagesList(index) {
        return this.messagesList.splice(index, 1)[0];
    }
    
    shiftMessagesList() {
        return this.messagesList.shift();
    }
    
    clearMessagesList() {
        this.messagesList.length = 0;
    }
    
    // Message index
    getMsgIdx() {
        return this.msgIdx;
    }
    
    incrementMsgIdx() {
        this.msgIdx++;
    }
    
    // User color mapping
    getUserColor(username) {
        return this.userColorMap.get(username);
    }
    
    setUserColor(username, color) {
        this.userColorMap.set(username, color);
    }
    
    clearUserColorMap() {
        this.userColorMap.clear();
    }
    
    // Staging state
    getIsStaging() {
        return this.isStaging;
    }
    
    setIsStaging(value) {
        this.isStaging = value;
    }
    
    getStagedMessage() {
        return this.stagedMessage;
    }
    
    setStagedMessage(messageEl) {
        this.stagedMessage = messageEl;
    }
    
    clearStagedMessage() {
        this.stagedMessage = null;
    }
    
    getMessageStagedTime() {
        return this.messageStagedTime;
    }
    
    setMessageStagedTime(time) {
        this.messageStagedTime = time;
    }
    
    getStageStartTime() {
        return this.stageStartTime;
    }
    
    setStageStartTime(time) {
        this.stageStartTime = time;
    }
    
    getTimeRemaining() {
        return this.timeRemaining;
    }
    
    setTimeRemaining(time) {
        this.timeRemaining = time;
    }
    
    // Timers
    getCurrentStageTimeout() {
        return this.currentStageTimeout;
    }
    
    setCurrentStageTimeout(timeout) {
        this.currentStageTimeout = timeout;
    }
    
    clearCurrentStageTimeout() {
        this.currentStageTimeout = null;
    }
    
    getTransitionToListFunc() {
        return this.transitionToListFunc;
    }
    
    setTransitionToListFunc(func) {
        this.transitionToListFunc = func;
    }
    
    // Pause state
    getIsPaused() {
        return this.isPaused;
    }
    
    setIsPaused(value) {
        this.isPaused = value;
    }
    
    // Reset all staging-related state
    resetStagingState() {
        this.isStaging = false;
        this.currentStageTimeout = null;
        this.messageStagedTime = null;
        this.stageStartTime = null;
        this.timeRemaining = null;
    }
}

