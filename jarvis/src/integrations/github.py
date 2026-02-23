"""
GitHub connector — activité repos, PRs, issues, commits.
Utilise l'API REST GitHub v3 via PyGithub.
"""
import asyncio
import logging
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional

from src.config import settings

logger = logging.getLogger(__name__)


def _get_client():
    from github import Github
    return Github(settings.github_token)


def _fetch_repo_activity_sync(repo_full_name: str, hours_back: int = 24) -> Dict[str, Any]:
    """Récupère l'activité récente d'un repo — exécuté en thread executor."""
    from github import GithubException
    cutoff = datetime.now(timezone.utc) - timedelta(hours=hours_back)

    try:
        g = _get_client()
        repo = g.get_repo(repo_full_name)

        # Commits récents
        commits = []
        try:
            for commit in repo.get_commits(since=cutoff):
                commits.append({
                    "sha": commit.sha[:7],
                    "message": commit.commit.message.split("\n")[0][:80],
                    "author": commit.commit.author.name,
                    "date": commit.commit.author.date.isoformat(),
                })
                if len(commits) >= 5:
                    break
        except Exception:
            pass

        # PRs ouvertes
        open_prs = []
        try:
            for pr in repo.get_pulls(state="open", sort="updated", direction="desc"):
                open_prs.append({
                    "number": pr.number,
                    "title": pr.title[:80],
                    "author": pr.user.login,
                    "updated_at": pr.updated_at.isoformat(),
                })
                if len(open_prs) >= 5:
                    break
        except Exception:
            pass

        # Issues ouvertes récentes
        open_issues = []
        try:
            for issue in repo.get_issues(state="open", sort="updated", direction="desc"):
                if issue.pull_request:
                    continue  # Exclure les PRs listées comme issues
                open_issues.append({
                    "number": issue.number,
                    "title": issue.title[:80],
                    "author": issue.user.login,
                    "updated_at": issue.updated_at.isoformat(),
                })
                if len(open_issues) >= 5:
                    break
        except Exception:
            pass

        return {
            "repo": repo_full_name,
            "description": repo.description or "",
            "stars": repo.stargazers_count,
            "commits": commits,
            "open_prs": open_prs,
            "open_issues": open_issues,
            "error": None,
        }

    except GithubException as e:
        logger.error(f"GitHub API error pour {repo_full_name}: {e}")
        return {"repo": repo_full_name, "error": str(e), "commits": [], "open_prs": [], "open_issues": []}
    except Exception as e:
        logger.error(f"Erreur GitHub {repo_full_name}: {e}")
        return {"repo": repo_full_name, "error": str(e), "commits": [], "open_prs": [], "open_issues": []}


async def fetch_repo_activity(repo_full_name: str, hours_back: int = 24) -> Dict[str, Any]:
    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(None, _fetch_repo_activity_sync, repo_full_name, hours_back)


async def fetch_all_repos_activity(hours_back: int = 24) -> List[Dict[str, Any]]:
    """Récupère l'activité de tous les repos configurés en parallèle."""
    if not settings.github_configured:
        return []
    repos = settings.github_repo_list
    if not repos:
        return []

    results = await asyncio.gather(
        *[fetch_repo_activity(r, hours_back) for r in repos],
        return_exceptions=True,
    )
    activity = []
    for i, r in enumerate(results):
        if isinstance(r, Exception):
            logger.error(f"Erreur gather GitHub {repos[i]}: {r}")
        else:
            activity.append(r)
    return activity


def format_activity_telegram(activity: List[Dict[str, Any]]) -> str:
    """Formate l'activité GitHub pour un message Telegram."""
    if not activity:
        return "Aucun repo GitHub configuré."

    lines = ["🐙 *GitHub — Activité récente*\n"]

    for repo_data in activity:
        repo_name = repo_data["repo"].split("/")[-1]
        lines.append(f"📦 *{repo_name}*")

        if repo_data.get("error"):
            lines.append(f"  ⚠️ Erreur : {repo_data['error'][:60]}")
            lines.append("")
            continue

        commits = repo_data.get("commits", [])
        if commits:
            lines.append(f"  Commits (24h) :")
            for c in commits[:3]:
                lines.append(f"  • `{c['sha']}` {c['message'][:60]}")
        else:
            lines.append("  Aucun commit dans les 24h")

        open_prs = repo_data.get("open_prs", [])
        if open_prs:
            lines.append(f"  PRs ouvertes ({len(open_prs)}) :")
            for pr in open_prs[:2]:
                lines.append(f"  • #{pr['number']} {pr['title'][:50]}")

        open_issues = repo_data.get("open_issues", [])
        if open_issues:
            lines.append(f"  Issues ouvertes ({len(open_issues)}) :")
            for issue in open_issues[:2]:
                lines.append(f"  • #{issue['number']} {issue['title'][:50]}")

        lines.append("")

    return "\n".join(lines).rstrip()


def format_activity_briefing(activity: List[Dict[str, Any]]) -> str:
    """Résumé compact pour le briefing quotidien."""
    if not activity:
        return ""

    parts = []
    for repo_data in activity:
        if repo_data.get("error"):
            continue
        repo_name = repo_data["repo"].split("/")[-1]
        commits_count = len(repo_data.get("commits", []))
        prs_count = len(repo_data.get("open_prs", []))
        issues_count = len(repo_data.get("open_issues", []))

        info = []
        if commits_count:
            info.append(f"{commits_count} commit(s)")
        if prs_count:
            info.append(f"{prs_count} PR(s) ouvertes")
        if issues_count:
            info.append(f"{issues_count} issue(s) ouvertes")

        if info:
            parts.append(f"{repo_name}: {', '.join(info)}")

    return " | ".join(parts) if parts else ""


# ─────────────────────────────────────────────────────────────
# Contexte business des apps — pour l'analyse conviction
# ─────────────────────────────────────────────────────────────

APP_CONTEXTS = {
    "job-verdict": {
        "name": "Job Verdict",
        "url": "jobverdict.com",
        "type": "SaaS B2C + API B2B",
        "domain": "Matching emploi, analyse candidatures",
        "monetized": True,
        "priority_level": "Haute",
        "objective": "Atteindre un CA stable et récurrent",
    },
    "kalen": {
        "name": "Kalen",
        "type": "Application mobile iOS",
        "domain": "Santé, analyse hormonale, accompagnement sport",
        "monetized": False,
        "priority_level": "Moyenne",
        "objective": "Déploiement progressif pub + modèle premium",
    },
    "Mindy_IOS": {
        "name": "Mindy",
        "type": "Application mobile iOS",
        "domain": "Bien-être, accompagnement IA",
        "monetized": False,
        "priority_level": "Moyenne",
        "objective": "Activation pub progressive + modèle premium",
    },
}


def _get_app_context(repo_full_name: str) -> dict:
    repo_name = repo_full_name.split("/")[-1]
    return APP_CONTEXTS.get(repo_name, {
        "name": repo_name,
        "type": "Application",
        "domain": "",
        "monetized": False,
        "priority_level": "Inconnue",
        "objective": "",
    })


def _fetch_repo_readme_sync(repo_full_name: str) -> str:
    """Récupère le README d'un repo — exécuté en thread executor."""
    from github import GithubException
    try:
        g = _get_client()
        repo = g.get_repo(repo_full_name)
        readme = repo.get_readme()
        content = readme.decoded_content.decode("utf-8", errors="replace")
        return content[:3000]
    except Exception as e:
        logger.debug(f"README non disponible pour {repo_full_name}: {e}")
        return ""


async def fetch_repo_readme(repo_full_name: str) -> str:
    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(None, _fetch_repo_readme_sync, repo_full_name)


async def fetch_repo_full_context(repo_full_name: str) -> dict:
    """Contexte complet d'un repo : activité 7j + README + contexte business."""
    activity, readme = await asyncio.gather(
        fetch_repo_activity(repo_full_name, hours_back=168),
        fetch_repo_readme(repo_full_name),
        return_exceptions=True,
    )
    if isinstance(activity, Exception):
        activity = {"repo": repo_full_name, "error": str(activity), "commits": [], "open_prs": [], "open_issues": []}
    if isinstance(readme, Exception):
        readme = ""

    return {
        "repo": repo_full_name,
        "app_context": _get_app_context(repo_full_name),
        "readme": readme,
        "activity": activity,
    }


async def fetch_all_repos_full_context() -> List[Dict[str, Any]]:
    """Contexte complet de tous les repos configurés en parallèle."""
    if not settings.github_configured:
        return []
    repos = settings.github_repo_list
    results = await asyncio.gather(
        *[fetch_repo_full_context(r) for r in repos],
        return_exceptions=True,
    )
    return [r for r in results if not isinstance(r, Exception)]


async def send_github_digest() -> None:
    """Envoie le digest GitHub quotidien via Telegram."""
    if not settings.github_configured:
        return

    from telegram import Bot
    activity = await fetch_all_repos_activity(hours_back=24)
    msg = format_activity_telegram(activity)

    bot = Bot(token=settings.telegram_bot_token)
    async with bot:
        await bot.send_message(
            chat_id=settings.telegram_user_id,
            text=msg,
            parse_mode="Markdown",
        )
    logger.info("Digest GitHub envoyé")
