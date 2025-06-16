## 5. `schemas/status.py`
from pydantic import BaseModel

class StatusResponse(BaseModel):
    status: str
    progress: float