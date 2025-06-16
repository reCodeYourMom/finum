"""
conftest.py – configuration unique pour tous les tests
"""
import os
import sys
import pathlib
import pytest
from fastapi.testclient import TestClient

# ------------------------------------------------------------------
# 0) DÉFINIR le DSN *avant* d'importer quoi que ce soit de SQLAlchemy
# ------------------------------------------------------------------
# ➜ évitez ':memory:' (problème de cache/threads). Utilisons un fichier
TEST_DB = "sqlite:///./test_db.sqlite"
os.environ["DATABASE_URL"] = TEST_DB

# mettre la racine projet dans sys.path (au cas où)
PROJECT_ROOT = pathlib.Path(__file__).resolve().parents[1]
sys.path.insert(0, str(PROJECT_ROOT))

# ------------------------------------------------------------------
# 1) maintenant on peut importer le reste de l'application
# ------------------------------------------------------------------
from database.base import Base               # contient la MetaData
from database.session import engine, SessionLocal, get_db  # <-- même engine !
from main import app

# ------------------------------------------------------------------
# 2) (ré)initialiser le schéma dans la base de test
# ------------------------------------------------------------------
Base.metadata.drop_all(bind=engine)
Base.metadata.create_all(bind=engine)

# ------------------------------------------------------------------
# 3) override de la dépendance FastAPI get_db pour qu'elle
#    utilise le *même* SessionLocal/engine que ci-dessus
# ------------------------------------------------------------------
def _get_test_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

app.dependency_overrides[get_db] = _get_test_db

# ------------------------------------------------------------------
# 4) fixture client pour les tests
# ------------------------------------------------------------------
@pytest.fixture(scope="module")
def client():
    with TestClient(app) as c:
        yield c
