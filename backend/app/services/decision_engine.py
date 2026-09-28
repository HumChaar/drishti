"""
DRISHTI Decision Engine Compatibility Layer
Forwards to decision_service for Stage 5 JEV / TypeSafe Decision Intelligence.
"""

from app.services.decision_service import decision_service, DecisionService

decision_engine = decision_service
