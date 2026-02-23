"""
Polling des emails — exécuté toutes les 15 minutes par le scheduler.
Fetch → Classifier → Brouillon → Notification Telegram si urgent/important.
"""
import logging
from typing import Any, Dict, List

from src.config import settings
from src.email.classifier import classify_email, priority_emoji
from src.email.drafter import build_reply_subject, draft_email_response
from src.email.gmail import fetch_all_gmail_emails
from src.email.outlook import fetch_all_outlook_emails
from src.memory.database import EmailDraft, EmailSeen, async_session
from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert as pg_insert
from datetime import datetime, timezone

logger = logging.getLogger(__name__)


async def _is_email_seen(account_id: str, email_id: str) -> bool:
    """Vérifie si un email a déjà été traité."""
    async with async_session() as session:
        result = await session.execute(
            select(EmailSeen).where(
                EmailSeen.account_id == account_id,
                EmailSeen.email_id == email_id,
            )
        )
        return result.scalar_one_or_none() is not None


async def _mark_email_seen(account_id: str, provider: str, email_id: str, priority: str) -> None:
    """Marque un email comme traité."""
    async with async_session() as session:
        stmt = pg_insert(EmailSeen).values(
            account_id=account_id,
            provider=provider,
            email_id=email_id,
            priority=priority,
            classified_at=datetime.now(timezone.utc),
        ).on_conflict_do_nothing(constraint="uq_email_seen")
        await session.execute(stmt)
        await session.commit()


async def _save_draft(email: Dict, draft_content: str, priority: str) -> int:
    """Sauvegarde un brouillon en base et retourne son ID."""
    async with async_session() as session:
        draft = EmailDraft(
            account_id=email["account_id"],
            provider=email["provider"],
            original_email_id=email["id"],
            original_thread_id=email.get("thread_id"),
            original_sender=email["sender"],
            original_subject=email["subject"],
            draft_content=draft_content,
            priority=priority,
            status="pending",
        )
        session.add(draft)
        await session.commit()
        await session.refresh(draft)
        return draft.id


async def _send_draft_notification(
    draft_id: int, email: Dict, classification: Dict, draft_content: str
) -> None:
    """Envoie une notification Telegram avec le brouillon et les boutons de validation."""
    from telegram import Bot, InlineKeyboardButton, InlineKeyboardMarkup

    emoji = priority_emoji(classification["priority"])
    priority_label = classification["priority"].capitalize()

    text = (
        f"{emoji} *Nouveau mail — {email['account_id']}*\n\n"
        f"*De* : {email['sender'][:100]}\n"
        f"*Objet* : {email['subject'][:150]}\n"
        f"*Priorité* : {priority_label}\n"
        f"*Résumé* : {classification['summary'][:300]}\n"
        f"\n— — —\n\n"
        f"*Brouillon de réponse* :\n\n"
        f"{draft_content[:800]}"
        f"{'…' if len(draft_content) > 800 else ''}"
        f"\n\n— — —\n"
        f"Validez-vous l'envoi ? _(draft ID: {draft_id})_"
    )

    keyboard = InlineKeyboardMarkup([
        [
            InlineKeyboardButton("✅ Valider l'envoi", callback_data=f"draft_approve:{draft_id}"),
            InlineKeyboardButton("❌ Annuler", callback_data=f"draft_cancel:{draft_id}"),
        ]
    ])

    bot = Bot(token=settings.telegram_bot_token)
    async with bot:
        message = await bot.send_message(
            chat_id=settings.telegram_user_id,
            text=text,
            parse_mode="Markdown",
            reply_markup=keyboard,
        )

    # Sauvegarder l'ID du message Telegram pour pouvoir l'éditer plus tard
    async with async_session() as session:
        result = await session.execute(
            select(EmailDraft).where(EmailDraft.id == draft_id)
        )
        draft = result.scalar_one_or_none()
        if draft:
            draft.telegram_message_id = message.message_id
            await session.commit()


async def poll_emails() -> None:
    """
    Job principal du scheduler : poll tous les emails, classifie, brouillonne et notifie.
    """
    logger.info("Polling emails en cours…")

    # Fetch de tous les emails
    gmail_emails = await fetch_all_gmail_emails(hours_back=1)
    outlook_emails = await fetch_all_outlook_emails(hours_back=1)
    all_emails = gmail_emails + outlook_emails

    if not all_emails:
        logger.info("Aucun nouvel email détecté")
        return

    logger.info(f"{len(all_emails)} email(s) à traiter")

    new_count = 0
    draft_count = 0

    for email in all_emails:
        account_id = email["account_id"]
        email_id = email["id"]
        provider = email["provider"]

        # Ignorer les emails déjà vus
        if await _is_email_seen(account_id, email_id):
            continue

        new_count += 1

        # Classification
        classification = await classify_email(email)
        priority = classification["priority"]
        await _mark_email_seen(account_id, provider, email_id, priority)

        logger.info(
            f"Email classé [{priority.upper()}] : {email['sender'][:50]} — {email['subject'][:60]}"
        )

        # Mémoire apprenante — contexte personne
        try:
            from src.memory.learning import record_person_interaction
            sender = email.get("sender", "")
            # Extraire email et nom depuis "Nom Prénom <email@domain.com>"
            sender_email = sender
            sender_name = None
            if "<" in sender and ">" in sender:
                parts = sender.split("<")
                sender_name = parts[0].strip().strip('"') or None
                sender_email = parts[1].rstrip(">").strip()
            await record_person_interaction(
                email=sender_email,
                name=sender_name,
                account_id=account_id,
                importance=priority,
            )
        except Exception:
            pass

        # Brouillon uniquement pour urgent et important avec réponse nécessaire
        if priority in ("urgent", "important") and classification.get("reply_needed"):
            try:
                draft_content = await draft_email_response(email, classification)
                if draft_content:
                    draft_id = await _save_draft(email, draft_content, priority)
                    await _send_draft_notification(draft_id, email, classification, draft_content)
                    draft_count += 1
            except Exception as e:
                logger.error(f"Erreur brouillon pour email {email_id}: {e}")

    logger.info(
        f"Polling terminé — {new_count} nouveau(x) email(s) traité(s), {draft_count} brouillon(s) envoyé(s)"
    )


async def send_approved_draft(draft_id: int) -> None:
    """Envoie un brouillon validé par Nassim."""
    from src.email.gmail import send_email as gmail_send
    from src.email.outlook import send_email as outlook_send

    async with async_session() as session:
        result = await session.execute(
            select(EmailDraft).where(EmailDraft.id == draft_id)
        )
        draft = result.scalar_one_or_none()

        if not draft or draft.status != "pending":
            raise ValueError(f"Draft {draft_id} introuvable ou déjà traité")

        reply_subject = build_reply_subject(draft.original_subject)

        if draft.provider == "gmail":
            await gmail_send(
                account_id=draft.account_id,
                to=draft.original_sender,
                subject=reply_subject,
                body=draft.draft_content,
                thread_id=draft.original_thread_id,
            )
        elif draft.provider == "microsoft":
            await outlook_send(
                account_id=draft.account_id,
                to=draft.original_sender,
                subject=reply_subject,
                body=draft.draft_content,
                thread_id=draft.original_thread_id,
            )

        draft.status = "sent"
        draft.updated_at = datetime.now(timezone.utc)
        await session.commit()

    logger.info(f"Draft {draft_id} envoyé avec succès")


async def cancel_draft(draft_id: int) -> None:
    """Annule un brouillon."""
    async with async_session() as session:
        result = await session.execute(
            select(EmailDraft).where(EmailDraft.id == draft_id)
        )
        draft = result.scalar_one_or_none()
        if draft and draft.status == "pending":
            draft.status = "cancelled"
            draft.updated_at = datetime.now(timezone.utc)
            await session.commit()
    logger.info(f"Draft {draft_id} annulé")
