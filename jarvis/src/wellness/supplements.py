"""
Rappels compléments alimentaires — matin, soir, post-sport.
Déclenchés par le scheduler ou manuellement après une séance.
"""
import logging
from datetime import datetime

import pytz

from src.config import settings

logger = logging.getLogger(__name__)

PARIS_TZ = pytz.timezone("Europe/Paris")

SUPPLEMENT_MESSAGES = {
    "matin": (
        "💊 *Compléments du matin*\n\n"
        "C'est l'heure de votre prise matinale.\n"
        "Prenez vos compléments avec un grand verre d'eau."
    ),
    "soir": (
        "💊 *Compléments du soir*\n\n"
        "Dernière prise de la journée.\n"
        "Prenez vos compléments avant de dormir."
    ),
    "post_sport": (
        "💊 *Compléments post-sport*\n\n"
        "Séance terminée — prenez vos compléments de récupération maintenant.\n"
        "Dans la fenêtre anabolique : protéines + créatine dans les 30 min."
    ),
}


async def _send(text: str) -> None:
    from telegram import Bot
    bot = Bot(token=settings.telegram_bot_token)
    async with bot:
        await bot.send_message(
            chat_id=settings.telegram_user_id,
            text=text,
            parse_mode="Markdown",
        )


async def send_supplement_reminder(moment: str) -> None:
    """
    Envoie un rappel Telegram pour les compléments.
    moment: "matin" | "soir" | "post_sport"
    """
    text = SUPPLEMENT_MESSAGES.get(moment, f"💊 Rappel compléments ({moment})")
    try:
        await _send(text)
        logger.info(f"Rappel compléments '{moment}' envoyé")
    except Exception as e:
        logger.error(f"Erreur rappel compléments {moment} : {e}")


async def remind_supplements_morning() -> None:
    """Job scheduler — prise matinale."""
    await send_supplement_reminder("matin")


async def remind_supplements_evening() -> None:
    """Job scheduler — prise du soir."""
    await send_supplement_reminder("soir")


async def remind_supplements_post_sport() -> None:
    """
    Rappel post-sport déclenché après détection d'une séance dans l'agenda
    ou manuellement via /sport.
    """
    await send_supplement_reminder("post_sport")


def format_supplement_schedule() -> str:
    """Affiche le planning des prises de compléments."""
    morning_time = getattr(settings, "supplement_time_morning", "07:30")
    evening_time = getattr(settings, "supplement_time_evening", "21:00")

    return (
        "💊 *Planning compléments*\n\n"
        f"☀️ *Matin* : {morning_time}\n"
        f"🌙 *Soir* : {evening_time}\n"
        f"🏋️ *Post-sport* : après chaque séance (rappel automatique)\n\n"
        "_Loggue une séance avec /sport pour déclencher le rappel post-sport._"
    )
