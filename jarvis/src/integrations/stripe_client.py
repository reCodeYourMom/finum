"""
Stripe connector — revenus, abonnements, charges récentes.
"""
import asyncio
import logging
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional

from src.config import settings

logger = logging.getLogger(__name__)


def _fetch_revenue_sync() -> Dict[str, Any]:
    """Récupère les métriques Stripe — exécuté en thread executor."""
    import stripe
    stripe.api_key = settings.stripe_secret_key

    now = datetime.now(timezone.utc)
    start_of_month = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    start_last_30 = now - timedelta(days=30)
    start_last_7 = now - timedelta(days=7)

    try:
        # Charges des 30 derniers jours
        charges_30 = stripe.Charge.list(
            created={"gte": int(start_last_30.timestamp())},
            limit=100,
        )
        successful_charges = [c for c in charges_30.auto_paging_iter()
                              if c.status == "succeeded" and not c.refunded]

        revenue_30d = sum(c.amount for c in successful_charges) / 100
        revenue_7d = sum(
            c.amount for c in successful_charges
            if c.created >= int(start_last_7.timestamp())
        ) / 100
        revenue_mtd = sum(
            c.amount for c in successful_charges
            if c.created >= int(start_of_month.timestamp())
        ) / 100

        # Abonnements actifs
        subscriptions = stripe.Subscription.list(status="active", limit=100)
        active_subs = list(subscriptions.auto_paging_iter())
        mrr = sum(
            (s.items.data[0].price.unit_amount or 0) / 100
            for s in active_subs
            if s.items.data
        )

        # Charges récentes (5 dernières)
        recent_charges_raw = stripe.Charge.list(limit=5)
        recent = []
        for c in recent_charges_raw.data:
            recent.append({
                "amount": c.amount / 100,
                "currency": c.currency.upper(),
                "status": c.status,
                "description": (c.description or "")[:60],
                "date": datetime.fromtimestamp(c.created, tz=timezone.utc).strftime("%d/%m %H:%M"),
            })

        return {
            "revenue_30d": revenue_30d,
            "revenue_7d": revenue_7d,
            "revenue_mtd": revenue_mtd,
            "active_subscriptions": len(active_subs),
            "mrr": mrr,
            "recent_charges": recent,
            "currency": "EUR",
            "error": None,
        }

    except Exception as e:
        logger.error(f"Erreur Stripe API: {e}")
        return {"error": str(e)}


async def fetch_revenue() -> Dict[str, Any]:
    """Récupère les métriques Stripe de façon asynchrone."""
    if not settings.stripe_configured:
        return {"error": "Stripe non configuré (STRIPE_SECRET_KEY manquant)"}
    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(None, _fetch_revenue_sync)


def format_revenue_telegram(data: Dict[str, Any]) -> str:
    """Formate les métriques Stripe pour Telegram."""
    if data.get("error"):
        return f"💳 *Stripe* — Erreur : {data['error']}"

    currency = data.get("currency", "EUR")

    lines = [
        "💳 *Stripe — Dashboard revenus*\n",
        f"📅 *Mois en cours* : {data['revenue_mtd']:.2f} {currency}",
        f"📊 *30 derniers jours* : {data['revenue_30d']:.2f} {currency}",
        f"📈 *7 derniers jours* : {data['revenue_7d']:.2f} {currency}",
        f"🔄 *Abonnements actifs* : {data['active_subscriptions']}",
    ]

    if data.get("mrr"):
        lines.append(f"💰 *MRR estimé* : {data['mrr']:.2f} {currency}/mois")

    recent = data.get("recent_charges", [])
    if recent:
        lines.append("\n*Dernières transactions :*")
        for c in recent[:5]:
            status_emoji = "✅" if c["status"] == "succeeded" else "❌"
            desc = f" — {c['description']}" if c["description"] else ""
            lines.append(f"{status_emoji} {c['date']} : {c['amount']:.2f} {c['currency']}{desc}")

    return "\n".join(lines)


def format_revenue_briefing(data: Dict[str, Any]) -> str:
    """Résumé compact Stripe pour le briefing."""
    if not data or data.get("error"):
        return ""
    currency = data.get("currency", "EUR")
    return (
        f"Revenue 30j: {data['revenue_30d']:.0f}{currency} | "
        f"MRR: {data['mrr']:.0f}{currency} | "
        f"Abonnements: {data['active_subscriptions']}"
    )


async def send_weekly_revenue_report() -> None:
    """Rapport Stripe hebdomadaire — lundi 8h05."""
    if not settings.stripe_configured:
        return

    from telegram import Bot
    data = await fetch_revenue()
    msg = format_revenue_telegram(data)

    bot = Bot(token=settings.telegram_bot_token)
    async with bot:
        await bot.send_message(
            chat_id=settings.telegram_user_id,
            text=msg,
            parse_mode="Markdown",
        )
    logger.info("Rapport Stripe hebdomadaire envoyé")

    # Snapshot KPI pour la mémoire apprenante
    if not data.get("error"):
        try:
            from src.memory.learning import update_kpi_snapshot
            await update_kpi_snapshot(
                app_key="job_verdict",
                mrr=data.get("mrr", 0.0),
                active_subs=data.get("active_subscriptions", 0),
                revenue_30d=data.get("revenue_30d", 0.0),
            )
        except Exception as e:
            logger.warning(f"Erreur snapshot KPI : {e}")
