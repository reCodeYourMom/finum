## 3. `schemas/voice.py`
from pydantic import BaseModel

class Voice(BaseModel):
    id: str
    name: str