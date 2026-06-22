from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import AsyncIterator


@dataclass
class ModelConfig:
    provider: str
    model_name: str
    api_key: str | None = None
    base_url: str | None = None


class BaseProvider(ABC):
    @abstractmethod
    async def generate(self, messages: list[dict], config: ModelConfig) -> str: ...

    @abstractmethod
    async def stream(self, messages: list[dict], config: ModelConfig) -> AsyncIterator[str]: ...

    @property
    def supports_tool_calling(self) -> bool:
        return True

    @property
    def context_window(self) -> int:
        return 128000
