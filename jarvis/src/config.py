from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # Telegram
    telegram_bot_token: str
    telegram_webhook_secret: str = ""
    telegram_user_id: int

    # API
    api_base_url: str = ""
    api_secret_key: str = ""

    # Groq (LLM principal)
    groq_api_key: str
    groq_model: str = "llama-3.3-70b-versatile"

    # Claude (usage ponctuel — tâches complexes)
    claude_api_key: str = ""

    # PostgreSQL
    database_url: str

    # Redis
    redis_url: str = "redis://localhost:6379"

    # Audio
    whisper_model: str = "base"
    tts_voice: str = "fr-FR-HenriNeural"

    # App
    timezone: str = "Europe/Paris"
    jarvis_md_path: str = "jarvis.md"

    # Sprint 2 — Google OAuth (Gmail + Calendar)
    google_client_id: str = ""
    google_client_secret: str = ""

    # Sprint 2 — Microsoft OAuth (Outlook / Hotmail)
    microsoft_client_id: str = ""

    # Sprint 3 — Bien-être (compléments)
    supplement_time_morning: str = "07:30"  # Format HH:MM
    supplement_time_evening: str = "21:00"  # Format HH:MM

    # Sprint 4 — GitHub
    github_token: str = ""
    github_repos: str = ""  # comma-separated: "nassimboughazi/job-verdict,nassimboughazi/arabai"

    # Sprint 4 — Stripe
    stripe_secret_key: str = ""

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}

    @property
    def github_repo_list(self) -> list:
        if not self.github_repos:
            return []
        return [r.strip() for r in self.github_repos.split(",") if r.strip()]

    @property
    def github_configured(self) -> bool:
        return bool(self.github_token)

    @property
    def stripe_configured(self) -> bool:
        return bool(self.stripe_secret_key)

    @property
    def google_redirect_uri(self) -> str:
        base = self.api_base_url.rstrip("/")
        return f"{base}/oauth/google/callback"

    @property
    def google_configured(self) -> bool:
        return bool(self.google_client_id and self.google_client_secret)

    @property
    def microsoft_configured(self) -> bool:
        return bool(self.microsoft_client_id)


settings = Settings()
