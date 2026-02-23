import logging
import pytz
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
from apscheduler.triggers.interval import IntervalTrigger

logger = logging.getLogger(__name__)

PARIS_TZ = pytz.timezone("Europe/Paris")
_scheduler: AsyncIOScheduler | None = None


def start_scheduler() -> None:
    global _scheduler

    from src.briefing.daily import send_daily_briefing
    from src.email.poller import poll_emails
    from src.calendar.conflict import check_and_notify_conflicts
    from src.wellness.reminders import (
        remind_sport,
        remind_water,
        remind_lunch,
        remind_dinner,
        remind_walk,
        remind_standing_desk,
        send_weekly_wellness_report,
    )
    from src.wellness.supplements import remind_supplements_morning, remind_supplements_evening
    from src.wellness.sport_scheduler import propose_weekly_sport_plan
    from src.wellness.meal_planner import send_weekly_meal_plan
    from src.integrations.github import send_github_digest
    from src.integrations.stripe_client import send_weekly_revenue_report

    _scheduler = AsyncIOScheduler(timezone=PARIS_TZ)

    # Briefing quotidien à 8h00 heure de Paris
    _scheduler.add_job(
        send_daily_briefing,
        trigger=CronTrigger(hour=8, minute=0, timezone=PARIS_TZ),
        id="daily_briefing",
        name="Briefing quotidien 8h00 Paris",
        replace_existing=True,
    )

    # Polling emails toutes les 15 minutes
    _scheduler.add_job(
        poll_emails,
        trigger=IntervalTrigger(minutes=15),
        id="email_poll",
        name="Polling emails toutes les 15 min",
        replace_existing=True,
        misfire_grace_time=60,
    )

    # Vérification conflits agenda toutes les 30 minutes
    _scheduler.add_job(
        check_and_notify_conflicts,
        trigger=IntervalTrigger(minutes=30),
        id="calendar_conflict",
        name="Vérification conflits agenda toutes les 30 min",
        replace_existing=True,
        misfire_grace_time=120,
    )

    # ── Sprint 3 — Bien-être & Rythme ────────────────────────

    # Compléments matin (configurable — défaut 7h30)
    _scheduler.add_job(
        remind_supplements_morning,
        trigger=CronTrigger(hour=7, minute=30, timezone=PARIS_TZ),
        id="supplement_morning",
        name="Compléments matin 7h30",
        replace_existing=True,
    )

    # Compléments soir (configurable — défaut 21h00)
    _scheduler.add_job(
        remind_supplements_evening,
        trigger=CronTrigger(hour=21, minute=0, timezone=PARIS_TZ),
        id="supplement_evening",
        name="Compléments soir 21h00",
        replace_existing=True,
    )

    # Rappel sport à 7h30 (lun-sam)
    _scheduler.add_job(
        remind_sport,
        trigger=CronTrigger(hour=7, minute=30, day_of_week="mon-sat", timezone=PARIS_TZ),
        id="remind_sport",
        name="Rappel sport 7h30",
        replace_existing=True,
    )

    # Rappel hydratation toutes les 2h (9h → 21h)
    _scheduler.add_job(
        remind_water,
        trigger=CronTrigger(hour="9,11,13,15,17,19,21", minute=0, timezone=PARIS_TZ),
        id="remind_water",
        name="Rappel eau toutes les 2h",
        replace_existing=True,
    )

    # Rappel déjeuner à 12h30
    _scheduler.add_job(
        remind_lunch,
        trigger=CronTrigger(hour=12, minute=30, timezone=PARIS_TZ),
        id="remind_lunch",
        name="Rappel déjeuner 12h30",
        replace_existing=True,
    )

    # Rappel marche — après déjeuner (13h30) et après dîner (20h30)
    _scheduler.add_job(
        remind_walk,
        trigger=CronTrigger(hour="13,20", minute=30, timezone=PARIS_TZ),
        id="remind_walk",
        name="Rappel marche 13h30 et 20h30",
        replace_existing=True,
    )

    # Rappel dîner à 19h30
    _scheduler.add_job(
        remind_dinner,
        trigger=CronTrigger(hour=19, minute=30, timezone=PARIS_TZ),
        id="remind_dinner",
        name="Rappel dîner 19h30",
        replace_existing=True,
    )

    # Bureau debout toutes les 90 min (lun-ven) : 10h00, 11h30, 14h00, 15h30, 17h00
    for _debout_id, _debout_h, _debout_m in [
        ("debout_1000", 10, 0),
        ("debout_1130", 11, 30),
        ("debout_1400", 14, 0),
        ("debout_1530", 15, 30),
        ("debout_1700", 17, 0),
    ]:
        _scheduler.add_job(
            remind_standing_desk,
            trigger=CronTrigger(hour=_debout_h, minute=_debout_m, day_of_week="mon-fri", timezone=PARIS_TZ),
            id=f"remind_standing_desk_{_debout_id}",
            name=f"Bureau debout {_debout_h}h{_debout_m:02d}",
            replace_existing=True,
        )

    # Rapport bien-être hebdomadaire — dimanche 20h00
    _scheduler.add_job(
        send_weekly_wellness_report,
        trigger=CronTrigger(day_of_week="sun", hour=20, minute=0, timezone=PARIS_TZ),
        id="weekly_wellness",
        name="Rapport bien-être hebdomadaire dimanche 20h",
        replace_existing=True,
    )

    # Planning sport proposé le vendredi à 18h00
    _scheduler.add_job(
        propose_weekly_sport_plan,
        trigger=CronTrigger(day_of_week="fri", hour=18, minute=0, timezone=PARIS_TZ),
        id="sport_plan_weekly",
        name="Proposition planning sport vendredi 18h",
        replace_existing=True,
    )

    # Plan repas + liste de courses — dimanche 19h00
    _scheduler.add_job(
        send_weekly_meal_plan,
        trigger=CronTrigger(day_of_week="sun", hour=19, minute=0, timezone=PARIS_TZ),
        id="weekly_meal_plan",
        name="Plan repas hebdomadaire dimanche 19h",
        replace_existing=True,
    )

    # ── Sprint 4 — GitHub + Stripe ────────────────────────────

    # Digest GitHub quotidien à 9h00 (lun-ven)
    _scheduler.add_job(
        send_github_digest,
        trigger=CronTrigger(hour=9, minute=0, day_of_week="mon-fri", timezone=PARIS_TZ),
        id="github_digest",
        name="Digest GitHub 9h00 lun-ven",
        replace_existing=True,
    )

    # Rapport Stripe hebdomadaire — lundi 8h05
    _scheduler.add_job(
        send_weekly_revenue_report,
        trigger=CronTrigger(day_of_week="mon", hour=8, minute=5, timezone=PARIS_TZ),
        id="stripe_weekly",
        name="Rapport Stripe lundi 8h05",
        replace_existing=True,
    )

    _scheduler.start()
    logger.info(
        "Scheduler démarré — "
        "Briefing 8h | "
        "Emails /15 min | "
        "Conflits /30 min | "
        "Compléments 7h30+21h | "
        "Sport 7h30 | "
        "Eau /2h | "
        "Repas 12h30+19h30 | "
        "Marche 13h30+20h30 | "
        "Bureau debout /90min | "
        "Planning sport ven 18h | "
        "Plan repas dim 19h | "
        "Bilan hebdo dim 20h | "
        "GitHub 9h lun-ven | "
        "Stripe lundi 8h05"
    )


def stop_scheduler() -> None:
    global _scheduler
    if _scheduler and _scheduler.running:
        _scheduler.shutdown(wait=False)
        logger.info("Scheduler arrêté")
