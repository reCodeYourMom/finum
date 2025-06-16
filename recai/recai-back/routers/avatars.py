from pathlib import Path
import os
from typing import Optional

from fastapi import APIRouter, UploadFile, File, Form, HTTPException, Depends
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from config import settings
from database.session import get_db
from schemas.avatar import AvatarResponse, LookResponse, VoiceResponse
from services.avatar_service import create_avatar, get_avatar

router = APIRouter()


# ──────────────────────────────────────────────────────────────────────────────
# Chemin commun
# ──────────────────────────────────────────────────────────────────────────────
def _avatar_root() -> Path:
    return Path(os.getenv("AVATAR_DATA_PATH", settings.AVATAR_DATA_PATH))


# ──────────────────────────────────────────────────────────────────────────────
# Endpoints
# ──────────────────────────────────────────────────────────────────────────────
@router.post("/avatar", response_model=dict)
def post_avatar(
    name: str = Form(...),
    description: Optional[str] = Form(None),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    avatar_id = create_avatar(name, description, file, db)
    return {"avatar_id": avatar_id}


@router.get("/avatar/{avatar_id}", response_model=AvatarResponse)
def get_avatar_info(
    avatar_id: str,
    db: Session = Depends(get_db),
):
    clone, looks, voices = get_avatar(avatar_id, db)
    if not clone:
        raise HTTPException(status_code=404, detail="Avatar not found")

    return AvatarResponse(
        avatar_id=clone.id,
        name=clone.name,
        description=clone.description,
        looks=[
            LookResponse(
                id=l.id,
                video_source_path=l.video_source_path,
                face_path=l.face_path,
                decor_context=l.decor_context,
            )
            for l in looks
        ],
        voices=[
            VoiceResponse(
                id=v.id,
                language=v.language,
                emotions=v.emotions,
            )
            for v in voices
        ],
    )


@router.get("/avatar/{avatar_id}/preview/audio")
def get_avatar_audio(avatar_id: str):
    path = _avatar_root() / avatar_id / "voice-clone.mp3"
    return FileResponse(path, media_type="audio/mpeg")


@router.get("/avatar/{avatar_id}/preview/look")
def get_avatar_look(avatar_id: str):
    path = _avatar_root() / avatar_id / "face.png"
    return FileResponse(path, media_type="image/png")
