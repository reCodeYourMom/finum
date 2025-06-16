# recai-back/tests/test_jobs.py
from httpx import Response


def test_job_lifecycle(client):
    # --- création ---
    resp: Response = client.post(
        "/jobs",
        json={"text": "Hello world", "voice_id": "v_123"},
    )
    assert resp.status_code == 201
    job_id = resp.json()["job_id"]

    # --- premier GET -> running 0.5 ---
    r1 = client.get(f"/jobs/{job_id}")
    assert r1.status_code == 200
    assert r1.json() == {"status": "running", "progress": 0.5}

    # --- second GET -> completed 1.0 ---
    r2 = client.get(f"/jobs/{job_id}")
    assert r2.json() == {"status": "completed", "progress": 1.0}


def test_job_not_found(client):
    r = client.get("/jobs/does-not-exist")
    assert r.status_code == 404


def test_generate_then_status(client):
    # submit
    payload = {"text": "Hello tests", "voice_id": "v-1"}
    r = client.post("/generate", json=payload)
    assert r.status_code == 200
    job_id = r.json()["job_id"]

    # first status ─ pending / running
    s1 = client.get(f"/status/{job_id}")
    assert s1.status_code == 200
    assert s1.json()["status"] in {"pending", "running"}
    assert 0.0 <= s1.json()["progress"] <= 1.0

    # second call → devrait progresser
    s2 = client.get(f"/status/{job_id}")
    assert s2.json()["progress"] >= s1.json()["progress"]
