from typing import AsyncIterator
from .providers.base import BaseProvider, ModelConfig
from .providers.openai import OpenAIProvider

_PROVIDERS: dict[str, type[BaseProvider]] = {
    "openai": OpenAIProvider,
}


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
        if config.provider == "huggingface":
            return False
        return True

    def get_context_window(self, config: ModelConfig) -> int:
        try:
            return _get_provider(config).context_window
        except ValueError:
            return 128000
