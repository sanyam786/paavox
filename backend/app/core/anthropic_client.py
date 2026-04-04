from groq import Groq
from app.core.config import settings

_client = None

def get_anthropic():
    global _client
    if _client is None:
        _client = Groq(api_key=settings.ANTHROPIC_API_KEY)
    return _client