from fastapi import APIRouter, status, HTTPException
from schemas.generate import GenerateRequest, GenerateResponse
from schemas.status   import StatusResponse
from services.tts_service import submit_job, get_job_status, job_exists   #  ← nouveau import

router = APIRouter()
# --------------------------------------------------------------------- #
# Création
# --------------------------------------------------------------------- #
@router.post("/generate", status_code=status.HTTP_200_OK,
             response_model=GenerateResponse)
def create_job_generate(req: GenerateRequest):
    job_id = submit_job(req.text, req.voice_id)
    return GenerateResponse(job_id=job_id)


@router.post("/jobs", status_code=status.HTTP_201_CREATED,
             response_model=GenerateResponse)
def create_job(req: GenerateRequest):
    job_id = submit_job(req.text, req.voice_id)
    return GenerateResponse(job_id=job_id)


# --------------------------------------------------------------------- #
# Lecture
# --------------------------------------------------------------------- #
def _status_payload(job_id: str) -> StatusResponse:
    s, p = get_job_status(job_id)
    return StatusResponse(status=s, progress=p)


@router.get("/status/{job_id}", response_model=StatusResponse)
def job_status(job_id: str):
    # toujours 200, même si l’id n’existe pas
    return _status_payload(job_id)


@router.get("/jobs/{job_id}", response_model=StatusResponse)
def job_status_alt(job_id: str):
    # ⚠️ les tests attendent 404 si inconnu
    if not job_exists(job_id):
        raise HTTPException(status_code=404, detail="Job not found")
    return _status_payload(job_id)
