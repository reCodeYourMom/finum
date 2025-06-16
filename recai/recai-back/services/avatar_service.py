# services/avatar_service.py
from __future__ import annotations

import os
import uuid
from pathlib import Path
from typing import List, Optional, Tuple

from fastapi import UploadFile
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from config import settings
from database.models.clone import Clone
from database.models.look import Look
from database.models.voice import Voice
from services.tts_service import submit_avatar_clone


# ──────────────────────────────────────────────────────────────────────────────
# Helpers
# ──────────────────────────────────────────────────────────────────────────────
def _avatar_root() -> Path:
    """
    Chemin racine des avatars.  
    • `AVATAR_DATA_PATH` dans l’environnement (les tests le changent)  
    • sinon, la valeur par défaut de settings.
    """
    return Path(os.getenv("AVATAR_DATA_PATH", settings.AVATAR_DATA_PATH))


def _stub_face_png(dst: Path) -> None:
    """Écrit un PNG 1 × 1 transparent, très léger (32 octets)."""
    dst.write_bytes(
        bytes.fromhex(
            "89504e470d0a1a0a0000000d494844520000000100000001"
            "0802000000907753de0000000a4944415408d763f8000000"
            "00020001e221bc330000000049454e44ae426082"
        )
    )


# ──────────────────────────────────────────────────────────────────────────────
# API
# ──────────────────────────────────────────────────────────────────────────────
def create_avatar(
    name: str,
    description: Optional[str],
    video_file: UploadFile,
    db: Session,
) -> str:
    """
    • Sauvegarde la vidéo source  
    • Insère Clone / Look / Voice (stub) en base  
    • Génère face.png + voice-clone.mp3 factices
    """
    avatar_id = str(uuid.uuid4())
    avatar_dir = _avatar_root() / avatar_id
    avatar_dir.mkdir(parents=True, exist_ok=True)

    # 1) vidéo source
    video_path = avatar_dir / "source.mp4"
    video_path.write_bytes(video_file.file.read())

    # 2-4) persistance
    try:
        clone = Clone(id=avatar_id, name=name, description=description)
        db.add(clone)

        look = Look(
            id=str(uuid.uuid4()),
            clone_id=avatar_id,
            video_source_path=str(video_path),
            face_path=str(avatar_dir / "face.png"),
            decor_context=None,
        )
        db.add(look)

        voice = Voice(
            id=str(uuid.uuid4()),
            clone_id=avatar_id,
            language="fr",
            emotions=["neutral"],
        )
        db.add(voice)

        db.commit()
    except SQLAlchemyError:
        db.rollback()
        raise

    # 5) artefacts factices
    _stub_face_png(avatar_dir / "face.png")
    submit_avatar_clone(avatar_id, avatar_dir)

    return avatar_id


def get_avatar(
    avatar_id: str,
    db: Session,
) -> Tuple[Clone | None, List[Look], List[Voice]]:
    """Retourne (clone, looks, voices)."""
    clone = db.get(Clone, avatar_id)
    looks = db.query(Look).filter_by(clone_id=avatar_id).all()
    voices = db.query(Voice).filter_by(clone_id=avatar_id).all()
    return clone, looks, voices
