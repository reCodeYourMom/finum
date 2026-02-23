import asyncio
import io
import logging
import os
import tempfile

from telegram import InlineKeyboardButton, InlineKeyboardMarkup, Update
from telegram.constants import ChatAction
from telegram.ext import ContextTypes

from src.config import settings
from src.context import get_paris_time

logger = logging.getLogger(__name__)


def is_authorized(user_id: int) -> bool:
    return user_id == settings.telegram_user_id


# ─────────────────────────────────────────────────────────────
# Commandes de base
# ─────────────────────────────────────────────────────────────

async def cmd_start(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    if not is_authorized(update.effective_user.id):
        return
    await update.message.reply_text(
        "Jarvis opérationnel.\n\n"
        "Envoyez un message texte ou vocal pour interagir.\n\n"
        "Commandes :\n"
        "/briefing — Briefing du jour\n"
        "/mails — Emails prioritaires des dernières 24h\n"
        "/agenda — Agenda du jour\n"
        "/sport [activité] [durée min] — Logger une séance\n"
        "/eau [ml] — Logger hydratation\n"
        "/repas [description] — Logger un repas\n"
        "/bilan — Bilan bien-être du jour\n"
        "/complements — Planning compléments\n"
        "/planning — Planning sport de la semaine\n"
        "/repasplan — Plan repas de la semaine\n"
        "/courses — Liste de courses\n"
        "/fitness — Trouver la salle Fitness Park la plus proche\n"
        "/analyse [app] — Analyse conviction app(s) via Claude\n"
        "/memoire — Ce que Jarvis a appris\n"
        "/github — Activité GitHub 24h\n"
        "/revenue — Dashboard Stripe\n"
        "/status — État du système\n"
        "/help — Aide"
    )


async def cmd_help(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    if not is_authorized(update.effective_user.id):
        return
    await update.message.reply_text(
        "Jarvis — Commandes disponibles :\n\n"
        "/start — Initialisation\n"
        "/briefing — Briefing du jour\n"
        "/mails — Emails prioritaires 24h\n"
        "/agenda — Agenda du jour\n"
        "/sport [activité] [durée min] — Logger une séance sport\n"
        "/eau [ml] — Logger hydratation (ex: /eau 500)\n"
        "/repas [description] — Logger un repas\n"
        "/bilan — Bilan bien-être du jour\n"
        "/status — État des systèmes\n\n"
        "Message texte → réponse texte\n"
        "Message vocal → transcription + réponse texte + réponse vocale"
    )


async def cmd_status(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    if not is_authorized(update.effective_user.id):
        return

    from src.auth.oauth_store import list_connected_accounts
    try:
        connected = await list_connected_accounts()
        google_accounts = ", ".join(connected["google"]) or "Aucun"
        ms_accounts = ", ".join(connected["microsoft"]) or "Aucun"
    except Exception:
        google_accounts = "Erreur"
        ms_accounts = "Erreur"

    status = (
        f"*Jarvis — État du système*\n\n"
        f"Heure Paris : {get_paris_time()}\n"
        f"LLM principal : Groq `{settings.groq_model}`\n"
        f"TTS : Edge TTS `{settings.tts_voice}`\n"
        f"STT : Whisper `{settings.whisper_model}`\n\n"
        f"*Comptes Google* : {google_accounts}\n"
        f"*Comptes Microsoft* : {ms_accounts}\n\n"
        f"Statut : ✓ Opérationnel"
    )
    await update.message.reply_text(status, parse_mode="Markdown")


async def cmd_briefing(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    if not is_authorized(update.effective_user.id):
        return
    await update.message.reply_chat_action(ChatAction.TYPING)
    from src.briefing.daily import generate_briefing
    briefing = await generate_briefing()
    await update.message.reply_text(briefing, parse_mode="Markdown")


# ─────────────────────────────────────────────────────────────
# Sprint 2 — /mails et /agenda
# ─────────────────────────────────────────────────────────────

async def cmd_mails(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Affiche les emails classifiés des dernières 24h."""
    if not is_authorized(update.effective_user.id):
        return

    await update.message.reply_chat_action(ChatAction.TYPING)

    from sqlalchemy import select
    from src.memory.database import EmailDraft, EmailSeen, async_session
    from datetime import datetime, timedelta, timezone

    cutoff = datetime.now(timezone.utc) - timedelta(hours=24)

    async with async_session() as session:
        result = await session.execute(
            select(EmailSeen)
            .where(EmailSeen.classified_at >= cutoff)
            .order_by(EmailSeen.classified_at.desc())
        )
        rows = result.scalars().all()

    if not rows:
        await update.message.reply_text(
            "Aucun email traité dans les dernières 24h.\n"
            "Vérifiez que les comptes sont connectés avec /status"
        )
        return

    urgent = [r for r in rows if r.priority == "urgent"]
    important = [r for r in rows if r.priority == "important"]
    reste = [r for r in rows if r.priority == "reste"]

    lines = ["📬 *Emails — dernières 24h*\n"]

    if urgent:
        lines.append(f"🔴 *Urgent ({len(urgent)})*")
        for r in urgent[:5]:
            lines.append(f"• {r.account_id}")
        lines.append("")

    if important:
        lines.append(f"🟡 *Important ({len(important)})*")
        for r in important[:5]:
            lines.append(f"• {r.account_id}")
        lines.append("")

    if reste:
        lines.append(f"🟢 *Reste ({len(reste)})* — traités silencieusement")

    async with async_session() as session:
        drafts_result = await session.execute(
            select(EmailDraft).where(EmailDraft.status == "pending")
        )
        pending_drafts = drafts_result.scalars().all()

    if pending_drafts:
        lines.append(f"\n⏳ *{len(pending_drafts)} brouillon(s) en attente de validation*")

    await update.message.reply_text("\n".join(lines), parse_mode="Markdown")


async def cmd_agenda(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Affiche les événements du jour sur tous les calendriers."""
    if not is_authorized(update.effective_user.id):
        return

    await update.message.reply_chat_action(ChatAction.TYPING)

    from src.calendar.google_cal import fetch_today_events, format_event_time
    from src.calendar.conflict import detect_conflicts

    try:
        events = await fetch_today_events()
    except Exception as e:
        await update.message.reply_text(f"Erreur lecture agenda : {e}")
        return

    import pytz
    paris = pytz.timezone("Europe/Paris")
    from datetime import datetime
    today = datetime.now(paris).strftime("%A %d %B %Y")

    if not events:
        await update.message.reply_text(
            f"📅 *Agenda du {today}*\n\nAucun événement aujourd'hui.",
            parse_mode="Markdown",
        )
        return

    lines = [f"📅 *Agenda du {today}*\n"]
    for event in events:
        time_str = format_event_time(event)
        lines.append(f"• {time_str} : *{event['title']}* _({event['calendar']})_")
        if event.get("location"):
            lines.append(f"  📍 {event['location'][:60]}")

    conflicts = detect_conflicts(events)
    if conflicts:
        lines.append(f"\n⚠️ *{len(conflicts)} conflit(s) détecté(s)* — vérifiez votre agenda")

    await update.message.reply_text("\n".join(lines), parse_mode="Markdown")


# ─────────────────────────────────────────────────────────────
# Callback — validation des brouillons
# ─────────────────────────────────────────────────────────────

async def handle_draft_callback(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Gère les boutons inline [Valider / Annuler] sur les brouillons."""
    query = update.callback_query
    await query.answer()

    if not is_authorized(query.from_user.id):
        return

    data = query.data  # "draft_approve:42" | "draft_cancel:42"
    try:
        action, draft_id_str = data.split(":", 1)
        draft_id = int(draft_id_str)
    except (ValueError, AttributeError):
        logger.warning(f"Callback data invalide : {data}")
        return

    from src.email.poller import send_approved_draft, cancel_draft

    from src.memory.learning import record_decision

    if action == "draft_approve":
        try:
            await send_approved_draft(draft_id)
            await record_decision("email_draft", str(draft_id), "approved")
            new_text = query.message.text + "\n\n✅ *Email envoyé.*"
            await query.edit_message_text(new_text, parse_mode="Markdown")
            logger.info(f"Draft {draft_id} approuvé et envoyé")
        except Exception as e:
            logger.error(f"Erreur envoi draft {draft_id}: {e}")
            await context.bot.send_message(
                chat_id=query.message.chat_id,
                text=f"❌ Erreur lors de l'envoi du brouillon {draft_id} : {e}",
            )

    elif action == "draft_cancel":
        try:
            await cancel_draft(draft_id)
            await record_decision("email_draft", str(draft_id), "rejected")
            new_text = query.message.text + "\n\n❌ *Brouillon annulé.*"
            await query.edit_message_text(new_text, parse_mode="Markdown")
            logger.info(f"Draft {draft_id} annulé")
        except Exception as e:
            logger.error(f"Erreur annulation draft {draft_id}: {e}")


# ─────────────────────────────────────────────────────────────
# Sprint 3 — Bien-être
# ─────────────────────────────────────────────────────────────

async def cmd_sport(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Logger une séance sport. Usage: /sport course 30"""
    if not is_authorized(update.effective_user.id):
        return

    args = context.args or []
    if not args:
        await update.message.reply_text(
            "Usage : /sport [activité] [durée en min]\n"
            "Exemple : /sport course 30\n"
            "Exemple : /sport muscu 45"
        )
        return

    # Dernier arg numérique = durée
    quantity = None
    activity_parts = list(args)
    if activity_parts and activity_parts[-1].isdigit():
        quantity = float(activity_parts.pop(-1))

    activity = " ".join(activity_parts) if activity_parts else "séance"

    from src.wellness.tracker import log_wellness
    await log_wellness("sport", activity, quantity)

    duration_str = f" — {int(quantity)} min" if quantity else ""
    await update.message.reply_text(
        f"✅ *Sport logué* : {activity}{duration_str}\n"
        f"Continue comme ça 💪",
        parse_mode="Markdown",
    )


async def cmd_eau(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Logger hydratation. Usage: /eau 500"""
    if not is_authorized(update.effective_user.id):
        return

    args = context.args or []
    quantity = None
    if args and args[0].isdigit():
        quantity = float(args[0])
    else:
        quantity = 250.0  # verre par défaut

    from src.wellness.tracker import log_wellness, get_today_logs
    await log_wellness("water", f"{int(quantity)}ml", quantity)

    water_logs = await get_today_logs("water")
    total = int(sum(l.quantity or 0 for l in water_logs))
    pct = min(100, int(total / 2000 * 100))
    bar = "█" * (pct // 10) + "░" * (10 - pct // 10)

    await update.message.reply_text(
        f"💧 *+{int(quantity)} ml* — Total du jour : {total} ml\n"
        f"[{bar}] {pct}% de l'objectif (2L)",
        parse_mode="Markdown",
    )


async def cmd_repas(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Logger un repas. Usage: /repas salade + poulet grillé"""
    if not is_authorized(update.effective_user.id):
        return

    args = context.args or []
    if not args:
        await update.message.reply_text(
            "Usage : /repas [description]\n"
            "Exemple : /repas salade thon + pain complet"
        )
        return

    description = " ".join(args)
    from src.wellness.tracker import log_wellness, get_today_logs
    await log_wellness("meal", description)

    meal_logs = await get_today_logs("meal")
    await update.message.reply_text(
        f"🍽️ *Repas logué* : {description}\n"
        f"Total aujourd'hui : {len(meal_logs)} repas",
        parse_mode="Markdown",
    )


async def cmd_bilan(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Affiche le bilan bien-être du jour."""
    if not is_authorized(update.effective_user.id):
        return

    await update.message.reply_chat_action(ChatAction.TYPING)

    args = context.args or []
    if args and args[0] == "semaine":
        from src.wellness.tracker import format_week_bilan
        text = await format_week_bilan()
    else:
        from src.wellness.tracker import format_today_bilan
        text = await format_today_bilan()

    await update.message.reply_text(text, parse_mode="Markdown")


# ─────────────────────────────────────────────────────────────
# Sprint 5 — Création d'événements calendrier
# ─────────────────────────────────────────────────────────────

async def cmd_event(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """
    Crée un événement via texte naturel avec confirmation.
    Usage: /event Réunion avec Pierre demain 14h Zoom
    """
    if not is_authorized(update.effective_user.id):
        return

    args = context.args or []
    if not args:
        await update.message.reply_text(
            "Usage : /event [description naturelle]\n\n"
            "Exemples :\n"
            "• /event Réunion Pierre demain 14h\n"
            "• /event Sport lundi 18h-19h salle de sport\n"
            "• /event Call client vendredi 10h30\n"
            "• /event Dentiste 25 mars 9h"
        )
        return

    await update.message.reply_chat_action(ChatAction.TYPING)
    text = " ".join(args)

    from src.calendar.google_cal import parse_event_from_nlp
    event_data = await parse_event_from_nlp(text)

    if not event_data or not event_data.get("start_iso"):
        await update.message.reply_text(
            "❌ Je n'ai pas pu comprendre les détails de l'événement.\n"
            "Essayez avec une date et une heure plus explicites.\n"
            "Exemple : /event Réunion demain 14h30"
        )
        return

    # Stocker en cache Redis pour confirmation
    import json
    from src.memory.cache import set_cache
    cache_key = f"pending_event:{update.effective_user.id}"
    await set_cache(cache_key, json.dumps(event_data), ttl=300)  # 5 min

    # Parser les dates pour affichage
    import pytz
    from datetime import datetime
    paris = pytz.timezone("Europe/Paris")
    try:
        start_dt = datetime.fromisoformat(event_data["start_iso"]).astimezone(paris)
        end_dt = datetime.fromisoformat(event_data["end_iso"]).astimezone(paris)
        date_str = start_dt.strftime("%A %d %B à %Hh%M")
        end_str = end_dt.strftime("%Hh%M")
    except Exception:
        date_str = event_data.get("start_iso", "?")
        end_str = "?"

    # Résoudre le label du compte
    account_labels = {
        "nassimboughazi@gmail.com": "Perso (nassimboughazi@gmail.com)",
        "nassimhandstied@gmail.com": "Pro (nassimhandstied@gmail.com)",
        "nassimboughazi@canva.com": "Canva (nassimboughazi@canva.com)",
    }
    account_label = account_labels.get(event_data["account_id"], event_data["account_id"])

    summary_lines = [
        f"📅 *Confirmation événement*\n",
        f"*Titre* : {event_data['title']}",
        f"*Date* : {date_str} → {end_str}",
        f"*Calendrier* : {account_label}",
    ]
    if event_data.get("location"):
        summary_lines.append(f"*Lieu* : {event_data['location']}")
    if event_data.get("description"):
        summary_lines.append(f"*Description* : {event_data['description']}")

    summary_lines.append("\nCréer cet événement ?")

    keyboard = InlineKeyboardMarkup([
        [
            InlineKeyboardButton("✅ Créer", callback_data=f"event_confirm:{update.effective_user.id}"),
            InlineKeyboardButton("❌ Annuler", callback_data=f"event_cancel:{update.effective_user.id}"),
        ]
    ])

    await update.message.reply_text(
        "\n".join(summary_lines),
        parse_mode="Markdown",
        reply_markup=keyboard,
    )


async def handle_event_callback(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Gère la confirmation/annulation de création d'événement."""
    query = update.callback_query
    await query.answer()

    if not is_authorized(query.from_user.id):
        return

    data = query.data  # "event_confirm:USER_ID" | "event_cancel:USER_ID"
    action = data.split(":")[0]

    import json
    from src.memory.cache import get_cache
    cache_key = f"pending_event:{query.from_user.id}"
    cached = await get_cache(cache_key)

    if not cached:
        await query.edit_message_text("⏱️ Délai expiré — relancez /event.")
        return

    event_data = json.loads(cached)

    from src.memory.learning import record_decision

    if action == "event_cancel":
        await record_decision("event", event_data.get("title", "?"), "rejected")
        await query.edit_message_text(
            query.message.text + "\n\n❌ *Annulé.*",
            parse_mode="Markdown",
        )
        return

    # Confirmer — créer l'événement
    await query.edit_message_text(
        query.message.text + "\n\n⏳ Création en cours…",
        parse_mode="Markdown",
    )

    try:
        from src.calendar.google_cal import create_event
        from datetime import datetime
        import pytz

        paris = pytz.timezone("Europe/Paris")
        start_dt = datetime.fromisoformat(event_data["start_iso"]).astimezone(paris)
        end_dt = datetime.fromisoformat(event_data["end_iso"]).astimezone(paris)

        await create_event(
            account_id=event_data["account_id"],
            title=event_data["title"],
            start_dt=start_dt,
            end_dt=end_dt,
            location=event_data.get("location", ""),
            description=event_data.get("description", ""),
        )

        date_str = start_dt.strftime("%A %d %B à %Hh%M")
        await record_decision("event", event_data["title"], "approved",
                              {"date": event_data.get("start_iso", "")})
        await query.edit_message_text(
            f"✅ *Événement créé !*\n\n"
            f"📅 *{event_data['title']}*\n"
            f"{date_str}",
            parse_mode="Markdown",
        )
        logger.info(f"Événement créé via Telegram : {event_data['title']}")

    except Exception as e:
        logger.error(f"Erreur création événement : {e}", exc_info=True)
        await query.edit_message_text(
            f"❌ Erreur lors de la création : {e}\n\n"
            "Vérifiez que le compte Google est connecté avec /status",
            parse_mode="Markdown",
        )


# ─────────────────────────────────────────────────────────────
# Sprint 3 réel — /complements /planning /courses /repasplan /fitness
# ─────────────────────────────────────────────────────────────

async def cmd_complements(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Affiche le planning des compléments ou déclenche un rappel manuel."""
    if not is_authorized(update.effective_user.id):
        return

    from src.wellness.supplements import format_supplement_schedule

    args = context.args or []
    if args and args[0] in ("matin", "soir", "post_sport"):
        from src.wellness.supplements import send_supplement_reminder
        await send_supplement_reminder(args[0])
        await update.message.reply_text(f"💊 Rappel '{args[0]}' déclenché.")
        return

    text = format_supplement_schedule()
    await update.message.reply_text(text, parse_mode="Markdown")


async def cmd_planning(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Affiche ou génère le planning sport de la semaine."""
    if not is_authorized(update.effective_user.id):
        return

    await update.message.reply_chat_action(ChatAction.TYPING)
    args = context.args or []

    if args and args[0] == "generer":
        from src.wellness.sport_scheduler import propose_weekly_sport_plan
        await update.message.reply_text("⏳ Génération du planning sport en cours…")
        await propose_weekly_sport_plan()
        return

    from src.memory.cache import get_cache
    import json

    cached = await get_cache("pending_sport_plan")
    if not cached:
        await update.message.reply_text(
            "Aucun planning sport en cache.\n\n"
            "Tapez `/planning generer` pour en créer un,\n"
            "ou attendez le vendredi soir à 18h (automatique).",
            parse_mode="Markdown",
        )
        return

    sessions = json.loads(cached)
    type_icons = {"muscu": "💪", "boxe": "🥊"}
    lines = ["🏋️ *Planning sport — en attente*\n"]
    for s in sessions:
        icon = type_icons.get(s.get("type", "muscu"), "🏃")
        lines.append(
            f"{icon} *{s['day'].capitalize()}* {s['date']} — {s['type'].capitalize()}\n"
            f"   ⏰ {s['start']} → {s['end']}"
        )
    lines.append("\n_/planning generer pour forcer une mise à jour._")

    keyboard = InlineKeyboardMarkup([[
        InlineKeyboardButton("✅ Bloquer ces créneaux", callback_data="sport_plan_confirm"),
        InlineKeyboardButton("🔄 Régénérer", callback_data="sport_plan_regenerate"),
    ]])
    await update.message.reply_text("\n".join(lines), parse_mode="Markdown", reply_markup=keyboard)


async def cmd_courses(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Affiche la liste de courses de la semaine."""
    if not is_authorized(update.effective_user.id):
        return

    await update.message.reply_chat_action(ChatAction.TYPING)
    from src.memory.cache import get_cache
    shopping_list = await get_cache("weekly_shopping_list")

    if not shopping_list:
        await update.message.reply_text(
            "🛒 Aucune liste de courses disponible.\n\n"
            "La liste est générée chaque dimanche soir automatiquement.\n"
            "Tapez `/repasplan generer` pour en créer une maintenant.",
            parse_mode="Markdown",
        )
        return

    await update.message.reply_text(shopping_list[:4000], parse_mode="Markdown")


async def cmd_repasplan(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Affiche le plan repas de la semaine ou le génère."""
    if not is_authorized(update.effective_user.id):
        return

    await update.message.reply_chat_action(ChatAction.TYPING)
    args = context.args or []

    if args and args[0] == "generer":
        from src.wellness.meal_planner import send_weekly_meal_plan
        await update.message.reply_text("⏳ Génération du plan repas en cours…")
        await send_weekly_meal_plan()
        return

    from src.memory.cache import get_cache
    meal_plan = await get_cache("weekly_meal_plan")

    if not meal_plan:
        await update.message.reply_text(
            "Aucun plan repas disponible.\n\n"
            "Tapez `/repasplan generer` pour en créer un maintenant,\n"
            "ou attendez le dimanche soir à 19h (automatique).",
            parse_mode="Markdown",
        )
        return

    await update.message.reply_text(meal_plan[:4000], parse_mode="Markdown")


async def cmd_fitness(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Affiche les salles Fitness Park. Partagez votre position pour la plus proche."""
    if not is_authorized(update.effective_user.id):
        return

    from src.wellness.sport_scheduler import format_fitness_parks_list
    text = format_fitness_parks_list()
    await update.message.reply_text(
        text + "\n\n📍 _Partagez votre position pour trouver la salle la plus proche._",
        parse_mode="Markdown",
    )


async def handle_location_message(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Reçoit une localisation Telegram et trouve la salle Fitness Park la plus proche."""
    if not is_authorized(update.effective_user.id):
        return
    if not update.message or not update.message.location:
        return

    loc = update.message.location
    from src.wellness.sport_scheduler import find_nearest_fitness_park
    park = find_nearest_fitness_park(loc.latitude, loc.longitude)

    if not park:
        await update.message.reply_text("Impossible de trouver une salle Fitness Park.")
        return

    await update.message.reply_text(
        f"🏋️ *Fitness Park le plus proche*\n\n"
        f"*{park['name']}*\n"
        f"📍 {park['address']}\n"
        f"📏 {park['distance_km']} km de votre position",
        parse_mode="Markdown",
    )


async def handle_sport_plan_callback(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Gère la confirmation/régénération/annulation du planning sport."""
    query = update.callback_query
    await query.answer()

    if not is_authorized(query.from_user.id):
        return

    action = query.data

    if action == "sport_plan_cancel":
        await query.edit_message_text(
            query.message.text + "\n\n❌ *Planning ignoré.*",
            parse_mode="Markdown",
        )
        return

    if action == "sport_plan_regenerate":
        await query.edit_message_text("⏳ Régénération du planning sport…")
        from src.wellness.sport_scheduler import propose_weekly_sport_plan
        await propose_weekly_sport_plan()
        return

    if action == "sport_plan_confirm":
        await query.edit_message_text(
            query.message.text + "\n\n⏳ Blocage dans l'agenda…",
            parse_mode="Markdown",
        )
        from src.wellness.sport_scheduler import block_sport_sessions_from_cache
        try:
            created = await block_sport_sessions_from_cache()
            new_text = (
                query.message.text.replace("\n\n⏳ Blocage dans l'agenda…", "")
                + f"\n\n✅ *{created} séances bloquées dans l'agenda.*"
            )
            await query.edit_message_text(new_text, parse_mode="Markdown")
        except Exception as e:
            logger.error(f"Erreur blocage séances sport : {e}")
            await context.bot.send_message(
                chat_id=query.message.chat_id,
                text=f"❌ Erreur lors du blocage : {e}\nVérifiez que Google Calendar est connecté.",
            )


async def handle_courses_callback(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Gère la création des créneaux courses + boucherie dans l'agenda."""
    query = update.callback_query
    await query.answer()

    if not is_authorized(query.from_user.id):
        return

    action = query.data

    if action == "courses_skip_slots":
        await query.edit_message_text(
            query.message.text + "\n\n_Aucun créneau ajouté à l'agenda._",
            parse_mode="Markdown",
        )
        return

    if action == "courses_block_slots":
        await query.edit_message_text(
            query.message.text + "\n\n⏳ Création des créneaux dans l'agenda…",
            parse_mode="Markdown",
        )
        from src.wellness.meal_planner import block_shopping_and_butcher_slots
        try:
            await block_shopping_and_butcher_slots()
            new_text = (
                query.message.text.replace("\n\n⏳ Création des créneaux dans l'agenda…", "")
                + "\n\n✅ *Courses sam. 10h-11h30 + Boucherie 11h30-12h15 — bloqués dans l'agenda.*"
            )
            await query.edit_message_text(new_text, parse_mode="Markdown")
        except Exception as e:
            logger.error(f"Erreur création créneaux courses : {e}")
            await context.bot.send_message(
                chat_id=query.message.chat_id,
                text=f"❌ Erreur lors de la création des créneaux : {e}",
            )


# ─────────────────────────────────────────────────────────────
# Sprint 4 — Intelligence produit (analyse conviction + roadmap)
# ─────────────────────────────────────────────────────────────

async def cmd_analyse(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """
    Déclenche une analyse conviction pour une app ou toutes les apps.
    Usage: /analyse           → rapport pour toutes les apps
           /analyse job       → rapport pour Job Verdict uniquement
    """
    if not is_authorized(update.effective_user.id):
        return

    await update.message.reply_chat_action(ChatAction.TYPING)

    from src.integrations.product_intelligence import (
        generate_weekly_product_report,
        send_weekly_product_report,
    )
    from src.config import settings

    if not settings.github_configured:
        await update.message.reply_text(
            "GitHub non configuré.\n"
            "Ajoutez GITHUB_TOKEN et GITHUB_REPOS sur Railway."
        )
        return

    args = context.args or []
    app_filter = " ".join(args).lower() if args else None

    await update.message.reply_text(
        "⏳ Analyse en cours via Claude… (peut prendre 30-60 secondes)",
    )

    try:
        if app_filter:
            # Rapport ciblé sur une app
            from src.integrations.github import fetch_all_repos_full_context
            from src.integrations.stripe_client import fetch_revenue
            from src.integrations.product_intelligence import analyze_app_conviction, APP_EMOJIS
            from src.memory.cache import set_cache
            import json
            from datetime import datetime, timezone

            all_contexts = await fetch_all_repos_full_context()
            # Trouver l'app matching le filtre
            match = None
            for ctx in all_contexts:
                app_name = ctx.get("app_context", {}).get("name", "").lower()
                repo_name = ctx["repo"].split("/")[-1].lower()
                if app_filter in app_name or app_filter in repo_name:
                    match = ctx
                    break

            if not match:
                await update.message.reply_text(
                    f"App '{app_filter}' introuvable. Apps disponibles : "
                    + ", ".join(
                        ctx.get("app_context", {}).get("name", ctx["repo"])
                        for ctx in all_contexts
                    )
                )
                return

            app_context = match.get("app_context", {})
            app_name = app_context.get("name", match["repo"])
            emoji = APP_EMOJIS.get(app_name, "📱")

            revenue_data = None
            if settings.stripe_configured and app_context.get("monetized"):
                try:
                    revenue_data = await fetch_revenue()
                except Exception:
                    pass

            report = await analyze_app_conviction(
                app_context=app_context,
                readme=match.get("readme", ""),
                activity=match.get("activity", {}),
                revenue_data=revenue_data,
            )

            # Stocker en cache pour validation roadmap
            from src.memory.cache import set_cache
            cache_key = f"roadmap_pending:{app_name.lower().replace(' ', '_')}"
            await set_cache(cache_key, json.dumps({
                "app_name": app_name,
                "repo": match["repo"],
                "report": report,
                "generated_at": datetime.now(timezone.utc).isoformat(),
            }), ttl=7 * 24 * 3600)

            from telegram import InlineKeyboardButton, InlineKeyboardMarkup
            safe_key = app_name.lower().replace(" ", "_")
            keyboard = InlineKeyboardMarkup([[
                InlineKeyboardButton("✅ Valider roadmap", callback_data=f"roadmap_approve:{safe_key}"),
                InlineKeyboardButton("❌ Rejeter", callback_data=f"roadmap_reject:{safe_key}"),
            ]])

            await update.message.reply_text(
                f"{emoji} {report[:4000]}",
                parse_mode="Markdown",
                reply_markup=keyboard,
            )

        else:
            # Rapport complet toutes les apps via send_weekly_product_report
            await send_weekly_product_report()

    except Exception as e:
        logger.error(f"Erreur cmd_analyse : {e}", exc_info=True)
        await update.message.reply_text(f"❌ Erreur analyse : {e}")


async def handle_roadmap_callback(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Gère la validation/rejet d'une roadmap produit."""
    query = update.callback_query
    await query.answer()

    if not is_authorized(query.from_user.id):
        return

    data = query.data  # "roadmap_approve:job_verdict" | "roadmap_reject:job_verdict"
    try:
        action, app_key = data.split(":", 1)
    except (ValueError, AttributeError):
        logger.warning(f"Callback roadmap invalide : {data}")
        return

    from src.memory.learning import record_decision

    if action == "roadmap_reject":
        await record_decision("roadmap", app_key, "rejected")
        await query.edit_message_text(
            query.message.text + "\n\n❌ *Roadmap rejetée.*",
            parse_mode="Markdown",
        )
        return

    if action == "roadmap_approve":
        from src.integrations.product_intelligence import approve_roadmap
        try:
            result = await approve_roadmap(app_key)
            if not result:
                await query.edit_message_text(
                    query.message.text + "\n\n⚠️ *Cache expiré — relancez /analyse.*",
                    parse_mode="Markdown",
                )
                return

            app_name = result.get("app_name", app_key)
            await record_decision("roadmap", app_key, "approved", {"app_name": app_name})
            await query.edit_message_text(
                query.message.text + f"\n\n✅ *Roadmap {app_name} validée et stockée.*",
                parse_mode="Markdown",
            )
            logger.info(f"Roadmap approuvée via Telegram : {app_name}")
        except Exception as e:
            logger.error(f"Erreur approbation roadmap {app_key}: {e}")
            await context.bot.send_message(
                chat_id=query.message.chat_id,
                text=f"❌ Erreur validation roadmap : {e}",
            )


# ─────────────────────────────────────────────────────────────
# Mémoire apprenante — /memoire
# ─────────────────────────────────────────────────────────────

async def cmd_memoire(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Affiche ce que Jarvis a appris sur Nassim et ses interactions."""
    if not is_authorized(update.effective_user.id):
        return

    await update.message.reply_chat_action(ChatAction.TYPING)
    from src.memory.learning import get_full_learning_report
    report = await get_full_learning_report()
    await update.message.reply_text(report, parse_mode="Markdown")


# ─────────────────────────────────────────────────────────────
# Sprint 4 — GitHub + Stripe
# ─────────────────────────────────────────────────────────────

async def cmd_github(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Affiche l'activité GitHub des 24 dernières heures."""
    if not is_authorized(update.effective_user.id):
        return

    await update.message.reply_chat_action(ChatAction.TYPING)

    from src.integrations.github import fetch_all_repos_activity, format_activity_telegram
    from src.config import settings

    if not settings.github_configured:
        await update.message.reply_text(
            "GitHub non configuré.\n"
            "Ajoutez GITHUB_TOKEN et GITHUB_REPOS sur Railway."
        )
        return

    args = context.args or []
    hours = 24
    if args and args[0].isdigit():
        hours = min(int(args[0]), 168)  # max 7 jours

    activity = await fetch_all_repos_activity(hours_back=hours)
    msg = format_activity_telegram(activity)
    await update.message.reply_text(msg, parse_mode="Markdown")


async def cmd_revenue(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Affiche le dashboard Stripe."""
    if not is_authorized(update.effective_user.id):
        return

    await update.message.reply_chat_action(ChatAction.TYPING)

    from src.integrations.stripe_client import fetch_revenue, format_revenue_telegram
    from src.config import settings

    if not settings.stripe_configured:
        await update.message.reply_text(
            "Stripe non configuré.\n"
            "Ajoutez STRIPE_SECRET_KEY sur Railway."
        )
        return

    data = await fetch_revenue()
    msg = format_revenue_telegram(data)
    await update.message.reply_text(msg, parse_mode="Markdown")


# ─────────────────────────────────────────────────────────────
# Handlers messages (Sprint 1 — inchangés)
# ─────────────────────────────────────────────────────────────

async def handle_text_message(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    if not is_authorized(update.effective_user.id):
        return

    await update.message.reply_chat_action(ChatAction.TYPING)

    from src.llm.groq_client import groq_client
    from src.memory.cache import get_conversation_history, save_conversation_history
    from src.memory.database import log_message
    from src.memory.learning import record_active_moment
    from src.context import build_enriched_system_prompt

    user_id = str(update.effective_user.id)
    user_text = update.message.text

    # Tracker l'activité + construire le prompt enrichi en parallèle
    system_prompt, _ = await asyncio.gather(
        build_enriched_system_prompt(),
        record_active_moment(),
        return_exceptions=True,
    )
    if isinstance(system_prompt, Exception):
        system_prompt = None

    history = await get_conversation_history(user_id)
    history.append({"role": "user", "content": user_text})

    response = await groq_client.chat(history, system_override=system_prompt or None)

    history.append({"role": "assistant", "content": response})
    await save_conversation_history(user_id, history)
    await log_message(telegram_user_id=update.effective_user.id, role="user", content=user_text)
    await log_message(telegram_user_id=update.effective_user.id, role="assistant", content=response)

    await update.message.reply_text(response)


async def handle_voice_message(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    if not is_authorized(update.effective_user.id):
        return

    await update.message.reply_chat_action(ChatAction.TYPING)

    from src.llm.groq_client import groq_client
    from src.audio.tts import text_to_ogg
    from src.audio.stt import transcribe_audio
    from src.memory.cache import get_conversation_history, save_conversation_history
    from src.memory.database import log_message
    from src.memory.learning import record_active_moment
    from src.context import build_enriched_system_prompt

    user_id = str(update.effective_user.id)
    voice = update.message.voice or update.message.audio
    tg_file = await context.bot.get_file(voice.file_id)

    with tempfile.NamedTemporaryFile(suffix=".ogg", delete=False) as tmp:
        tmp_path = tmp.name

    try:
        await tg_file.download_to_drive(tmp_path)

        transcription = await transcribe_audio(tmp_path)
        if not transcription:
            await update.message.reply_text(
                "Je n'ai pas pu transcrire votre message. Pourriez-vous répéter ?"
            )
            return

        # Tracker l'activité + construire le prompt enrichi en parallèle
        system_prompt, _ = await asyncio.gather(
            build_enriched_system_prompt(),
            record_active_moment(),
            return_exceptions=True,
        )
        if isinstance(system_prompt, Exception):
            system_prompt = None

        history = await get_conversation_history(user_id)
        history.append({"role": "user", "content": transcription})

        response = await groq_client.chat(history, system_override=system_prompt or None)

        history.append({"role": "assistant", "content": response})
        await save_conversation_history(user_id, history)
        await log_message(
            telegram_user_id=update.effective_user.id,
            role="user",
            content=transcription,
            audio_transcription=transcription,
        )
        await log_message(telegram_user_id=update.effective_user.id, role="assistant", content=response)

        await update.message.reply_text(
            f"_{transcription}_\n\n{response}",
            parse_mode="Markdown",
        )

        try:
            await update.message.reply_chat_action(ChatAction.RECORD_VOICE)
            ogg_bytes = await text_to_ogg(response)
            await update.message.reply_voice(voice=io.BytesIO(ogg_bytes))
        except Exception as tts_err:
            logger.error(f"Erreur réponse vocale (TTS/OGG) : {tts_err}")

    except Exception as e:
        logger.error(f"Erreur traitement message vocal : {e}", exc_info=True)
        try:
            await update.message.reply_text(
                "Une erreur est survenue lors du traitement de votre message vocal. Réessayez."
            )
        except Exception:
            pass
    finally:
        if os.path.exists(tmp_path):
            os.unlink(tmp_path)
