const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

const doc = new PDFDocument({
  size: 'A4',
  margins: { top: 40, bottom: 40, left: 45, right: 45 },
  bufferPages: true
});

const outputPath = path.join(__dirname, 'ARES-SURVEX-System-Documentation.pdf');
const stream = fs.createWriteStream(outputPath);
doc.pipe(stream);

// Color Palette
const COLOR_BLACK = '#0d1116';
const COLOR_OCHRE = '#d97736';
const COLOR_BLUE = '#1f6feb';
const COLOR_GREEN = '#2ea043';
const COLOR_AMBER = '#d29922';
const COLOR_RED = '#cf222e';
const COLOR_GRAY_DARK = '#24292f';
const COLOR_GRAY_MID = '#57606a';
const COLOR_GRAY_LIGHT = '#f6f8fa';
const COLOR_BORDER = '#d0d7de';

function drawHeader(title, sectionCode) {
  doc.rect(45, 40, 505, 24).fill(COLOR_BLACK);
  doc.fillColor('#ffffff').fontSize(9).font('Helvetica-Bold')
     .text(`ARES-SURVEX // FLIGHT OPERATIONS MANUAL`, 55, 47, { continued: true })
     .font('Helvetica').text(`   |   SEC: ${sectionCode}`, { align: 'left' });
  doc.fillColor(COLOR_OCHRE).fontSize(9).font('Helvetica-Bold')
     .text(`NASA SPACE APPS CHALLENGE`, 360, 47, { width: 180, align: 'right' });
  doc.moveDown(1.5);
}

function drawSectionHeading(num, text) {
  doc.moveDown(0.8);
  const y = doc.y;
  doc.rect(45, y, 6, 16).fill(COLOR_OCHRE);
  doc.fillColor(COLOR_BLACK).fontSize(12).font('Helvetica-Bold')
     .text(`${num}. ${text}`, 58, y + 2);
  doc.moveDown(0.5);
  doc.strokeColor(COLOR_BORDER).lineWidth(0.8).moveTo(45, doc.y).lineTo(550, doc.y).stroke();
  doc.moveDown(0.6);
}

function drawSubHeading(text) {
  doc.moveDown(0.4);
  doc.fillColor(COLOR_BLUE).fontSize(10.5).font('Helvetica-Bold').text(text);
  doc.moveDown(0.3);
}

function drawBody(text, options = {}) {
  doc.fillColor(COLOR_GRAY_DARK).fontSize(9.5).font('Helvetica')
     .text(text, { lineGap: 3, align: 'justify', ...options });
  doc.moveDown(0.4);
}

function drawBullet(title, desc) {
  doc.fillColor(COLOR_BLACK).fontSize(9.5).font('Helvetica-Bold').text(`• ${title}: `, { continued: true });
  doc.fillColor(COLOR_GRAY_DARK).font('Helvetica').text(desc, { lineGap: 2 });
  doc.moveDown(0.25);
}

function drawCodeBlock(code) {
  const y = doc.y;
  const h = doc.heightOfString(code, { width: 490, font: 'Courier', size: 8 }) + 10;
  doc.rect(45, y, 505, h).fill(COLOR_GRAY_LIGHT);
  doc.rect(45, y, 505, h).stroke(COLOR_BORDER);
  doc.fillColor(COLOR_BLACK).fontSize(8).font('Courier').text(code, 52, y + 5, { width: 490, lineGap: 2 });
  doc.y = y + h + 6;
}

// ==========================================
// PAGE 1: TITLE & COVER PAGE
// ==========================================
doc.rect(45, 60, 505, 6).fill(COLOR_OCHRE);

doc.moveDown(2);
doc.fillColor(COLOR_GRAY_MID).fontSize(10).font('Helvetica-Bold')
   .text('NASA SPACE APPS CHALLENGE // SPECIAL PROBLEM DIRECTIVE', 45, 80);
doc.fillColor(COLOR_OCHRE).fontSize(9).font('Helvetica')
   .text('PROBLEM STATEMENT: "INTERPLANETARY SURVIVAL GUIDE: MARTIAN MAP"', 45, 95);

doc.moveDown(1.5);
doc.fillColor(COLOR_BLACK).fontSize(20).font('Helvetica-Bold')
   .text('ARES-SURVEX: MARTIAN EXTRAVEHICULAR ACTIVITY (EVA) OPERATIONS & CARTOGRAPHY SYSTEM', 45, 120, { width: 505 });

doc.moveDown(0.5);
doc.fillColor(COLOR_GRAY_MID).fontSize(11).font('Helvetica')
   .text('Autonomous Risk Evaluation, Trajectory Calculation, Life Support Modeling & Surface Cartography', 45, 175);

// Metadata Block Table
const metaY = 210;
doc.rect(45, metaY, 505, 80).fill('#f8fafc');
doc.rect(45, metaY, 505, 80).stroke(COLOR_BORDER);

doc.fillColor(COLOR_GRAY_MID).fontSize(8.5).font('Helvetica-Bold').text('DOCUMENT IDENTIFIER:', 55, metaY + 10);
doc.fillColor(COLOR_BLACK).font('Courier-Bold').text('NASA-JPL-EVA-SURVEX-2026-REV-A', 180, metaY + 10);

doc.fillColor(COLOR_GRAY_MID).font('Helvetica-Bold').text('SECURITY CLASSIFICATION:', 55, metaY + 24);
doc.fillColor(COLOR_GREEN).font('Helvetica-Bold').text('PUBLIC / OPEN RESEARCH / NASA SPACE APPS', 180, metaY + 24);

doc.fillColor(COLOR_GRAY_MID).font('Helvetica-Bold').text('PRIMARY SUIT STANDARD:', 55, metaY + 38);
doc.fillColor(COLOR_BLACK).font('Helvetica').text('EMU-M4 Mars Surface Extravehicular Mobility Unit (29.6 kPa pure O2)', 180, metaY + 38);

doc.fillColor(COLOR_GRAY_MID).font('Helvetica-Bold').text('PLANETARY SPHEROID DATUM:', 55, metaY + 52);
doc.fillColor(COLOR_BLACK).font('Helvetica').text('IAU 2000 Mars Mean Radius (R_Mars = 3389.5 km)', 180, metaY + 52);

doc.fillColor(COLOR_GRAY_MID).font('Helvetica-Bold').text('SOFTWARE ARCHITECTURE:', 55, metaY + 66);
doc.fillColor(COLOR_BLACK).font('Helvetica').text('Node.js / Express.js / Vanilla ES6+ / Leaflet.js Vector Engine', 180, metaY + 66);

doc.y = 310;

drawSectionHeading('1', 'EXECUTIVE SUMMARY & MISSION PURPOSE');
drawBody(
  'Human exploration of the Martian surface presents unprecedented survivability challenges. Astronauts operating on the surface are exposed to a hostile near-vacuum atmospheric envelope (6 hPa, 95.3% CO2), lethal diurnal temperature variations (-110°C to -15°C), soft regolith sink hazards, steep volcanic escarpments (>25°), and unshielded galactic cosmic radiation.'
);
drawBody(
  'ARES-SURVEX (Autonomous Risk Evaluation & Surface Survival Explorer) is a mission-critical web application that bridges planetary cartography, physical terrain analytics, metabolic consumption modeling, and real-time Return-to-Base (RTB) decision intelligence. It enables planetary science teams to plan traverses, evaluate terrain risk profiles, monitor consumables reserves, and log hermetically sealed geological samples.'
);

drawSectionHeading('2', 'STRICT ANTI-SLOP & AEROSPACE ERGONOMIC RULES');
drawBody('The user interface conforms strictly to NASA/JPL and ESA flight control console design principles, eliminating all generic SaaS and AI-generated design tropes:');
drawBullet('Monospace Telemetry Fonts', 'Built on IBM Plex Mono with tabular numeric alignment for zero-jitter readouts.');
drawBullet('Tactical Matte Palette', 'Deep technical carbon (#07090b), dark slate panels (#131920), mission amber (#d97736), and phosphor indicators.');
drawBullet('Zero Generic Slop', 'No purple/black neon glow orbs, no floating blobs, no frosted glass cards, no emojis in UI labels, and crisp 0px-2px border radii.');
drawBullet('Authentic Monochromatic Skeletons', 'Low-luminance pulse states during asynchronous satellite telemetry acquisition.');

// ==========================================
// PAGE 2: ARCHITECTURE & CARTOGRAPHY
// ==========================================
doc.addPage();
drawHeader('SYSTEM ARCHITECTURE & CARTOGRAPHY', 'SEC-02');

drawSectionHeading('3', 'SYSTEM ARCHITECTURE & DATA FLOW');
drawBody(
  'The application employs a decoupled, high-reliability architecture with an Express.js backend and modular ES6+ client controllers:'
);

drawCodeBlock(
`+---------------------------------------------------------------------------------+
|                       ARES-SURVEX APPLICATION ARCHITECTURE                      |
+---------------------------------------------------------------------------------+
| CLIENT LAYER (Browser Vanilla ES6+):                                            |
|   - index.html          : Multi-viewport telemetry workstation layout           |
|   - js/map.js           : Leaflet.js vector cartography + Canvas raster engine  |
|   - js/eva-calculator.js: Geodesic traverse math & physiological PLSS modeling   |
|   - js/api.js           : RESTful asynchronous HTTP client                      |
|   - js/app.js           : Controller, astronomical Sol clocks & skeleton states |
+---------------------------------------------------------------------------------+
| SERVER LAYER (Node.js & Express.js - server.js):                                |
|   - GET  /api/status            : System health, datum & mission metadata       |
|   - GET  /api/sites             : Catalog of exploration sectors                |
|   - GET  /api/sites/:id         : Full sector POIs, hazards, contours & base    |
|   - GET  /api/sites/:id/telemetry: Live simulated meteorological sensor stream  |
|   - GET  /api/survival-metrics  : EMU-M4 life support specs & metabolic tables  |
|   - POST /api/route/calculate   : Trajectory calculation & hazard collisions    |
|   - GET/POST /api/samples       : Science sample registry CRUD operations       |
+---------------------------------------------------------------------------------+
| DATA PERSISTENCE LAYER:                                                         |
|   - data/mars_sites.json        : Coordinates, POIs, hazards, contours, orbiters|
|   - data/survival_metrics.json  : PLSS limits, O2 curves, power wattages        |
|   - data/sample_registry.json   : Hermetically sealed planetary sample database |
+---------------------------------------------------------------------------------+`
);

drawSectionHeading('4', 'PLANETARY CARTOGRAPHY & SECTOR EXPLORATION');
drawBody(
  'ARES-SURVEX covers four geologically significant exploration zones across the Martian crust:'
);
drawBullet('Jezero Crater (JEZERO-ALPHA, 18.38°N 77.58°E, Elev: -2530m)', 'Perseverance landing site. Ancient lake delta with smectite clays, deltaic sandstones, and the dangerous Séítah basaltic dunefield.');
drawBullet('Gale Crater (GALE-BETA, 4.59°S 137.44°E, Elev: -4450m)', 'Curiosity landing site. Mount Sharp layered sedimentary sulfate sequence, Vera Rubin hematite ridge, and Gediz Vallis debris flow.');
drawBullet('Olympus Mons (OLYMPUS-GAMMA, 18.65°N 133.80°W, Elev: +21287m)', 'Highest volcanic edifice in the Solar System. 6-ring collapse caldera, thin atmosphere envelope (0.72 hPa), and intact subterranean lava tube skylights.');
drawBullet('Valles Marineris (VALLES-DELTA, 9.80°S 76.40°W, Elev: -3800m)', 'Melas Chasma tectonic rift valley. 4-billion-year crustal stratigraphy, massive landslide breccias, and Recurring Slope Lineae (RSL) brine seeps.');

drawSubHeading('Tactical Cartography Layers:');
drawBullet('MOLA Topographic Contours', 'Concentric vector contour rings visualizing elevation tiers and basin depressions.');
drawBullet('Multi-Hazard Vector Buffers', 'Proximity warning circles covering soft regolith (sinkage >25cm), steep slope grades (>25°), razor-sharp ventifacts, and dust devil corridors.');
drawBullet('Science Sampling Targets', 'Mineral outcrops, river scarp sediments, and hermetic cache depots.');
drawBullet('Orbital Relay Footprints', 'Active line-of-sight satellite contact cones (MRO, TGO, Odyssey, MAVEN) with real-time pass countdowns.');

// ==========================================
// PAGE 3: MATHEMATICAL MODELS & LIFE SUPPORT
// ==========================================
doc.addPage();
drawHeader('MATHEMATICAL MODELS & TRAJECTORY ANALYTICS', 'SEC-03');

drawSectionHeading('5', 'TRAVERSE MATHEMATICS & PHYSICAL FORMULAS');
drawBody('All spatial operations on ARES-SURVEX are computed using spherical trigonometry scaled to the Martian datum:');

drawSubHeading('A. Spherical Haversine Geodesic Distance:');
drawBody('For two points P1(lat1, lon1) and P2(lat2, lon2) on Mars:');
drawCodeBlock(
`a = sin²(Δlat / 2) + cos(lat1) * cos(lat2) * sin²(Δlon / 2)
c = 2 * atan2(√a, √(1 - a))
Distance (km) = R_Mars * c  [where R_Mars = 3389.5 km]`
);

drawSubHeading('B. Terrain Slope Grade Calculation:');
drawBody('Slope inclination angle θ is determined from elevation differential Δh and geodesic ground track:');
drawCodeBlock(
`Slope Angle (θ) = arctan( |h2 - h1| / (Distance_km * 1000) ) * (180 / π)
Terrain Speed (v):
  - If θ ≤ 8°  : Nominal speed = 3.2 km/h
  - If 8° < θ ≤ 15°: Rough terrain = 2.1 km/h
  - If θ > 15° : Steep slope grade = 1.2 km/h`
);

drawSectionHeading('6', 'EMU-M4 LIFE SUPPORT (PLSS) CONSUMABLES MODEL');
drawBody(
  'The astronaut life support subsystem evaluates continuous metabolic demand, equipment power consumption, and thermal control loads:'
);

drawBullet('Oxygen Consumption Rate (R_O2)', 'Scales from 69.0 L/hr on flat ground to 96.0 L/hr on moderate grades (5°-15°) and 132.0 L/hr on steep inclines (>15°). Total primary tank capacity is 720 L, with an absolute abort threshold of 180 L (25% reserve).');
drawBullet('Battery Energy Consumption', 'Base electronics & HUD (42W) + LCVG liquid cooling pump (38W) + metabolic chiller demand (18W per 100W excess metabolic heat) + glove/boot heaters (45W at -60°C up to 92W at -90°C). Usable battery capacity: 765 Wh (850 Wh nominal).');

drawSubHeading('Return-to-Base (RTB) Decision Algorithm:');
drawBody(
  'At every waypoint, the system computes the direct return vector back to the habitat base station, estimating the return time, return O2, and return battery required. The safety margin is evaluated:'
);
drawCodeBlock(
`Min Margin % = min( O2_Remaining_Margin_%, Battery_Remaining_Margin_% )

Decision State:
  - NOMINAL_GO     : Min Margin > 35% AND Distance ≤ 14.0 km (Traverse safe)
  - ADVISORY_CAUTION: 20% ≤ Min Margin ≤ 35% OR Hazard Proximity (Cease drilling, RTB)
  - CRITICAL_ABORT : Min Margin < 15% OR Distance > 14.0 km (Immediate RTB mandatory)`
);

// ==========================================
// PAGE 4: TELEMETRY, SAMPLES & OPERATIONS
// ==========================================
doc.addPage();
drawHeader('TELEMETRY, SAMPLE REGISTRY & FLIGHT RULES', 'SEC-04');

drawSectionHeading('7', 'ENVIRONMENTAL SENSORS & MARTIAN TIMING');
drawBody('The mission console streams synchronized surface telemetry with realistic sensor micro-jitter:');
drawBullet('Sol Counter & Local Mars Time (MTC)', 'Calculates true solar diurnal time (1 Martian sol = 24h 39m 35.244s).');
drawBullet('Ambient Temperature', 'Tracks extreme diurnal shifts from -110°C night to -15°C peak afternoon.');
drawBullet('Atmospheric Optical Depth (Tau τ)', 'Monitors dust opacity from clear sol (τ = 0.5) to dust storm warning (τ > 2.5).');
drawBullet('Ionizing Radiation Dosimeter', 'Galactic Cosmic Rays (GCR) baseline: 0.60 - 0.75 mSv/day (Action limit: 1.2 mSv/day).');

drawSectionHeading('8', 'HERMETIC SCIENCE SAMPLE REGISTRY');
drawBody(
  'The Science Sample Registry allows astronauts to record gathered cores into an official planetary catalog. All entries are validated and persisted to data/sample_registry.json:'
);
drawBullet('Attributes Stored', 'Sample ID (e.g. SMP-JEZ-004), Lithology (e.g. Lacustrine Mudstone, Basaltic Igneous, Hydrothermal Silica), Mineralogy, Specimen Mass (grams), Coordinates, and Geological Significance.');
drawBullet('Chain-of-Custody', 'Enforces verification of titanium-nitride hermetic seals before submission.');

drawSectionHeading('9', 'LEGAL FRAMEWORK & FLIGHT DIRECTIVES');
drawBody('The application includes dedicated, fully functional legal compliance documents:');
drawBullet('Mission Terms of Service (public/tos.html)', 'Codifies Flight Rule EVA-704 consumables thresholds, absolute RTB compliance, and COSPAR Planetary Protection Category IV-b quarantine protocols.');
drawBullet('Planetary Telemetry & Privacy Policy (public/privacy.html)', 'Guarantees biometric confidentiality (CCSDS 355.0-B-1 encryption), 12-month scientific embargo on returned sample geochemical spectra, and open-access release of cartographic terrain data.');

drawSectionHeading('10', 'OPERATOR QUICK-START & EXECUTION GUIDE');
drawBody('To start and operate the system on any workstation:');
drawCodeBlock(
`# 1. Open Terminal in the project directory:
cd "c:\\Users\\asus\\OneDrive\\Desktop\\ares-survex"

# 2. Start the development server (configured with nodemon):
npm run dev

# 3. Access the Operations Console:
Open http://localhost:3000 in Google Chrome, Microsoft Edge, or Firefox.

# 4. To terminate the server:
Press Ctrl + C in the terminal window.`
);

// Add page numbering to all pages
const range = doc.bufferedPageRange();
for (let i = range.start; i < range.start + range.count; i++) {
  doc.switchToPage(i);
  doc.rect(45, 800, 505, 1).fill(COLOR_BORDER);
  doc.fillColor(COLOR_GRAY_MID).fontSize(8).font('Helvetica')
     .text(`ARES-SURVEX // NASA SPACE APPS CHALLENGE DOCUMENTATION`, 45, 808);
  doc.text(`Page ${i + 1} of ${range.count}`, 45, 808, { align: 'right' });
}

doc.end();

stream.on('finish', () => {
  console.log(`[PDF] Generated successfully at: ${outputPath}`);
});
