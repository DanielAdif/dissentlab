import os
from typing import AsyncIterator
import httpx
from .base import BaseProvider, ModelConfig

OLLAMA_DEFAULT_URL = os.environ.get("OLLAMA_URL", "http://host.docker.internal:11434")

class OllamaProvider(BaseProvider):
    async def generate(self, messages: list[dict], config: ModelConfig) -> str:
        base_url = config.base_url or OLLAMA_DEFAULT_URL
        async with httpx.AsyncClient(timeout=120) as client:
            response = await client.post(
                f"{base_url}/api/chat",
                json={"model": config.model_name, "messages": messages, "stream": False},
            )
            response.raise_for_status()
            return response.json()["message"]["content"]

    async def stream(self, messages: list[dict], config: ModelConfig) -> AsyncIterator[str]:
        base_url = config.base_url or OLLAMA_DEFAULT_URL
        async with httpx.AsyncClient(timeout=120) as client:
            async with client.stream(
                "POST",
                f"{base_url}/api/chat",
                json={"model": config.model_name, "messages": messages, "stream": True},
            ) as response:
                response.raise_for_status()
                async for line in response.aiter_lines():
                    if line:
                        import json
                        data = json.loads(line)
                        if content := data.get("message", {}).get("content"):
                            yield content
                        if data.get("done"):
                            break

    @property
    def supports_tool_calling(self) -> bool:
        return True  # model-dependent; assume capable models are used

    @property
    def context_window(self) -> int:
        return 32768
