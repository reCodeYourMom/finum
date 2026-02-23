import logging
from datetime import datetime, timezone
from typing import Optional

from sqlalchemy import BigInteger, DateTime, Float, String, Text, UniqueConstraint
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column

from src.config import settings

logger = logging.getLogger(__name__)

engine = create_async_engine(settings.database_url, echo=False, pool_pre_ping=True)
async_session = async_sessionmaker(engine, expire_on_commit=False)


class Base(DeclarativeBase):
    pass


class Message(Base):
    """Historique de tous les échanges avec Jarvis."""

    __tablename__ = "messages"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    telegram_user_id: Mapped[Optional[int]] = mapped_column(BigInteger, nullable=True)
    role: Mapped[str] = mapped_column(String(20))  # 'user' | 'assistant'
    content: Mapped[str] = mapped_column(Text)
    audio_transcription: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
    )


class DailyBriefing(Base):
    """Archive des briefings quotidiens envoyés."""

    __tablename__ = "daily_briefings"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    content: Mapped[str] = mapped_column(Text)
    sent_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
    )


class JarvisMemory(Base):
    """Mémoire long terme clé/valeur de Jarvis."""

    __tablename__ = "jarvis_memory"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    key: Mapped[str] = mapped_column(String(255), unique=True)
    value: Mapped[str] = mapped_column(Text)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )


class OAuthToken(Base):
    """Tokens OAuth stockés par compte et fournisseur."""

    __tablename__ = "oauth_tokens"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    account_id: Mapped[str] = mapped_column(String(255))   # ex: nassimboughazi@gmail.com
    provider: Mapped[str] = mapped_column(String(50))       # "google" | "microsoft"
    token_data: Mapped[str] = mapped_column(Text)           # JSON sérialisé
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    __table_args__ = (UniqueConstraint("account_id", "provider", name="uq_oauth_account_provider"),)


class EmailSeen(Base):
    """Emails déjà traités — évite la double classification."""

    __tablename__ = "emails_seen"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    account_id: Mapped[str] = mapped_column(String(255))
    provider: Mapped[str] = mapped_column(String(50))   # "gmail" | "microsoft"
    email_id: Mapped[str] = mapped_column(String(512))  # ID externe
    priority: Mapped[str] = mapped_column(String(20))   # "urgent" | "important" | "reste"
    classified_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
    )

    __table_args__ = (UniqueConstraint("account_id", "email_id", name="uq_email_seen"),)


class EmailDraft(Base):
    """Brouillons en attente de validation par Nassim."""

    __tablename__ = "email_drafts"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    account_id: Mapped[str] = mapped_column(String(255))
    provider: Mapped[str] = mapped_column(String(50))
    original_email_id: Mapped[str] = mapped_column(String(512))
    original_thread_id: Mapped[Optional[str]] = mapped_column(String(512), nullable=True)
    original_sender: Mapped[str] = mapped_column(String(512))
    original_subject: Mapped[str] = mapped_column(Text)
    draft_content: Mapped[str] = mapped_column(Text)
    priority: Mapped[str] = mapped_column(String(20))
    status: Mapped[str] = mapped_column(String(20), default="pending")  # pending | sent | cancelled
    telegram_message_id: Mapped[Optional[int]] = mapped_column(BigInteger, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )


class WellnessLog(Base):
    """Logs bien-être : sport, hydratation, nutrition, sommeil."""

    __tablename__ = "wellness_logs"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    category: Mapped[str] = mapped_column(String(50))   # "sport" | "water" | "meal" | "sleep"
    value: Mapped[str] = mapped_column(Text)             # description libre
    quantity: Mapped[Optional[float]] = mapped_column(Float, nullable=True)  # ml eau, min sport
    logged_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
    )


class LearningEntry(Base):
    """Mémoire apprenante — décisions validées/rejetées + patterns d'activité."""

    __tablename__ = "learning_entries"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    category: Mapped[str] = mapped_column(String(50))    # "decision" | "activity"
    subject: Mapped[str] = mapped_column(String(255))    # "email_draft:42" | "roadmap:job_verdict"
    action: Mapped[str] = mapped_column(String(50))      # "approved" | "rejected" | "active"
    context_json: Mapped[Optional[str]] = mapped_column(Text, nullable=True)  # JSON contexte
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
    )


class PersonContext(Base):
    """Contexte appris sur les personnes qui écrivent à Nassim."""

    __tablename__ = "person_contexts"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    email: Mapped[str] = mapped_column(String(512), unique=True)
    name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    account: Mapped[str] = mapped_column(String(255))     # compte Nassim qui reçoit
    last_importance: Mapped[str] = mapped_column(String(20))  # dernière classification
    interaction_count: Mapped[int] = mapped_column(default=1)
    last_seen: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )


async def init_db() -> None:
    """Crée toutes les tables si elles n'existent pas."""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    logger.info("Schéma base de données vérifié/créé")


async def log_message(
    role: str,
    content: str,
    telegram_user_id: Optional[int] = None,
    audio_transcription: Optional[str] = None,
) -> None:
    """Persiste un message en base de données."""
    async with async_session() as session:
        msg = Message(
            telegram_user_id=telegram_user_id,
            role=role,
            content=content,
            audio_transcription=audio_transcription,
        )
        session.add(msg)
        await session.commit()


async def save_briefing(content: str) -> None:
    """Persiste un briefing quotidien."""
    async with async_session() as session:
        record = DailyBriefing(content=content)
        session.add(record)
        await session.commit()


async def get_memory(key: str) -> Optional[str]:
    """Récupère une valeur de la mémoire long terme."""
    from sqlalchemy import select
    async with async_session() as session:
        result = await session.execute(
            select(JarvisMemory).where(JarvisMemory.key == key)
        )
        record = result.scalar_one_or_none()
        return record.value if record else None


async def set_memory(key: str, value: str) -> None:
    """Enregistre ou met à jour une valeur dans la mémoire long terme."""
    from sqlalchemy.dialects.postgresql import insert
    async with async_session() as session:
        stmt = insert(JarvisMemory).values(key=key, value=value)
        stmt = stmt.on_conflict_do_update(
            index_elements=["key"],
            set_={"value": value, "updated_at": datetime.now(timezone.utc)},
        )
        await session.execute(stmt)
        await session.commit()
