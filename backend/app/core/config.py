from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    ENVIRONMENT: str = "development"

    # Anthropic
    ANTHROPIC_API_KEY: str

    # Supabase
    SUPABASE_URL: str
    SUPABASE_SERVICE_KEY: str

    # Clerk
    CLERK_SECRET_KEY: str = ""
    CLERK_JWT_ISSUER: str = ""

    # Tavily
    TAVILY_API_KEY: str = ""

    # Fal.ai (image generation — $10 free credits at fal.ai, no card needed)
    FAL_KEY: str = ""

    # Together AI (image generation)
    TOGETHER_API_KEY: str = ""

    # Hugging Face (image generation — free at huggingface.co)
    HUGGINGFACE_API_KEY: str = ""

    # Stable Horde (image generation — free, community-run, no key needed)
    STABLE_HORDE_API_KEY: str = ""

    # Cloudinary
    CLOUDINARY_CLOUD_NAME: str = ""
    CLOUDINARY_API_KEY: str = ""
    CLOUDINARY_API_SECRET: str = ""

    # Stripe
    STRIPE_SECRET_KEY: str = ""
    STRIPE_WEBHOOK_SECRET: str = ""

    # Social OAuth
    TWITTER_CLIENT_ID: str = ""
    TWITTER_CLIENT_SECRET: str = ""
    INSTAGRAM_CLIENT_ID: str = ""
    INSTAGRAM_CLIENT_SECRET: str = ""
    LINKEDIN_CLIENT_ID: str = ""
    LINKEDIN_CLIENT_SECRET: str = ""
    FACEBOOK_APP_ID: str = ""           # Auth app (used for Instagram too)
    FACEBOOK_APP_SECRET: str = ""
    FACEBOOK_PAGES_APP_ID: str = ""     # Pages/posting app
    FACEBOOK_PAGES_APP_SECRET: str = ""
    GOOGLE_CLIENT_ID: str = ""
    GOOGLE_CLIENT_SECRET: str = ""

    # Monitoring
    SENTRY_DSN: str = ""

    # App
    APP_SECRET_KEY: str
    FRONTEND_URL: str = "http://localhost:3000"
    BACKEND_URL: str = "http://localhost:8000"
    CORS_ORIGINS: list[str] = ["http://localhost:3000"]

    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()
