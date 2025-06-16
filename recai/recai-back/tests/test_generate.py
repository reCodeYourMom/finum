### `tests/test_generate.py`
from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

def test_generate_job():
    payload = {"text": "Hello world", "voice_id": "voice1"}
    response = client.post("/generate", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert "job_id" in data and isinstance(data["job_id"], str)