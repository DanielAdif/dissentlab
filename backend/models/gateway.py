from typing import AsyncIterator
from .providers.base import BaseProvider, ModelConfig
from .providers.openai import OpenAIProvider
from .providers.anthropic import AnthropicProvider
from .providers.gemini import GeminiProvider
from .providers.moonshot import MoonshotProvider
from .providers.openrouter import OpenRouterProvider
from .providers.ollama import OllamaProvider
from .providers.huggingface import HuggingFaceProvider

_PROVIDERS: dict[str, type[BaseProvider]] = {
    "openai": OpenAIProvider,
    "anthropic": AnthropicProvider,
    "gemini": GeminiProvider,
    "moonshot": MoonshotProvider,
    "openrouter": OpenRouterProvider,
    "ollama": OllamaProvider,
    "huggingface": HuggingFaceProvider,
}

_NO_TOOL_CALLING = {"huggingface"}

def _get_provider(config: ModelConfig) -> BaseProvider:
    provider_class = _PROVIDERS.get(config.provider)
    if provider_class is None:
        raise ValueError(f"Unknown provider: {config.provider}")
    return provider_class()


class ModelGateway:
    async def generate(self, messages: list[dict], config: ModelConfig) -> str:
        provider = _get_provider(config)
        return await provider.generate(messages, config)

    async def stream(self, messages: list[dict], config: ModelConfig) -> AsyncIterator[str]:
        provider = _get_provider(config)
        async for chunk in provider.stream(messages, config):
            yield chunk

    def supports_tool_calling(self, config: ModelConfig) -> bool:
        return config.provider not in _NO_TOOL_CALLING

    def get_context_window(self, config: ModelConfig) -> int:
        try:
            return _get_provider(config).context_window
        except ValueError:
            return 128000
