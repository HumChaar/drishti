import os
import json
from typing import List, Optional, Dict, Any

DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data")
ACTIONS_PATH = os.path.join(DATA_DIR, "emergency_actions.json")

class EmergencyService:
    def __init__(self):
        self._data = None
        self._load_data()

    def _load_data(self):
        if os.path.exists(ACTIONS_PATH):
            with open(ACTIONS_PATH, "r", encoding="utf-8") as f:
                self._data = json.load(f)
        else:
            self._data = {"metrics": {}, "directives": []}

    def get_metrics(self) -> Dict[str, Any]:
        return self._data.get("metrics", {})

    def get_directives(self) -> List[Dict[str, Any]]:
        return self._data.get("directives", [])

    def update_directive_status(self, directive_id: str, new_status: str) -> Optional[Dict[str, Any]]:
        directives = self._data.get("directives", [])
        directive = next((d for d in directives if d["id"] == directive_id), None)
        if not directive:
            return None
        directive["status"] = new_status
        if new_status == "COMPLETED":
            directive["progressPct"] = 100
        return directive

emergency_service = EmergencyService()
