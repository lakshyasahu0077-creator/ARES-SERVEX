const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Data paths
const DATA_DIR = path.join(__dirname, 'data');
const SITES_FILE = path.join(DATA_DIR, 'mars_sites.json');
const SURVIVAL_FILE = path.join(DATA_DIR, 'survival_metrics.json');
const SAMPLES_FILE = path.join(DATA_DIR, 'sample_registry.json');

// Helper to read JSON data safely
function loadJson(filePath) {
  try {
    const raw = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(raw);
  } catch (err) {
    console.error(`Error reading ${filePath}:`, err.message);
    return null;
  }
}

// Helper to save JSON data safely
function saveJson(filePath, data) {
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
    return true;
  } catch (err) {
    console.error(`Error saving ${filePath}:`, err.message);
    return false;
  }
}

// Mars Physical Constants
const MARS_MEAN_RADIUS_KM = 3389.5; // Mars volumetric mean radius in km

// Haversine distance formula adapted for Mars
function calculateMarsDistanceKm(lat1, lon1, lat2, lon2) {
  const toRad = deg => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const rLat1 = toRad(lat1);
  const rLat2 = toRad(lat2);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(rLat1) * Math.cos(rLat2) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return MARS_MEAN_RADIUS_KM * c;
}

// --- REST API ENDPOINTS ---

// 1. System Health & Mission Metadata
app.get('/api/status', (req, res) => {
  res.json({
    system: 'ARES-SURVEX Planetary EVA Cartography Server',
    status: 'ONLINE',
    version: '1.0.0-PROD',
    mars_datum: 'IAU 2000 Mars Spheroid (R=3389.5km)',
    active_mission: 'ARES-IV Joint Planetary Science Expedition',
    server_time_utc: new Date().toISOString(),
    uptime_seconds: Math.floor(process.uptime())
  });
});

// 2. Exploration Sites List
app.get('/api/sites', (req, res) => {
  const sitesData = loadJson(SITES_FILE);
  if (!sitesData || !sitesData.sites) {
    return res.status(500).json({ error: 'Failed to load Mars sites dataset' });
  }

  // Return summary catalog
  const catalog = sitesData.sites.map(s => ({
    id: s.id,
    name: s.name,
    callsign: s.callsign,
    coordinates: s.coordinates,
    quadrangle: s.quadrangle,
    surface_type: s.surface_type,
    base_station: s.base_station,
    poi_count: s.pois.length,
    hazard_count: s.hazards.length
  }));

  res.json({ sites: catalog });
});

// 3. Specific Exploration Site Details
app.get('/api/sites/:id', (req, res) => {
  const sitesData = loadJson(SITES_FILE);
  if (!sitesData || !sitesData.sites) {
    return res.status(500).json({ error: 'Failed to load Mars sites dataset' });
  }

  const site = sitesData.sites.find(s => s.id === req.params.id);
  if (!site) {
    return res.status(404).json({ error: `Site '${req.params.id}' not found in planetary database` });
  }

  res.json(site);
});

// 4. Live Simulated Telemetry for Site
app.get('/api/sites/:id/telemetry', (req, res) => {
  const sitesData = loadJson(SITES_FILE);
  const site = sitesData?.sites?.find(s => s.id === req.params.id);
  if (!site) {
    return res.status(404).json({ error: 'Site not found' });
  }

  // Add realistic micro-variations to simulate sensor telemetry jitter
  const jitter = (range) => (Math.random() - 0.5) * range;
  const baseTel = site.telemetry_stream;

  const live = {
    ...baseTel,
    temp_c: Number((baseTel.temp_c + jitter(0.4)).toFixed(1)),
    pressure_pa: Math.round(baseTel.pressure_pa + jitter(2)),
    radiation_msv_day: Number((baseTel.radiation_msv_day + jitter(0.02)).toFixed(2)),
    dust_optical_depth_tau: Number((baseTel.dust_optical_depth_tau + jitter(0.01)).toFixed(2)),
    wind_speed_mps: Number((baseTel.wind_speed_mps + jitter(0.6)).toFixed(1)),
    timestamp_utc: new Date().toISOString()
  };

  res.json(live);
});

// 5. Survival Metrics & PLSS Limits
app.get('/api/survival-metrics', (req, res) => {
  const survivalData = loadJson(SURVIVAL_FILE);
  if (!survivalData) {
    return res.status(500).json({ error: 'Failed to load survival metrics' });
  }
  res.json(survivalData);
});

// 6. EVA Route Calculator (Complex Life Support & Hazards Intersect)
app.post('/api/route/calculate', (req, res) => {
  const { site_id, waypoints, crew_count = 1 } = req.body;

  if (!waypoints || !Array.isArray(waypoints) || waypoints.length < 2) {
    return res.status(400).json({
      error: 'At least 2 waypoints (starting point and destination) are required to compute an EVA traverse path.'
    });
  }

  const sitesData = loadJson(SITES_FILE);
  const survivalData = loadJson(SURVIVAL_FILE);

  const site = sitesData?.sites?.find(s => s.id === site_id) || sitesData?.sites?.[0];
  const suitSpecs = survivalData?.suit_specifications || {
    nominal_walking_speed_kmh: 3.2,
    plss_battery_usable_wh: 765,
    primary_o2_tank_liters_stp: 720,
    emergency_reserve_o2_liters: 180
  };
  const metabolic = survivalData?.metabolic_rates || {};
  const power = survivalData?.power_consumption_watts || {};

  let totalDistanceKm = 0;
  let totalAscentMeters = 0;
  let totalDescentMeters = 0;
  let segments = [];
  let detectedHazards = [];

  for (let i = 0; i < waypoints.length - 1; i++) {
    const p1 = waypoints[i];
    const p2 = waypoints[i + 1];

    const distKm = calculateMarsDistanceKm(p1.lat, p1.lon, p2.lat, p2.lon);
    totalDistanceKm += distKm;

    const elev1 = p1.elevation_m !== undefined ? p1.elevation_m : (site?.coordinates?.elevation_m || -2500);
    const elev2 = p2.elevation_m !== undefined ? p2.elevation_m : (site?.coordinates?.elevation_m || -2500);
    const elevDiff = elev2 - elev1;

    if (elevDiff > 0) totalAscentMeters += elevDiff;
    else totalDescentMeters += Math.abs(elevDiff);

    // Approximate slope angle
    const horizDistM = Math.max(distKm * 1000, 1);
    const slopeDeg = Number(((Math.atan(Math.abs(elevDiff) / horizDistM) * 180) / Math.PI).toFixed(1));

    // Dynamic walking speed on Mars based on slope and terrain
    let speedKmh = suitSpecs.nominal_walking_speed_kmh;
    if (slopeDeg > 15) speedKmh = suitSpecs.steep_slope_speed_kmh;
    else if (slopeDeg > 8) speedKmh = suitSpecs.rough_terrain_speed_kmh;

    const segmentDurationHours = distKm / Math.max(speedKmh, 0.5);

    // Metabolic O2 rate for this segment
    let o2RatePerHour = metabolic.nominal_walk_flat?.o2_liters_per_hour || 69.0;
    if (slopeDeg > 15) o2RatePerHour = metabolic.steep_ascent_over_15_deg?.o2_liters_per_hour || 132.0;
    else if (slopeDeg > 5) o2RatePerHour = metabolic.moderate_grade_5_15_deg?.o2_liters_per_hour || 96.0;

    const segmentO2Liters = o2RatePerHour * segmentDurationHours;

    // Battery draw (Avionics 42W + LCVG pump 38W + metabolic cooling factor + heaters 45W)
    const baseWatts = 42 + 38 + 45;
    const coolingFactorWatts = (o2RatePerHour / 69.0) * 18.0;
    const totalWatts = baseWatts + coolingFactorWatts;
    const segmentBatteryWh = totalWatts * segmentDurationHours;

    segments.push({
      segment_index: i + 1,
      from_name: p1.name || `Waypoint ${i + 1}`,
      to_name: p2.name || `Waypoint ${i + 2}`,
      distance_km: Number(distKm.toFixed(3)),
      slope_deg: slopeDeg,
      speed_kmh: Number(speedKmh.toFixed(1)),
      duration_minutes: Number((segmentDurationHours * 60).toFixed(1)),
      o2_consumed_liters: Number(segmentO2Liters.toFixed(2)),
      battery_wh: Number(segmentBatteryWh.toFixed(1))
    });

    // Check intersection with site hazards
    if (site && site.hazards) {
      site.hazards.forEach(hz => {
        // Distance from midpoint of segment to hazard
        const midLat = (p1.lat + p2.lat) / 2;
        const midLon = (p1.lon + p2.lon) / 2;
        const distToHazM = calculateMarsDistanceKm(midLat, midLon, hz.lat, hz.lon) * 1000;
        if (distToHazM <= (hz.radius_m + 150)) {
          if (!detectedHazards.find(d => d.id === hz.id)) {
            detectedHazards.push({
              id: hz.id,
              name: hz.name,
              type: hz.type,
              severity: hz.severity,
              description: hz.description,
              avoidance_advice: hz.avoidance_advice,
              proximity_m: Math.round(distToHazM)
            });
          }
        }
      });
    }
  }

  const totalDurationMinutes = segments.reduce((sum, s) => sum + s.duration_minutes, 0);
  const totalO2Liters = segments.reduce((sum, s) => sum + s.o2_consumed_liters, 0) * crew_count;
  const totalBatteryWh = segments.reduce((sum, s) => sum + s.battery_wh, 0);

  // RTB (Return to Base) Calculation from final waypoint back to Base Station
  const lastWp = waypoints[waypoints.length - 1];
  const baseCoords = site?.base_station || waypoints[0];
  const rtbDistanceKm = calculateMarsDistanceKm(lastWp.lat, lastWp.lon, baseCoords.lat, baseCoords.lon);
  const rtbDurationMinutes = (rtbDistanceKm / suitSpecs.nominal_walking_speed_kmh) * 60;
  const rtbO2Liters = (metabolic.nominal_walk_flat?.o2_liters_per_hour || 69.0) * (rtbDurationMinutes / 60) * crew_count;
  const rtbBatteryWh = (125 * (rtbDurationMinutes / 60));

  const totalRequiredO2 = totalO2Liters + rtbO2Liters;
  const totalRequiredBattery = totalBatteryWh + rtbBatteryWh;

  const o2ReserveRemainingPct = Number((((suitSpecs.primary_o2_tank_liters_stp - totalRequiredO2) / suitSpecs.primary_o2_tank_liters_stp) * 100).toFixed(1));
  const batteryReserveRemainingPct = Number((((suitSpecs.plss_battery_usable_wh - totalRequiredBattery) / suitSpecs.plss_battery_usable_wh) * 100).toFixed(1));

  // Determine RTB Safety Decision
  let rtbSafetyStatus = 'NOMINAL_GO';
  let rtbSafetyCode = 'GO';
  let advisoryMessage = 'Traverse profile within nominal safety envelope. Safe to proceed.';

  const minReservePct = Math.min(o2ReserveRemainingPct, batteryReserveRemainingPct);

  if (minReservePct < 15.0 || totalDistanceKm > 14.0) {
    rtbSafetyStatus = 'CRITICAL_ABORT';
    rtbSafetyCode = 'ABORT';
    advisoryMessage = 'CRITICAL WARNING: Traverse distance or energy consumption violates PLSS abort margins (<15% reserve). Shorten route or add pressurized rover.';
  } else if (minReservePct < 28.0 || detectedHazards.some(h => h.severity === 'CRITICAL')) {
    rtbSafetyStatus = 'ADVISORY_CAUTION';
    rtbSafetyCode = 'CAUTION';
    advisoryMessage = 'CAUTION: Consumables near minimum return reserve threshold or critical terrain hazard nearby. Monitor telemetry closely.';
  }

  res.json({
    summary: {
      total_distance_km: Number(totalDistanceKm.toFixed(3)),
      total_duration_minutes: Number(totalDurationMinutes.toFixed(1)),
      total_ascent_m: Math.round(totalAscentMeters),
      total_descent_m: Math.round(totalDescentMeters),
      rtb_direct_distance_km: Number(rtbDistanceKm.toFixed(3)),
      rtb_duration_minutes: Number(rtbDurationMinutes.toFixed(1)),
      crew_count
    },
    consumables: {
      outbound_o2_liters: Number(totalO2Liters.toFixed(1)),
      rtb_reserved_o2_liters: Number(rtbO2Liters.toFixed(1)),
      total_projected_o2_liters: Number(totalRequiredO2.toFixed(1)),
      o2_margin_percent: o2ReserveRemainingPct,
      outbound_battery_wh: Number(totalBatteryWh.toFixed(1)),
      rtb_reserved_battery_wh: Number(rtbBatteryWh.toFixed(1)),
      total_projected_battery_wh: Number(totalRequiredBattery.toFixed(1)),
      battery_margin_percent: batteryReserveRemainingPct
    },
    safety_assessment: {
      status_code: rtbSafetyCode,
      status_label: rtbSafetyStatus,
      advisory_message: advisoryMessage,
      min_margin_percent: minReservePct,
      detected_hazards: detectedHazards
    },
    segments
  });
});

// 7. Planetary Science Sample Catalog (GET)
app.get('/api/samples', (req, res) => {
  const { site_id } = req.query;
  const samplesData = loadJson(SAMPLES_FILE) || { samples: [] };

  let list = samplesData.samples;
  if (site_id) {
    list = list.filter(s => s.site_id === site_id);
  }

  res.json({ samples: list, total: list.length });
});

// 8. Register New Planetary Science Sample (POST)
app.post('/api/samples', (req, res) => {
  const {
    site_id,
    name,
    rock_type,
    mineralogy,
    mass_grams,
    lat,
    lon,
    scientific_significance,
    logged_by
  } = req.body;

  if (!name || !rock_type || lat === undefined || lon === undefined) {
    return res.status(400).json({
      error: 'Missing mandatory sample parameters: name, rock_type, lat, lon are required.'
    });
  }

  const samplesData = loadJson(SAMPLES_FILE) || { samples: [] };

  const newId = `SMP-${(site_id || 'MARS').substring(0, 3).toUpperCase()}-${String(samplesData.samples.length + 1).padStart(3, '0')}`;

  const newSample = {
    id: newId,
    name: name.trim(),
    site_id: site_id || 'jezero-crater',
    sol: Math.floor(1000 + Math.random() * 200),
    coordinates: {
      lat: Number(parseFloat(lat).toFixed(4)),
      lon: Number(parseFloat(lon).toFixed(4))
    },
    rock_type: rock_type.trim(),
    mineralogy: mineralogy ? mineralogy.trim() : 'Unspecified silicates/oxides',
    mass_grams: mass_grams ? Number(parseFloat(mass_grams).toFixed(1)) : 48.0,
    tube_seal_status: 'HERMETIC_SEALED',
    scientific_significance: scientific_significance
      ? scientific_significance.trim()
      : 'Target specimen collected for return bio/geochemical analysis.',
    logged_by: logged_by ? logged_by.trim() : 'Mission EVA Specialist',
    timestamp: new Date().toISOString()
  };

  samplesData.samples.unshift(newSample);
  const success = saveJson(SAMPLES_FILE, samplesData);

  if (!success) {
    return res.status(500).json({ error: 'Failed to write sample to registry' });
  }

  res.status(201).json({
    message: 'Planetary sample logged and secured into hermetic tube registry',
    sample: newSample
  });
});

// 9. Delete a sample record (DELETE)
app.delete('/api/samples/:id', (req, res) => {
  const samplesData = loadJson(SAMPLES_FILE);
  if (!samplesData || !samplesData.samples) {
    return res.status(500).json({ error: 'Failed to access samples file' });
  }

  const index = samplesData.samples.findIndex(s => s.id === req.params.id);
  if (index === -1) {
    return res.status(404).json({ error: `Sample ${req.params.id} not found` });
  }

  const removed = samplesData.samples.splice(index, 1)[0];
  saveJson(SAMPLES_FILE, samplesData);

  res.json({
    message: `Sample ${req.params.id} purged from registry`,
    purged: removed
  });
});

// Global 404 handler for API routes
app.use('/api/*', (req, res) => {
  res.status(404).json({ error: 'API endpoint does not exist' });
});

// Start Express Server
const server = app.listen(PORT, () => {
  console.log(`=======================================================`);
  console.log(`[ARES-SURVEX] Planetary EVA Console Server ONLINE`);
  console.log(`[HTTP] Listening on port: http://localhost:${PORT}`);
  console.log(`[ENV] Mode: ${process.env.NODE_ENV || 'production'}`);
  console.log(`[DATA] Mars Exploration Zones loaded from: ${SITES_FILE}`);
  console.log(`=======================================================`);
});

module.exports = app;
