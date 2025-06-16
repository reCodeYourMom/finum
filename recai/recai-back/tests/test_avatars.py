import io
import pytest
from fastapi.testclient import TestClient
from main import app
import shutil

client = TestClient(app)

@pytest.fixture(autouse=True)
def clean_avatar_dir(tmp_path, monkeypatch):
    # Pointe AVATAR_DATA_PATH vers un répertoire temporaire
    monkeypatch.setenv("AVATAR_DATA_PATH", str(tmp_path / "avatars"))
    # Assure que le dossier est propre
    yield
    shutil.rmtree(str(tmp_path / "avatars"), ignore_errors=True)

def test_create_avatar_and_files(tmp_path):
    video_bytes = b"\x00\x00\x00\x01"
    files = {
        "name": (None, "TestAvatar"),
        "description": (None, "TestDesc"),
        "file": ("video.mp4", io.BytesIO(video_bytes), "video/mp4"),
    }

    # POST /avatar
    response = client.post("/avatar", files=files)
    assert response.status_code == 200
    data = response.json()
    assert "avatar_id" in data
    avatar_id = data["avatar_id"]

    base = tmp_path / "avatars" / avatar_id
    # Vérifie la présence des fichiers
    assert (base / "source.mp4").exists()
    assert (base / "face.png").exists()
    assert (base / "voice-clone.mp3").exists()

def test_get_avatar_metadata(tmp_path):
    # Création préalable pour avoir un avatar en base
    video_bytes = b"\x00\x00\x00\x01"
    files = {
        "name": (None, "MetaAvatar"),
        "description": (None, "MetaDesc"),
        "file": ("video.mp4", io.BytesIO(video_bytes), "video/mp4"),
    }
    create_resp = client.post("/avatar", files=files)
    avatar_id = create_resp.json()["avatar_id"]

    # GET /avatar/{id}
    resp = client.get(f"/avatar/{avatar_id}")
    assert resp.status_code == 200
    body = resp.json()
    assert body["avatar_id"] == avatar_id
    assert body["name"] == "MetaAvatar"
    assert body["description"] == "MetaDesc"
    assert isinstance(body["looks"], list) and len(body["looks"]) == 1
    assert isinstance(body["voices"], list) and len(body["voices"]) == 1

def test_avatar_previews(tmp_path):
    # Création préalable
    video_bytes = b"\x00\x00\x00\x01"
    files = {
        "name": (None, "PrevAvatar"),
        "description": (None, "PrevDesc"),
        "file": ("video.mp4", io.BytesIO(video_bytes), "video/mp4"),
    }
    avatar_id = client.post("/avatar", files=files).json()["avatar_id"]

    # Preview audio
    r_audio = client.get(f"/avatar/{avatar_id}/preview/audio")
    assert r_audio.status_code == 200
    assert r_audio.headers["content-type"] == "audio/mpeg"
    assert r_audio.content.startswith(b"\x00")

    # Preview look
    r_look = client.get(f"/avatar/{avatar_id}/preview/look")
    assert r_look.status_code == 200
    assert r_look.headers["content-type"] == "image/png"
