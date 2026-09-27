# DRISHTI FastAPI Backend Foundation

Production MVP backend for DRISHTI (Disaster Risk Intelligence & Surveillance Hazard Tracking Interface).

Serves cyclone telemetry, temporal hazard scenario forecasting, district vulnerability matrices, critical coastal infrastructure, and emergency standard operating procedure (SOP) directives.

---

## 1. Local Setup

### Prerequisites
- Python 3.10+ (Recommended: Python 3.12)
- pip

### Installation
Navigate to the `backend/` directory:

```bash
cd backend
python -m venv venv
# Windows:
venv\Scripts\activate
# Linux/macOS:
source venv/bin/activate

pip install -r requirements.txt
```

---

## 2. Environment Variables

Create a `.env` file in `backend/` or configure via host environment:

| Variable | Default | Description |
| :--- | :--- | :--- |
| `ENVIRONMENT` | `development` | Environment mode (`development`, `production`) |
| `PORT` | `8000` | Port for the Uvicorn ASGI server |
| `ALLOWED_ORIGINS` | `http://localhost:5173,http://localhost:3000` | Comma-separated list of allowed CORS origins for Vite / Vercel |

> **Note on CORS**: The backend also includes a secure regex pattern (`r"^https:\/\/.*\.vercel\.app$"`) to automatically permit Vercel branch preview deployments without resorting to a wildcard `*`.

---

## 3. Running Locally

Run Uvicorn in development mode with hot reload:

```bash
uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

Interactive API documentation will be available at:
- **Swagger UI**: [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)
- **ReDoc**: [http://127.0.0.1:8000/redoc](http://127.0.0.1:8000/redoc)

---

## 4. Render Deployment (Free Tier)

This service is configured for direct zero-downtime deployment on Render's free tier.

### Deployment Settings
- **Environment**: Python 3
- **Root Directory**: `backend`
- **Build Command**: `pip install -r requirements.txt`
- **Start Command**: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
- **Plan**: Free

### Render Blueprint
A `render.yaml` specification is provided in the `backend/` directory for automated blueprint deployments.

---

## 5. Available API Endpoints

All endpoints are mounted under `/api`:

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/health` | Service health status, environment, and data provenance |
| `GET` | `/api/cyclone` | Active monitored cyclone metadata (Cyclone REMAL BOB/01/2024) |
| `GET` | `/api/cyclone/timeline` | List of temporal replay forecast steps (`T-24h` to `+72h`) |
| `GET` | `/api/cyclone/scenario/{step_id}` | Cyclone coordinates, wind speed, pressure, track, and cone coordinates |
| `GET` | `/api/risk/districts?step_id=NOW` | Coastal districts ranked by composite hazard risk score |
| `GET` | `/api/risk/district/{district_id}?step_id=NOW` | Single district vulnerability dossier and surge/rain metrics |
| `GET` | `/api/infrastructure` | Critical ports, cyclone shelters (MPCS), hospitals, and power grids |
| `GET` | `/api/emergency/directives` | Incident command SOP directives, evacuation metrics, and port signals |
| `PATCH` | `/api/emergency/directive/{id}` | Update status of an incident directive |
| `GET` | `/api/weather/bulletin` | IMD marine weather bulletin and sea state archive |
