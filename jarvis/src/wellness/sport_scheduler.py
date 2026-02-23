"""
Planification automatique des séances sport dans Google Calendar.
Géolocalisation → sélection de la salle Fitness Park la plus proche.
"""
import json
import logging
import math
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional

import pytz

from src.config import settings

logger = logging.getLogger(__name__)

PARIS_TZ = pytz.timezone("Europe/Paris")

# ─────────────────────────────────────────────────────────────
# Salles Fitness Park — Paris & Région parisienne
# ─────────────────────────────────────────────────────────────

FITNESS_PARKS: List[Dict[str, Any]] = [
    {"name": "Fitness Park Châtelet", "address": "20 Rue Saint-Denis, 75001 Paris", "lat": 48.8604, "lon": 2.3490},
    {"name": "Fitness Park Opéra", "address": "16 Bd des Italiens, 75009 Paris", "lat": 48.8706, "lon": 2.3369},
    {"name": "Fitness Park Bastille", "address": "9 Passage Thuret, 75011 Paris", "lat": 48.8544, "lon": 2.3761},
    {"name": "Fitness Park Nation", "address": "8 Pl. de la Nation, 75012 Paris", "lat": 48.8482, "lon": 2.3966},
    {"name": "Fitness Park Alésia", "address": "98 Av. du Général Leclerc, 75014 Paris", "lat": 48.8294, "lon": 2.3268},
    {"name": "Fitness Park Montparnasse", "address": "7 Av. du Maine, 75015 Paris", "lat": 48.8425, "lon": 2.3215},
    {"name": "Fitness Park Montrouge", "address": "2 Av. de la République, 92120 Montrouge", "lat": 48.8163, "lon": 2.3192},
    {"name": "Fitness Park Levallois", "address": "5 Rue Aristide Briand, 92300 Levallois-Perret", "lat": 48.8975, "lon": 2.2930},
    {"name": "Fitness Park Neuilly", "address": "85 Av. du Roule, 92200 Neuilly-sur-Seine", "lat": 48.8857, "lon": 2.2750},
    {"name": "Fitness Park Clichy", "address": "47 Rue de la République, 92110 Clichy", "lat": 48.9073, "lon": 2.3052},
    {"name": "Fitness Park Saint-Denis", "address": "2 Rue de la Légion d'Honneur, 93200 Saint-Denis", "lat": 48.9363, "lon": 2.3566},
    {"name": "Fitness Park Montreuil", "address": "2 Av. de la République, 93100 Montreuil", "lat": 48.8634, "lon": 2.4440},
    {"name": "Fitness Park Vincennes", "address": "7 Rue Raymond du Temple, 94300 Vincennes", "lat": 48.8476, "lon": 2.4346},
    {"name": "Fitness Park Issy-les-Moulineaux", "address": "13 Rue Icare, 92130 Issy-les-Moulineaux", "lat": 48.8231, "lon": 2.2701},
    {"name": "Fitness Park Vitry", "address": "1 Rue de la Convention, 94400 Vitry-sur-Seine", "lat": 48.7884, "lon": 2.3927},
]


def _haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calcule la distance Haversine en km entre deux coordonnées GPS."""
    R = 6371.0
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = (
        math.sin(dlat / 2) ** 2
        + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2) ** 2
    )
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c


def find_nearest_fitness_park(user_lat: float, user_lon: float) -> Dict[str, Any]:
    """Retourne la salle Fitness Park la plus proche des coordonnées données."""
    best: Optional[Dict[str, Any]] = None
    best_dist = float("inf")
    for park in FITNESS_PARKS:
        dist = _haversine_km(user_lat, user_lon, park["lat"], park["lon"])
        if dist < best_dist:
            best_dist = dist
            best = {**park, "distance_km": round(dist, 2)}
    return best or {}


def format_fitness_parks_list(user_lat: Optional[float] = None, user_lon: Optional[float] = None) -> str:
    """Formate la liste des Fitness Park, triée par distance si coordonnées fournies."""
    parks = [p.copy() for p in FITNESS_PARKS]

    if user_lat is not None and user_lon is not None:
        for p in parks:
            p["dist"] = _haversine_km(user_lat, user_lon, p["lat"], p["lon"])
        parks.sort(key=lambda x: x["dist"])
        lines = ["🏋️ *Fitness Park les plus proches*\n"]
        for i, p in enumerate(parks[:6], 1):
            lines.append(f"{i}. *{p['name']}* — {p['dist']:.1f} km\n   📍 {p['address']}")
    else:
        lines = ["🏋️ *Fitness Park — Paris & Région*\n"]
        for i, p in enumerate(parks, 1):
            lines.append(f"{i}. *{p['name']}*\n   📍 {p['address']}")

    return "\n".join(lines)


# ─────────────────────────────────────────────────────────────
# Planification automatique sport
# ─────────────────────────────────────────────────────────────

async def propose_weekly_sport_plan() -> None:
    """
    Génère et propose un planning sport pour la semaine à venir.
    Appelé le vendredi soir ou à la demande via /planning.
    6 séances : alternance muscu / boxe selon créneaux libres.
    """
    from src.calendar.google_cal import fetch_all_events
    from src.llm.groq_client import groq_client
    from src.memory.cache import set_cache
    from telegram import Bot, InlineKeyboardButton, InlineKeyboardMarkup

    now = datetime.now(PARIS_TZ)

    # Récupérer les événements des 10 prochains jours
    try:
        events = await fetch_all_events(days_ahead=10)
    except Exception:
        events = []

    # Résumé des créneaux occupés pour le LLM
    busy_slots = []
    for e in events:
        if not e.get("all_day") and e.get("end"):
            start_paris = e["start"].astimezone(PARIS_TZ)
            end_paris = e["end"].astimezone(PARIS_TZ)
            busy_slots.append(
                f"{start_paris.strftime('%A %d/%m %Hh%M')} → {end_paris.strftime('%Hh%M')}"
            )
    busy_str = "\n".join(busy_slots[:20]) if busy_slots else "Agenda vide"

    # Calculer les dates de la semaine prochaine
    days_until_monday = (7 - now.weekday()) % 7 or 7
    next_monday = now + timedelta(days=days_until_monday)

    prompt = [{
        "role": "user",
        "content": f"""Propose un planning sport pour la semaine prochaine (du lundi au samedi).

Profil Nassim : recomposition corporelle (116 kg, 170 cm), musculation + boxe, 6 séances/semaine.
Horaires préférés (par ordre de priorité) : 7h00-9h00, 12h00-14h00, 18h00-20h00, lundi au samedi.
Lundi prochain : {next_monday.strftime('%Y-%m-%d')}
Créneaux occupés :\n{busy_str}

Génère exactement 6 séances en JSON valide :
[
  {{"day": "lundi", "date": "YYYY-MM-DD", "type": "muscu", "start": "07:00", "end": "08:15", "location": "Fitness Park"}},
  {{"day": "mardi", "date": "YYYY-MM-DD", "type": "boxe", "start": "18:00", "end": "19:00", "location": "Fitness Park"}},
  ...
]

Règles :
- Alterne muscu et boxe (3 muscu + 3 boxe)
- Évite les créneaux occupés
- Muscu : 75 min, Boxe : 60 min
- Répartis lun-sam, préfère matin ou soir
- UNIQUEMENT le JSON, aucun texte autour""",
    }]

    sessions = []
    try:
        raw = await groq_client.chat(prompt)
        raw = raw.strip()
        if raw.startswith("```"):
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:]
        sessions = json.loads(raw.strip())
    except Exception as e:
        logger.error(f"Erreur génération planning sport : {e}")
        return

    if not sessions:
        return

    # Sauvegarder en cache 24h
    await set_cache("pending_sport_plan", json.dumps(sessions), ttl=86400)

    # Formater le message
    type_icons = {"muscu": "💪", "boxe": "🥊"}
    lines = ["🏋️ *Planning sport — semaine prochaine*\n"]
    for s in sessions:
        icon = type_icons.get(s.get("type", "muscu"), "🏃")
        lines.append(
            f"{icon} *{s['day'].capitalize()}* {s['date']} — {s['type'].capitalize()}\n"
            f"   ⏰ {s['start']} → {s['end']} | 📍 {s.get('location', 'Fitness Park')}"
        )
    lines.append("\nValider et bloquer ces créneaux dans l'agenda ?")

    keyboard = InlineKeyboardMarkup([[
        InlineKeyboardButton("✅ Bloquer", callback_data="sport_plan_confirm"),
        InlineKeyboardButton("❌ Ignorer", callback_data="sport_plan_cancel"),
    ]])

    try:
        bot = Bot(token=settings.telegram_bot_token)
        async with bot:
            await bot.send_message(
                chat_id=settings.telegram_user_id,
                text="\n".join(lines),
                parse_mode="Markdown",
                reply_markup=keyboard,
            )
        logger.info(f"Planning sport proposé : {len(sessions)} séances")
    except Exception as e:
        logger.error(f"Erreur envoi planning sport : {e}")


async def block_sport_sessions_from_cache() -> int:
    """
    Crée les événements sport dans Google Calendar depuis le plan en cache.
    Retourne le nombre de séances créées.
    """
    from src.calendar.google_cal import create_event
    from src.memory.cache import get_cache

    cached = await get_cache("pending_sport_plan")
    if not cached:
        return 0

    sessions = json.loads(cached)
    account_id = "nassimboughazi@gmail.com"
    type_titles = {"muscu": "💪 Muscu — Fitness Park", "boxe": "🥊 Boxe — Fitness Park"}
    created = 0

    for s in sessions:
        try:
            title = type_titles.get(s["type"], "🏋️ Sport")
            start_dt = datetime.fromisoformat(f"{s['date']}T{s['start']}:00").replace(tzinfo=PARIS_TZ)
            end_dt = datetime.fromisoformat(f"{s['date']}T{s['end']}:00").replace(tzinfo=PARIS_TZ)

            await create_event(
                account_id=account_id,
                title=title,
                start_dt=start_dt,
                end_dt=end_dt,
                location=s.get("location", "Fitness Park"),
                description=f"Séance {s['type']} — planifiée par Jarvis",
            )
            created += 1
            logger.info(f"Séance créée : {title} le {s['date']} {s['start']}")
        except Exception as e:
            logger.error(f"Erreur création séance sport {s.get('date', '?')} : {e}")

    logger.info(f"{created}/{len(sessions)} séances sport créées dans l'agenda")
    return created
