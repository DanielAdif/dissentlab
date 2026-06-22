from typing import AsyncIterator
import google.generativeai as genai
from .base import BaseProvider, ModelConfig

class GeminiProvider(BaseProvider):
    async def generate(self, messages: list[dict], config: ModelConfig) -> str:
        genai.configure(api_key=config.api_key)
        model = genai.GenerativeModel(config.model_name)
        prompt = "\n".join(f"{m['role'].upper()}: {m['content']}" for m in messages)
        response = await model.generate_content_async(prompt)
        return response.text or ""

    async def stream(self, messages: list[dict], config: ModelConfig) -> AsyncIterator[str]:
        genai.configure(api_key=config.api_key)
        model = genai.GenerativeModel(config.model_name)
        prompt = "\n".join(f"{m['role'].upper()}: {m['content']}" for m in messages)
        async for chunk in await model.generate_content_async(prompt, stream=True):
            if chunk.text:
                yield chunk.text

    @property
    def context_window(self) -> int:
        return 1000000
