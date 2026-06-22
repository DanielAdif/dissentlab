from typing import AsyncIterator
from openai import AsyncOpenAI
from .base import BaseProvider, ModelConfig


class OpenAIProvider(BaseProvider):
    async def generate(self, messages: list[dict], config: ModelConfig) -> str:
        client = AsyncOpenAI(api_key=config.api_key, base_url=config.base_url)
        response = await client.chat.completions.create(
            model=config.model_name,
            messages=messages,
        )
        return response.choices[0].message.content or ""

    async def stream(self, messages: list[dict], config: ModelConfig) -> AsyncIterator[str]:
        client = AsyncOpenAI(api_key=config.api_key, base_url=config.base_url)
        async with client.chat.completions.stream(
            model=config.model_name,
            messages=messages,
        ) as stream:
            async for chunk in stream:
                delta = chunk.choices[0].delta.content if chunk.choices else None
                if delta:
                    yield delta

    @property
    def supports_tool_calling(self) -> bool:
        return True

    @property
    def context_window(self) -> int:
        return 128000
