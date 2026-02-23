import asyncio
import logging
from datetime import datetime

import pytz

from src.config import settings
from src.context import get_paris_time

logger = logging.getLogger(__name__)

PARIS_TZ = pytz.timezone("Europe/Paris")


def _get_day_context() -> str:
    """Construit le contexte du jour pour le briefing."""
    now = datetime.now(PARIS_TZ)
    jours = {
        0: "Lundi", 1: "Mardi", 2: "Mercredi",
        3: "Jeudi", 4: "Vendredi", 5: "Samedi", 6: "Dimanche",
    }
    jour = jours[now.weekday()]
    est_semaine = now.weekday() < 5

    contexte = f"Nous sommes {jour}."
    if not est_semaine:
        contexte += " C'est le week-end — les obligations Canva sont absentes."
    return contexte


async def _fetch_email_summary() -> str:
    """Récupère un résumé des emails des dernières 24h depuis la base."""
    try:
        from sqlalchemy import select, func
        from src.memory.database import EmailSeen, async_session
        from datetime import timedelta, timezone

        cutoff = datetime.now(timezone.utc) - timedelta(hours=24)

        async with async_session() as session:
            result = await session.execute(
                select(EmailSeen.priority, func.count(EmailSeen.id))
                .where(EmailSeen.classified_at >= cutoff)
                .group_by(EmailSeen.priority)
            )
            counts = {row[0]: row[1] for row in result.all()}

        if not counts:
            return "Aucun email traité la veille."

        parts = []
        if counts.get("urgent"):
            parts.append(f"{counts['urgent']} urgent(s)")
        if counts.get("important"):
            parts.append(f"{counts['important']} important(s)")
        if counts.get("reste"):
            parts.append(f"{counts['reste']} de moindre priorité")

        return f"Emails traités : {', '.join(parts)}."

    except Exception as e:
        logger.warning(f"Erreur résumé emails pour briefing : {e}")
        return ""


async def _fetch_calendar_summary() -> str:
    """Récupère le résumé des événements du jour."""
    try:
        from src.calendar.google_cal import fetch_today_events, format_event_time
        events = await fetch_today_events()
        if not events:
            return "Aucun événement aujourd'hui."

        lines = []
        for e in events[:5]:
            lines.append(f"• {format_event_time(e)} : {e['title']} ({e['calendar']})")

        summary = "\n".join(lines)
        if len(events) > 5:
            summary += f"\n… et {len(events) - 5} autre(s)"
        return summary

    except Exception as e:
        logger.warning(f"Erreur résumé agenda pour briefing : {e}")
        return ""


async def _fetch_wellness_summary() -> str:
    """Récupère un résumé des logs bien-être de la veille."""
    try:
        from src.wellness.tracker import get_week_logs
        from datetime import timedelta, timezone

        logs = await get_week_logs()
        yesterday_cutoff = datetime.now(timezone.utc) - timedelta(hours=24)
        yesterday_logs = [l for l in logs if l.logged_at >= yesterday_cutoff]

        if not yesterday_logs:
            return ""

        sport = [l for l in yesterday_logs if l.category == "sport"]
        water = [l for l in yesterday_logs if l.category == "water"]
        meals = [l for l in yesterday_logs if l.category == "meal"]

        parts = []
        if sport:
            total_min = int(sum(l.quantity or 0 for l in sport))
            parts.append(f"sport {total_min} min")
        if water:
            total_ml = int(sum(l.quantity or 0 for l in water))
            parts.append(f"eau {total_ml} ml")
        if meals:
            parts.append(f"{len(meals)} repas")

        return ", ".join(parts) if parts else ""

    except Exception as e:
        logger.warning(f"Erreur résumé bien-être pour briefing : {e}")
        return ""


async def _fetch_github_summary() -> str:
    """Résumé compact de l'activité GitHub des dernières 24h."""
    try:
        from src.integrations.github import fetch_all_repos_activity, format_activity_briefing
        activity = await fetch_all_repos_activity(hours_back=24)
        return format_activity_briefing(activity)
    except Exception as e:
        logger.warning(f"Erreur résumé GitHub pour briefing : {e}")
        return ""


async def generate_briefing() -> str:
    """Génère le contenu du briefing quotidien via Groq."""
    from src.llm.groq_client import groq_client

    day_context = _get_day_context()
    heure = get_paris_time()

    # Enrichissement avec données réelles (Sprint 2 + Sprint 3 + Sprint 4)
    email_summary, calendar_summary, wellness_summary, github_summary = await asyncio.gather(
        _fetch_email_summary(),
        _fetch_calendar_summary(),
        _fetch_wellness_summary(),
        _fetch_github_summary(),
        return_exceptions=True,
    )
    # Remplacer les exceptions par chaîne vide
    if isinstance(email_summary, Exception):
        email_summary = ""
    if isinstance(calendar_summary, Exception):
        calendar_summary = ""
    if isinstance(wellness_summary, Exception):
        wellness_summary = ""
    if isinstance(github_summary, Exception):
        github_summary = ""

    # Contexte appris (mémoire apprenante)
    try:
        from src.memory.learning import get_learned_context_summary
        learned_context = await get_learned_context_summary()
    except Exception:
        learned_context = ""

    data_section = ""
    if email_summary:
        data_section += f"\n\n**Emails (veille)** : {email_summary}"
    if calendar_summary:
        data_section += f"\n\n**Agenda du jour** :\n{calendar_summary}"
    if wellness_summary:
        data_section += f"\n\n**Bien-être (hier)** : {wellness_summary}"
    if github_summary:
        data_section += f"\n\n**GitHub (24h)** : {github_summary}"
    if learned_context:
        data_section += f"\n\n**{learned_context}**"

    prompt = [
        {
            "role": "user",
            "content": f"""Génère le briefing quotidien de Nassim.

Contexte : {day_context} — {heure}{data_section}

Format attendu (Markdown, soyez concis) :

**Briefing — [jour et date complète]**

**Situation générale**
[1-2 phrases : contexte du jour, projets actifs, rythme de la semaine]

**Emails & Agenda**
[Résumé factuel basé sur les données ci-dessus. Si données disponibles, citez-les. Sinon, mentionnez que le monitoring est actif.]

**Activité GitHub**
[Si données GitHub disponibles : cite les repos actifs, commits, PRs. Sinon, omets cette section.]

**Priorité du jour**
[UNE recommandation concrète et justifiée — ce que Nassim doit absolument faire aujourd'hui]

**Point stratégique**
[Un rappel sur la vision 12 mois lié à l'un de ses projets — Job Verdict, ArabAI, Canva, Mindy ou Kalen]

**Bien-être**
[Basé sur les données bien-être ci-dessus : sport logué hier, hydratation, repas. Si pas de données : rappel sport + nutrition adapté au jour.]

Règles : factuel, direct, orienté action. Maximum 350 mots. Pas de fioritures.""",
        }
    ]

    briefing_text = await groq_client.chat(prompt)

    try:
        from src.memory.database import save_briefing
        await save_briefing(briefing_text)
    except Exception as e:
        logger.error(f"Erreur persistance briefing : {e}")

    return briefing_text


async def send_daily_briefing() -> None:
    """Envoie le briefing quotidien à Nassim via Telegram. Déclenché par le scheduler à 8h00."""
    from telegram import Bot

    logger.info("Génération du briefing quotidien…")
    try:
        briefing = await generate_briefing()
        bot = Bot(token=settings.telegram_bot_token)
        async with bot:
            await bot.send_message(
                chat_id=settings.telegram_user_id,
                text=briefing,
                parse_mode="Markdown",
            )
        logger.info("Briefing quotidien envoyé avec succès")
    except Exception as e:
        logger.error(f"Erreur envoi briefing quotidien : {e}", exc_info=True)
