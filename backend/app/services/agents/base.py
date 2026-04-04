from app.core.anthropic_client import get_anthropic

class BaseAgent:
    def __init__(self):
        self.client = get_anthropic()

    def _chat(self, system: str, user: str, max_tokens: int = 1024) -> str:
        response = self.client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[
                {"role": "system", "content": system},
                {"role": "user", "content": user},
            ],
            max_tokens=max_tokens,
        )
        return response.choices[0].message.content

    async def run(self, **kwargs):
        raise NotImplementedError