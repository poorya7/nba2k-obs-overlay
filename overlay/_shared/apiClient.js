/**
 * Shared API Client
 * Handles all server API communication with consistent error handling
 */

class ApiClient {
  /**
   * Generic GET request
   * @param {string} endpoint 
   * @returns {Promise<Object>}
   */
  async get(endpoint) {
    try {
      const response = await fetch(endpoint);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.json();
    } catch (error) {
      return null;
    }
  }

  /**
   * Generic POST request
   * @param {string} endpoint 
   * @param {Object} data 
   * @returns {Promise<Object>}
   */
  async post(endpoint, data) {
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.json();
    } catch (error) {
      return null;
    }
  }

  // ==================== Specific API Methods ====================

  async getSelectedGame() {
    return this.get('/api/selected-game');
  }

  async setSelectedGame(gameId) {
    return this.post('/api/selected-game', { gameId });
  }

  async getSimulation() {
    return this.get('/api/simulation');
  }

  async setSimulation(updates) {
    return this.post('/api/simulation', updates);
  }

  async getQuarter() {
    return this.get('/api/quarter');
  }

  async setQuarter(quarter) {
    return this.post('/api/quarter', { quarter });
  }
}

