# DRISHTI — ADDITIONAL DISASTER DATA SOURCES & API INTEGRATION PLAN

**Version:** 1.0  
**Date:** 2026-09-29  
**Target Architecture:** React + Vite Frontend (<512 MB Deployment Hard Limit)  
**Security & Data Integrity Standard:** Zero Secret Exposure • Zero Fabricated Data • Zero Client CORS Bypass • Explicit Data Provenance  

---

## 1. Executive Summary & Source Hierarchy

DRISHTI integrates multi-agency disaster intelligence across official Indian Government monitoring systems, international meteorological numerical models, and crowdsourced geospatial road networks. In compliance with strict institutional integrity standards, DRISHTI **never fabricates data, never reinterprets official warning colors, and never labels a facility "SAFE" without conclusive empirical evidence**.

### Official Sourcing & Provenance Hierarchy
1. **IMD OBSERVED** — Primary meteorological authority (*Observed station telemetry & official synoptic bulletins*)
2. **NDMA OFFICIAL ALERT** — National multi-hazard warning authority (*SACHET CAP feeds*)
3. **CWC / OFFICIAL FLOOD OBSERVATIONS** — Central Water Commission (*River gauges & flood levels*)
4. **MOSDAC / ISRO OBSERVED SATELLITE** — ISRO SAC (*INSAT-3DS Imager & Sounder products*)
5. **INCOIS OFFICIAL COASTAL/OCEAN DATA** — MoES (*Tsunami bulletins & ocean state forecasts*)
6. **OPENSTREETMAP INFRASTRUCTURE** — OpenStreetMap Foundation (*Real hospitals, shelters, fire, police*)
7. **OPEN-METEO MODEL DATA** — Open-Meteo High-Resolution NWP (*Surface wind vectors, rainfall, pressure, DEM*)
8. **DRISHTI DERIVED** — Deterministic algorithmic evaluations (*Proximity, water exposure, district risk*)
9. **HISTORICAL / SIMULATED** — Calibrated exercise benchmarks (*Cyclone REMAL BOB/01/2024*)

---

## 2. Comprehensive Candidate Source Audit

| # | Source Category | Candidate Source | HTTP Status | CORS Header | Frontend Usable? | Architecture Requirement |
|---|---|---|---|---|---|---|
| **A** | National Alerts | NDMA SACHET | `200` (HTML) / `404` (API) | `NONE` (Omitted by CDN) | **NO (CORS Blocked)** | **BACKEND INTEGRATION REQUIRED — JOHNEY** |
| **B** | Flood & River | CWC / India-WRIS | `200` (Portal) | `NONE` | **NO (CORS Blocked)** | **BACKEND INTEGRATION REQUIRED — JOHNEY** |
| **C** | Response Facilities | OpenStreetMap (Overpass) | `200 OK` | `*` (Supported) | **YES** | Frontend Direct Service Adapter (`nearbyServicesService.js`) |
| **D** | Road Routing | Project OSRM | `200 OK` | `*` (Supported) | **YES** | Frontend Direct Service Adapter (`routingService.js`) |
| **E** | Ocean & Coastal | INCOIS | `200` (Redirect) / `404` | `NONE` | **NO (CORS Blocked)** | **BACKEND INTEGRATION REQUIRED — JOHNEY** |
| **F** | Satellite Products | MOSDAC / ISRO INSAT-3DS | `200 OK` (Images) | Direct `<img>` load | **YES** | Frontend Direct Service Adapter (`mosdacProductService.js`) |
| **G** | Terrain / DEM | Open-Meteo Elevation (90m DEM) | `200 OK` | `*` (Supported) | **YES** | Frontend Direct Service Adapter (`terrainService.js`) |

---

## 3. Detailed Data Source Plans (13 Key Criteria)

### A. NDMA SACHET (National Disaster Alerts)
1. **Source:** National Disaster Management Authority (NDMA) — Project SACHET.
2. **Official URL:** `https://sachet.ndma.gov.in/`
3. **Endpoint:** `https://sachet.ndma.gov.in/CapFeed` / `/api/alerts` (Future backend target: `/api/v1/sachet/alerts`)
4. **HTTP Status:** `200` (HTML page route), `404` (direct raw JSON/XML endpoints).
5. **CORS Status:** `NONE / NOT SET`. (Even though HTML contains `<meta http-equiv="Access-Control-Allow-Origin" content="*">`, browsers only honor actual HTTP response headers on fetch/XHR requests).
6. **Authentication:** Open for public web portal; backend API for CAP feeds requires institutional IP whitelist or API registration.
7. **Rate Limits:** Standard web rate-limiting behind Cloudflare/Nginx.
8. **Data Fields:** `identifier`, `sender`, `sent`, `status`, `msgType`, `scope`, `event`, `urgency`, `severity`, `certainty`, `headline`, `description`, `instruction`, `areaDesc`, `circle/polygon`.
9. **Provenance:** `WARNING / ALERT • SOURCE: NDMA SACHET`
10. **Frontend/Backend Requirement:** **BACKEND INTEGRATION REQUIRED — JOHNEY**. Direct browser connection blocked by CORS.
11. **DRISHTI UI Destination:** `RightIntelligencePanel` Evidence tab, `EmergencyAlertBanner`, and Alert Center.
12. **Implementation Status:** Clean service adapter implemented (`frontend/src/services/ndmaAlertService.js`). Reports honest `liveStatus: "SOURCE_UNAVAILABLE"` client-side without fake warnings. Ready for FastAPI endpoint proxying.
13. **Limitations:** Direct client access blocked by CORS. Official severity color hierarchy (`RED WARNING`, `ORANGE ALERT`, `YELLOW WATCH`, `GREEN ADVISORY`) strictly maintained without modification.

---

### B. CWC / INDIA-WRIS (Central Water Commission Flood & Water Data)
1. **Source:** Central Water Commission (CWC), Ministry of Jal Shakti, and India-WRIS.
2. **Official URL:** `https://ffs.india-water.gov.in/` and `https://indiawris.gov.in/`
3. **Endpoint:** `https://ffs.india-water.gov.in/ffs/api/public/data` (Future backend target: `/api/v1/cwc/river-gauges`)
4. **HTTP Status:** `200` (Portal landing), `404` (unauthenticated direct API probes).
5. **CORS Status:** `NONE / NOT SET`.
6. **Authentication:** Portal uses internal session cookies; open public REST endpoints omitted from CORS whitelist.
7. **Rate Limits:** Unspecified government portal throttles.
8. **Data Fields:** River Basin, Gauge Station ID, Danger Level (DL), Warning Level (WL), Current Water Level (CWL), Trend (Rising / Falling / Steady), Historical Highest Flood Level (HFL).
9. **Provenance:** `OBSERVED • SOURCE: CWC`
10. **Frontend/Backend Requirement:** **BACKEND INTEGRATION REQUIRED — JOHNEY**. Direct browser connection blocked by CORS.
11. **DRISHTI UI Destination:** `waterExposureService.js`, Map Inundation layers, District Risk Top Drivers.
12. **Implementation Status:** Clean water exposure evaluation service implemented (`frontend/src/services/waterExposureService.js`).
13. **Limitations:** Browser cannot query live river gauges directly due to CORS. In absence of active CWC data, facilities report `WATER EXPOSURE: UNKNOWN`. **Strict Rule: Facilities are NEVER labeled "SAFE"**.

---

### C. OPENSTREETMAP / OVERPASS (Nearby Response Infrastructure)
1. **Source:** OpenStreetMap (OSM) via Overpass API.
2. **Official URL:** `https://www.openstreetmap.org/`
3. **Endpoints:**
   - Primary: `https://overpass-api.de/api/interpreter`
   - Fallback Mirror: `https://lz4.overpass-api.de/api/interpreter`
4. **HTTP Status:** `200 OK` (Latency: ~1.1s for 3–5km bounding queries).
5. **CORS Status:** `Access-Control-Allow-Origin: *` (Confirmed working directly in browser).
6. **Authentication:** None required.
7. **Rate Limits:** 2 concurrent requests per IP, 10,000 queries/day.
8. **Data Fields:** `id`, `lat`, `lon`, `tags` (`name`, `amenity`, `building`, `emergency`, `phone`, `operator`, `wheelchair`).
9. **Provenance:** `OPENSTREETMAP INFRASTRUCTURE`
10. **Frontend/Backend Requirement:** **FRONTEND USABLE DIRECTLY**.
11. **DRISHTI UI Destination:** `RightIntelligencePanel` under new **NEARBY RESPONSE SERVICES** section with category counters (`HOSPITALS`, `RELIEF CENTRES`, `EMERGENCY`), distance, and `[ ROUTE ]` buttons.
12. **Implementation Status:** **FULLY OPERATIONAL & IMPLEMENTED** (`frontend/src/services/nearbyServicesService.js`).
13. **Limitations:**
   - Explicit user interaction required: Initial state displays `LOCATION REQUIRED` with `[ USE MY LOCATION ]`. Geolocation is NEVER polled automatically.
   - Zero synthetic facilities: displays only real OSM returned nodes.
   - In-memory 5-minute cache with radius bounding (3–5 km) to respect Overpass usage policy.

---

### D. ROUTING (OSRM - Open Source Routing Machine)
1. **Source:** Project OSRM Public Driving Routing Service.
2. **Official URL:** `https://project-osrm.org/`
3. **Endpoint:** `https://router.project-osrm.org/route/v1/driving/{lon1},{lat1};{lon2},{lat2}?overview=full&geometries=geojson`
4. **HTTP Status:** `200 OK` (Latency: ~250–400ms).
5. **CORS Status:** `Access-Control-Allow-Origin: *` (Confirmed working directly in browser).
6. **Authentication:** None required.
7. **Rate Limits:** Public demo server: max 1 request/second.
8. **Data Fields:** `routes[0].distance` (meters), `duration` (seconds), `geometry.coordinates` (GeoJSON LineString array `[[lon, lat], ...]`).
9. **Provenance:** `ROUTING: OSRM (OPEN SOURCE ROUTING MACHINE)`
10. **Frontend/Backend Requirement:** **FRONTEND USABLE DIRECTLY**.
11. **DRISHTI UI Destination:**
   - Road route rendered directly via existing Leaflet `<Polyline />` in `MapContainer.jsx`.
   - Floating route HUD banner on map displaying Destination, Distance, ETA, and `[ CLEAR ROUTE ]`.
   - ETA attached to facility cards in `RightIntelligencePanel`.
12. **Implementation Status:** **FULLY OPERATIONAL & IMPLEMENTED** (`frontend/src/services/routingService.js`).
13. **Limitations:** Zero bundled routing engine or offline routing data (<512 MB memory preserved). If network fails, falls back gracefully to Haversine straight-line distance with explicit notice.

---

### E. INCOIS (Coastal & Ocean Hazard Intelligence)
1. **Source:** Indian National Centre for Ocean Information Services (INCOIS), MoES.
2. **Official URL:** `https://incois.gov.in/`
3. **Endpoint:** `https://incois.gov.in/portal/osf/osf.jsp` (Future backend target: `/api/v1/incois/bulletins`)
4. **HTTP Status:** `200` (Redirects to `/site/index.jsp`).
5. **CORS Status:** `NONE / NOT SET`.
6. **Authentication:** Public web pages open; programmatic feeds require backend proxy.
7. **Rate Limits:** Government firewall controls.
8. **Data Fields:** Coastal Sector, Significant Wave Height (SWH), Swell Surge alerts, High Wave Warning period, Tsunami Threat Status (Threat / Watch / No Threat).
9. **Provenance:** `COASTAL HAZARD / OCEAN ALERT • SOURCE: INCOIS`
10. **Frontend/Backend Requirement:** **BACKEND INTEGRATION REQUIRED — JOHNEY**. Direct browser connection blocked by CORS.
11. **DRISHTI UI Destination:** Evidence Center, Coastal Hazard Layers, Tsunami Bulletins.
12. **Implementation Status:** Clean service adapter implemented (`frontend/src/services/incoisService.js`). Reports honest `liveStatus: "SOURCE_UNAVAILABLE"` client-side without fake warnings.
13. **Limitations:** Never invent ocean warnings. Direct browser access restricted by CORS.

---

### F. MOSDAC / ISRO ADDITIONAL PRODUCTS (INSAT-3DS Products)
1. **Source:** Meteorological & Oceanographic Satellite Data Archival Centre (MOSDAC), SAC/ISRO & IMD.
2. **Official URL:** `https://mosdac.gov.in/`
3. **Endpoint:** Remote imagery and catalog previews (`https://mausam.imd.gov.in/Satellite/*`, `https://mosdac.gov.in/live/`)
4. **HTTP Status:** `200 OK`.
5. **CORS Status:** Direct `<img>` element loading freely supported without CORS restrictions.
6. **Authentication:** Public open access for real-time rendered image products.
7. **Rate Limits:** Standard web caching.
8. **Data Fields:**
   - Quantitative Precipitation Estimation (QPE / Rainfall rate)
   - Atmospheric Motion Vectors (AMV - Cloud motion winds)
   - Sea Surface Temperature (SST)
   - Cloud Top Temperature (CTT)
   - Aerosol Optical Depth (AOD / Smoke Plumes)
9. **Provenance:** `OBSERVED / SATELLITE PRODUCT • SOURCE: MOSDAC / ISRO & IMD`
10. **Frontend/Backend Requirement:** **FRONTEND USABLE DIRECTLY** via remote cloud image rendering.
11. **DRISHTI UI Destination:** `SatellitePanel.jsx` and `mosdacProductService.js`.
12. **Implementation Status:** **FULLY OPERATIONAL & IMPLEMENTED** (`frontend/src/services/mosdacProductService.js`).
13. **Limitations:** Avoid downloading raw HDF5/NetCDF bulk files. Use lightweight remote renders to preserve <512 MB client RAM.

---

### G. TERRAIN / ELEVATION (Open-Meteo DEM 90m)
1. **Source:** Open-Meteo High-Resolution Elevation API (Copernicus DEM 90m resolution).
2. **Official URL:** `https://open-meteo.com/en/docs/elevation-api`
3. **Endpoint:** `https://api.open-meteo.com/v1/elevation?latitude={lat}&longitude={lon}`
4. **HTTP Status:** `200 OK` (Latency: ~180ms).
5. **CORS Status:** `Access-Control-Allow-Origin: *` (Confirmed working directly in browser).
6. **Authentication:** None required.
7. **Rate Limits:** 10,000 daily API calls for non-commercial open data.
8. **Data Fields:** `elevation` (array of float elevations in meters above sea level).
9. **Provenance:** `DERIVED • SOURCE: DRISHTI + ELEVATION DATA SOURCE (OPEN-METEO DEM)`
10. **Frontend/Backend Requirement:** **FRONTEND USABLE DIRECTLY**.
11. **DRISHTI UI Destination:** `waterExposureService.js` and Topographic Hazard Context.
12. **Implementation Status:** **FULLY OPERATIONAL & IMPLEMENTED** (`frontend/src/services/terrainService.js`).
13. **Limitations:** In-memory caching by coordinate grid. Elevation is never used as an independent "safe/unsafe" decision, but rather as one evidence factor in water exposure derivation.

---

## 4. UI Polish & Operational Dossier Structure

The National Synoptic Dossier in `RightIntelligencePanel.jsx` has been restructured from verbose text blocks into compact, high-density operational cards:

```
NATIONAL SYNOPTIC DOSSIER [MODEL]
[SITUATION] [WEATHER] [RISK] [INFRA] [EVIDENCE] [ADVISORY]
-----------------------------------------------------------------
[CARD 1: SYSTEM STATUS]
IMD SYSTEM FEED: SOURCE UNAVAILABLE
Coordinates: NOT VERIFIED
Observation: NOT VERIFIED
Checked: 21:28 IST
[ OPEN IMD BULLETIN ] -> external link to IMD Cyclone Portal
-----------------------------------------------------------------
[CARD 2: PAN-INDIA METEOROLOGY]
WIND: 18 km/h [MODEL]      | RAINFALL: 0.0 mm [MODEL]
PRESSURE: DATA UNAVAILABLE | TEMPERATURE: DATA UNAVAILABLE
Checked: 21:28 IST
-----------------------------------------------------------------
[CARD 3: NEARBY RESPONSE SERVICES]
Initial State:
LOCATION REQUIRED
[ USE MY LOCATION ] (or quick test buttons: New Delhi / Digha WB)

Active State (After Permission):
HOSPITALS (12 nearby) | RELIEF CENTRES (6 nearby) | EMERGENCY (4 nearby)
[Filter Pills: ALL | HOSPITALS | RELIEF | EMERGENCY]

Facility Card Format:
🏥 General Williams Hospital
Hospitals & Medical • 1.8 km (ETA 7 min when routed)
[WATER EXPOSURE: LOW]  •  SOURCE: OpenStreetMap
[ ROUTE ] -> calculates OSRM route & renders Leaflet polyline
-----------------------------------------------------------------
```

---

## 5. Backend Integration Tasks for Johney

The following authoritative government feeds require backend proxy endpoints in `backend/app/main.py`:

1. **`GET /api/v1/imd/synoptic`**
   - Ingests `https://api.imd.gov.in/api/v1/current_wx` with `X-Api-Key` and `Authorization: Bearer <jwt>`.
   - Caches responses for 15 minutes.
   - Emits CORS header `Access-Control-Allow-Origin: *`.

2. **`GET /api/v1/sachet/alerts`**
   - Connects to NDMA SACHET server-to-server CAP feed (`https://sachet.ndma.gov.in/`).
   - Normalizes OASIS CAP XML/JSON.
   - Emits CORS header `Access-Control-Allow-Origin: *`.

3. **`GET /api/v1/cwc/flood-gauges`**
   - Connects to Central Water Commission Flood Forecast System (`https://ffs.india-water.gov.in/`).
   - Extracts station danger levels and rising/falling trends.

4. **`GET /api/v1/incois/bulletins`**
   - Ingests INCOIS Ocean State and Tsunami Bulletins (`https://incois.gov.in/`).
   - Emits structured coastal wave and surge advisories.

---

## 6. Verification & Quality Checklist

- [x] **Lint:** `npm run lint` passes with **0 errors**.
- [x] **Build:** `npm run build` succeeds in **1.28s** (Gzipped JS: ~202 kB, CSS: ~18 kB; strictly well below 512 MB limit).
- [x] **Zero Backend Modification:** No files in `backend/` modified.
- [x] **Zero Secret Exposure:** No API keys or tokens embedded in client JavaScript.
- [x] **Zero Fake Data:** Overpass facilities are 100% real OSM objects; water exposure defaults to `UNKNOWN` when evidence is missing.
- [x] **Strict Water Exposure Semantics:** Facilities are **NEVER labeled "SAFE"**.
- [x] **OSRM Road Routing:** Road geometry rendered on Leaflet map with floating HUD and `[ CLEAR ROUTE ]`.
- [x] **Explicit Geolocation:** Browser geolocation requested **only after explicit user click**.
- [x] **Historical Cyclone Remal 2024:** Preserved completely isolated from live mode.
- [x] **Git Hygiene:** No commits or pushes made.
