/**
 * TimingManager - Manages time-related state
 * Single Responsibility: Track countdown, time multiplier, quarter timing
 * 
 * Extracted from StateManager to follow Single Responsibility Principle
 */

class TimingManager {
    constructor() {
        // Countdown state (for pregame)
        this.countdownInterval = null;
        this.countdownSeconds = 0;
        
        // Time tracking
        this.lastTimeMultiplier = 1;
        this.lastQuarter = null;
        this.virtualTimeOffset = 0;
        this.quarterStartTime = null;
    }

    /**
     * Start countdown interval
     * @param {Function} callback - Called every second with decremented seconds
     */
    startCountdown(callback) {
        if (this.countdownInterval) {
            this.stopCountdown();
        }

        this.countdownInterval = setInterval(() => {
            if (this.countdownSeconds > 0) {
                this.countdownSeconds--;
                callback(this.countdownSeconds);
            }
        }, 1000);
    }

    /**
     * Stop countdown interval
     */
    stopCountdown() {
        if (this.countdownInterval) {
            clearInterval(this.countdownInterval);
            this.countdownInterval = null;
        }
    }

    /**
     * Set countdown seconds
     * @param {number} seconds
     */
    setCountdownSeconds(seconds) {
        this.countdownSeconds = seconds;
    }

    /**
     * Get countdown seconds
     * @returns {number}
     */
    getCountdownSeconds() {
        return this.countdownSeconds;
    }

    /**
     * Check if countdown is active
     * @returns {boolean}
     */
    isCountdownActive() {
        return this.countdownInterval !== null;
    }

    /**
     * Get time multiplier
     * @returns {number}
     */
    getTimeMultiplier() {
        return this.lastTimeMultiplier;
    }

    /**
     * Set time multiplier
     * @param {number} multiplier
     */
    setTimeMultiplier(multiplier) {
        this.lastTimeMultiplier = multiplier;
    }

    /**
     * Get last quarter
     * @returns {string}
     */
    getLastQuarter() {
        return this.lastQuarter;
    }

    /**
     * Set last quarter
     * @param {string} quarter
     */
    setLastQuarter(quarter) {
        this.lastQuarter = quarter;
    }

    /**
     * Get virtual time offset
     * @returns {number}
     */
    getVirtualTimeOffset() {
        return this.virtualTimeOffset;
    }

    /**
     * Set virtual time offset
     * @param {number} offset
     */
    setVirtualTimeOffset(offset) {
        this.virtualTimeOffset = offset;
    }

    /**
     * Reset virtual time offset
     */
    resetVirtualTimeOffset() {
        this.virtualTimeOffset = 0;
    }

    /**
     * Get quarter start time
     * @returns {number}
     */
    getQuarterStartTime() {
        return this.quarterStartTime;
    }

    /**
     * Set quarter start time
     * @param {number} time
     */
    setQuarterStartTime(time) {
        this.quarterStartTime = time;
    }

    /**
     * Reset all timing state
     */
    reset() {
        this.stopCountdown();
        this.countdownSeconds = 0;
    }
}

