# services/tts_service.py
"""
Stubs TTS pour la phase de tests.
Fournit :
    • submit_job / get_job_status  (pour routers/jobs.py)
    • submit_avatar_clone          (pour avatar_service.py)
"""
from __future__ import annotations

import uuid
from typing import Tuple, Dict
from pathlib import Path, PurePath


# ──────────────────────────────────────────────────────────────────────────
# Mémoire simulant nos jobs TTS
# ──────────────────────────────────────────────────────────────────────────
_JOBS: Dict[str, Dict[str, float]] = {}

def job_exists(job_id: str) -> bool:
    """True si le job est connu du stub."""
    return job_id in _JOBS

def submit_job(text: str, voice_id: str) -> str:
    """Enregistre un job factice et renvoie son UUID."""
    job_id = str(uuid.uuid4())
    _JOBS[job_id] = {"progress": 0.0, "status": "pending"}
    return job_id


def get_job_status(job_id: str) -> Tuple[str, float]:
    """
    Renvoie (status, progress). Avance de 0.5 à chaque appel
    jusqu’à atteindre « completed ».
    """
    job = _JOBS.get(job_id)

    # ✅ spécification des tests : un id inconnu == pending à 0 %
    if job is None:
        return "pending", 0.0

    # Avancement simpliste
    job["progress"] = min(job["progress"] + 0.5, 1.0)
    job["status"] = "completed" if job["progress"] >= 1.0 else "running"
    return job["status"], job["progress"]



def submit_avatar_clone(avatar_id: str, avatar_dir: PurePath) -> None:
    """Crée un petit fichier MP3 factice (0x00) pour les tests."""
    (Path(avatar_dir) / "voice-clone.mp3").write_bytes(b"\x00")
