# ARES-SURVEX: Martian Extravehicular Activity (EVA) Operations & Survival Cartography System

**NASA Space Apps Challenge:** *Interplanetary Survival Guide: Martian Map*  
**Mission Architecture Standard:** NASA/JPL & ESA Flight Rule Operations Console  
**Project Identifier:** `ares-survex`

---

## 1. System Overview

**ARES-SURVEX** (Autonomous Risk Evaluation & Surface Survival Explorer) is a production-grade planetary operations console designed for future astronauts and ground controllers to plan safe, scientifically productive Extravehicular Activities (EVAs) across the Martian surface.

The system integrates high-resolution planetary cartography, multi-hazard spatial analytics, metabolic Primary Life Support System (PLSS) consumption modeling, and real-time Return-to-Base (RTB) decision engines.

---

## 2. Strict Aerospace Design System (Anti-Slop Compliance)

Built strictly according to mission operations ergonomics (JPL / ESA operations room specifications):
- **Monospace Telemetry Typography:** High-density readouts using `IBM Plex Mono` with tabular numerals.
- **Authentic Engineering Palette:** Deep matte carbon chassis (`#07090b`), slate console panels (`#131920`), subdued amber hazards (`#d97736`), and tactical phosphor status indicators.
- **Zero Generic UI Slop:** No bubbly gradients, no purple/black neon glow orbs, no frosted glass blurs, no emojis in operational labels, and crisp 0px–2px border radii.
- **Tactical Responsive Layout:** High-density split console with synchronized HUD coordinate tracking, Sol & MTC clocks, and low-latency interactive canvas/vector cartography.
- **Authentic Skeleton Loading:** Subtle monochromatic luminance sweeps during asynchronous telemetry updates.

---

## 3. Core Functional Capabilities

### A. Layered Martian Cartography Engine
- Interactive mapping powered by **Leaflet.js** with procedural Martian iron-oxide terrain canvas and NASA/USGS MDIM2.1 WMS satellite integration.
- Real toggleable tactical layers:
  1. **Topographic Contours (MOLA):** Elevation tiers and depression basins.
  2. **Terrain Hazard Zones:** Soft regolith sand traps, steep slopes (>25°), razor-sharp ventifact beds, and convective dust devils.
  3. **Planetary Science Targets:** Stratified lacustrine mudstones, deltaic scarps, silica sinters, and volcanic skylights.
  4. **Orbital Line-of-Sight (LOS):** Active satellite relay tracking (MRO, TGO, Odyssey, MAVEN) with communication window countdowns.

### B. High-Precision EVA Route & Life-Support Planner
- Point-and-click waypoint plotting on the Martian surface with geodesic Mars Great-Circle spherical calculations ($R_{Mars} = 3389.5\text{ km}$).
- Dynamic metabolic modeling:
  - Oxygen consumption scaling ($69.0\text{ L/hr}$ flat to $132.0\text{ L/hr}$ on slopes $>15^\circ$).
  - Suit avionics, LCVG liquid cooling pump, and thermal glove heater power drain.
  - Multi-crew scaling (1 to 6 astronauts).
- **Automated Return-to-Base (RTB) Decision Subsystem:**
  - `NOMINAL_GO`: Margins $>35\%$ (safe to proceed).
  - `ADVISORY_CAUTION`: Margins between $20\%$ and $35\%$ or adjacent hazard detected.
  - `CRITICAL_ABORT`: Consumables margin $<15\%$ or traverse $>14\text{ km}$ (immediate RTB alert triggered).

### C. Environmental Telemetry & Astronomical Timing
- Real-time **Sol counter**, **Local Mars Coordinated Time (MTC)**, and UTC mission elapsed clocks.
- Atmospheric optical depth ($\tau$), surface barometric pressure (Pa), ionizing radiation dosimeter readings ($\text{mSv/day}$), and anemometer wind vectors.

### D. Hermetic Science Sample Registry
- Real-time catalog of collected planetary specimens with full CRUD support.
- Stores lithology, mineralogy, coordinates, specimen mass, and scientific preservation significance.
- Fully persisted on the backend in `data/sample_registry.json`.

### E. Mission Operations Compliance & Policies
- Standalone **Mission Terms of Service** ([`public/tos.html`](file:///c:/Users/asus/OneDrive/Desktop/New%20folder%20(2)/public/tos.html)) detailing NASA flight rules, consumables thresholds, and COSPAR Category IV-b Planetary Protection guidelines.
- **Planetary Telemetry & Privacy Policy** ([`public/privacy.html`](file:///c:/Users/asus/OneDrive/Desktop/New%20folder%20(2)/public/privacy.html)) governing biometric security (CCSDS standards) and sample scientific embargoes.

---

## 4. Exploration Zones Included

| Sector ID | Sector Name | Primary Science Objective |
| :--- | :--- | :--- |
| `jezero-crater` | Jezero Crater Delta & Floor | Lacustrine mudstones, deltaic clay, ancient biosignatures |
| `gale-crater` | Gale Crater Mount Sharp | Sedimentary sulfate mound, crystalline hematite ridges |
| `olympus-mons` | Olympus Mons Caldera & Scarp | Shield volcano tholeiitic basalt, intact subterranean lava tubes |
| `valles-marineris`| Melas Chasma Rift | 4-billion-year crustal stratigraphy, Recurring Slope Lineae (RSL) |

---

## 5. Quick Start & Execution

### Prerequisites:
- Node.js LTS (v18+ or v24+)
- npm (v9+)

### Installation & Launch:
```powershell
# 1. Install dependencies
npm install

# 2. Run in development mode with nodemon
npm run dev

# 3. Alternatively, run in standard production mode
npm start
```

Open your browser at:
```
http://localhost:3000
```

---

## 6. Directory Structure

```
ares-survex/
├── package.json               # Node.js project manifest & scripts
├── server.js                  # Express.js REST API & static server
├── README.md                  # System architecture & documentation
├── data/
│   ├── mars_sites.json        # Coordinates, POIs, hazards, and telemetry
│   ├── survival_metrics.json  # EMU-M4 PLSS life support specifications
│   └── sample_registry.json   # Hermetically sealed sample database
└── public/
    ├── index.html             # EVA Operations Console & Map Viewport
    ├── tos.html               # Mission Terms of Service
    ├── privacy.html           # Planetary Telemetry & Biometrics Privacy Policy
    ├── css/
    │   └── styles.css         # Tactical aerospace design system
    └── js/
        ├── api.js             # Backend REST API client
        ├── eva-calculator.js  # Trajectory, life-support & RTB algorithms
        ├── map.js             # Leaflet Mars cartography & layer overlays
        └── app.js             # Controller, skeleton loaders & telemetry ticker
```
