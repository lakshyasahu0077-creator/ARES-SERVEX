/**
 * ARES-SURVEX: EVA Calculator Engine
 * Planetary Extravehicular Activity Life Support & Trajectory Analysis
 */

const EvaCalculator = {
  MARS_RADIUS_KM: 3389.5,

  // Nominal PLSS (Primary Life Support System) Specs
  DEFAULTS: {
    o2TankCapacityLiters: 720,
    o2EmergencyReserveLiters: 180,
    batteryUsableWh: 765,
    nominalWalkSpeedKmh: 3.2,
    basePowerWatts: 125,
    o2BaseRateLph: 69.0
  },

  /**
   * Calculate Mars Great-Circle Distance between two coordinates in kilometers
   */
  calculateMarsDistance(lat1, lon1, lat2, lon2) {
    const toRad = deg => (deg * Math.PI) / 180;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const rLat1 = toRad(lat1);
    const rLat2 = toRad(lat2);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(rLat1) * Math.cos(rLat2) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return this.MARS_RADIUS_KM * c;
  },

  /**
   * Fast client-side preliminary route evaluation
   */
  quickEvaluateRoute(waypoints, baseStation = null, crewCount = 1) {
    if (!waypoints || waypoints.length < 2) {
      return {
        totalDistanceKm: 0,
        totalDurationMinutes: 0,
        o2ConsumedLiters: 0,
        batteryConsumedWh: 0,
        rtbDistanceKm: 0,
        rtbSafetyCode: 'GO',
        rtbSafetyStatus: 'NOMINAL_GO',
        o2MarginPercent: 100,
        batteryMarginPercent: 100,
        segments: []
      };
    }

    let totalDist = 0;
    const segments = [];

    for (let i = 0; i < waypoints.length - 1; i++) {
      const p1 = waypoints[i];
      const p2 = waypoints[i + 1];
      const dist = this.calculateMarsDistance(p1.lat, p1.lon, p2.lat, p2.lon);
      totalDist += dist;

      // Approximate slope from elevation if provided
      const elev1 = p1.elevation_m || 0;
      const elev2 = p2.elevation_m || 0;
      const elevDiff = elev2 - elev1;
      const horizM = Math.max(dist * 1000, 1);
      const slopeDeg = Math.min(45, (Math.atan(Math.abs(elevDiff) / horizM) * 180) / Math.PI);

      let speedKmh = this.DEFAULTS.nominalWalkSpeedKmh;
      if (slopeDeg > 15) speedKmh = 1.2;
      else if (slopeDeg > 8) speedKmh = 2.1;

      const durHours = dist / speedKmh;
      const durMin = durHours * 60;

      // O2 calculation based on slope
      let o2Rate = this.DEFAULTS.o2BaseRateLph;
      if (slopeDeg > 15) o2Rate = 132.0;
      else if (slopeDeg > 5) o2Rate = 96.0;

      const segO2 = o2Rate * durHours * crewCount;
      const segBat = (this.DEFAULTS.basePowerWatts + (slopeDeg * 2.5)) * durHours;

      segments.push({
        index: i + 1,
        fromName: p1.name || `WP ${i + 1}`,
        toName: p2.name || `WP ${i + 2}`,
        distanceKm: Number(dist.toFixed(3)),
        slopeDeg: Number(slopeDeg.toFixed(1)),
        durationMin: Number(durMin.toFixed(1)),
        o2Liters: Number(segO2.toFixed(1)),
        batteryWh: Number(segBat.toFixed(1))
      });
    }

    const totalDurMin = segments.reduce((acc, s) => acc + s.durationMin, 0);
    const totalO2 = segments.reduce((acc, s) => acc + s.o2Liters, 0);
    const totalBat = segments.reduce((acc, s) => acc + s.batteryWh, 0);

    // RTB direct return from last waypoint to base station (or origin)
    const base = baseStation || waypoints[0];
    const lastPoint = waypoints[waypoints.length - 1];
    const rtbDistKm = this.calculateMarsDistance(lastPoint.lat, lastPoint.lon, base.lat, base.lon);
    const rtbDurMin = (rtbDistKm / this.DEFAULTS.nominalWalkSpeedKmh) * 60;
    const rtbO2 = this.DEFAULTS.o2BaseRateLph * (rtbDurMin / 60) * crewCount;
    const rtbBat = this.DEFAULTS.basePowerWatts * (rtbDurMin / 60);

    const projectedO2Total = totalO2 + rtbO2;
    const projectedBatTotal = totalBat + rtbBat;

    const o2Margin = Number((((this.DEFAULTS.o2TankCapacityLiters - projectedO2Total) / this.DEFAULTS.o2TankCapacityLiters) * 100).toFixed(1));
    const batMargin = Number((((this.DEFAULTS.batteryUsableWh - projectedBatTotal) / this.DEFAULTS.batteryUsableWh) * 100).toFixed(1));
    const minMargin = Math.min(o2Margin, batMargin);

    let code = 'GO';
    let status = 'NOMINAL_GO';
    let advisory = 'Traverse profile within standard safety parameters.';

    if (minMargin < 15.0 || totalDist > 14.0) {
      code = 'ABORT';
      status = 'CRITICAL_ABORT';
      advisory = 'DANGER: Trajectory exceeds PLSS safety reserves. Immediate abort threshold crossed.';
    } else if (minMargin < 28.0) {
      code = 'CAUTION';
      status = 'ADVISORY_CAUTION';
      advisory = 'CAUTION: Consumables near minimum return reserve. Advise heading back to Hab.';
    }

    return {
      totalDistanceKm: Number(totalDist.toFixed(3)),
      totalDurationMinutes: Number(totalDurMin.toFixed(1)),
      o2ConsumedLiters: Number(totalO2.toFixed(1)),
      batteryConsumedWh: Number(totalBat.toFixed(1)),
      rtbDistanceKm: Number(rtbDistKm.toFixed(3)),
      rtbDurationMinutes: Number(rtbDurMin.toFixed(1)),
      rtbReservedO2: Number(rtbO2.toFixed(1)),
      rtbReservedBattery: Number(rtbBat.toFixed(1)),
      o2MarginPercent: Math.max(0, o2Margin),
      batteryMarginPercent: Math.max(0, batMargin),
      rtbSafetyCode: code,
      rtbSafetyStatus: status,
      advisoryMessage: advisory,
      segments
    };
  }
};

window.EvaCalculator = EvaCalculator;
