"""
Rappels bien-être — envoi automatique via Telegram.
Déclenchés par le scheduler APScheduler.
"""
import logging

from src.config import settings

logger = logging.getLogger(__name__)


async def _send(text: str) -> None:
    from telegram import Bot
    bot = Bot(token=settings.telegram_bot_token)
    async with bot:
        await bot.send_message(
            chat_id=settings.telegram_user_id,
            text=text,
            parse_mode="Markdown",
        )


async def remind_sport() -> None:
    """Rappel sport du matin — vérifie si déjà logué aujourd'hui."""
    from src.wellness.tracker import get_today_logs
    import pytz
    from datetime import datetime
    paris = pytz.timezone("Europe/Paris")
    weekday = datetime.now(paris).weekday()  # 0=Lundi, 6=Dimanche

    # Pas de rappel le dimanche
    if weekday == 6:
        return

    sport_logs = await get_today_logs("sport")
    if sport_logs:
        return  # Déjà logué, pas de rappel

    day_plans = {
        0: "🏃 *Rappel sport* — Lundi : course ou muscu. Lance-toi maintenant, tu le regretteras pas.",
        1: "🏋️ *Rappel sport* — Mardi : séance muscu prévue. Prépare ta tenue.",
        2: "🚴 *Rappel sport* — Mercredi : cardio ou mobilité. 30 min suffisent.",
        3: "🏃 *Rappel sport* — Jeudi : course ou HIIT. Tu es à mi-semaine, tiens bon.",
        4: "🏋️ *Rappel sport* — Vendredi : dernière séance de la semaine. Termine fort.",
        5: "🌿 *Rappel sport* — Samedi : activité libre. Marche, vélo, natation — reste actif.",
    }
    msg = day_plans.get(weekday, "💪 *Rappel sport* — Pense à bouger aujourd'hui.")
    await _send(msg)
    logger.info("Rappel sport envoyé")


async def remind_water() -> None:
    """Rappel hydratation toutes les 2h (9h-21h)."""
    from src.wellness.tracker import get_today_logs
    water_logs = await get_today_logs("water")
    total_ml = int(sum(l.quantity or 0 for l in water_logs))

    if total_ml >= 2000:
        return  # Objectif atteint, silence

    glasses = round(total_ml / 250, 1)
    remaining = max(0, 2000 - total_ml)

    msg = (
        f"💧 *Hydratation* — {total_ml} ml bu ({glasses}x250ml)\n"
        f"Encore {remaining} ml pour atteindre 2L.\n"
        f"Loggue avec /eau [quantité en ml]"
    )
    await _send(msg)
    logger.info(f"Rappel eau envoyé (total={total_ml}ml)")


async def remind_lunch() -> None:
    """Rappel repas du midi."""
    from src.wellness.tracker import get_today_logs
    meal_logs = await get_today_logs("meal")
    if meal_logs:
        return  # Déjà logué un repas, pas de rappel

    await _send(
        "🍽️ *Repas du midi* — Priorise protéines + légumes.\n"
        "Loggue ton repas : /repas [description]"
    )
    logger.info("Rappel déjeuner envoyé")


async def remind_dinner() -> None:
    """Rappel repas du soir."""
    from src.wellness.tracker import get_today_logs
    meal_logs = await get_today_logs("meal")

    # Rappel soir seulement si moins de 2 repas loggés
    if len(meal_logs) >= 2:
        return

    await _send(
        "🌙 *Repas du soir* — Mange léger avant 20h si possible.\n"
        "Loggue : /repas [description]"
    )
    logger.info("Rappel dîner envoyé")


async def remind_walk() -> None:
    """Rappel marche — après déjeuner (13h30) et après dîner (20h30)."""
    import pytz
    from datetime import datetime

    paris = pytz.timezone("Europe/Paris")
    now = datetime.now(paris)
    hour = now.hour

    # Pas de rappel le dimanche après 20h (repos)
    if now.weekday() == 6 and hour >= 20:
        return

    if 13 <= hour < 15:
        msg = (
            "🚶 *Rappel marche* — Après le déjeuner\n\n"
            "20-30 min de marche favorisent la digestion et la glycémie.\n"
            "Profitez-en pour prendre l'air."
        )
    else:
        msg = (
            "🚶 *Rappel marche* — Après le dîner\n\n"
            "15-20 min de marche légère pour terminer la journée.\n"
            "C'est l'une des habitudes les plus efficaces pour la recomposition."
        )

    await _send(msg)
    logger.info(f"Rappel marche envoyé ({hour}h)")


async def remind_standing_desk() -> None:
    """
    Rappel bureau debout — toutes les 90 min pendant les blocs de travail.
    Déclenché aux heures fixes : 10h00, 11h30, 14h00, 15h30, 17h00.
    """
    import pytz
    from datetime import datetime

    paris = pytz.timezone("Europe/Paris")
    now = datetime.now(paris)

    # Pas de rappel le week-end
    if now.weekday() >= 5:
        return

    hour = now.hour
    messages = {
        10: "⬆️ *Bureau debout* — Levez-vous ! 90 min écoulées depuis 8h30.\nRestez debout 20-30 min avant de vous rasseoir.",
        11: "⬆️ *Bureau debout* — Changement de posture.\n20 min debout, puis reprise en position assise.",
        14: "⬆️ *Bureau debout* — Après-midi : levez-vous.\nLe pic de somnolence post-déjeuner passe mieux debout.",
        15: "⬆️ *Bureau debout* — Mi-après-midi.\nBougez un peu, hydratez-vous, puis reprenez.",
        17: "⬆️ *Bureau debout* — Avant-dernière heure.\nDernière posture debout avant 18h30.",
    }

    msg = messages.get(hour, "⬆️ *Bureau debout* — Changement de posture recommandé.")
    await _send(msg)
    logger.info(f"Rappel bureau debout envoyé ({hour}h)")


async def send_weekly_wellness_report() -> None:
    """Résumé bien-être hebdomadaire — dimanche 20h."""
    from src.wellness.tracker import format_week_bilan
    from src.wellness.planner import generate_weekly_sport_plan

    bilan = await format_week_bilan()
    plan = await generate_weekly_sport_plan()

    msg = f"{bilan}\n\n{plan}"
    await _send(msg)
    logger.info("Rapport bien-être hebdomadaire envoyé")
