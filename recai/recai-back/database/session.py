# database/session.py
from __future__ import annotations

import os
from typing import Generator

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from sqlalchemy.pool import StaticPool

# --------------------------------------------------
# 1. URL de BDD (par défaut : fichier SQLite local)
# --------------------------------------------------
DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./app.db")

# --------------------------------------------------
# 2. Création de l'engine
#    • Pour SQLite en mémoire  : StaticPool + check_same_thread=False
#    • Pour SQLite fichier     : check_same_thread=False
#    • Pour autres SGBD        : paramètres par défaut
# --------------------------------------------------
is_sqlite: bool = DATABASE_URL.startswith("sqlite")
is_memory: bool = DATABASE_URL.endswith(":memory:")

engine = create_engine(
    DATABASE_URL,
    echo=False,                       # passez à True pour déboguer les requêtes
    connect_args={"check_same_thread": False} if is_sqlite else {},
    poolclass=StaticPool if is_memory else None,
)

# --------------------------------------------------
# 3. Factory de sessions et base déclarative
# --------------------------------------------------
SessionLocal = sessionmaker(
    bind=engine,
    autocommit=False,
    autoflush=False,
    expire_on_commit=False,           # évite de re-charger après commit
)

Base = declarative_base()

# --------------------------------------------------
# 4. Dépendance FastAPI : ouverture / fermeture de session
# --------------------------------------------------
def get_db() -> Generator:
    """Dépendance FastAPI fournissant une session SQLAlchemy."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# --------------------------------------------------
# 5. Initialisation des tables (à appeler au démarrage ou dans les tests)
# --------------------------------------------------
def init_db() -> None:
    """
    Importe tous les modules déclarant des modèles afin que
    Base.metadata.create_all() connaisse les tables, puis crée celles-ci.
    """
    import database.models  # noqa: F401  # déclenche l'import des ORM
    Base.metadata.create_all(bind=engine)
