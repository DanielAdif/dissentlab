from typing import AsyncIterator
from openai import AsyncOpenAI
from .base import BaseProvider, ModelConfig

class OpenRouterProvider(BaseProvider):
    """OpenRouter uses an OpenAI-compatible API."""

    async def generate(self, messages: list[dict], config: ModelConfig) -> str:
        client = AsyncOpenAI(
            api_key=config.api_key,
            base_url="https://openrouter.ai/api/v1"
        )
        response = await client.chat.completions.create(
            model=config.model_name,
            messages=messages,
        )
        return response.choices[0].message.content or ""

    async def stream(self, messages: list[dict], config: ModelConfig) -> AsyncIterator[str]:
        client = AsyncOpenAI(
            api_key=config.api_key,
            base_url="https://openrouter.ai/api/v1"
        )
        async with client.chat.completions.stream(
            model=config.model_name,
            messages=messages,
        ) as stream:
            async for chunk in stream:
                delta = chunk.choices[0].delta.content if chunk.choices else None
                if delta:
                    yield delta
