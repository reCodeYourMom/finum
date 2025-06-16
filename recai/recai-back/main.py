## 1. `main.py`
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers.voices import router as voices_router
from routers.jobs import router as jobs_router
from config import settings
from database.session import init_db
from routers.avatars import router as avatars_router


app = FastAPI(
    title="REC.AI TTS API",
    version="0.1.0"
)

init_db()

# CORS middleware (allow front-end origin)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(voices_router, prefix="", tags=["voices"])
app.include_router(jobs_router,   prefix="", tags=["jobs"])
app.include_router(avatars_router, prefix="", tags=["avatars"])