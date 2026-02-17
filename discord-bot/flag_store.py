import json
import os
import threading
from datetime import datetime

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
STORE_FILE = os.path.join(BASE_DIR, "flags_db.json")


class FlagStore:
    """Stockage thread-safe des flags générés, liés aux pseudos et sessions."""

    def __init__(self):
        self._lock = threading.Lock()
        self._data = self._load()

    def _load(self):
        if os.path.exists(STORE_FILE):
            try:
                with open(STORE_FILE, "r", encoding="utf-8") as f:
                    return json.load(f)
            except Exception:
                return {"players": {}, "flags": {}}
        return {"players": {}, "flags": {}}

    def _persist(self):
        with open(STORE_FILE, "w", encoding="utf-8") as f:
            json.dump(self._data, f, indent=2, ensure_ascii=False)

    def save(self, discord_user_id: str, pseudo: str, session_id: str, flag: str):
        with self._lock:
            # Index par discord_user_id
            self._data["players"][discord_user_id] = {
                "pseudo": pseudo,
                "session_id": session_id,
                "flag": flag,
                "generated_at": datetime.now().isoformat(),
            }
            # Index par flag pour lookup inverse
            self._data["flags"][flag] = {
                "discord_user_id": discord_user_id,
                "pseudo": pseudo,
                "session_id": session_id,
            }
            self._persist()

    def get_by_discord_id(self, discord_user_id: str):
        with self._lock:
            return self._data["players"].get(discord_user_id)

    def get_by_pseudo(self, pseudo: str):
        with self._lock:
            for uid, info in self._data["players"].items():
                if info["pseudo"].lower() == pseudo.lower():
                    return {**info, "discord_user_id": uid}
            return None

    def get_by_session(self, session_id: str):
        with self._lock:
            for uid, info in self._data["players"].items():
                if info["session_id"] == session_id:
                    return {**info, "discord_user_id": uid}
            return None

    def get_all(self):
        with self._lock:
            return dict(self._data["players"])


# Singleton
flag_store = FlagStore()
