"""
Mode polling — développement local uniquement.

Utilise setup_handlers() pour enregistrer tous les handlers (identique à la prod).
Les messages Telegram arrivent via polling au lieu du webhook.

Usage :
    python -m src.polling

Ne pas utiliser en production (Railway utilise le webhook via main.py).
"""
import asyncio
import logging
import signal

from src.config import settings
from src.memory.cache import close_redis, init_redis
from src.memory.database import init_db
from src.scheduler import start_scheduler, stop_scheduler

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s — %(name)s — %(levelname)s — %(message)s",
)
logger = logging.getLogger(__name__)


async def main() -> None:
    logger.info("Jarvis — mode polling local (tous les handlers actifs)")

    await init_db()
    logger.info("DB initialisée")

    await init_redis()
    logger.info("Redis connecté")

    # Créer une instance avec updater (polling) séparée de l'instance prod (webhook)
    from telegram.ext import Application, CallbackQueryHandler, CommandHandler, MessageHandler, filters
    from src.telegram.commands import (
        cmd_start, cmd_help, cmd_status, cmd_briefing,
        cmd_mails, cmd_agenda, handle_draft_callback,
        cmd_sport, cmd_eau, cmd_repas, cmd_bilan,
        cmd_complements, cmd_planning, cmd_courses, cmd_repasplan, cmd_fitness,
        handle_location_message, handle_sport_plan_callback, handle_courses_callback,
        cmd_memoire, cmd_analyse, handle_roadmap_callback,
        cmd_github, cmd_revenue,
        cmd_event, handle_event_callback,
        handle_text_message, handle_voice_message,
    )

    application = Application.builder().token(settings.telegram_bot_token).build()

    application.add_handler(CommandHandler("start", cmd_start))
    application.add_handler(CommandHandler("help", cmd_help))
    application.add_handler(CommandHandler("status", cmd_status))
    application.add_handler(CommandHandler("briefing", cmd_briefing))
    application.add_handler(CommandHandler("mails", cmd_mails))
    application.add_handler(CommandHandler("agenda", cmd_agenda))
    application.add_handler(CommandHandler("sport", cmd_sport))
    application.add_handler(CommandHandler("eau", cmd_eau))
    application.add_handler(CommandHandler("repas", cmd_repas))
    application.add_handler(CommandHandler("bilan", cmd_bilan))
    application.add_handler(CommandHandler("complements", cmd_complements))
    application.add_handler(CommandHandler("planning", cmd_planning))
    application.add_handler(CommandHandler("courses", cmd_courses))
    application.add_handler(CommandHandler("repasplan", cmd_repasplan))
    application.add_handler(CommandHandler("fitness", cmd_fitness))
    application.add_handler(CommandHandler("memoire", cmd_memoire))
    application.add_handler(CommandHandler("analyse", cmd_analyse))
    application.add_handler(CommandHandler("github", cmd_github))
    application.add_handler(CommandHandler("revenue", cmd_revenue))
    application.add_handler(CommandHandler("event", cmd_event))
    application.add_handler(CallbackQueryHandler(handle_draft_callback, pattern=r"^draft_"))
    application.add_handler(CallbackQueryHandler(handle_event_callback, pattern=r"^event_"))
    application.add_handler(CallbackQueryHandler(handle_sport_plan_callback, pattern=r"^sport_plan_"))
    application.add_handler(CallbackQueryHandler(handle_courses_callback, pattern=r"^courses_"))
    application.add_handler(CallbackQueryHandler(handle_roadmap_callback, pattern=r"^roadmap_"))
    application.add_handler(MessageHandler(filters.LOCATION, handle_location_message))
    application.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, handle_text_message))
    application.add_handler(MessageHandler(filters.VOICE | filters.AUDIO, handle_voice_message))

    start_scheduler()

    stop_event = asyncio.Event()
    loop = asyncio.get_event_loop()
    for sig in (signal.SIGINT, signal.SIGTERM):
        loop.add_signal_handler(sig, stop_event.set)

    async with application:
        await application.start()
        await application.updater.start_polling(drop_pending_updates=True)
        logger.info("Jarvis opérationnel — mode polling (Ctrl+C pour arrêter)")
        await stop_event.wait()
        logger.info("Arrêt en cours…")
        await application.updater.stop()
        await application.stop()

    stop_scheduler()
    await close_redis()
    logger.info("Jarvis arrêté.")


if __name__ == "__main__":
    asyncio.run(main())
