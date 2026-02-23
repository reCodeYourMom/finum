from pathlib import Path
import pytz
from datetime import datetime

from src.config import settings

_PARIS_TZ = pytz.timezone("Europe/Paris")


def get_paris_time() -> str:
    now = datetime.now(_PARIS_TZ)
    jours = {
        "Monday": "Lundi", "Tuesday": "Mardi", "Wednesday": "Mercredi",
        "Thursday": "Jeudi", "Friday": "Vendredi", "Saturday": "Samedi", "Sunday": "Dimanche",
    }
    mois = {
        "January": "janvier", "February": "février", "March": "mars", "April": "avril",
        "May": "mai", "June": "juin", "July": "juillet", "August": "août",
        "September": "septembre", "October": "octobre", "November": "novembre", "December": "décembre",
    }
    jour = jours[now.strftime("%A")]
    mois_fr = mois[now.strftime("%B")]
    return f"{jour} {now.day} {mois_fr} {now.year} à {now.strftime('%H:%M')}"


def load_jarvis_md() -> str:
    """Charge le fichier jarvis.md depuis le disque."""
    md_path = Path(settings.jarvis_md_path)
    if not md_path.exists():
        # Fallback : chercher depuis la racine du projet
        md_path = Path(__file__).parent.parent / "jarvis.md"
    return md_path.read_text(encoding="utf-8")


def build_system_prompt() -> str:
    """Construit le prompt système complet avec contexte temporel."""
    context = load_jarvis_md()
    return f"""Tu es Jarvis, l'assistant personnel de Nassim Boughazi.

Voici ta configuration et tes instructions maîtresses — respecte-les intégralement :

{context}

---

RÈGLES ABSOLUES DE COMPORTEMENT :
1. Vouvoiement systématique en toutes circonstances, sans exception
2. Factuel, direct, orienté action — zéro fioriture
3. Pas de questions inutiles — si tu dois agir, tu agis
4. Toujours en français sauf si le contexte est explicitement anglophone
5. Recommandations avec conviction et justification claire — tu ne présentes pas des options, tu recommandes
6. Tu ne contactes Nassim que si une action de sa part est requise
7. Ton niveau de confiance par domaine est défini dans la section 6 de ta configuration

Heure actuelle (Paris) : {get_paris_time()}
"""


async def build_enriched_system_prompt() -> str:
    """
    Version enrichie du system prompt avec le contexte appris injecté.
    Utiliser à la place de build_system_prompt() dans les conversations actives.
    """
    base = build_system_prompt()
    try:
        from src.memory.learning import get_learned_context_summary
        learned = await get_learned_context_summary()
        if learned:
            return base + f"\n---\n\n{learned}\n"
    except Exception:
        pass
    return base
