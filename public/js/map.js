/**
 * ARES-SURVEX: Interactive Martian Surface Cartography & Tactical Overlay Engine
 * Uses Leaflet.js with authentic Mars coordinates, procedural raster fallback, and vector layers.
 */

class MarsSurfaceMap {
  constructor(containerId, options = {}) {
    this.containerId = containerId;
    this.map = null;
    this.activeSite = null;

    // Layer Groups
    this.layers = {
      baseStation: null,
      contours: null,
      hazards: null,
      science: null,
      satellites: null,
      route: null
    };

    // Layer visibility states
    this.visibility = {
      contours: true,
      hazards: true,
      science: true,
      satellites: true
    };

    this.waypoints = [];
    this.onWaypointAddedCallback = options.onWaypointAdded || null;
    this.onCoordsUpdateCallback = options.onCoordsUpdate || null;

    this.initMap();
  }

  initMap() {
    // Initialize Leaflet map with custom CRS or standard with Mars coordinates
    this.map = L.map(this.containerId, {
      center: [18.38, 77.58],
      zoom: 12,
      minZoom: 4,
      maxZoom: 17,
      zoomControl: false,
      attributionControl: false
    });

    // Custom tactical zoom control on top right
    L.control.zoom({ position: 'topright' }).addTo(this.map);

    // Initialize Mars surface tile layer:
    // 1. Primary: NASA / USGS Mars Astrogeology WMS or OpenPlanetary Mars Viking Tiles
    // 2. High-reliability fallback: Custom procedural Martian procedural canvas tile layer
    this.initMarsTileLayers();

    // Initialize empty feature groups
    this.layers.baseStation = L.layerGroup().addTo(this.map);
    this.layers.contours = L.layerGroup().addTo(this.map);
    this.layers.hazards = L.layerGroup().addTo(this.map);
    this.layers.science = L.layerGroup().addTo(this.map);
    this.layers.satellites = L.layerGroup().addTo(this.map);
    this.layers.route = L.layerGroup().addTo(this.map);

    // Map Event Listeners
    this.map.on('click', (e) => this.handleMapClick(e));
    this.map.on('mousemove', (e) => this.handleMouseMove(e));
  }

  initMarsTileLayers() {
    // Custom Procedural Mars Surface Canvas Grid Layer (guarantees 100% offline & instant reliability)
    const MarsCanvasLayer = L.GridLayer.extend({
      createTile: function (coords) {
        const tile = document.createElement('canvas');
        const ctx = tile.getContext('2d');
        const size = this.getTileSize();
        tile.width = size.x;
        tile.height = size.y;

        // Base Martian dark iron-oxide ground
        const xSeed = (coords.x * 13) % 256;
        const ySeed = (coords.y * 17) % 256;
        const baseHue = 18 + ((coords.x + coords.y) % 6);
        ctx.fillStyle = `hsl(${baseHue}, 36%, 14%)`;
        ctx.fillRect(0, 0, size.x, size.y);

        // Procedural regolith grain & subtle crater shading
        const step = 32;
        for (let x = 0; x < size.x; x += step) {
          for (let y = 0; y < size.y; y += step) {
            const val = ((x * 37 + y * 71 + coords.x * 101 + coords.y * 97) % 100) / 100;
            if (val > 0.6) {
              ctx.fillStyle = `rgba(200, 100, 40, ${val * 0.08})`;
              ctx.fillRect(x, y, step, step);
            } else if (val < 0.25) {
              ctx.fillStyle = `rgba(0, 0, 0, ${0.15 - val * 0.2})`;
              ctx.fillRect(x, y, step, step);
            }
          }
        }

        // Tactical 100m grid reticle lines
        ctx.strokeStyle = 'rgba(70, 90, 110, 0.12)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, 0); ctx.lineTo(size.x, 0);
        ctx.moveTo(0, 0); ctx.lineTo(0, size.y);
        ctx.stroke();

        // Subtle quadrant coordinate label on tile corner
        ctx.fillStyle = 'rgba(140, 160, 180, 0.25)';
        ctx.font = '8px monospace';
        ctx.fillText(`M-${coords.z}:${coords.x},${coords.y}`, 4, 12);

        return tile;
      }
    });

    // Add Mars procedural layer as base
    this.marsTileLayer = new MarsCanvasLayer({ tileSize: 256 });
    this.marsTileLayer.addTo(this.map);

    // Attempt to overlay USGS Mars MDIM2.1 WMS tile layer if connected
    try {
      const usgsWms = L.tileLayer.wms('https://planetarymaps.usgs.gov/cgi-bin/mapserv?map=/maps/mars/mars_simp_mdim.map', {
        layers: 'MDIM21_color',
        format: 'image/jpeg',
        transparent: true,
        opacity: 0.65,
        attribution: 'NASA/USGS Mars Astrogeology'
      });
      usgsWms.addTo(this.map);
    } catch (e) {
      console.warn('[Map] USGS WMS fallback to procedural canvas', e);
    }
  }

  loadSite(site) {
    this.activeSite = site;
    this.clearAllLayers();

    if (!site || !site.coordinates) return;

    // Pan map to site coordinates
    this.map.setView([site.coordinates.lat, site.coordinates.lon], 12);

    // 1. Render Base Station Habitat
    this.renderBaseStation(site.base_station);

    // 2. Render Elevation Contours
    this.renderElevationContours(site.elevation_contours, site.coordinates);

    // 3. Render Hazards
    this.renderHazards(site.hazards);

    // 4. Render Science POIs
    this.renderPois(site.pois);

    // 5. Render Active Satellite Uplink Cone
    this.renderSatelliteUplink(site.telemetry_stream, site.coordinates);
  }

  clearAllLayers() {
    Object.values(this.layers).forEach(layer => {
      if (layer) layer.clearLayers();
    });
  }

  renderBaseStation(station) {
    if (!station) return;

    // Custom SVG Base Station icon
    const habIcon = L.divIcon({
      className: 'custom-hab-icon',
      html: `
        <div style="
          width: 24px;
          height: 24px;
          background: #0d1116;
          border: 2px solid #388bfd;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #388bfd;
          font-weight: 700;
          font-size: 10px;
          font-family: monospace;
          box-shadow: 0 0 0 2px rgba(56, 139, 253, 0.25);
        ">HAB</div>
      `,
      iconSize: [24, 24],
      iconAnchor: [12, 12]
    });

    const marker = L.marker([station.lat, station.lon], { icon: habIcon });
    marker.bindPopup(`
      <div class="popup-title">${station.name}</div>
      <div class="popup-desc">Primary Surface Habitat & EVA Airlock</div>
      <div class="popup-specs">
        ID: <b>${station.id}</b><br>
        Elev: <b>${station.elevation_m} m</b> | Crew Cap: <b>${station.shelter_capacity}</b><br>
        O2 Recharge: <b>${station.o2_recharge_rate_lpm} L/min</b>
      </div>
    `);

    this.layers.baseStation.addLayer(marker);
  }

  renderElevationContours(contours, center) {
    if (!contours || !this.visibility.contours) return;

    // Generate concentric tactical contour elevation rings for display
    contours.forEach((c, idx) => {
      const radiusM = (idx + 1) * 750;
      const circle = L.circle([center.lat, center.lon], {
        radius: radiusM,
        color: '#388bfd',
        weight: 1,
        dashArray: '4, 4',
        fill: false,
        opacity: 0.4
      });

      circle.bindTooltip(`CONTOUR: ${c.label} (${c.level_m}m)`, {
        sticky: true,
        className: 'contour-tooltip'
      });

      this.layers.contours.addLayer(circle);
    });
  }

  renderHazards(hazards) {
    if (!hazards || !this.visibility.hazards) return;

    hazards.forEach(hz => {
      const isCritical = hz.severity === 'CRITICAL';
      const color = isCritical ? '#f85149' : '#d29922';

      // Warning circle zone
      const circle = L.circle([hz.lat, hz.lon], {
        radius: hz.radius_m,
        color: color,
        weight: 1.5,
        fillColor: color,
        fillOpacity: 0.18,
        dashArray: isCritical ? '6, 3' : '2, 4'
      });

      circle.bindPopup(`
        <div class="popup-title" style="color:${color}">⚠️ ${hz.name}</div>
        <div class="popup-desc">${hz.description}</div>
        <div class="popup-specs">
          TYPE: <b>${hz.type}</b><br>
          SEVERITY: <b>${hz.severity}</b><br>
          AVOIDANCE: <i>${hz.avoidance_advice}</i>
        </div>
      `);

      // Tactical Diamond Glyph Marker in center
      const hazardIcon = L.divIcon({
        className: 'custom-hazard-marker',
        html: `
          <div style="
            width: 14px;
            height: 14px;
            background: ${color};
            border: 1px solid #000;
            transform: rotate(45deg);
            display: flex;
            align-items: center;
            justify-content: center;
          "></div>
        `,
        iconSize: [14, 14],
        iconAnchor: [7, 7]
      });

      const marker = L.marker([hz.lat, hz.lon], { icon: hazardIcon });
      marker.bindPopup(circle.getPopup());

      this.layers.hazards.addLayer(circle);
      this.layers.hazards.addLayer(marker);
    });
  }

  renderPois(pois) {
    if (!pois || !this.visibility.science) return;

    pois.forEach(poi => {
      const isScience = poi.category === 'science';
      const color = isScience ? '#2ea043' : '#d97736';

      const poiIcon = L.divIcon({
        className: 'custom-poi-marker',
        html: `
          <div style="
            width: 18px;
            height: 18px;
            border: 2px solid ${color};
            background: #0d1116;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 8px;
            font-weight: 700;
            color: ${color};
            font-family: monospace;
          ">${isScience ? 'SC' : 'POI'}</div>
        `,
        iconSize: [18, 18],
        iconAnchor: [9, 9]
      });

      const marker = L.marker([poi.lat, poi.lon], { icon: poiIcon });
      marker.bindPopup(`
        <div class="popup-title">${poi.name}</div>
        <div class="popup-desc">${poi.description}</div>
        <div class="popup-specs">
          TARGET: <b>${poi.sample_target}</b><br>
          SLOPE: <b>${poi.slope_deg}°</b> (${poi.hazard_grade})<br>
          ELEVATION: <b>${poi.elevation_m} m</b>
        </div>
        <div style="margin-top:6px;">
          <button class="btn-aerospace sm primary" onclick="window.AresApp.addPoiToRoute('${poi.id}')">+ Add to EVA Route</button>
        </div>
      `);

      this.layers.science.addLayer(marker);
    });
  }

  renderSatelliteUplink(telemetry, center) {
    if (!telemetry || !this.visibility.satellites) return;

    // Render active satellite orbital cone
    const satCircle = L.circle([center.lat + 0.04, center.lon + 0.04], {
      radius: 2200,
      color: '#d29922',
      weight: 1,
      dashArray: '5, 5',
      fillColor: '#d29922',
      fillOpacity: 0.06
    });

    satCircle.bindPopup(`
      <div class="popup-title">🛰️ Satellite LOS Contact</div>
      <div class="popup-desc">Active Relay: <b>${telemetry.active_orbiter}</b></div>
      <div class="popup-specs">
        LOS Window Remaining: <b>${telemetry.comm_window_remaining_min} min</b><br>
        Uplink SNR: <b>${telemetry.uplink_signal_snr_db} dB</b>
      </div>
    `);

    this.layers.satellites.addLayer(satCircle);
  }

  toggleLayer(layerKey, isVisible) {
    this.visibility[layerKey] = isVisible;
    if (!this.map) return;

    if (layerKey === 'contours') {
      if (isVisible) {
        if (this.activeSite) this.renderElevationContours(this.activeSite.elevation_contours, this.activeSite.coordinates);
      } else {
        this.layers.contours.clearLayers();
      }
    } else if (layerKey === 'hazards') {
      if (isVisible) {
        if (this.activeSite) this.renderHazards(this.activeSite.hazards);
      } else {
        this.layers.hazards.clearLayers();
      }
    } else if (layerKey === 'science') {
      if (isVisible) {
        if (this.activeSite) this.renderPois(this.activeSite.pois);
      } else {
        this.layers.science.clearLayers();
      }
    } else if (layerKey === 'satellites') {
      if (isVisible) {
        if (this.activeSite) this.renderSatelliteUplink(this.activeSite.telemetry_stream, this.activeSite.coordinates);
      } else {
        this.layers.satellites.clearLayers();
      }
    }
  }

  handleMapClick(e) {
    const lat = Number(e.latlng.lat.toFixed(4));
    const lon = Number(e.latlng.lng.toFixed(4));

    if (this.onWaypointAddedCallback) {
      this.onWaypointAddedCallback({
        lat,
        lon,
        name: `WP-${this.waypoints.length + 1}`,
        elevation_m: this.activeSite?.coordinates?.elevation_m || -2500
      });
    }
  }

  handleMouseMove(e) {
    if (this.onCoordsUpdateCallback) {
      const lat = e.latlng.lat.toFixed(4);
      const lon = e.latlng.lng.toFixed(4);
      // Rough elevation approximation
      const elev = (this.activeSite?.coordinates?.elevation_m || -2500) + Math.round((Math.sin(e.latlng.lat * 50) + Math.cos(e.latlng.lng * 50)) * 60);
      this.onCoordsUpdateCallback({ lat, lon, elevation_m: elev });
    }
  }

  updateWaypoints(waypoints) {
    this.waypoints = waypoints;
    this.layers.route.clearLayers();

    if (!waypoints || waypoints.length === 0) return;

    const latlngs = [];

    // Plot waypoint markers
    waypoints.forEach((wp, idx) => {
      const pos = [wp.lat, wp.lon];
      latlngs.push(pos);

      const isFirst = idx === 0;
      const isLast = idx === waypoints.length - 1;
      const markerColor = isFirst ? '#388bfd' : (isLast ? '#f85149' : '#d97736');

      const wpIcon = L.divIcon({
        className: 'route-wp-marker',
        html: `
          <div style="
            width: 20px;
            height: 20px;
            background: #0d1116;
            border: 2px solid ${markerColor};
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 9px;
            font-weight: 700;
            color: ${markerColor};
            font-family: monospace;
          ">${idx + 1}</div>
        `,
        iconSize: [20, 20],
        iconAnchor: [10, 10]
      });

      const marker = L.marker(pos, { icon: wpIcon });
      marker.bindPopup(`
        <div class="popup-title">Waypoint ${idx + 1}: ${wp.name || 'EVA Point'}</div>
        <div class="popup-specs">
          Lat: <b>${wp.lat}°</b> | Lon: <b>${wp.lon}°</b><br>
          Elev: <b>${wp.elevation_m || 'N/A'} m</b>
        </div>
        <div style="margin-top:6px;">
          <button class="btn-aerospace sm danger" onclick="window.AresApp.removeWaypoint(${idx})">Remove</button>
        </div>
      `);

      this.layers.route.addLayer(marker);
    });

    // Draw main route polyline if at least 2 points
    if (latlngs.length >= 2) {
      const routeLine = L.polyline(latlngs, {
        color: '#d97736',
        weight: 3,
        opacity: 0.9,
        lineCap: 'square',
        lineJoin: 'miter'
      });
      this.layers.route.addLayer(routeLine);

      // Draw dashed Return-to-Base (RTB) vector from last point back to Base Station (or WP1)
      const basePoint = this.activeSite?.base_station
        ? [this.activeSite.base_station.lat, this.activeSite.base_station.lon]
        : latlngs[0];

      const rtbLine = L.polyline([latlngs[latlngs.length - 1], basePoint], {
        color: '#f85149',
        weight: 1.5,
        opacity: 0.75,
        dashArray: '4, 4'
      });
      this.layers.route.addLayer(rtbLine);
    }
  }
}

window.MarsSurfaceMap = MarsSurfaceMap;
