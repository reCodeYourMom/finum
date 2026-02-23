"""
Intelligence produit — analyse conviction par app + workflow roadmap.
Utilise Claude API (tâche haute valeur) pour formuler des recommandations argumentées.
Workflow : analyse → proposition Telegram → validation → roadmap stockée en DB.
"""
import json
import logging
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

import pytz

from src.config import settings

logger = logging.getLogger(__name__)

PARIS_TZ = pytz.timezone("Europe/Paris")

# Mapping app → emoji pour le formatage
APP_EMOJIS = {
    "Job Verdict": "⚖️",
    "Kalen": "💪",
    "Mindy": "🧘",
}


# ─────────────────────────────────────────────────────────────
# Analyse Claude par app
# ─────────────────────────────────────────────────────────────

async def analyze_app_conviction(
    app_context: Dict[str, Any],
    readme: str,
    activity: Dict[str, Any],
    revenue_data: Optional[Dict[str, Any]] = None,
) -> str:
    """
    Génère une analyse conviction d'une app via Claude API.
    Retourne un rapport structuré : état, priorité, roadmap proposée.
    """
    from src.llm.claude_client import claude_client
    from src.llm.groq_client import groq_client

    app_name = app_context.get("name", "App inconnue")
    app_type = app_context.get("type", "")
    domain = app_context.get("domain", "")
    objective = app_context.get("objective", "")
    priority_level = app_context.get("priority_level", "Moyenne")

    # Construire le contexte activité
    commits = activity.get("commits", [])
    open_prs = activity.get("open_prs", [])
    open_issues = activity.get("open_issues", [])

    commit_str = "\n".join(f"- {c['sha']} : {c['message']}" for c in commits[:5]) or "Aucun commit cette semaine"
    prs_str = "\n".join(f"- PR #{p['number']} : {p['title']}" for p in open_prs[:5]) or "Aucune PR ouverte"
    issues_str = "\n".join(f"- Issue #{i['number']} : {i['title']}" for i in open_issues[:5]) or "Aucune issue ouverte"

    revenue_str = ""
    if revenue_data and not revenue_data.get("error") and app_context.get("monetized"):
        revenue_str = (
            f"\nRevenus :\n"
            f"- MRR : {revenue_data.get('mrr', 0):.0f}€/mois\n"
            f"- 30 derniers jours : {revenue_data.get('revenue_30d', 0):.0f}€\n"
            f"- Abonnements actifs : {revenue_data.get('active_subscriptions', 0)}"
        )

    readme_str = f"\nREADME (extrait) :\n{readme[:1500]}" if readme else ""

    prompt = f"""Tu es Jarvis, Chief of Staff de Nassim Boughazi. Analyse cette app et formule une recommandation avec conviction.

**App : {app_name}**
Type : {app_type}
Domaine : {domain}
Objectif 12 mois : {objective}
Priorité actuelle : {priority_level}{revenue_str}{readme_str}

**Activité GitHub (7 derniers jours) :**
Commits :
{commit_str}

PRs ouvertes :
{prs_str}

Issues ouvertes :
{issues_str}

---
Génère un rapport structuré en Markdown (max 400 mots) :

**{app_name} — Analyse hebdomadaire**

**État actuel**
[1-2 phrases : où en est l'app cette semaine — développement actif ou en pause ?]

**Signal clé**
[Le fait le plus important cette semaine — commit critique, bug bloquant, opportunité, stagnation]

**Recommandation prioritaire**
[UNE action concrète et justifiée. Pas d'options — une conviction. Ex: "La priorité est X parce que Y — sans ça, Z ne se fera pas."]

**Roadmap proposée (3 actions)**
1. [Action immédiate — cette semaine]
2. [Action court terme — dans les 15 jours]
3. [Action moyen terme — ce mois]

**Avertissement**
[Un risque ou point d'attention à ne pas ignorer]

Ton : factuel, direct, pas de fioritures. Tu ne présentes pas des options — tu recommandes avec conviction."""

    try:
        # Utiliser Claude pour l'analyse haute valeur
        if claude_client.available:
            result = await claude_client.analyze(
                content="",
                task=prompt,
            )
        else:
            # Fallback Groq si Claude non configuré
            result = await groq_client.chat([{"role": "user", "content": prompt}])
        return result
    except Exception as e:
        logger.error(f"Erreur analyse conviction {app_name}: {e}")
        return f"❌ Analyse de {app_name} indisponible : {e}"


# ─────────────────────────────────────────────────────────────
# Rapport hebdomadaire produit complet
# ─────────────────────────────────────────────────────────────

async def generate_weekly_product_report() -> List[Dict[str, Any]]:
    """
    Génère le rapport hebdomadaire pour toutes les apps.
    Retourne une liste de {app_name, report, repo}.
    """
    from src.integrations.github import fetch_all_repos_full_context
    from src.integrations.stripe_client import fetch_revenue

    logger.info("Génération rapport produit hebdomadaire...")

    # Récupérer contexte complet de tous les repos
    all_contexts = await fetch_all_repos_full_context()

    # Récupérer les revenus Stripe (pour Job Verdict uniquement)
    revenue_data = None
    if settings.stripe_configured:
        try:
            revenue_data = await fetch_revenue()
        except Exception as e:
            logger.warning(f"Stripe indisponible pour rapport produit : {e}")

    reports = []
    for ctx in all_contexts:
        app_context = ctx.get("app_context", {})
        app_name = app_context.get("name", ctx["repo"])

        # Ne passer les données Stripe qu'à l'app monétisée
        app_revenue = revenue_data if app_context.get("monetized") else None

        try:
            report_text = await analyze_app_conviction(
                app_context=app_context,
                readme=ctx.get("readme", ""),
                activity=ctx.get("activity", {}),
                revenue_data=app_revenue,
            )
            reports.append({
                "repo": ctx["repo"],
                "app_name": app_name,
                "report": report_text,
                "app_context": app_context,
            })
        except Exception as e:
            logger.error(f"Erreur rapport {app_name}: {e}")

    return reports


async def send_weekly_product_report() -> None:
    """
    Envoie le rapport produit hebdomadaire via Telegram.
    Une analyse par app, chacune avec bouton de validation roadmap.
    """
    from telegram import Bot, InlineKeyboardButton, InlineKeyboardMarkup
    from src.memory.cache import set_cache

    reports = await generate_weekly_product_report()
    if not reports:
        logger.warning("Rapport produit vide — aucun repo analysé")
        return

    try:
        bot = Bot(token=settings.telegram_bot_token)
        async with bot:
            # Message d'intro
            now = datetime.now(PARIS_TZ)
            await bot.send_message(
                chat_id=settings.telegram_user_id,
                text=f"📊 *Intelligence produit — semaine du {now.strftime('%d/%m')}*\n\n"
                     f"{len(reports)} app(s) analysée(s) via Claude.",
                parse_mode="Markdown",
            )

            for r in reports:
                app_name = r["app_name"]
                emoji = APP_EMOJIS.get(app_name, "📱")

                # Stocker le rapport en cache pour le callback de validation
                cache_key = f"roadmap_pending:{app_name.lower().replace(' ', '_')}"
                await set_cache(cache_key, json.dumps({
                    "app_name": app_name,
                    "repo": r["repo"],
                    "report": r["report"],
                    "generated_at": datetime.now(timezone.utc).isoformat(),
                }), ttl=7 * 24 * 3600)

                safe_key = app_name.lower().replace(" ", "_")
                keyboard = InlineKeyboardMarkup([[
                    InlineKeyboardButton(
                        "✅ Valider roadmap",
                        callback_data=f"roadmap_approve:{safe_key}",
                    ),
                    InlineKeyboardButton(
                        "❌ Rejeter",
                        callback_data=f"roadmap_reject:{safe_key}",
                    ),
                ]])

                await bot.send_message(
                    chat_id=settings.telegram_user_id,
                    text=f"{emoji} {r['report'][:4000]}",
                    parse_mode="Markdown",
                    reply_markup=keyboard,
                )

        logger.info(f"Rapport produit envoyé : {len(reports)} apps")

    except Exception as e:
        logger.error(f"Erreur envoi rapport produit : {e}", exc_info=True)


# ─────────────────────────────────────────────────────────────
# Validation roadmap → stockage DB
# ─────────────────────────────────────────────────────────────

async def approve_roadmap(app_key: str) -> Dict[str, Any]:
    """
    Valide une roadmap : la stocke en DB et retourne les données.
    app_key : clé normalisée (ex: "job_verdict")
    """
    from src.memory.cache import get_cache
    from src.memory.database import set_memory

    cache_key = f"roadmap_pending:{app_key}"
    cached = await get_cache(cache_key)
    if not cached:
        return {}

    data = json.loads(cached)

    # Persister en mémoire long terme
    memory_key = f"roadmap_approved:{app_key}"
    await set_memory(memory_key, json.dumps({
        **data,
        "approved_at": datetime.now(timezone.utc).isoformat(),
        "status": "approved",
    }))

    logger.info(f"Roadmap approuvée pour {data.get('app_name', app_key)}")
    return data


async def get_approved_roadmap(app_key: str) -> Optional[Dict[str, Any]]:
    """Récupère la dernière roadmap validée pour une app."""
    from src.memory.database import get_memory
    memory_key = f"roadmap_approved:{app_key}"
    raw = await get_memory(memory_key)
    if not raw:
        return None
    try:
        return json.loads(raw)
    except Exception:
        return None
