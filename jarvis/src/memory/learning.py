"""
Mémoire apprenante — Section 10 de jarvis.md.

4 piliers :
  1. Décisions : ce que Nassim valide ou rejette (brouillons, roadmaps, planning)
  2. Personnes  : qui écrit sur quel compte, fréquence, importance apprise
  3. Patterns   : heures/jours d'activité réelle
  4. KPIs       : évolution hebdomadaire des métriques Stripe par app
"""
import asyncio
import json
import logging
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional

logger = logging.getLogger(__name__)


# ─────────────────────────────────────────────────────────────
# 1. Décisions
# ─────────────────────────────────────────────────────────────

async def record_decision(
    category: str,
    subject: str,
    action: str,
    context: Optional[Dict[str, Any]] = None,
) -> None:
    """
    Enregistre une décision de Nassim pour apprentissage.
    category : "email_draft" | "roadmap" | "sport_plan" | "event" | "meal_plan"
    action   : "approved" | "rejected"
    """
    from src.memory.database import LearningEntry, async_session
    try:
        async with async_session() as session:
            entry = LearningEntry(
                category="decision",
                subject=f"{category}:{subject}",
                action=action,
                context_json=json.dumps(context) if context else None,
            )
            session.add(entry)
            await session.commit()
        logger.debug(f"Décision enregistrée : {category}:{subject} → {action}")
    except Exception as e:
        logger.warning(f"Erreur enregistrement décision : {e}")


# ─────────────────────────────────────────────────────────────
# 2. Personnes
# ─────────────────────────────────────────────────────────────

async def record_person_interaction(
    email: str,
    name: Optional[str],
    account_id: str,
    importance: str,
) -> None:
    """
    Met à jour le contexte appris d'une personne.
    Appelé lors de la classification d'un email.
    """
    from sqlalchemy import select
    from src.memory.database import PersonContext, async_session
    try:
        async with async_session() as session:
            result = await session.execute(
                select(PersonContext).where(PersonContext.email == email)
            )
            existing = result.scalar_one_or_none()
            if existing:
                existing.interaction_count += 1
                existing.last_importance = importance
                existing.last_seen = datetime.now(timezone.utc)
                if name and not existing.name:
                    existing.name = name
            else:
                session.add(PersonContext(
                    email=email,
                    name=name,
                    account=account_id,
                    last_importance=importance,
                    interaction_count=1,
                ))
            await session.commit()
    except Exception as e:
        logger.warning(f"Erreur enregistrement personne {email} : {e}")


# ─────────────────────────────────────────────────────────────
# 3. Patterns d'activité
# ─────────────────────────────────────────────────────────────

async def record_active_moment() -> None:
    """
    Enregistre un moment d'activité de Nassim.
    Appelé à chaque message envoyé via Telegram.
    """
    from src.memory.database import LearningEntry, async_session
    try:
        now = datetime.now(timezone.utc)
        async with async_session() as session:
            session.add(LearningEntry(
                category="activity",
                subject="message",
                action="active",
                context_json=json.dumps({
                    "hour": now.hour,
                    "weekday": now.weekday(),  # 0=Lun, 6=Dim
                }),
            ))
            await session.commit()
    except Exception as e:
        logger.warning(f"Erreur enregistrement activité : {e}")


# ─────────────────────────────────────────────────────────────
# 4. KPIs
# ─────────────────────────────────────────────────────────────

async def update_kpi_snapshot(
    app_key: str,
    mrr: float,
    active_subs: int,
    revenue_30d: float = 0.0,
) -> None:
    """
    Sauvegarde un snapshot KPI hebdomadaire pour tracer les tendances.
    Conserve 52 entrées max (1 an).
    """
    from src.memory.database import get_memory, set_memory
    try:
        history_key = f"kpi_history:{app_key}"
        existing_raw = await get_memory(history_key)
        history = json.loads(existing_raw) if existing_raw else []

        history.append({
            "date": datetime.now(timezone.utc).strftime("%Y-%m-%d"),
            "mrr": round(mrr, 2),
            "active_subs": active_subs,
            "revenue_30d": round(revenue_30d, 2),
        })
        history = history[-52:]
        await set_memory(history_key, json.dumps(history))
        logger.info(f"Snapshot KPI {app_key} : MRR={mrr:.0f}€, subs={active_subs}")
    except Exception as e:
        logger.warning(f"Erreur snapshot KPI {app_key} : {e}")


# ─────────────────────────────────────────────────────────────
# Lecture mémoire — pour injection dans prompts
# ─────────────────────────────────────────────────────────────

async def _get_decision_stats(days: int = 30) -> Dict[str, Any]:
    """Stats de validation/rejet par catégorie sur N jours."""
    from sqlalchemy import select, func
    from src.memory.database import LearningEntry, async_session
    cutoff = datetime.now(timezone.utc) - timedelta(days=days)
    try:
        async with async_session() as session:
            result = await session.execute(
                select(LearningEntry.subject, LearningEntry.action, func.count(LearningEntry.id))
                .where(LearningEntry.category == "decision")
                .where(LearningEntry.created_at >= cutoff)
                .group_by(LearningEntry.subject, LearningEntry.action)
            )
            rows = result.all()
        stats: Dict[str, Dict[str, int]] = {}
        for subject, action, count in rows:
            if subject not in stats:
                stats[subject] = {"approved": 0, "rejected": 0}
            stats[subject][action] = stats[subject].get(action, 0) + int(count)
        return stats
    except Exception:
        return {}


async def _get_activity_pattern(days: int = 30) -> Dict[str, Any]:
    """Heures et jours les plus actifs sur N jours."""
    from sqlalchemy import select
    from src.memory.database import LearningEntry, async_session
    cutoff = datetime.now(timezone.utc) - timedelta(days=days)
    try:
        async with async_session() as session:
            result = await session.execute(
                select(LearningEntry.context_json)
                .where(LearningEntry.category == "activity")
                .where(LearningEntry.created_at >= cutoff)
            )
            rows = result.scalars().all()

        hour_counts = [0] * 24
        day_counts = [0] * 7
        for raw in rows:
            if not raw:
                continue
            try:
                ctx = json.loads(raw)
                h = ctx.get("hour")
                d = ctx.get("weekday")
                if isinstance(h, int):
                    hour_counts[h] += 1
                if isinstance(d, int):
                    day_counts[d] += 1
            except Exception:
                pass

        sorted_hours = sorted(range(24), key=lambda x: hour_counts[x], reverse=True)
        top_hours = [h for h in sorted_hours[:3] if hour_counts[h] > 0]

        days_fr = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"]
        sorted_days = sorted(range(7), key=lambda x: day_counts[x], reverse=True)
        top_days = [days_fr[d] for d in sorted_days[:3] if day_counts[d] > 0]

        return {"top_hours": top_hours, "top_days": top_days}
    except Exception:
        return {}


async def _get_top_persons(limit: int = 10) -> List[Dict[str, Any]]:
    """Personnes les plus fréquentes triées par nombre d'interactions."""
    from sqlalchemy import select
    from src.memory.database import PersonContext, async_session
    try:
        async with async_session() as session:
            result = await session.execute(
                select(PersonContext)
                .order_by(PersonContext.interaction_count.desc())
                .limit(limit)
            )
            persons = result.scalars().all()
        return [
            {
                "email": p.email,
                "name": p.name,
                "account": p.account,
                "importance": p.last_importance,
                "count": p.interaction_count,
                "last_seen": p.last_seen.strftime("%Y-%m-%d") if p.last_seen else "?",
            }
            for p in persons
        ]
    except Exception:
        return []


async def get_learned_context_summary() -> str:
    """
    Résumé compact du contexte appris, injecté dans le system prompt.
    Retourne une chaîne vide si aucune donnée disponible.
    """
    try:
        persons, pattern, stats = await asyncio.gather(
            _get_top_persons(8),
            _get_activity_pattern(),
            _get_decision_stats(),
            return_exceptions=True,
        )
        if isinstance(persons, Exception):
            persons = []
        if isinstance(pattern, Exception):
            pattern = {}
        if isinstance(stats, Exception):
            stats = {}

        parts = []

        # Personnes prioritaires connues
        if persons:
            urgent = [p for p in persons if p["importance"] == "urgent"]
            if urgent:
                names = ", ".join(
                    (p["name"] or p["email"].split("@")[0]) for p in urgent[:5]
                )
                parts.append(f"Contacts prioritaires appris : {names}")

        # Heures d'activité réelle
        top_hours = pattern.get("top_hours", [])
        if top_hours:
            hours_str = ", ".join(f"{h}h" for h in top_hours)
            parts.append(f"Heures de présence réelle de Nassim : {hours_str}")

        # Taux de validation par catégorie
        if stats:
            rates = []
            for subject, counts in stats.items():
                total = counts.get("approved", 0) + counts.get("rejected", 0)
                if total >= 3:
                    rate = int(counts.get("approved", 0) / total * 100)
                    label = subject.split(":")[0].replace("_", " ")
                    rates.append(f"{label} {rate}%✅")
            if rates:
                parts.append("Taux de validation : " + " | ".join(rates[:5]))

        if not parts:
            return ""

        return "Mémoire apprise :\n" + "\n".join(f"- {p}" for p in parts)
    except Exception:
        return ""


# ─────────────────────────────────────────────────────────────
# Rapport complet — commande /memoire
# ─────────────────────────────────────────────────────────────

async def get_full_learning_report() -> str:
    """Rapport lisible de tout ce que Jarvis a appris — pour /memoire."""
    persons, pattern, stats = await asyncio.gather(
        _get_top_persons(10),
        _get_activity_pattern(),
        _get_decision_stats(),
        return_exceptions=True,
    )
    if isinstance(persons, Exception):
        persons = []
    if isinstance(pattern, Exception):
        pattern = {}
    if isinstance(stats, Exception):
        stats = {}

    lines = ["🧠 *Mémoire apprenante Jarvis*\n"]

    # Personnes connues
    if persons:
        lines.append("*Contacts connus*")
        icons = {"urgent": "🔴", "important": "🟡", "reste": "🟢"}
        for p in persons[:8]:
            icon = icons.get(p["importance"], "⚪️")
            name = p["name"] or p["email"].split("@")[0]
            account_short = p["account"].split("@")[0]
            lines.append(f"{icon} {name} ({p['count']}x) → {account_short}")
        lines.append("")

    # Patterns d'activité
    top_hours = pattern.get("top_hours", [])
    top_days = pattern.get("top_days", [])
    if top_hours or top_days:
        lines.append("*Patterns d'activité (30 jours)*")
        if top_hours:
            lines.append(f"Heures actives : {', '.join(str(h)+'h' for h in top_hours)}")
        if top_days:
            lines.append(f"Jours actifs : {', '.join(top_days)}")
        lines.append("")

    # Décisions
    if stats:
        lines.append("*Décisions validées/rejetées (30 jours)*")
        for subject, counts in list(stats.items())[:8]:
            approved = counts.get("approved", 0)
            rejected = counts.get("rejected", 0)
            total = approved + rejected
            rate = int(approved / total * 100) if total else 0
            lines.append(f"• {subject} : {approved}✅ {rejected}❌ ({rate}%)")
        lines.append("")

    # KPI Job Verdict
    from src.memory.database import get_memory
    kpi_raw = await get_memory("kpi_history:job_verdict")
    if kpi_raw:
        try:
            history = json.loads(kpi_raw)
            if history:
                latest = history[-1]
                lines.append("*KPI Job Verdict*")
                lines.append(f"MRR : {latest['mrr']:.0f}€")
                lines.append(f"Abonnements actifs : {latest['active_subs']}")
                if len(history) >= 2:
                    prev = history[-2]
                    delta = latest["mrr"] - prev["mrr"]
                    sign = "+" if delta >= 0 else ""
                    lines.append(f"Évolution : {sign}{delta:.0f}€ vs semaine dernière")
                lines.append("")
        except Exception:
            pass

    if len(lines) == 1:
        lines.append(
            "_Aucune donnée apprise pour le moment._\n"
            "Jarvis enrichit sa mémoire au fil de vos interactions."
        )

    return "\n".join(lines)
