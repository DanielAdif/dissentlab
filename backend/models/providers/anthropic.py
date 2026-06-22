from typing import AsyncIterator
import anthropic
from .base import BaseProvider, ModelConfig

class AnthropicProvider(BaseProvider):
    async def generate(self, messages: list[dict], config: ModelConfig) -> str:
        client = anthropic.AsyncAnthropic(api_key=config.api_key)
        system = next((m["content"] for m in messages if m["role"] == "system"), "")
        user_messages = [m for m in messages if m["role"] != "system"]
        response = await client.messages.create(
            model=config.model_name,
            max_tokens=8096,
            system=system,
            messages=user_messages,
        )
        return response.content[0].text if response.content else ""

    async def stream(self, messages: list[dict], config: ModelConfig) -> AsyncIterator[str]:
        client = anthropic.AsyncAnthropic(api_key=config.api_key)
        system = next((m["content"] for m in messages if m["role"] == "system"), "")
        user_messages = [m for m in messages if m["role"] != "system"]
        async with client.messages.stream(
            model=config.model_name,
            max_tokens=8096,
            system=system,
            messages=user_messages,
        ) as stream:
            async for text in stream.text_stream:
                yield text

    @property
    def context_window(self) -> int:
        return 200000
