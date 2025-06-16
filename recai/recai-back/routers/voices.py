## 2. `routers/voices.py` (unchanged)
from fastapi import APIRouter
from typing import List
from schemas.voice import Voice

router = APIRouter()

@router.get(
    "/voices",
    response_model=List[Voice],
    summary="List available voices"
)
def get_voices():
    """
    Returns a mocked list of available TTS voices.
    """
    return [
        Voice(id="voice1", name="Alice"),
        Voice(id="voice2", name="Bob"),
    ]