from pydantic import BaseModel
from typing import List, Optional

class LookResponse(BaseModel):
    id: str
    video_source_path: str
    face_path: str
    decor_context: Optional[str]

class VoiceResponse(BaseModel):
    id: str
    language: str
    emotions: List[str]

class AvatarCreate(BaseModel):
    name: str
    description: Optional[str]

class AvatarResponse(BaseModel):
    avatar_id: str
    name: str
    description: Optional[str]
    looks: List[LookResponse]
    voices: List[VoiceResponse]