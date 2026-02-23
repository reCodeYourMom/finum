"""
Plan repas hebdomadaire halal + liste de courses + créneaux dans l'agenda.
Proposé chaque dimanche soir, adapté au planning sport de la semaine.
"""
import logging
from datetime import datetime, timedelta

import pytz

from src.config import settings

logger = logging.getLogger(__name__)

PARIS_TZ = pytz.timezone("Europe/Paris")


async def generate_weekly_meal_plan() -> str:
    """Génère un plan repas hebdomadaire via Groq, adapté au planning sport."""
    from src.llm.groq_client import groq_client
    from src.memory.cache import get_cache
    import json

    now = datetime.now(PARIS_TZ)

    # Récupérer le planning sport pour adapter les macros
    sport_plan_raw = await get_cache("pending_sport_plan")
    muscu_days: list = []
    boxe_days: list = []

    if sport_plan_raw:
        try:
            sessions = json.loads(sport_plan_raw)
            for s in sessions:
                t = s.get("type", "")
                day = s.get("day", "").lower()
                if t == "muscu" and day:
                    muscu_days.append(day)
                elif t == "boxe" and day:
                    boxe_days.append(day)
        except Exception:
            pass

    # Jours de la semaine prochaine
    days_until_monday = (7 - now.weekday()) % 7 or 7
    next_monday = now + timedelta(days=days_until_monday)
    weekday_labels = ["lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi", "dimanche"]
    week_days = [weekday_labels[(next_monday + timedelta(days=i)).weekday()] for i in range(7)]

    muscu_str = ", ".join(muscu_days) if muscu_days else "lundi, mercredi, vendredi"
    boxe_str = ", ".join(boxe_days) if boxe_days else "mardi, jeudi, samedi"

    prompt = [{
        "role": "user",
        "content": f"""Génère un plan repas complet pour la semaine ({', '.join(week_days)}).

Profil Nassim :
- Objectif : recomposition corporelle (perdre du gras, prendre du muscle)
- Poids : 116 kg | Taille : 170 cm
- Régime halal strict — aucune exception
- Allergies : aucune
- Budget : sans contrainte, cuisine simple et réaliste
- Jours musculation ({muscu_str}) → protéines renforcées ~230g/j (2g/kg)
- Jours boxe ({boxe_str}) → glucides complexes + récupération
- Dimanche → repos, repas léger, légèrement en déficit

Semaine du {next_monday.strftime('%d/%m/%Y')} :

Format EXACT (Markdown Telegram) :
*Plan repas — semaine du {next_monday.strftime('%d/%m')}*

*Lundi* _(Muscu — protéines++)_
🌅 Petit-déj : ...
🌞 Déjeuner : ...
🌙 Dîner : ...

[continuer pour chaque jour]

Règles :
- Cuisine variée : poulet, dinde, bœuf halal, agneau, poisson, œufs, légumineuses
- Féculents : riz basmati, quinoa, patate douce, pain complet
- Maximum 20 lignes par jour
- Portions réalistes et concrètes (ex: "150g de blanc de poulet grillé")""",
    }]

    try:
        plan = await groq_client.chat(prompt)
        return plan
    except Exception as e:
        logger.error(f"Erreur génération plan repas : {e}")
        return ""


async def generate_shopping_list(meal_plan: str) -> str:
    """Extrait une liste de courses organisée depuis le plan repas."""
    from src.llm.groq_client import groq_client

    prompt = [{
        "role": "user",
        "content": f"""À partir de ce plan repas, génère une liste de courses complète, organisée par rayon.

Plan repas :
{meal_plan[:3000]}

Format EXACT (Markdown Telegram) :
🛒 *Liste de courses — semaine*

🥩 *Viandes & Poissons (Halal — boucherie)*
- ...

🥦 *Fruits & Légumes*
- ...

🌾 *Féculents & Légumineuses*
- ...

🥚 *Produits laitiers & Œufs*
- ...

🫙 *Épicerie sèche & Condiments*
- ...

❄️ *Surgelés (optionnel)*
- ...

Règles :
- Quantités pour 1 personne sur 7 jours
- Regroupe les ingrédients identiques
- Indique les quantités approximatives (ex: "500g de blanc de poulet")
- Marque "⚠️ boucherie halal" pour les viandes fraîches
- Reste concis, liste seulement l'essentiel""",
    }]

    try:
        return await groq_client.chat(prompt)
    except Exception as e:
        logger.error(f"Erreur génération liste de courses : {e}")
        return ""


async def send_weekly_meal_plan() -> None:
    """
    Envoie le plan repas + liste de courses chaque dimanche soir.
    Puis propose de bloquer les créneaux courses dans l'agenda.
    """
    from src.memory.cache import set_cache
    from telegram import Bot, InlineKeyboardButton, InlineKeyboardMarkup

    logger.info("Génération du plan repas hebdomadaire…")
    meal_plan = await generate_weekly_meal_plan()
    if not meal_plan:
        logger.warning("Plan repas vide — abandon")
        return

    shopping_list = await generate_shopping_list(meal_plan)

    # Persister en cache 7 jours
    await set_cache("weekly_meal_plan", meal_plan, ttl=7 * 24 * 3600)
    if shopping_list:
        await set_cache("weekly_shopping_list", shopping_list, ttl=7 * 24 * 3600)

    keyboard = InlineKeyboardMarkup([[
        InlineKeyboardButton("📅 Bloquer courses + boucherie", callback_data="courses_block_slots"),
        InlineKeyboardButton("❌ Non merci", callback_data="courses_skip_slots"),
    ]])

    try:
        bot = Bot(token=settings.telegram_bot_token)
        async with bot:
            # Plan repas (peut dépasser 4096 — tronquer si besoin)
            await bot.send_message(
                chat_id=settings.telegram_user_id,
                text=meal_plan[:4000],
                parse_mode="Markdown",
            )
            # Liste de courses avec bouton
            if shopping_list:
                await bot.send_message(
                    chat_id=settings.telegram_user_id,
                    text=shopping_list[:4000],
                    parse_mode="Markdown",
                    reply_markup=keyboard,
                )
        logger.info("Plan repas + liste de courses envoyés")
    except Exception as e:
        logger.error(f"Erreur envoi plan repas hebdomadaire : {e}")


async def block_shopping_and_butcher_slots() -> None:
    """Crée les créneaux courses + boucherie dans l'agenda du samedi."""
    from src.calendar.google_cal import create_event

    now = datetime.now(PARIS_TZ)
    days_until_saturday = (5 - now.weekday()) % 7 or 7
    saturday = now + timedelta(days=days_until_saturday)

    account_id = "nassimboughazi@gmail.com"

    # Courses grandes surfaces : samedi 10h00 → 11h30
    courses_start = saturday.replace(hour=10, minute=0, second=0, microsecond=0)
    courses_end = saturday.replace(hour=11, minute=30, second=0, microsecond=0)

    # Boucherie halal : samedi 11h30 → 12h15
    boucher_start = saturday.replace(hour=11, minute=30, second=0, microsecond=0)
    boucher_end = saturday.replace(hour=12, minute=15, second=0, microsecond=0)

    try:
        await create_event(
            account_id=account_id,
            title="🛒 Courses de la semaine",
            start_dt=courses_start,
            end_dt=courses_end,
            description="Liste de courses générée par Jarvis — voir /courses pour le détail",
        )
        logger.info("Créneau courses créé")
    except Exception as e:
        logger.error(f"Erreur création créneau courses : {e}")

    try:
        await create_event(
            account_id=account_id,
            title="🥩 Boucherie halal",
            start_dt=boucher_start,
            end_dt=boucher_end,
            description="Viandes halal fraîches — boucherie en physique",
        )
        logger.info("Créneau boucherie créé")
    except Exception as e:
        logger.error(f"Erreur création créneau boucherie : {e}")
