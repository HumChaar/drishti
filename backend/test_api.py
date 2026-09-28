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

    # 12. Perception Status Endpoint
    res = client.get("/api/perception/status")
    assert res.status_code == 200
    p_status = res.json()
    assert p_status["model_identifier"] == "SegFormer-B0 (best_clean)"
    assert p_status["num_parameters"] == 3713090
    print("PASS: /api/perception/status ->", p_status["model_identifier"], f"({p_status['num_parameters']:,} params, CPU)")

    # 13. Deterministic Flood Inference on Synthetic VV/VH Input
    # Construct a deterministic 224x224 synthetic VV/VH backscatter input
    import numpy as np
    np.random.seed(42)
    synthetic_vv = np.random.normal(loc=-18.0, scale=3.0, size=(224, 224)).tolist()
    synthetic_vh = np.random.normal(loc=-23.0, scale=3.0, size=(224, 224)).tolist()

    res = client.post("/api/perception/flood", json={
        "district_id": "od_balasore",
        "vv_values": synthetic_vv,
        "vh_values": synthetic_vh,
        "include_mask": False
    })
    assert res.status_code == 200, f"Perception flood failed: {res.status_code}"
    evidence = res.json()
    assert evidence["model_identifier"] == "SegFormer-B0 (best_clean)"
    assert evidence["provenance"] == "[AI INFERENCE] SegFormer-B0 SAR Flood Perception"
    assert evidence["total_pixels"] == 50176
    assert evidence["flood_pixel_count"] + evidence["non_flood_pixel_count"] == 50176
    assert 0.0 <= evidence["flood_percentage"] <= 100.0
    assert 0.0 <= evidence["flood_probability"] <= 1.0
    assert evidence["is_genuine_sar_sample"] is False
    print("PASS: /api/perception/flood -> [AI INFERENCE] Extent:", evidence["flood_percentage"], f"%, Confidence: {evidence['flood_probability']}, Latency: {evidence['inference_time_ms']}ms")

    # 14. District Perception Query Endpoint
    res_dist = client.get("/api/perception/flood/district/od_balasore?include_mask=false")
    assert res_dist.status_code == 200
    assert res_dist.json()["model_identifier"] == "SegFormer-B0 (best_clean)"
    print("PASS: /api/perception/flood/district/od_balasore -> 200 OK")

    # 15. Evidence Layer All Districts
    res_ev_all = client.get("/api/risk/evidence?step_id=NOW")
    assert res_ev_all.status_code == 200
    ev_all = res_ev_all.json()
    assert ev_all["totalDistricts"] == 8
    assert ev_all["provenance"] == "EVIDENCE_LAYER_MULTI_MODAL_AGGREGATOR"
    print("PASS: /api/risk/evidence ->", ev_all["totalDistricts"], "districts compiled into Evidence Layer")

    # 16. Single District Evidence Layer Dossier
    res_ev_bal = client.get("/api/risk/evidence/od_balasore?step_id=NOW")
    assert res_ev_bal.status_code == 200
    ev_bal = res_ev_bal.json()["district"]
    assert ev_bal["districtId"] == "od_balasore"
    assert ev_bal["cycloneHazard"]["stormName"] == "REMAL"
    assert "floodPerception" in ev_bal
    assert "meteorology" in ev_bal
    print("PASS: /api/risk/evidence/od_balasore -> Multi-Modal Evidence Dossier OK")

    # 17. District Risk Explainability Audit
    res_exp = client.get("/api/risk/explain/od_balasore?step_id=NOW")
    assert res_exp.status_code == 200
    exp = res_exp.json()
    assert "compositeScore" in exp
    assert "contributingFactors" in exp
    assert "flood_hazard" in exp["contributingFactors"]
    assert "plainTextExplanation" in exp
    print("PASS: /api/risk/explain/od_balasore ->", exp["riskBand"], f"({exp['compositeScore']}/100):", exp["plainTextExplanation"][:60], "...")

    # 18. Transparent Risk Engine Configuration & Weights
    res_cfg = client.get("/api/risk/config")
    assert res_cfg.status_code == 200
    cfg = res_cfg.json()
    assert cfg["weights"]["flood_hazard"] == 0.25
    assert cfg["weights"]["storm_surge"] == 0.20
    assert cfg["weights"]["wind_hazard"] == 0.20
    assert cfg["weights"]["vulnerability"] == 0.20
    assert cfg["weights"]["infrastructure_exposure"] == 0.15
    print("PASS: /api/risk/config -> Weights validated (5 factors, sum=1.00)")

    # 19. Dynamic Multi-Hazard Risk Evaluation
    res_dyn = client.post("/api/risk/evaluate", json={
        "districtId": "od_balasore",
        "stepId": "NOW",
        "customRainMm24h": 220.0,
        "customSurgeMeters": 3.5,
        "customFloodPct": 85.0
    })
    assert res_dyn.status_code == 200
    dyn = res_dyn.json()
    assert dyn["riskExplanation"]["compositeScore"] >= 65
    print("PASS: /api/risk/evaluate -> Dynamic risk score", dyn["riskExplanation"]["compositeScore"], f"({dyn['riskExplanation']['riskBand']})")

    # 20. Decision Intelligence & Advisory Generation
    res_adv = client.post("/api/advisory/generate", json={
        "district_id": "od_balasore",
        "step_id": "NOW",
        "language": "en"
    })
    assert res_adv.status_code == 200
    adv_data = res_adv.json()
    assert adv_data["district_id"] == "od_balasore"
    assert adv_data["risk_score"] == 86
    assert adv_data["review"]["status"] == "PENDING"
    assert len(adv_data["advisory"]["priority_actions"]) >= 2
    print("PASS: /api/advisory/generate -> Mode:", adv_data["mode"], f"(Score: {adv_data['risk_score']}, Actions: {len(adv_data['advisory']['priority_actions'])})")

    # 21. Multilingual Support
    res_lang = client.get("/api/advisory/config/languages")
    assert res_lang.status_code == 200
    langs = res_lang.json()
    assert "en" in langs and "or" in langs and "bn" in langs and "hi" in langs
    print("PASS: /api/advisory/config/languages ->", len(langs), "languages supported (English, Odia, Bengali, Hindi)")

    # 22. Human Approval Workflow
    adv_id = adv_data["advisory_id"]
    res_rev = client.post(f"/api/advisory/{adv_id}/review", json={
        "action": "APPROVE",
        "reviewer_name": "Special Relief Commissioner, Odisha",
        "reviewer_notes": "Advisory verified against ground telemetry. Mandatory evacuation authorized."
    })
    assert res_rev.status_code == 200
    assert res_rev.json()["review"]["status"] == "APPROVED"
    print("PASS: /api/advisory/{id}/review -> Human Review: APPROVED by", res_rev.json()["review"]["reviewer_name"])

    # 23. List All Advisories
    res_list = client.get("/api/advisory/all/list")
    assert res_list.status_code == 200
    assert len(res_list.json()) >= 1
    print("PASS: /api/advisory/all/list ->", len(res_list.json()), "advisories tracked in session")

    # 24. Stage 5 Decision Intelligence District Endpoint
    res_dec = client.get("/api/decision/od_balasore?step_id=NOW")
    assert res_dec.status_code == 200
    dec_data = res_dec.json()
    assert dec_data["district_id"] == "od_balasore"
    assert dec_data["human_approval_required"] is True
    assert dec_data["direct_execution_prohibited"] is True
    assert "[DECISION INTELLIGENCE]" in dec_data["provenance"]
    assert len(dec_data["recommendations"]) == 5
    dec_categories = {r["action"]["category"] for r in dec_data["recommendations"]}
    assert {"evacuation", "shelter", "maritime_port", "emergency_dispatch", "infrastructure"}.issubset(dec_categories)
    print("PASS: /api/decision/od_balasore -> 5 pillars verified [DECISION INTELLIGENCE] (Score:", dec_data["composite_risk_score"], ")")

    # 25. Stage 5 Decision Intelligence Evaluate Endpoint
    res_eval = client.post("/api/decision/evaluate", json={
        "district_id": "od_balasore",
        "step_id": "NOW",
        "custom_rain_mm": 200.0,
        "custom_surge_m": 2.5,
        "custom_wind_kmh": 110,
        "custom_flood_pct": 65.0
    })
    assert res_eval.status_code == 200
    eval_dec = res_eval.json()
    assert eval_dec["human_approval_required"] is True
    assert eval_dec["direct_execution_prohibited"] is True
    assert len(eval_dec["recommendations"]) == 5
    print("PASS: /api/decision/evaluate -> Dynamic override evaluation verified (Score:", eval_dec["composite_risk_score"], ")")

    # 26. Stage 6 Gemini Reasoning Status
    res_reas_stat = client.get("/api/reasoning/status")
    assert res_reas_stat.status_code == 200
    reas_stat = res_reas_stat.json()
    assert reas_stat["governance"]["risk_calculation_by_llm_prohibited"] is True
    print("PASS: /api/reasoning/status ->", reas_stat["mode"], f"(Model: {reas_stat['model']})")

    # 27. Stage 6 Gemini Reasoning District Advisory
    res_reas_adv = client.get("/api/reasoning/advisory/od_balasore?step_id=NOW")
    assert res_reas_adv.status_code == 200
    reas_adv = res_reas_adv.json()
    assert reas_adv["district_id"] == "od_balasore"
    assert reas_adv["risk_score"] == 86
    assert reas_adv["risk_band"] == "EXTREME"
    assert reas_adv["requires_human_approval"] is True
    assert len(reas_adv["key_risk_drivers"]) >= 2
    print("PASS: /api/reasoning/advisory/od_balasore ->", reas_adv["provenance"], f"(Score: {reas_adv['risk_score']})")

    print("========================================")
    print("ALL FASTAPI BACKEND TESTS PASSED (27/27)!")
    print("========================================")


if __name__ == "__main__":
    run_tests()


