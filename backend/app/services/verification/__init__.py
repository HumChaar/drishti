"""
DRISHTI Verification Package
AI Flood Evidence Verification + Uncertainty Layer

Implements an independent multimodal flood-evidence verification system
that cross-checks SegFormer model-derived flood predictions with:
- Sentinel-2 optical imagery (via Google Earth Engine)
- Cloud quality gating
- Permanent water reference data
- Gemini multimodal structured verifier

This layer does NOT replace SegFormer. It adds independent observational
cross-checking and represents disagreement as risk uncertainty.
"""
