## 4. `schemas/generate.py`
from pydantic import BaseModel

class GenerateRequest(BaseModel):
    text: str
    voice_id: str

class GenerateResponse(BaseModel):
    job_id: str
