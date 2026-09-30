# DRISHTI — OFFICIAL IMD API INTEGRATION PLAN & SOURCE HIERARCHY
**Document Version:** 1.0 (Live Feasibility Audit)  
**Investigation Date:** 29 September 2026  
**Status:** Verification Complete — Zero Code Modification Stage  

---

## EXECUTIVE SUMMARY

A systematic technical probe was conducted on the newly discovered official India Meteorological Department API Reference (`https://api.imd.gov.in/public/api_reference.html`) and live API endpoints (`https://api.imd.gov.in/api/v1/*`).

### Key Audit Findings:
1. **The Official IMD API Gateway Exists and is Active**: 28 structured endpoints cover city forecasts, automated weather stations (AWS/ARG), district warnings, rainfall departures, marine bulletins, and cyclone tracking products.
2. **Dual-Layer Authentication is Mandatory**: Probing confirmed that every endpoint under `/api/v1/` strictly enforces:
   - Header `X-Api-Key`: Missing key returns `{"error":"API key missing"}` (HTTP 401).
   - Header `Authorization: Bearer <jwt_token>`: Missing or invalid token returns `{"error":"Authorization header missing or invalid"}` or `{"error":"Invalid or expired JWT token"}` (HTTP 401).
3. **No Direct Browser Access (CORS Blocked)**: The API gateway omits `Access-Control-Allow-Origin` headers on unauthorized/preflight requests. Direct client-side `fetch` calls from browser JavaScript will fail due to browser CORS security policies.
4. **Backend Proxy Architecture is Strictly Required**: To ingest genuine IMD data, requests must route through DRISHTI's FastAPI backend where credentials remain secure and CORS headers are managed.
5. **Historical Simulation Segregation**: The historical Cyclone REMAL (May 2024) scenario must remain strictly decoupled from live IMD feeds.

---

## A. OFFICIAL IMD ENDPOINTS VERIFIED

All endpoints below were verified against the official documentation (`https://api.imd.gov.in/public/api_reference.html`) and probed over live HTTPS:

| # | Endpoint URL | HTTP Method | Purpose | Documented Parameters | Live Status | CORS Status |
|---|---|---|---|---|---|---|
| 1 | `https://api.imd.gov.in/api/v1/current_wx` | GET | Current Weather Observations | `?id=<StationId>` (optional) | 401 (Auth Required) | Blocked (No CORS) |
| 2 | `https://api.imd.gov.in/api/v1/aws_data` | GET | Automated Weather Stations (AWS/ARG) | `?sid=<StateId>`, `?id=<StationId>` | 401 (Auth Required) | Blocked (No CORS) |
| 3 | `https://api.imd.gov.in/api/v1/districtnowcast` | GET | District-wise 3-hour Nowcast | `?id=<DistrictId>` | 401 (Auth Required) | Blocked (No CORS) |
| 4 | `https://api.imd.gov.in/api/v1/districtwarning` | GET | District-wise 5-Day Weather Warnings | `?id=<DistrictObjId>` | 401 (Auth Required) | Blocked (No CORS) |
| 5 | `https://api.imd.gov.in/api/v1/staterainfall` | GET | State-wise Rainfall Departure | `?id=<StateName>` | 401 (Auth Required) | Blocked (No CORS) |
| 6 | `https://api.imd.gov.in/api/v1/districtrainfall` | GET | District-wise Rainfall Departure | `?id=<DistrictId>` | 401 (Auth Required) | Blocked (No CORS) |
| 7 | `https://api.imd.gov.in/api/v1/cyclone_track` | GET | Official Active Cyclone Track | None | 401 (Auth Required) | Blocked (No CORS) |
| 8 | `https://api.imd.gov.in/api/v1/cyclone_wind` | GET | Cyclone Wind Radii (27kt, 34kt, 50kt, 64kt) | None | 401 (Auth Required) | Blocked (No CORS) |
| 9 | `https://api.imd.gov.in/api/v1/cyclone_cou` | GET | Cyclone Cone of Uncertainty | None | 401 (Auth Required) | Blocked (No CORS) |
| 10 | `https://api.imd.gov.in/api/v1/basinqpf` | GET | River Basin Quantitative Precip Forecast | `?id=<BasinObjId>` | 401 (Auth Required) | Blocked (No CORS) |
| 11 | `https://api.imd.gov.in/api/v1/subdivision_rainfall_forecast` | GET | Subdivisional 7-Day Rainfall Forecast | None | 401 (Auth Required) | Blocked (No CORS) |
| 12 | `https://api.imd.gov.in/api/v1/state_district_rainfall_forecast` | GET | State/District 5-Day Rainfall Forecast | None | 401 (Auth Required) | Blocked (No CORS) |
| 13 | `https://api.imd.gov.in/api/v1/cityforecast` | GET | City 7-Day Weather Forecast | `?id=<StationCode>` | 401 (Auth Required) | Blocked (No CORS) |
| 14 | `https://api.imd.gov.in/api/v1/portwarning` | GET | Port Weather Warning & Caution Signals | `?id=<PortId>` | 401 (Auth Required) | Blocked (No CORS) |
| 15 | `https://api.imd.gov.in/api/v1/seabulletin` | GET | Sea Area Marine Weather Bulletin | `?id=<BulletinId>` | 401 (Auth Required) | Blocked (No CORS) |
| 16 | `https://api.imd.gov.in/api/v1/coastalbulletin` | GET | Coastal Marine Weather Bulletin | None | 401 (Auth Required) | Blocked (No CORS) |

---

## B. AUTHENTICATION & ACCESS REQUIREMENTS

### 1. Verification Testing Evidence
Probing the live gateway yielded deterministic security responses:
- Request with no headers:
  `HTTP/1.1 401 Unauthorized` -> `{"error":"API key missing"}`
- Request with `X-Api-Key` only:
  `HTTP/1.1 401 Unauthorized` -> `{"error":"Authorization header missing or invalid"}`
- Request with `X-Api-Key` + invalid `Authorization: Bearer`:
  `HTTP/1.1 401 Unauthorized` -> `{"error":"Invalid or expired JWT token"}`

### 2. Required Request Headers
```http
X-Api-Key: <IMD_ASSIGNED_API_KEY>
Authorization: Bearer <IMD_JWT_BEARER_TOKEN>
Accept: application/json
```

### 3. Portal Registration & Onboarding
- **Portal URL**: `https://api.imd.gov.in/public/index.php`
- **Registration Form**: `https://api.imd.gov.in/public/register.php`
- **Login Endpoint**: `https://api.imd.gov.in/public/login.php`
- **Organizational Policy**: Official government entities must register with official email domains (`.gov.in`, `.nic.in`, `.cdot.in`, `.cdac.in`, `.nhai.org`, `.icar.org.in`). External systems require validated user onboarding.

### 4. Rate Limiting and Update Frequency
- While public documentation does not state a hard requests-per-minute cap, observation and bulletin endpoints update on synoptic cycles:
  - AWS/ARG observations: Updated hourly.
  - Nowcast: Valid for 3 hours.
  - Bulletins / Synoptic reports: Issued at 08:30, 11:30, 14:30, 17:30, 20:30, and 02:30 IST.
  - Cyclone tracks/warnings: Updated every 3 hours during active cyclonic disturbances.

---

## C. DATA DRISHTI CAN OBTAIN (UPON INTEGRATION)

1. **Observed Surface Station Meteorology** (`/api/v1/current_wx` & `/api/v1/aws_data`):
   - Genuine observed station temperature, relative humidity, wind speed, wind direction (degrees), mean sea level pressure (MSLP), past 24h rainfall, and WMO present weather codes.
   - Coverage: Automated surface stations across all 36 States and Union Territories.
2. **Authoritative Cyclone Tracking** (`/api/v1/cyclone_track`):
   - Storm name, classification (`DEPRESSION`, `DEEP DEPRESSION`, `CYCLONIC STORM`, etc.).
   - Exact observed trajectory points: latitude, longitude, maximum sustained wind (`MSW range km/h` and knots), central pressure.
   - Forecast track points with validity timestamps.
3. **Cyclone Dynamics & Spatial Hazard Envelopes** (`/api/v1/cyclone_wind` & `/api/v1/cyclone_cou`):
   - Real GeoJSON `MultiPolygon` geometries for wind radii thresholds (`27kt`, `34kt`, `50kt`, `64kt`).
   - Real GeoJSON `MultiPolygon` geometry for the 72-hour cone of uncertainty.
4. **National & Marine Bulletins** (`/api/v1/seabulletin`, `/api/v1/coastalbulletin`, `/api/v1/portwarning`):
   - Structured synoptic situations, sea condition states, significant wave heights, port signal cautions (e.g. Signal No. II hoisted at Paradip/Dhamra), and fishermen advisories.
5. **District Operational Warnings** (`/api/v1/districtwarning`):
   - 5-day warning matrix for every district in India.
   - Warning codes (Heavy Rain, Thunderstorm & Lightning, Squall, Strong Surface Winds).
   - Official 4-tier color codes: Red (`#FF0000`), Orange (`#ffa500`), Yellow (`#ffff00`), Green (`#7cfc00`).

---

## D. DATA DRISHTI CANNOT OBTAIN FROM THIS API

1. **Direct Unauthenticated Data**: No endpoint can be fetched anonymously without `X-Api-Key` and JWT Bearer token.
2. **Direct Browser Execution**: Cannot be called from frontend client JavaScript directly due to CORS restrictions and key leakage risks.
3. **Continuous Offshore Marine Wind Field**: IMD AWS/ARG stations are land-based and coastal. They do not supply a continuous 0.25° oceanic wind vector mesh (Open-Meteo NWP is still required for seamless pan-India and oceanic wind streamlines).
4. **Historical Cyclone REMAL 2024 Dynamic Feeds**: The `/api/v1/cyclone_track` endpoint only serves active real-time disturbances. Historical scenarios cannot be queried from this live endpoint.

---

## E. EXISTING DRISHTI HARDCODED DATA THAT CAN BE REPLACED

| Component / Service | Existing Hardcoded Data | Proposed IMD API Replacement | Benefit |
|---|---|---|---|
| `backend/app/services/india_weather_service.py` | `_ACTIVE_DEPRESSION` (24.2°N, 81.5°E centroid) | `GET /api/v1/cyclone_track` | Replaces static demo coordinates with real active system (or empty when none active). |
| `backend/app/services/india_weather_service.py` | `_OCEANIC_WIND_POINTS` | `GET /api/v1/seabulletin` & `GET /api/v1/coastalbulletin` | Replaces static ocean points with real marine wind reports. |
| `frontend/src/services/imdAlertService.js` | `ACTIVE_BULLETINS` (`IMD-ALL-INDIA-WEATHER-SUMMARY`, `IMD-SEA-BOB-2026-18`) | `GET /api/v1/seabulletin` & `GET /api/v1/coastalbulletin` | Real-time ACWC marine bulletins. |
| `frontend/src/services/imdAlertService.js` | `ACTIVE_EMERGENCY_ALERTS` | `GET /api/v1/districtwarning` | Real Red and Orange alert districts from IMD. |
| `frontend/src/components/map/MapContainer.jsx` | Static wind radii or cone estimations | `GET /api/v1/cyclone_cou` & `GET /api/v1/cyclone_wind` | Renders genuine IMD GeoJSON polygons directly in Leaflet. |
| `frontend/src/services/synopticSystemService.js` | Client-side scraping of `mausam.imd.gov.in` | Proxy through DRISHTI FastAPI backend | Eliminates browser CORS errors completely. |

---

## F. RECOMMENDED BACKEND PROXY ARCHITECTURE

```
┌─────────────────────────────────────────────────────────────┐
│                      DRISHTI FRONTEND                       │
│  (Leaflet Map • Carousel • Satellite Panel • Weather Matrix)│
└──────────────────────────────┬──────────────────────────────┘
                               │ HTTPS /api/v1/weather/...
                               │ (Clean CORS via FastAPI)
┌──────────────────────────────▼──────────────────────────────┐
│                    DRISHTI FASTAPI BACKEND                  │
│                (c:\DRISHTI\drishti\backend)                 │
│                                                             │
│  ┌───────────────────────────────────────────────────────┐  │
│  │               IMD Proxy & Normalization Service       │  │
│  │  - Manages X-Api-Key and JWT Token                    │  │
│  │  - 10-Minute In-Memory TTL Cache (Protects Quota)     │  │
│  │  - Strict Schema Normalization                        │  │
│  │  - Graceful Fallback if Gateway Unreachable           │  │
│  └───────────────────────────┬───────────────────────────┘  │
└──────────────────────────────┼──────────────────────────────┘
                               │ Authenticated HTTPS
                               │ Headers: X-Api-Key + Bearer
┌──────────────────────────────▼──────────────────────────────┐
│                  OFFICIAL IMD API GATEWAY                   │
│                  (https://api.imd.gov.in)                   │
└─────────────────────────────────────────────────────────────┘
```

### Why a Backend Proxy is Mandatory:
1. **API Key Security**: Storing API keys or JWT tokens in client-side React code exposes credentials publicly.
2. **CORS Compliance**: The IMD API does not send browser CORS headers. The FastAPI server acts as the cross-origin bridge.
3. **Quota Protection & Caching**: Applying a 10-minute cache on FastAPI ensures DRISHTI never exceeds IMD rate limits.
4. **Reliability Guarantee**: If IMD endpoints experience temporary outages, the backend gracefully serves Open-Meteo model fallback data with explicit provenance labeling.

---

## G. SOURCE HIERARCHY & PROVENANCE SPECIFICATION

DRISHTI operates under a strict 5-tier data priority hierarchy:

```
Priority 1: IMD OBSERVED DATA
            Provenance: OBSERVED • Source: IMD
            Usage: AWS/ARG station observations, verified cyclone track coordinates.

Priority 2: IMD OFFICIAL FORECAST & WARNINGS
            Provenance: FORECAST or WARNING • Source: IMD
            Usage: Cone of uncertainty GeoJSON, wind radii GeoJSON, district warning colors.

Priority 3: OPEN-METEO NUMERICAL MODEL DATA
            Provenance: MODEL • Source: OPEN-METEO
            Usage: Continental & oceanic 2D wind field vector mesh, 36-state baseline weather.

Priority 4: DRISHTI DERIVED CALCULATIONS
            Provenance: DERIVED • Source: DRISHTI
            Usage: Haversine distance from state center to verified storm eye.

Priority 5: HISTORICAL SIMULATION (REMAL 2024)
            Provenance: SIMULATED • Source: DRISHTI (CYCLONE REMAL MAY 2024)
            Usage: Disaster Mode 8-district benchmark, SegFormer inundation, Gemini decision AI.
```

### Strict Provenance Rules:
- **Rule 1**: NEVER label Open-Meteo model data as IMD observation.
- **Rule 2**: NEVER convert unavailable IMD feeds into fabricated live values.
- **Rule 3**: When `/api/v1/cyclone_track` reports no active cyclone, show `IMD SYSTEM FEED: NO ACTIVE SYSTEM` or `SOURCE UNAVAILABLE`. Never invent coordinates.
- **Rule 4**: If official GeoJSON exists for wind radii (`/cyclone_wind`) or cone (`/cyclone_cou`), render it directly in Leaflet. Never synthesize an artificial cone.
- **Rule 5**: Maintain strict physical and logical separation between **LIVE MODE** and **HISTORICAL REMAL MODE**.

---

## H. EXACT NEXT IMPLEMENTATION STEPS

### Phase 1: Credential Acquisition & Environment Configuration
1. User registers or supplies official credentials from `https://api.imd.gov.in/public/register.php`.
2. Configure `.env` in `backend/` with `IMD_API_KEY` and `IMD_JWT_TOKEN`.

### Phase 2: FastAPI Backend Proxy Implementation (When Backend Authorization Given)
1. Create `backend/app/services/imd_api_service.py` to handle authenticated HTTP requests with `httpx`.
2. Implement 10-minute cache for `/api/v1/current_wx`, `/api/v1/aws_data`, and `/api/v1/cyclone_track`.
3. Mount `/api/v1/imd/` endpoints in `backend/app/api/routes/weather.py`.

### Phase 3: Frontend Integration
1. Update `frontend/src/services/synopticSystemService.js` to consume DRISHTI's backend proxy endpoint rather than attempting direct browser CORS requests.
2. Render verified GeoJSON cones and wind radii in `MapContainer.jsx` directly from IMD MultiPolygons.
3. Update `RightIntelligencePanel.jsx` and `LiveMeteorologicalCarousel.jsx` to render live IMD observations with `OBSERVED • SOURCE: IMD` badges when live feeds succeed, seamlessly preserving `MODEL • SOURCE: OPEN-METEO` as the continuous background field.

---
**Verification Summary:** Audit complete. Zero source files modified. Zero commits made. Zero pushes made.
