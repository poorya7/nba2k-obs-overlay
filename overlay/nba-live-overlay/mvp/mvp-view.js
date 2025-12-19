/**
 * MvpView - Handles MVP player section animations and updates
 * Single Responsibility: MVP view layer only
 * 
 * Usage:
 *   const mvpView = new MvpView();
 *   mvpView.show(playerData);
 *   mvpView.hide();
 *   mvpView.updatePlayer(playerData);
 */

// MVP Animation timing constants (all in milliseconds)
// These values were carefully tuned and should not be changed
const MVP_ANIMATION_TIMING = {
    // Opening sequence
    BOX_EXPAND_DURATION: 500,
    CONTENT_DELAY: 300,
    CONTENT_FADE_IN_DURATION: 300,
    SLIDE_AMOUNT_PX: 15,
    
    // Closing sequence
    CONTENT_FADE_OUT_DURATION: 350,
    BOX_SHRINK_DELAY: 300,
    BOX_SHRINK_DURATION: 500,
    
    // Layout constants
    MVP_SECTION_HEIGHT: 140,
    MVP_SECTION_PADDING_TOP: 4,
    MVP_SECTION_PADDING_BOTTOM: 4,
    MVP_SECTION_MARGIN_TOP: 4
};

class MvpView {
    constructor() {
        // Cache DOM elements for performance
        this.elements = {
            mvpSection: document.querySelector('.mvp-section'),
            mvpContent: document.querySelector('.mvp-content'),
            playerPic: document.querySelector('.mvp-content .player-pic'),
            playerName: document.querySelector('.mvp-content .player-name'),
            playerTeamLogo: document.querySelector('.mvp-content .player-team-logo'),
            statValues: {
                pts: document.querySelector('.mvp-content .stat-value[data-stat="pts"]'),
                reb: document.querySelector('.mvp-content .stat-value[data-stat="reb"]'),
                ast: document.querySelector('.mvp-content .stat-value[data-stat="ast"]')
            }
        };
        
        // Validate critical DOM elements exist
        if (!this.elements.mvpSection) {
            throw new Error('MvpView: .mvp-section element not found in DOM');
        }
        if (!this.elements.mvpContent) {
            throw new Error('MvpView: .mvp-content element not found in DOM');
        }
        
        this.isVisible = false;
        this._initializeHiddenState();
    }

    /**
     * Initialize MVP section in hidden state
     * @private
     */
    _initializeHiddenState() {
        if (!this.elements.mvpSection || !this.elements.mvpContent) return;
        
        const section = this.elements.mvpSection;
        const content = this.elements.mvpContent;
        
        section.style.height = '0px';
        section.style.paddingTop = '0px';
        section.style.paddingBottom = '0px';
        section.style.marginTop = '0px';
        section.style.borderTop = 'none';
        content.style.opacity = '0';
        content.style.transform = `translateX(-${MVP_ANIMATION_TIMING.SLIDE_AMOUNT_PX}px)`;
    }

    /**
     * Show MVP section with animation
     * @param {Object} playerData - Player data object
     * @param {string} playerData.name - Player name
     * @param {string} playerData.photoUrl - Player photo URL
     * @param {number} playerData.pts - Points
     * @param {number} playerData.reb - Rebounds
     * @param {number} playerData.ast - Assists
     * @returns {void}
     */
    show(playerData) {
        if (!this.elements.mvpSection || !this.elements.mvpContent) {
            // View layer: throw error up to controller
            throw new Error('MvpView: MVP DOM elements not found');
        }

        // Update player data first
        if (playerData) {
            this.updatePlayer(playerData);
        }

        const section = this.elements.mvpSection;
        const content = this.elements.mvpContent;
        const timing = MVP_ANIMATION_TIMING;

        // Step 1: Expand box
        section.style.transition = `height ${timing.BOX_EXPAND_DURATION}ms ease-out, padding-top ${timing.BOX_EXPAND_DURATION}ms ease-out, padding-bottom ${timing.BOX_EXPAND_DURATION}ms ease-out, margin-top ${timing.BOX_EXPAND_DURATION}ms ease-out`;
        section.style.height = `${timing.MVP_SECTION_HEIGHT}px`;
        section.style.paddingTop = `${timing.MVP_SECTION_PADDING_TOP}px`;
        section.style.paddingBottom = `${timing.MVP_SECTION_PADDING_BOTTOM}px`;
        section.style.marginTop = `${timing.MVP_SECTION_MARGIN_TOP}px`;
        section.style.borderTop = '1px solid rgba(59, 130, 246, 0.3)';

        // Step 2: Fade in content with slide (after delay)
        setTimeout(() => {
            content.style.transition = `opacity ${timing.CONTENT_FADE_IN_DURATION}ms ease-in, transform ${timing.CONTENT_FADE_IN_DURATION}ms ease-out`;
            content.style.opacity = '1';
            content.style.transform = 'translateX(0)';
        }, timing.CONTENT_DELAY);

        this.isVisible = true;
    }

    /**
     * Hide MVP section with animation
     * @returns {void}
     */
    hide() {
        if (!this.elements.mvpSection || !this.elements.mvpContent) {
            // View layer: throw error up to controller
            throw new Error('MvpView: MVP DOM elements not found');
        }

        const section = this.elements.mvpSection;
        const content = this.elements.mvpContent;
        const timing = MVP_ANIMATION_TIMING;

        // Step 1: Set transition FIRST
        content.style.transition = `opacity ${timing.CONTENT_FADE_OUT_DURATION}ms ease-in`;
        
        // Force reflow to ensure transition is applied
        void content.offsetWidth;
        
        // Step 2: Now change opacity (will animate)
        content.style.opacity = '0';

        // Step 3: Collapse box (after delay)
        setTimeout(() => {
            section.style.transition = `height ${timing.BOX_SHRINK_DURATION}ms ease-out, padding-top ${timing.BOX_SHRINK_DURATION}ms ease-out, padding-bottom ${timing.BOX_SHRINK_DURATION}ms ease-out, margin-top ${timing.BOX_SHRINK_DURATION}ms ease-out`;
            section.style.height = '0px';
            section.style.paddingTop = '0px';
            section.style.paddingBottom = '0px';
            section.style.marginTop = '0px';
            section.style.borderTop = 'none';
        }, timing.BOX_SHRINK_DELAY);

        // Step 3: Reset position for next opening (after box is fully collapsed)
        setTimeout(() => {
            content.style.transform = `translateX(-${timing.SLIDE_AMOUNT_PX}px)`;
        }, timing.BOX_SHRINK_DELAY + timing.BOX_SHRINK_DURATION);

        this.isVisible = false;
    }

    /**
     * Update player data without animation
     * @param {Object} playerData - Player data object
     */
    updatePlayer(playerData) {
        if (!playerData) return;

        // Update player photo
        if (playerData.photoUrl && this.elements.playerPic) {
            this.elements.playerPic.src = playerData.photoUrl;
            this.elements.playerPic.alt = playerData.name || 'MVP Player';
        }

        // Update team logo
        if (playerData.teamLogo && this.elements.playerTeamLogo) {
            this.elements.playerTeamLogo.src = playerData.teamLogo;
            this.elements.playerTeamLogo.alt = playerData.teamAbbr || 'Team';
        }

        // Update player name with dynamic font sizing
        if (playerData.name && this.elements.playerName) {
            this.elements.playerName.textContent = playerData.name;
        }

        // Update stats
        if (playerData.pts !== undefined && this.elements.statValues.pts) {
            this.elements.statValues.pts.textContent = playerData.pts;
        }
        if (playerData.reb !== undefined && this.elements.statValues.reb) {
            this.elements.statValues.reb.textContent = playerData.reb;
        }
        if (playerData.ast !== undefined && this.elements.statValues.ast) {
            this.elements.statValues.ast.textContent = playerData.ast;
        }
    }

    /**
     * Get current visibility state
     * @returns {boolean} True if visible
     */
    getVisibility() {
        return this.isVisible;
    }
}

