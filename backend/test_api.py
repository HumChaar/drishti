"""
DRISHTI FastAPI Backend Test Suite
Validates all required endpoints, schemas, CORS, and error handling.
"""
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def run_tests():
    print("========================================")
    print("RUNNING DRISHTI FASTAPI ENDPOINT TESTS")
    print("========================================")

    # 1. Health Endpoints (Root /health and /api/health)
    res_root = client.get("/health")
    assert res_root.status_code == 200, f"Root /health check failed: {res_root.status_code}"
    assert res_root.json()["status"] == "healthy"
    print("PASS: /health ->", res_root.json()["status"])

    res = client.get("/api/health")
    assert res.status_code == 200, f"Health check failed: {res.status_code}"
    data = res.json()
    assert data["status"] == "healthy"
    assert "HISTORICAL SIMULATION" in data["provenance"]
    print("PASS: /api/health ->", data["status"], f"(provenance: {data['provenance']})")

    # 1b. OpenAPI Docs
    res_docs = client.get("/docs")
    assert res_docs.status_code == 200
    print("PASS: /docs -> 200 OK")

    # 2. Cyclone Metadata
    res = client.get("/api/cyclone")
    assert res.status_code == 200
    cyclone = res.json()
    assert cyclone["stormId"] == "BOB-01-2024-REMAL"
    assert cyclone["name"] == "Cyclone REMAL"
    print("PASS: /api/cyclone ->", cyclone["name"], f"[{cyclone['category']}]")

    # 3. Cyclone Timeline
    res = client.get("/api/cyclone/timeline")
    assert res.status_code == 200
    timeline = res.json()
    assert len(timeline) == 7
    step_ids = [s["id"] for s in timeline]
    assert "NOW" in step_ids and "+12h" in step_ids and "T-24h" in step_ids
    print("PASS: /api/cyclone/timeline ->", step_ids)

    # 4. Cyclone Scenario (NOW and +12h)
    res = client.get("/api/cyclone/scenario/NOW")
    assert res.status_code == 200
    sc_now = res.json()
    assert sc_now["success"] is True
    assert sc_now["data"]["current"]["category"] == "Severe Cyclonic Storm (SCS)"
    # Check isSimulated flags
    assert len(sc_now["data"]["forecastTrack"]) > 0
    assert sc_now["data"]["forecastTrack"][0]["isSimulated"] is True
    assert sc_now["data"]["pastTrack"][0]["isSimulated"] is False
    print("PASS: /api/cyclone/scenario/NOW ->", sc_now["data"]["current"]["latitude"], sc_now["data"]["current"]["longitude"])

    # 4a. Support CURRENT as alias for NOW
    res_curr = client.get("/api/cyclone/scenario/CURRENT")
    assert res_curr.status_code == 200
    assert res_curr.json()["data"]["current"]["pressureMb"] == 984
    print("PASS: /api/cyclone/scenario/CURRENT -> alias for NOW resolved successfully")

    res = client.get("/api/cyclone/scenario/+12h")
    assert res.status_code == 200
    sc_landfall = res.json()
    assert sc_landfall["data"]["current"]["windKt"] == 60
    print("PASS: /api/cyclone/scenario/+12h -> peak wind", sc_landfall["data"]["current"]["windKt"], "kt")

    # 4b. Cyclone Scenario 404 test
    res = client.get("/api/cyclone/scenario/INVALID_STEP_XYZ")
    assert res.status_code == 404
    print("PASS: /api/cyclone/scenario/INVALID_STEP_XYZ -> 404 Not Found (Correct)")

    # 5. District Risk Matrix
    res = client.get("/api/risk/districts?step_id=NOW")
    assert res.status_code == 200
    districts_res = res.json()
    assert districts_res["totalDistrictsMonitored"] == 8
    top_district = districts_res["districts"][0]
    print("PASS: /api/risk/districts -> total monitored:", districts_res["totalDistrictsMonitored"], f"(top risk: {top_district['name']} {top_district['risk']['riskScore']}/100)")

    # 6. District Detail
    res = client.get("/api/risk/district/od_balasore?step_id=NOW")
    assert res.status_code == 200
    balasore = res.json()
    assert balasore["name"] == "Balasore"
    assert balasore["risk"]["riskScore"] == 86
    print("PASS: /api/risk/district/od_balasore ->", balasore["name"], balasore["risk"]["riskBand"], f"score {balasore['risk']['riskScore']}")

    # 6b. District Detail 404 test
    res = client.get("/api/risk/district/non_existent_district")
    assert res.status_code == 404
    print("PASS: /api/risk/district/non_existent_district -> 404 Not Found (Correct)")

    # 7. Infrastructure Assets
    res = client.get("/api/infrastructure")
    assert res.status_code == 200
    infra = res.json()
    assert infra["totalAssets"] >= 10
    print("PASS: /api/infrastructure ->", infra["totalAssets"], "assets found")

    # 8. Emergency Directives
    res = client.get("/api/emergency/directives")
    assert res.status_code == 200
    emerg = res.json()
    assert len(emerg["directives"]) >= 6
    assert emerg["metrics"]["totalEvacuated"] == 485000
    print("PASS: /api/emergency/directives ->", len(emerg["directives"]), "SOP directives, evacuees:", emerg["metrics"]["totalEvacuated"])

    # 9. Weather Bulletin
    res = client.get("/api/weather/bulletin")
    assert res.status_code == 200
    weather = res.json()
    assert "bulletinNo" in weather
    print("PASS: /api/weather/bulletin ->", weather["bulletinNo"])

    # 10. CORS Options preflight test
    res = client.options("/api/health", headers={"Origin": "http://localhost:5173", "Access-Control-Request-Method": "GET"})
    assert res.status_code == 200
    assert res.headers.get("access-control-allow-origin") == "http://localhost:5173"
    print("PASS: CORS Preflight -> access-control-allow-origin:", res.headers.get("access-control-allow-origin"))

    # 11. CORS Vercel preview regex test
    res = client.options("/api/health", headers={"Origin": "https://drishti-git-deployment-humchaar.vercel.app", "Access-Control-Request-Method": "GET"})
    assert res.status_code == 200
    assert res.headers.get("access-control-allow-origin") == "https://drishti-git-deployment-humchaar.vercel.app"
    print("PASS: CORS Vercel Preview Regex -> access-control-allow-origin:", res.headers.get("access-control-allow-origin"))

    print("========================================")
    print("ALL FASTAPI BACKEND TESTS PASSED (11/11)!")
    print("========================================")

if __name__ == "__main__":
    run_tests()
