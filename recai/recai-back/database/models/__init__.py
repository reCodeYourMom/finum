# database/models/__init__.py
from config import settings   # ✅  settings.DATABASE_URL, settings.AVATAR_DATA_PATH, …

from .clone import Clone
from .look import Look
from .voice import Voice
from .script import Script
from .video_project import VideoProject

# Maintenant, `import database.models` importera et
# enregistrera tous tes modèles dans Base.metadata
