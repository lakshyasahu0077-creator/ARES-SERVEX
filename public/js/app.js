/**
 * ARES-SURVEX: Main Client Application Controller
 * Coordinates Map, Telemetry Streams, Life-Support Calculations, and Skeleton States
 */

const AresApp = {
  state: {
    sites: [],
    activeSiteId: 'jezero-crater',
    activeSite: null,
    telemetry: null,
    survivalMetrics: null,
    waypoints: [],
    samples: [],
    crewCount: 1,
    telemetryInterval: null,
    clockInterval: null,
    isLoadingTelemetry: true,
    isLoadingSamples: true
  },

  mapEngine: null,

  async init() {
    console.log('[ARES-SURVEX] Booting Mission Operations Console...');

    // 1. Start System Clocks
    this.startMissionClocks();

    // 2. Initialize Leaflet Surface Map
    this.initMap();

    // 3. Render Skeleton Loaders initially
    this.renderTelemetrySkeletons();
    this.renderSampleSkeletons();

    // 4. Fetch Core Planetary Datasets
    await this.loadInitialData();

    // 5. Setup UI Event Listeners
    this.setupEventListeners();

    // 6. Start Live Simulated Telemetry Stream (every 6 seconds)
    this.startTelemetryStream();

    console.log('[ARES-SURVEX] Mission Console Ready.');
  },

  startMissionClocks() {
    const solEl = document.getElementById('clock-sol');
    const mtcEl = document.getElementById('clock-mtc');
    const earthUtcEl = document.getElementById('clock-utc');

    this.clockInterval = setInterval(() => {
      const now = new Date();
      if (earthUtcEl) {
        earthUtcEl.textContent = now.toISOString().substring(11, 19) + ' UTC';
      }

      // Mars Coordinated Time calculation approximation
      // Mars sol is 24h 39m 35.244s (~1.02749 Earth days)
      const marsSeconds = (now.getUTCHours() * 3600 + now.getUTCMinutes() * 60 + now.getUTCSeconds()) * 0.9732;
      const mHours = String(Math.floor((marsSeconds / 3600) % 24)).padStart(2, '0');
      const mMins = String(Math.floor((marsSeconds / 60) % 60)).padStart(2, '0');
      const mSecs = String(Math.floor(marsSeconds % 60)).padStart(2, '0');

      if (mtcEl) {
        mtcEl.textContent = `${mHours}:${mMins}:${mSecs} MTC`;
      }
    }, 1000);
  },

  initMap() {
    this.mapEngine = new MarsSurfaceMap('mars-map-canvas', {
      onWaypointAdded: (wp) => this.addWaypoint(wp),
      onCoordsUpdate: (coords) => this.updateCoordsHud(coords)
    });
  },

  updateCoordsHud(coords) {
    const latEl = document.getElementById('hud-lat');
    const lonEl = document.getElementById('hud-lon');
    const elevEl = document.getElementById('hud-elev');

    if (latEl) latEl.textContent = `${coords.lat}°`;
    if (lonEl) lonEl.textContent = `${coords.lon}°`;
    if (elevEl) elevEl.textContent = `${coords.elevation_m} m`;
  },

  renderTelemetrySkeletons() {
    const container = document.getElementById('telemetry-ticker-content');
    if (!container) return;

    container.innerHTML = `
      <div class="skeleton skeleton-box" style="width: 140px; height: 22px;"></div>
      <div class="skeleton skeleton-box" style="width: 120px; height: 22px;"></div>
      <div class="skeleton skeleton-box" style="width: 130px; height: 22px;"></div>
      <div class="skeleton skeleton-box" style="width: 110px; height: 22px;"></div>
      <div class="skeleton skeleton-box" style="width: 150px; height: 22px;"></div>
      <div class="skeleton skeleton-box" style="width: 140px; height: 22px;"></div>
    `;
  },

  renderSampleSkeletons() {
    const container = document.getElementById('sample-list-container');
    if (!container) return;

    container.innerHTML = `
      <div class="sample-item skeleton" style="height: 52px; margin-bottom: 6px;"></div>
      <div class="sample-item skeleton" style="height: 52px; margin-bottom: 6px;"></div>
      <div class="sample-item skeleton" style="height: 52px;"></div>
    `;
  },

  async loadInitialData() {
    try {
      // Fetch sites list and survival specs in parallel
      const [sites, survivalMetrics] = await Promise.all([
        window.API.getSites(),
        window.API.getSurvivalMetrics()
      ]);

      this.state.sites = sites;
      this.state.survivalMetrics = survivalMetrics;

      // Populate Site Selector
      this.populateSiteSelector(sites);

      // Select default site
      await this.selectSite(this.state.activeSiteId);

      // Fetch science samples
      await this.loadSamples();
    } catch (err) {
      console.error('[ARES-SURVEX] Error loading initial mission data:', err);
    }
  },

  populateSiteSelector(sites) {
    const select = document.getElementById('site-select');
    if (!select) return;

    select.innerHTML = '';
    sites.forEach(s => {
      const opt = document.createElement('option');
      opt.value = s.id;
      opt.textContent = `${s.callsign} | ${s.name}`;
      select.appendChild(opt);
    });

    select.value = this.state.activeSiteId;
  },

  async selectSite(siteId) {
    this.state.activeSiteId = siteId;
    this.renderTelemetrySkeletons();

    const site = await window.API.getSiteDetails(siteId);
    if (!site) return;

    this.state.activeSite = site;

    // Update Masthead Sol
    const solEl = document.getElementById('clock-sol');
    if (solEl && site.telemetry_stream) {
      solEl.textContent = `SOL ${site.telemetry_stream.sol}`;
    }

    // Render Telemetry
    this.renderTelemetryTicker(site.telemetry_stream);

    // Update Map
    this.mapEngine.loadSite(site);

    // Reset waypoints and load starting base habitat as first waypoint
    this.clearWaypoints(false);
    if (site.base_station) {
      this.addWaypoint({
        lat: site.base_station.lat,
        lon: site.base_station.lon,
        name: `HAB: ${site.base_station.name}`,
        elevation_m: site.base_station.elevation_m
      });
    }

    // Filter samples for this site
    this.renderSamplesList();
  },

  renderTelemetryTicker(tel) {
    const container = document.getElementById('telemetry-ticker-content');
    if (!container || !tel) return;

    container.innerHTML = `
      <div class="ticker-item">
        <span class="ticker-key">AMB TEMP:</span>
        <span class="ticker-val ${tel.temp_c < -80 ? 'danger' : ''}">${tel.temp_c}°C</span>
      </div>
      <div class="ticker-item">
        <span class="ticker-key">SURF PRESS:</span>
        <span class="ticker-val">${tel.pressure_pa} Pa</span>
      </div>
      <div class="ticker-item">
        <span class="ticker-key">RADIATION:</span>
        <span class="ticker-val ${tel.radiation_msv_day > 1.0 ? 'warning' : ''}">${tel.radiation_msv_day} mSv/d</span>
      </div>
      <div class="ticker-item">
        <span class="ticker-key">DUST TAU (τ):</span>
        <span class="ticker-val ${tel.dust_optical_depth_tau > 1.0 ? 'warning' : ''}">${tel.dust_optical_depth_tau}</span>
      </div>
      <div class="ticker-item">
        <span class="ticker-key">WIND VECT:</span>
        <span class="ticker-val">${tel.wind_speed_mps} m/s @ ${tel.wind_direction_deg}°</span>
      </div>
      <div class="ticker-item">
        <span class="ticker-key">ORBITER RELAY:</span>
        <span class="ticker-val" style="color:var(--telemetry-blue)">${tel.active_orbiter} (${tel.comm_window_remaining_min}m LOS)</span>
      </div>
    `;
  },

  startTelemetryStream() {
    if (this.telemetryInterval) clearInterval(this.telemetryInterval);

    this.telemetryInterval = setInterval(async () => {
      if (!this.state.activeSiteId) return;
      const live = await window.API.getLiveTelemetry(this.state.activeSiteId);
      if (live) {
        this.renderTelemetryTicker(live);
      }
    }, 6000);
  },

  addWaypoint(wp) {
    // If not already in array
    this.state.waypoints.push(wp);
    this.mapEngine.updateWaypoints(this.state.waypoints);
    this.renderWaypointTable();
    this.recalculateRoute();
  },

  addPoiToRoute(poiId) {
    if (!this.state.activeSite || !this.state.activeSite.pois) return;
    const poi = this.state.activeSite.pois.find(p => p.id === poiId);
    if (!poi) return;

    this.addWaypoint({
      lat: poi.lat,
      lon: poi.lon,
      name: poi.name,
      elevation_m: poi.elevation_m
    });
  },

  removeWaypoint(index) {
    this.state.waypoints.splice(index, 1);
    this.mapEngine.updateWaypoints(this.state.waypoints);
    this.renderWaypointTable();
    this.recalculateRoute();
  },

  clearWaypoints(resetToHab = true) {
    this.state.waypoints = [];
    if (resetToHab && this.state.activeSite?.base_station) {
      const hab = this.state.activeSite.base_station;
      this.state.waypoints.push({
        lat: hab.lat,
        lon: hab.lon,
        name: `HAB: ${hab.name}`,
        elevation_m: hab.elevation_m
      });
    }
    this.mapEngine.updateWaypoints(this.state.waypoints);
    this.renderWaypointTable();
    this.recalculateRoute();
  },

  renderWaypointTable() {
    const tbody = document.getElementById('waypoint-table-body');
    const countEl = document.getElementById('waypoint-count');
    if (countEl) countEl.textContent = this.state.waypoints.length;

    if (!tbody) return;
    if (this.state.waypoints.length === 0) {
      tbody.innerHTML = `<tr><td colspan="4" style="text-align:center;color:var(--text-muted);padding:12px;">No waypoints plotted. Click map or select POI.</td></tr>`;
      return;
    }

    tbody.innerHTML = this.state.waypoints.map((wp, idx) => `
      <tr>
        <td style="font-weight:700;color:var(--mars-ochre)">WP-${idx + 1}</td>
        <td>${wp.name || 'Coord Point'}</td>
        <td>${wp.lat}°, ${wp.lon}°</td>
        <td style="text-align:right;">
          <button class="btn-aerospace sm danger" onclick="window.AresApp.removeWaypoint(${idx})">DEL</button>
        </td>
      </tr>
    `).join('');
  },

  async recalculateRoute() {
    const waypoints = this.state.waypoints;
    const base = this.state.activeSite?.base_station;

    // Fast preliminary calculation on client
    const clientCalc = window.EvaCalculator.quickEvaluateRoute(waypoints, base, this.state.crewCount);
    this.updateEvaDashboard(clientCalc);

    // If 2+ waypoints, trigger backend authoritative validation
    if (waypoints.length >= 2) {
      try {
        const backendResult = await window.API.calculateRoute(
          this.state.activeSiteId,
          waypoints,
          this.state.crewCount
        );
        if (backendResult) {
          this.updateEvaDashboardFromBackend(backendResult);
        }
      } catch (err) {
        console.warn('[ARES-SURVEX] Backend route calc note:', err.message);
      }
    }
  },

  updateEvaDashboard(calc) {
    // Total distance
    const distEl = document.getElementById('metric-total-dist');
    if (distEl) distEl.textContent = `${calc.totalDistanceKm} km`;

    // Duration
    const durEl = document.getElementById('metric-total-dur');
    if (durEl) durEl.textContent = `${calc.totalDurationMinutes} min`;

    // RTB Direct Distance
    const rtbDistEl = document.getElementById('metric-rtb-dist');
    if (rtbDistEl) rtbDistEl.textContent = `${calc.rtbDistanceKm} km (${calc.rtbDurationMinutes}m)`;

    // O2 Consumed
    const o2ValEl = document.getElementById('metric-o2-val');
    const o2BarEl = document.getElementById('gauge-o2-fill');
    const o2PctEl = document.getElementById('metric-o2-pct');
    if (o2ValEl) o2ValEl.textContent = `${calc.o2ConsumedLiters} L`;
    if (o2PctEl) o2PctEl.textContent = `${calc.o2MarginPercent}% MARGIN`;
    if (o2BarEl) {
      o2BarEl.style.width = `${Math.min(100, Math.max(0, calc.o2MarginPercent))}%`;
      o2BarEl.className = `gauge-bar-fill ${calc.o2MarginPercent < 20 ? 'red' : (calc.o2MarginPercent < 35 ? 'amber' : '')}`;
    }

    // Battery Consumed
    const batValEl = document.getElementById('metric-bat-val');
    const batBarEl = document.getElementById('gauge-bat-fill');
    const batPctEl = document.getElementById('metric-bat-pct');
    if (batValEl) batValEl.textContent = `${calc.batteryConsumedWh} Wh`;
    if (batPctEl) batPctEl.textContent = `${calc.batteryMarginPercent}% MARGIN`;
    if (batBarEl) {
      batBarEl.style.width = `${Math.min(100, Math.max(0, calc.batteryMarginPercent))}%`;
      batBarEl.className = `gauge-bar-fill ${calc.batteryMarginPercent < 20 ? 'red' : (calc.batteryMarginPercent < 35 ? 'amber' : '')}`;
    }

    // RTB Decision Banner
    const rtbBanner = document.getElementById('rtb-decision-banner');
    if (rtbBanner) {
      rtbBanner.className = `rtb-banner ${calc.rtbSafetyCode.toLowerCase()}`;
      rtbBanner.innerHTML = `
        <div class="rtb-title">
          <span>●</span> RTB STATUS: ${calc.rtbSafetyStatus}
        </div>
        <div class="rtb-message">${calc.advisoryMessage}</div>
      `;
    }
  },

  updateEvaDashboardFromBackend(res) {
    const s = res.summary;
    const c = res.consumables;
    const safe = res.safety_assessment;

    const distEl = document.getElementById('metric-total-dist');
    if (distEl) distEl.textContent = `${s.total_distance_km} km`;

    const durEl = document.getElementById('metric-total-dur');
    if (durEl) durEl.textContent = `${s.total_duration_minutes} min (+${s.total_ascent_m}m)`;

    const rtbDistEl = document.getElementById('metric-rtb-dist');
    if (rtbDistEl) rtbDistEl.textContent = `${s.rtb_direct_distance_km} km (${s.rtb_duration_minutes}m)`;

    const o2ValEl = document.getElementById('metric-o2-val');
    const o2BarEl = document.getElementById('gauge-o2-fill');
    const o2PctEl = document.getElementById('metric-o2-pct');
    if (o2ValEl) o2ValEl.textContent = `${c.outbound_o2_liters} L (RTB Res: ${c.rtb_reserved_o2_liters}L)`;
    if (o2PctEl) o2PctEl.textContent = `${c.o2_margin_percent}% MARGIN`;
    if (o2BarEl) {
      o2BarEl.style.width = `${Math.min(100, Math.max(0, c.o2_margin_percent))}%`;
      o2BarEl.className = `gauge-bar-fill ${c.o2_margin_percent < 20 ? 'red' : (c.o2_margin_percent < 35 ? 'amber' : '')}`;
    }

    const batValEl = document.getElementById('metric-bat-val');
    const batBarEl = document.getElementById('gauge-bat-fill');
    const batPctEl = document.getElementById('metric-bat-pct');
    if (batValEl) batValEl.textContent = `${c.outbound_battery_wh} Wh (RTB Res: ${c.rtb_reserved_battery_wh}Wh)`;
    if (batPctEl) batPctEl.textContent = `${c.battery_margin_percent}% MARGIN`;
    if (batBarEl) {
      batBarEl.style.width = `${Math.min(100, Math.max(0, c.battery_margin_percent))}%`;
      batBarEl.className = `gauge-bar-fill ${c.battery_margin_percent < 20 ? 'red' : (c.battery_margin_percent < 35 ? 'amber' : '')}`;
    }

    const rtbBanner = document.getElementById('rtb-decision-banner');
    if (rtbBanner) {
      rtbBanner.className = `rtb-banner ${safe.status_code.toLowerCase()}`;
      let hazardWarn = '';
      if (safe.detected_hazards && safe.detected_hazards.length > 0) {
        hazardWarn = `<div style="margin-top:4px;color:var(--telemetry-amber);font-size:9px;">
          ⚠️ PROXIMITY HAZARD DETECTED: ${safe.detected_hazards.map(h => `${h.name} (${h.proximity_m}m)`).join(', ')}
        </div>`;
      }
      rtbBanner.innerHTML = `
        <div class="rtb-title">
          <span>●</span> RTB STATUS: ${safe.status_label}
        </div>
        <div class="rtb-message">${safe.advisory_message}</div>
        ${hazardWarn}
      `;
    }
  },

  async loadSamples() {
    const samples = await window.API.getSamples();
    this.state.samples = samples;
    this.renderSamplesList();
  },

  renderSamplesList() {
    const container = document.getElementById('sample-list-container');
    const countEl = document.getElementById('sample-count');
    if (!container) return;

    // Filter samples for active site or all
    const filtered = this.state.samples.filter(
      s => !s.site_id || s.site_id === this.state.activeSiteId
    );

    if (countEl) countEl.textContent = filtered.length;

    if (filtered.length === 0) {
      container.innerHTML = `
        <div style="color:var(--text-muted);font-size:11px;padding:12px;text-align:center;">
          No field samples logged for this exploration sector.
        </div>
      `;
      return;
    }

    container.innerHTML = filtered.map(s => `
      <div class="sample-item">
        <div class="sample-item-header">
          <span class="sample-id-code">${s.id}</span>
          <span style="font-size:9px;color:var(--telemetry-green);">${s.tube_seal_status}</span>
        </div>
        <div style="font-weight:600;margin-top:2px;">${s.name}</div>
        <div class="sample-details">
          Lithology: <b>${s.rock_type}</b> | Mass: <b>${s.mass_grams}g</b>
        </div>
        <div class="sample-details" style="color:var(--text-muted);margin-top:2px;">
          ${s.scientific_significance}
        </div>
        <div class="sample-meta">
          <span>Coords: ${s.coordinates?.lat}°, ${s.coordinates?.lon}°</span>
          <button class="btn-aerospace sm danger" style="padding:1px 4px;font-size:8px;" onclick="window.AresApp.deleteSample('${s.id}')">PURGE</button>
        </div>
      </div>
    `).join('');
  },

  async deleteSample(sampleId) {
    if (!confirm(`Purge sample ${sampleId} from planetary hermetic registry?`)) return;
    try {
      await window.API.deleteSample(sampleId);
      this.state.samples = this.state.samples.filter(s => s.id !== sampleId);
      this.renderSamplesList();
    } catch (err) {
      alert(`Failed to delete sample: ${err.message}`);
    }
  },

  loadMissionPreset(presetName) {
    if (!this.state.activeSite) return;

    if (presetName === 'jezero-delta') {
      this.selectSite('jezero-crater').then(() => {
        this.clearWaypoints(false);
        const hab = this.state.activeSite.base_station;
        this.addWaypoint({ lat: hab.lat, lon: hab.lon, name: 'HAB Departure', elevation_m: hab.elevation_m });
        this.addWaypoint({ lat: 18.395, lon: 77.550, name: 'Three Forks Cache', elevation_m: -2520 });
        this.addWaypoint({ lat: 18.420, lon: 77.520, name: 'Neretva Delta Scarp', elevation_m: -2470 });
      });
    } else if (presetName === 'jezero-seitah') {
      this.selectSite('jezero-crater').then(() => {
        this.clearWaypoints(false);
        const hab = this.state.activeSite.base_station;
        this.addWaypoint({ lat: hab.lat, lon: hab.lon, name: 'HAB Departure', elevation_m: hab.elevation_m });
        this.addWaypoint({ lat: 18.365, lon: 77.545, name: 'Séítah Dunefield West', elevation_m: -2560 });
        this.addWaypoint({ lat: 18.350, lon: 77.510, name: 'Kodiak Butte Foot', elevation_m: -2450 });
      });
    } else if (presetName === 'gale-ridge') {
      this.selectSite('gale-crater').then(() => {
        this.clearWaypoints(false);
        const hab = this.state.activeSite.base_station;
        this.addWaypoint({ lat: hab.lat, lon: hab.lon, name: 'Bradbury Station', elevation_m: hab.elevation_m });
        this.addWaypoint({ lat: -4.575, lon: 137.460, name: 'Yellowknife Lakebed', elevation_m: -4520 });
        this.addWaypoint({ lat: -4.620, lon: 137.410, name: 'Vera Rubin Hematite Ridge', elevation_m: -4180 });
      });
    } else if (presetName === 'olympus-rim') {
      this.selectSite('olympus-mons').then(() => {
        this.clearWaypoints(false);
        const hab = this.state.activeSite.base_station;
        this.addWaypoint({ lat: hab.lat, lon: hab.lon, name: 'Daedalia Shelter', elevation_m: hab.elevation_m });
        this.addWaypoint({ lat: 18.660, lon: -133.830, name: 'Lava Tube Skylight Entrance', elevation_m: 21320 });
        this.addWaypoint({ lat: 18.680, lon: -133.780, name: 'Caldera Pit Rim Crest', elevation_m: 21100 });
      });
    }
  },

  setupEventListeners() {
    // Site select change
    const siteSelect = document.getElementById('site-select');
    if (siteSelect) {
      siteSelect.addEventListener('change', (e) => {
        this.selectSite(e.target.value);
      });
    }

    // Crew count input change
    const crewInput = document.getElementById('crew-count-input');
    if (crewInput) {
      crewInput.addEventListener('change', (e) => {
        this.state.crewCount = Math.max(1, parseInt(e.target.value, 10) || 1);
        this.recalculateRoute();
      });
    }

    // Clear Waypoints Button
    const clearBtn = document.getElementById('btn-clear-waypoints');
    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        if (confirm('Clear all plotted EVA waypoints?')) {
          this.clearWaypoints(true);
        }
      });
    }

    // Layer checkboxes
    const layerContour = document.getElementById('layer-toggle-contours');
    if (layerContour) {
      layerContour.addEventListener('change', (e) => this.mapEngine.toggleLayer('contours', e.target.checked));
    }
    const layerHazard = document.getElementById('layer-toggle-hazards');
    if (layerHazard) {
      layerHazard.addEventListener('change', (e) => this.mapEngine.toggleLayer('hazards', e.target.checked));
    }
    const layerScience = document.getElementById('layer-toggle-science');
    if (layerScience) {
      layerScience.addEventListener('change', (e) => this.mapEngine.toggleLayer('science', e.target.checked));
    }
    const layerSat = document.getElementById('layer-toggle-satellites');
    if (layerSat) {
      layerSat.addEventListener('change', (e) => this.mapEngine.toggleLayer('satellites', e.target.checked));
    }

    // Reset Map View Button
    const resetMapBtn = document.getElementById('btn-reset-map');
    if (resetMapBtn) {
      resetMapBtn.addEventListener('click', () => {
        if (this.state.activeSite?.coordinates) {
          this.mapEngine.map.setView(
            [this.state.activeSite.coordinates.lat, this.state.activeSite.coordinates.lon],
            12
          );
        }
      });
    }

    // Sample Modal Handlers
    const openSampleBtn = document.getElementById('btn-open-sample-modal');
    const sampleModal = document.getElementById('sample-modal');
    const closeSampleBtn = document.getElementById('btn-close-sample-modal');
    const sampleForm = document.getElementById('sample-entry-form');

    if (openSampleBtn && sampleModal) {
      openSampleBtn.addEventListener('click', () => {
        // Pre-fill coordinates with center or current waypoint
        const latInput = document.getElementById('sample-lat');
        const lonInput = document.getElementById('sample-lon');
        if (latInput && lonInput && this.state.activeSite) {
          const wp = this.state.waypoints[this.state.waypoints.length - 1] || this.state.activeSite.coordinates;
          latInput.value = wp.lat;
          lonInput.value = wp.lon;
        }
        sampleModal.classList.add('active');
      });
    }

    if (closeSampleBtn && sampleModal) {
      closeSampleBtn.addEventListener('click', () => {
        sampleModal.classList.remove('active');
      });
    }

    if (sampleForm && sampleModal) {
      sampleForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const submitBtn = sampleForm.querySelector('button[type="submit"]');
        submitBtn.disabled = true;
        submitBtn.textContent = 'SEALING SAMPLE TUBE...';

        try {
          const newSampleData = {
            site_id: this.state.activeSiteId,
            name: document.getElementById('sample-name').value,
            rock_type: document.getElementById('sample-rock-type').value,
            mineralogy: document.getElementById('sample-mineralogy').value,
            mass_grams: parseFloat(document.getElementById('sample-mass').value) || 45.0,
            lat: parseFloat(document.getElementById('sample-lat').value),
            lon: parseFloat(document.getElementById('sample-lon').value),
            scientific_significance: document.getElementById('sample-significance').value,
            logged_by: document.getElementById('sample-logged-by').value || 'EVA Lead Specialist'
          };

          const res = await window.API.createSample(newSampleData);
          if (res && res.sample) {
            this.state.samples.unshift(res.sample);
            this.renderSamplesList();
            sampleModal.classList.remove('active');
            sampleForm.reset();
          }
        } catch (err) {
          alert(`Failed to log sample: ${err.message}`);
        } finally {
          submitBtn.disabled = false;
          submitBtn.textContent = 'SECURE & LOG SAMPLE';
        }
      });
    }
  }
};

window.AresApp = AresApp;

// Auto-boot on DOMContentLoaded
document.addEventListener('DOMContentLoaded', () => {
  window.AresApp.init();
});
