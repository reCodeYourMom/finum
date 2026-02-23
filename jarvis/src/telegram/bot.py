import logging
from telegram.ext import Application, CallbackQueryHandler, CommandHandler, MessageHandler, filters

from src.config import settings

logger = logging.getLogger(__name__)

# Application Telegram en mode webhook (pas d'updater intégré)
application = (
    Application.builder()
    .token(settings.telegram_bot_token)
    .updater(None)
    .build()
)


def setup_handlers() -> None:
    """Enregistre tous les handlers de commandes et messages."""
    from src.telegram.commands import (
        # Base
        cmd_start,
        cmd_help,
        cmd_status,
        cmd_briefing,
        # Sprint 2
        cmd_mails,
        cmd_agenda,
        handle_draft_callback,
        # Sprint 3 — Bien-être (logging)
        cmd_sport,
        cmd_eau,
        cmd_repas,
        cmd_bilan,
        # Sprint 3 réel — Rythme & Bien-être
        cmd_complements,
        cmd_planning,
        cmd_courses,
        cmd_repasplan,
        cmd_fitness,
        handle_location_message,
        handle_sport_plan_callback,
        handle_courses_callback,
        # Mémoire apprenante
        cmd_memoire,
        # Sprint 4 — Intelligence produit
        cmd_analyse,
        handle_roadmap_callback,
        # Sprint 4 — GitHub + Stripe
        cmd_github,
        cmd_revenue,
        # Sprint 5 — Création d'événements
        cmd_event,
        handle_event_callback,
        # Handlers messages
        handle_text_message,
        handle_voice_message,
    )

    # ── Commandes de base ──────────────────────────────────────
    application.add_handler(CommandHandler("start", cmd_start))
    application.add_handler(CommandHandler("help", cmd_help))
    application.add_handler(CommandHandler("status", cmd_status))
    application.add_handler(CommandHandler("briefing", cmd_briefing))

    # ── Sprint 2 — Communication ───────────────────────────────
    application.add_handler(CommandHandler("mails", cmd_mails))
    application.add_handler(CommandHandler("agenda", cmd_agenda))

    # ── Sprint 3 — Bien-être (logging manuel) ─────────────────
    application.add_handler(CommandHandler("sport", cmd_sport))
    application.add_handler(CommandHandler("eau", cmd_eau))
    application.add_handler(CommandHandler("repas", cmd_repas))
    application.add_handler(CommandHandler("bilan", cmd_bilan))

    # ── Sprint 3 réel — Rythme, compléments, planning ─────────
    application.add_handler(CommandHandler("complements", cmd_complements))
    application.add_handler(CommandHandler("planning", cmd_planning))
    application.add_handler(CommandHandler("courses", cmd_courses))
    application.add_handler(CommandHandler("repasplan", cmd_repasplan))
    application.add_handler(CommandHandler("fitness", cmd_fitness))

    # ── Mémoire apprenante ────────────────────────────────────
    application.add_handler(CommandHandler("memoire", cmd_memoire))

    # ── Sprint 4 — Intelligence produit ──────────────────────
    application.add_handler(CommandHandler("analyse", cmd_analyse))

    # ── Sprint 4 — GitHub + Stripe ────────────────────────────
    application.add_handler(CommandHandler("github", cmd_github))
    application.add_handler(CommandHandler("revenue", cmd_revenue))

    # ── Sprint 5 — Création d'événements ──────────────────────
    application.add_handler(CommandHandler("event", cmd_event))

    # ── Callback queries ──────────────────────────────────────
    application.add_handler(CallbackQueryHandler(handle_draft_callback, pattern=r"^draft_"))
    application.add_handler(CallbackQueryHandler(handle_event_callback, pattern=r"^event_"))
    application.add_handler(CallbackQueryHandler(handle_sport_plan_callback, pattern=r"^sport_plan_"))
    application.add_handler(CallbackQueryHandler(handle_courses_callback, pattern=r"^courses_"))
    application.add_handler(CallbackQueryHandler(handle_roadmap_callback, pattern=r"^roadmap_"))

    # ── Messages libres ───────────────────────────────────────
    application.add_handler(
        MessageHandler(filters.LOCATION, handle_location_message)
    )
    application.add_handler(
        MessageHandler(filters.TEXT & ~filters.COMMAND, handle_text_message)
    )
    application.add_handler(
        MessageHandler(filters.VOICE | filters.AUDIO, handle_voice_message)
    )

    logger.info("Handlers Telegram enregistrés (Sprint 1→5 + Sprint 3 réel + Sprint 4 produit)")
