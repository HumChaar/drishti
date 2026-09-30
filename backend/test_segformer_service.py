"""
DRISHTI Stage 3A: SegFormer Production Inference Layer Test Suite
Validates:
1. Strict model loading with layer remapping
2. Exact VV/VH preprocessing (clipping, channels, resolution)
3. SegFormer segmentation inference and evidence object generation
4. Tensor fixture handling (explicit non-genuine sample flag)
5. ONNX export compatibility and numerical parity
6. FastAPI endpoints (/api/inference/status and /api/inference/benchmark-segmentation)
"""

import os
import sys
import numpy as np
import pytest

torch = pytest.importorskip("torch", reason="PyTorch not installed; skipping SegFormer service tests")
from fastapi.testclient import TestClient

from app.main import app
from app.services.flood_inference_service import (
    FloodInferenceService,
    CHECKPOINT_DIR,
    flood_inference_service,
)

client = TestClient(app)


def test_model_loading_and_remapping():
    print("\n--- TEST 1: Model Loading & Layer Remapping ---")
    service = FloodInferenceService(CHECKPOINT_DIR)
    assert service.is_checkpoint_available(), "Checkpoint files missing!"
    
    model = service.load_model()
    assert model is not None, "Model failed to load"
    
    # Check total parameters
    total_params = sum(p.numel() for p in model.parameters())
    assert total_params == 3713090, f"Unexpected parameter count: {total_params}"
    
    # Check input channels on first patch embedding layer
    first_conv = model.segformer.encoder.patch_embeddings[0].proj
    assert first_conv.in_channels == 2, f"Expected 2 in_channels, got {first_conv.in_channels}"
    
    # Check classifier output channels (binary classes: NON_FLOOD, FLOOD)
    classifier = model.decode_head.classifier
    assert classifier.out_channels == 2, f"Expected 2 out_channels, got {classifier.out_channels}"
    
    print(f"PASS: SegFormer-B0 successfully loaded with strict=True (Params: {total_params:,})")


def test_exact_preprocessing():
    print("\n--- TEST 2: Exact VV/VH Preprocessing Verification ---")
    service = FloodInferenceService(CHECKPOINT_DIR)
    
    # Create synthetic test arrays with extreme values outside clipping range
    vv_raw = np.array([[-50.0, 15.0], [-20.0, 0.0]], dtype=np.float32)
    vh_raw = np.array([[-60.0, 10.0], [-30.0, -10.0]], dtype=np.float32)
    
    processed = service.preprocess_vv_vh(vv_raw, vh_raw)
    
    # Check output shape: (1, 2, 224, 224)
    assert processed.shape == (1, 2, 224, 224), f"Unexpected shape: {processed.shape}"
    assert processed.dtype == torch.float32, f"Unexpected dtype: {processed.dtype}"
    
    # Check clipping constraints
    vv_out = processed[0, 0]
    vh_out = processed[0, 1]
    
    assert vv_out.min().item() >= -35.0, f"VV below -35.0: {vv_out.min().item()}"
    assert vv_out.max().item() <= 5.0, f"VV above 5.0: {vv_out.max().item()}"
    assert vh_out.min().item() >= -40.0, f"VH below -40.0: {vh_out.min().item()}"
    assert vh_out.max().item() <= 0.0, f"VH above 0.0: {vh_out.max().item()}"
    
    # Test invalid channel count error handling
    invalid_tensor = np.zeros((3, 224, 224), dtype=np.float32)
    try:
        service.preprocess_multichannel_tensor(invalid_tensor)
        assert False, "Should have raised ValueError for 3-channel input"
    except ValueError as e:
        assert "Expected exactly 2 channels" in str(e)
    
    print("PASS: Preprocessing correctly enforces VV [-35, 5], VH [-40, 0], and 224x224 shape")


def test_inference_and_evidence_object():
    print("\n--- TEST 3: Segmentation Inference & Evidence Object ---")
    service = FloodInferenceService(CHECKPOINT_DIR)
    
    # Create controlled fixture (1, 2, 224, 224)
    vv = np.random.uniform(-30.0, 0.0, size=(224, 224)).astype(np.float32)
    vh = np.random.uniform(-35.0, -5.0, size=(224, 224)).astype(np.float32)
    
    evidence = service.infer((vv, vh), is_genuine_sample=False, include_mask=True)
    
    # Verify evidence schema fields
    assert evidence.model_identifier == "SegFormer-B0 (best_clean)"
    assert evidence.base_model == "nvidia/mit-b0"
    assert evidence.input_shape == [1, 2, 224, 224]
    assert evidence.output_shape == [1, 2, 224, 224]
    assert evidence.total_pixels == 50176  # 224 * 224
    assert evidence.flood_pixel_count + evidence.non_flood_pixel_count == 50176
    assert 0.0 <= evidence.flood_percentage <= 100.0
    assert evidence.classes == {"0": "NON_FLOOD", "1": "FLOOD"}
    assert evidence.is_genuine_sar_sample is False
    assert "Tensor fixture" in evidence.validation_note
    assert evidence.flood_mask is not None
    assert len(evidence.flood_mask) == 224
    assert len(evidence.flood_mask[0]) == 224
    assert evidence.inference_time_ms > 0
    
    print(f"PASS: Inference produced valid evidence object:")
    print(f"      Total pixels: {evidence.total_pixels}")
    print(f"      Flood pixels: {evidence.flood_pixel_count} ({evidence.flood_percentage}%)")
    print(f"      Inference time: {evidence.inference_time_ms} ms")
    print(f"      Provenance: {evidence.provenance}")


def test_onnx_export_and_numerical_parity():
    print("\n--- TEST 4: ONNX Export & Parity Verification ---")
    import onnx
    import onnxruntime as ort
    
    service = FloodInferenceService(CHECKPOINT_DIR)
    scratch_onnx = os.path.join(CHECKPOINT_DIR, "test_export.onnx")
    
    # Export
    exported_path = service.export_onnx(scratch_onnx)
    assert os.path.exists(exported_path)
    file_size_mb = os.path.getsize(exported_path) / (1024 * 1024)
    assert 14.0 <= file_size_mb <= 16.0, f"Unexpected ONNX size: {file_size_mb:.2f} MB"
    
    # Validate ONNX model proto
    onnx_proto = onnx.load(exported_path)
    onnx.checker.check_model(onnx_proto)
    
    # Compare ONNX Runtime vs PyTorch on identical test tensor
    dummy_input = torch.randn(1, 2, 224, 224, dtype=torch.float32)
    
    pytorch_model = service.load_model()
    with torch.no_grad():
        py_logits = pytorch_model(pixel_values=dummy_input).logits.numpy()
        
    session = ort.InferenceSession(exported_path, providers=["CPUExecutionProvider"])
    ort_logits = session.run(["logits"], {"pixel_values": dummy_input.numpy()})[0]
    
    max_diff = np.abs(py_logits - ort_logits).max()
    assert max_diff < 1e-4, f"Parity difference too large: {max_diff}"
    
    # Clean up test artifact
    if os.path.exists(scratch_onnx):
        os.remove(scratch_onnx)
        
    print(f"PASS: ONNX export validated with onnx.checker (Size: {file_size_mb:.2f} MB)")
    print(f"      Max parity difference PyTorch vs ONNX: {max_diff:.6e} (< 1e-4)")


def test_api_endpoints():
    print("\n--- TEST 5: FastAPI Inference API Endpoints ---")
    
    # 1. GET /api/inference/status
    res = client.get("/api/inference/status")
    assert res.status_code == 200, f"Status endpoint failed: {res.status_code}"
    status_data = res.json()
    assert status_data["model_identifier"] == "SegFormer-B0 (best_clean)"
    assert status_data["num_parameters"] == 3713090
    assert status_data["input_channels"] == 2
    assert status_data["input_size"] == 224
    print(f"PASS: GET /api/inference/status -> 200 OK (Params: {status_data['num_parameters']:,})")
    
    # 2. POST /api/inference/benchmark-segmentation
    res_bench = client.post("/api/inference/benchmark-segmentation?fixture_type=baseline&include_mask=false")
    assert res_bench.status_code == 200, f"Benchmark failed: {res_bench.status_code}"
    bench_data = res_bench.json()
    assert bench_data["model_identifier"] == "SegFormer-B0 (best_clean)"
    assert bench_data["total_pixels"] == 50176
    assert bench_data["flood_mask"] is None  # Since include_mask=false
    assert bench_data["is_genuine_sar_sample"] is False
    print(f"PASS: POST /api/inference/benchmark-segmentation -> 200 OK (Flood: {bench_data['flood_percentage']}%)")


    # 3. GET /api/perception/status (Health / status check)
    res_perc_status = client.get("/api/perception/status")
    assert res_perc_status.status_code == 200
    p_status = res_perc_status.json()
    assert p_status["model_loaded"] is True or p_status["checkpoint_exists"] is True
    assert p_status["num_parameters"] == 3713090
    print(f"PASS: GET /api/perception/status -> 200 OK (Parameters: {p_status['num_parameters']:,}, Device: {p_status['device']})")

    # 4. POST /api/perception/segformer (Evidence schema validation)
    synthetic_vv = np.random.normal(loc=-18.0, scale=3.0, size=(224, 224)).tolist()
    synthetic_vh = np.random.normal(loc=-23.0, scale=3.0, size=(224, 224)).tolist()
    res_seg = client.post("/api/perception/segformer", json={
        "district_id": "od_balasore",
        "vv_values": synthetic_vv,
        "vh_values": synthetic_vh,
        "include_mask": False
    })
    assert res_seg.status_code == 200, f"SegFormer endpoint failed: {res_seg.status_code}"
    seg_ev = res_seg.json()
    assert seg_ev["model"] == "SegFormer-B0"
    assert "NON_FLOOD" in str(seg_ev["classes"]) and "FLOOD" in str(seg_ev["classes"])
    assert "flood_probability" in seg_ev
    assert "flood_pixels" in seg_ev
    assert seg_ev["total_pixels"] == 50176
    assert 0.0 <= seg_ev["flood_percentage"] <= 100.0
    assert "provenance" in seg_ev
    assert seg_ev["is_genuine_sar_sample"] is False
    print(f"PASS: POST /api/perception/segformer -> 200 OK (Extent: {seg_ev['flood_percentage']}%, Confidence: {seg_ev['flood_probability']})")

    # 5. Invalid Input Error Handling
    res_invalid = client.post("/api/perception/segformer", json="INVALID_NON_OBJECT_PAYLOAD")
    assert res_invalid.status_code == 422
    print("PASS: POST /api/perception/segformer invalid payload -> 422 Unprocessable Entity (Correct)")


def run_all_tests():
    print("==================================================================")
    print("RUNNING DRISHTI STAGE 3A SEGFORMER INFERENCE TEST SUITE")
    print("==================================================================")
    
    test_model_loading_and_remapping()
    test_exact_preprocessing()
    test_inference_and_evidence_object()
    test_onnx_export_and_numerical_parity()
    test_api_endpoints()
    
    print("==================================================================")
    print("ALL STAGE 3A TESTS PASSED (5/5)! ALL SEGFORMER TESTS VERIFIED!")
    print("==================================================================")


if __name__ == "__main__":
    run_all_tests()
