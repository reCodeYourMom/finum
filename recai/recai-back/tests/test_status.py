### `tests/test_status.py`
from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

def test_status_job():
    fake_id = "1234-5678"
    response = client.get(f"/status/{fake_id}")
    assert response.status_code == 200
    data = response.json()
    assert data == {"status": "pending", "progress": 0.0}