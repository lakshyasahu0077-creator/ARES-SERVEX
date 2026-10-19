/**
 * ARES-SURVEX: API Client Module
 * Communicates with the Express.js Mission Operations Backend
 */

const API = {
  baseUrl: window.location.origin,

  /**
   * Fetch system status and active mission info
   */
  async getStatus() {
    try {
      const res = await fetch(`${this.baseUrl}/api/status`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (err) {
      console.error('[API] getStatus error:', err);
      return null;
    }
  },

  /**
   * Fetch list of exploration sites
   */
  async getSites() {
    try {
      const res = await fetch(`${this.baseUrl}/api/sites`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      return data.sites || [];
    } catch (err) {
      console.error('[API] getSites error:', err);
      return [];
    }
  },

  /**
   * Fetch detailed data for a specific site
   */
  async getSiteDetails(siteId) {
    try {
      const res = await fetch(`${this.baseUrl}/api/sites/${encodeURIComponent(siteId)}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (err) {
      console.error(`[API] getSiteDetails(${siteId}) error:`, err);
      return null;
    }
  },

  /**
   * Fetch live simulated telemetry for a site
   */
  async getLiveTelemetry(siteId) {
    try {
      const res = await fetch(`${this.baseUrl}/api/sites/${encodeURIComponent(siteId)}/telemetry`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (err) {
      console.error(`[API] getLiveTelemetry error:`, err);
      return null;
    }
  },

  /**
   * Fetch survival metrics and PLSS specs
   */
  async getSurvivalMetrics() {
    try {
      const res = await fetch(`${this.baseUrl}/api/survival-metrics`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (err) {
      console.error('[API] getSurvivalMetrics error:', err);
      return null;
    }
  },

  /**
   * Calculate EVA Route traverse, life support drain, and RTB safety threshold
   */
  async calculateRoute(siteId, waypoints, crewCount = 1) {
    try {
      const res = await fetch(`${this.baseUrl}/api/route/calculate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          site_id: siteId,
          waypoints,
          crew_count: crewCount
        })
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `HTTP ${res.status}`);
      }
      return await res.json();
    } catch (err) {
      console.error('[API] calculateRoute error:', err);
      throw err;
    }
  },

  /**
   * Fetch planetary science sample registry
   */
  async getSamples(siteId = '') {
    try {
      const url = siteId
        ? `${this.baseUrl}/api/samples?site_id=${encodeURIComponent(siteId)}`
        : `${this.baseUrl}/api/samples`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      return data.samples || [];
    } catch (err) {
      console.error('[API] getSamples error:', err);
      return [];
    }
  },

  /**
   * Log new planetary science sample
   */
  async createSample(sampleData) {
    try {
      const res = await fetch(`${this.baseUrl}/api/samples`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sampleData)
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `HTTP ${res.status}`);
      }
      return await res.json();
    } catch (err) {
      console.error('[API] createSample error:', err);
      throw err;
    }
  },

  /**
   * Purge sample record
   */
  async deleteSample(sampleId) {
    try {
      const res = await fetch(`${this.baseUrl}/api/samples/${encodeURIComponent(sampleId)}`, {
        method: 'DELETE'
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (err) {
      console.error('[API] deleteSample error:', err);
      throw err;
    }
  }
};

window.API = API;
