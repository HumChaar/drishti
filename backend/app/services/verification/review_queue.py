"""
DRISHTI Human Review Queue (Phase 9)

In-memory review queue for uncertain flood-evidence decisions that require
human approval before operational action.

Review items are generated when:
    - Uncertainty interval crosses a risk-band boundary
    - Band crossing is detected by verification_policy.py

Review statuses: PENDING → APPROVED | REJECTED | ESCALATED

Every decision is logged to the audit log.

NOTE: This is an in-memory implementation for the MVP.
For production, replace with a persistent database (e.g. PostgreSQL via Supabase).
Data is cleared on server restart. For persistence in MVP, a JSON file is
optionally written to disk.
"""

from __future__ import annotations
import uuid
import json
import os
import logging
from datetime import datetime, timezone
from typing import List, Optional, Dict, Any

from app.models.schemas import ReviewItem, ReviewStatus, AuditLogEntry, RiskUncertaintyResult, VerificationResult

logger = logging.getLogger(__name__)

# Optional disk persistence for MVP (not a database — just JSON file)
REVIEW_QUEUE_FILE = os.path.join(
    os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))),
    "data", "review_queue.json"
)
AUDIT_LOG_FILE = os.path.join(
    os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))),
    "data", "audit_log.json"
)


class ReviewQueueService:
    """
    Manages the human review queue for uncertain flood-evidence decisions.

    Key guarantees:
    - PENDING items require human action before they are cleared
    - Review decisions are logged to the audit log
    - API keys and secrets are NEVER stored
    - Auto-creates data directory if it doesn't exist
    """

    def __init__(self):
        self._queue: Dict[str, ReviewItem] = {}
        self._audit_log: List[AuditLogEntry] = []
        self._load_from_disk()

    # ------------------------------------------------------------------
    # Queue Operations
    # ------------------------------------------------------------------

    def add_review_item(
        self,
        risk: RiskUncertaintyResult,
        verification: VerificationResult,
        event_id: str,
        location: Optional[str] = None,
        affected_population: Optional[int] = None,
        affected_road_km: Optional[float] = None,
        affected_hospitals: Optional[int] = None,
    ) -> Optional[ReviewItem]:
        """
        Adds a new review item if human review is required.
        Returns the item if added, None otherwise.
        """
        if not risk.requires_human_review:
            return None

        review_id = f"rev_{uuid.uuid4().hex[:12]}"
        now = datetime.now(timezone.utc).isoformat()

        evidence_sources = [
            "[AI MODEL PREDICTION] SegFormer-B0 SAR Dual-Polarization Flood Segmentation",
            f"Sentinel-2 optical evidence: {verification.cloud_quality.quality}",
            f"Permanent water check: {'FLAGGED' if verification.permanent_water.is_flagged else 'NOT FLAGGED'}",
            "[AI VERIFICATION] Gemini structured verifier (second opinion only)"
        ]

        flag_reason = risk.human_review_reason or (
            f"Uncertainty interval [{risk.risk_lower}–{risk.risk_upper}] crosses a risk-band boundary."
        )

        item = ReviewItem(
            review_id=review_id,
            created_at=now,
            location=location,
            roi=verification.roi,
            risk_zone_id=verification.risk_zone_id,
            event_id=event_id,
            central_risk=risk.central_risk,
            risk_lower=risk.risk_lower,
            risk_upper=risk.risk_upper,
            risk_band=risk.risk_band,
            uncertainty_adjustment=risk.uncertainty_adjustment,
            verification_verdict=verification.verdict.verdict,
            failure_mode=verification.verdict.failure_mode,
            evidence_quality=verification.verdict.evidence_quality,
            disagreement_level=verification.verdict.disagreement_level,
            affected_population=affected_population,
            affected_road_km=affected_road_km,
            affected_hospitals=affected_hospitals,
            evidence_sources=evidence_sources,
            model_version="SegFormer-B0 (best_clean)",
            provenance=(
                "[VERIFICATION LAYER] AI Flood Evidence Verification + Uncertainty Layer — "
                "Requires human review before operational decision."
            ),
            review_status=ReviewStatus.PENDING,
            flag_reason=flag_reason
        )

        self._queue[review_id] = item
        self._log_audit(
            event_type="VERIFICATION_RUN",
            event_id=event_id,
            zone_id=verification.risk_zone_id,
            verification_verdict=verification.verdict.verdict,
            risk_score=risk.central_risk,
            risk_lower=risk.risk_lower,
            risk_upper=risk.risk_upper,
            evidence_sources=evidence_sources
        )
        self._save_to_disk()
        logger.info(f"[ReviewQueue] Added review item {review_id} (verdict={verification.verdict.verdict}, band_crossing={risk.band_boundaries_crossed})")
        return item

    def get_queue(self, status_filter: Optional[str] = None) -> List[ReviewItem]:
        """Returns all queue items, optionally filtered by status."""
        items = list(self._queue.values())
        if status_filter:
            items = [i for i in items if i.review_status.value == status_filter.upper()]
        # Sort by created_at descending
        items.sort(key=lambda x: x.created_at, reverse=True)
        return items

    def get_item(self, review_id: str) -> Optional[ReviewItem]:
        """Returns a single review item by ID."""
        return self._queue.get(review_id)

    def submit_decision(
        self,
        review_id: str,
        action: str,
        reviewer_name: Optional[str] = None,
        reviewer_note: Optional[str] = None
    ) -> Optional[ReviewItem]:
        """
        Submits a human review decision.

        Action must be: APPROVE | REJECT | ESCALATE

        Every decision is logged to the audit trail.
        API keys and secrets are NEVER stored.
        """
        item = self._queue.get(review_id)
        if not item:
            return None

        action_upper = action.upper()
        valid_actions = {"APPROVE", "REJECT", "ESCALATE"}
        if action_upper not in valid_actions:
            raise ValueError(f"Invalid action '{action}'. Must be one of: {valid_actions}")

        status_map = {
            "APPROVE": ReviewStatus.APPROVED,
            "REJECT": ReviewStatus.REJECTED,
            "ESCALATE": ReviewStatus.ESCALATED
        }

        now = datetime.now(timezone.utc).isoformat()
        item.review_status = status_map[action_upper]
        item.reviewer_name = reviewer_name
        item.reviewer_note = reviewer_note
        item.reviewed_at = now

        self._queue[review_id] = item

        self._log_audit(
            event_type="REVIEW_DECISION",
            event_id=item.event_id,
            zone_id=item.risk_zone_id,
            verification_verdict=item.verification_verdict,
            risk_score=item.central_risk,
            risk_lower=item.risk_lower,
            risk_upper=item.risk_upper,
            review_decision=action_upper,
            reviewer_note=reviewer_note,
            user_reviewer=reviewer_name,
            evidence_sources=item.evidence_sources
        )

        self._save_to_disk()
        logger.info(f"[ReviewQueue] Decision {action_upper} submitted for {review_id} by {reviewer_name}")
        return item

    def get_pending_count(self) -> int:
        """Returns count of PENDING review items."""
        return sum(1 for i in self._queue.values() if i.review_status == ReviewStatus.PENDING)

    # ------------------------------------------------------------------
    # Audit Log
    # ------------------------------------------------------------------

    def get_audit_log(self, limit: int = 100) -> List[AuditLogEntry]:
        """Returns the audit log, most recent first."""
        return list(reversed(self._audit_log))[:limit]

    def _log_audit(
        self,
        event_type: str,
        event_id: str,
        zone_id: Optional[str] = None,
        verification_verdict: Optional[str] = None,
        risk_score: Optional[int] = None,
        risk_lower: Optional[int] = None,
        risk_upper: Optional[int] = None,
        review_decision: Optional[str] = None,
        reviewer_note: Optional[str] = None,
        user_reviewer: Optional[str] = None,
        evidence_sources: Optional[List[str]] = None
    ) -> None:
        """Creates an immutable audit log entry. Never stores API keys or secrets."""
        entry = AuditLogEntry(
            entry_id=f"audit_{uuid.uuid4().hex[:12]}",
            timestamp=datetime.now(timezone.utc).isoformat(),
            event_type=event_type,
            user_reviewer=user_reviewer,
            event_id=event_id,
            zone_id=zone_id,
            model_version="SegFormer-B0 (best_clean)",
            verification_verdict=verification_verdict,
            risk_score=risk_score,
            risk_lower=risk_lower,
            risk_upper=risk_upper,
            review_decision=review_decision,
            reviewer_note=reviewer_note,
            evidence_sources=evidence_sources or [],
            provenance="[AUDIT] DRISHTI Verification Layer"
        )
        self._audit_log.append(entry)

    # ------------------------------------------------------------------
    # Disk Persistence (MVP — JSON file, not a database)
    # ------------------------------------------------------------------

    def _ensure_data_dir(self):
        """Creates the data directory if it doesn't exist."""
        data_dir = os.path.dirname(REVIEW_QUEUE_FILE)
        os.makedirs(data_dir, exist_ok=True)

    def _save_to_disk(self):
        """Persists queue and audit log to JSON files for MVP."""
        try:
            self._ensure_data_dir()
            # Save queue
            queue_data = {k: v.model_dump() for k, v in self._queue.items()}
            with open(REVIEW_QUEUE_FILE, "w", encoding="utf-8") as f:
                json.dump(queue_data, f, indent=2, default=str)

            # Save audit log
            audit_data = [e.model_dump() for e in self._audit_log]
            with open(AUDIT_LOG_FILE, "w", encoding="utf-8") as f:
                json.dump(audit_data, f, indent=2, default=str)
        except Exception as e:
            logger.warning(f"[ReviewQueue] Could not persist to disk: {e}")

    def _load_from_disk(self):
        """Loads persisted queue and audit log if available."""
        try:
            if os.path.exists(REVIEW_QUEUE_FILE):
                with open(REVIEW_QUEUE_FILE, "r", encoding="utf-8") as f:
                    raw = json.load(f)
                self._queue = {k: ReviewItem(**v) for k, v in raw.items()}
                logger.info(f"[ReviewQueue] Loaded {len(self._queue)} items from disk.")
        except Exception as e:
            logger.warning(f"[ReviewQueue] Could not load queue from disk: {e}")
            self._queue = {}

        try:
            if os.path.exists(AUDIT_LOG_FILE):
                with open(AUDIT_LOG_FILE, "r", encoding="utf-8") as f:
                    raw_audit = json.load(f)
                self._audit_log = [AuditLogEntry(**e) for e in raw_audit]
                logger.info(f"[ReviewQueue] Loaded {len(self._audit_log)} audit entries from disk.")
        except Exception as e:
            logger.warning(f"[ReviewQueue] Could not load audit log from disk: {e}")
            self._audit_log = []

    def get_stats(self) -> Dict[str, Any]:
        """Returns queue statistics."""
        all_items = list(self._queue.values())
        return {
            "total": len(all_items),
            "pending": sum(1 for i in all_items if i.review_status == ReviewStatus.PENDING),
            "approved": sum(1 for i in all_items if i.review_status == ReviewStatus.APPROVED),
            "rejected": sum(1 for i in all_items if i.review_status == ReviewStatus.REJECTED),
            "escalated": sum(1 for i in all_items if i.review_status == ReviewStatus.ESCALATED),
            "audit_entries": len(self._audit_log),
            "persistence": "JSON_FILE_MVP",
            "note": "MVP in-memory + JSON persistence. Replace with database for production."
        }


review_queue_service = ReviewQueueService()
