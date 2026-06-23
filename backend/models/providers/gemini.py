from typing import AsyncIterator
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.messages import AIMessage, BaseMessage, HumanMessage, SystemMessage
from .base import BaseProvider, ModelConfig


def _to_langchain_messages(messages: list[dict]) -> list[BaseMessage]:
    role_map: dict[str, type[BaseMessage]] = {
        "system": SystemMessage,
        "user": HumanMessage,
        "assistant": AIMessage,
    }
    return [role_map.get(m["role"], HumanMessage)(content=m["content"]) for m in messages]


class GeminiProvider(BaseProvider):
    async def generate(self, messages: list[dict], config: ModelConfig) -> str:
        llm = ChatGoogleGenerativeAI(model=config.model_name, google_api_key=config.api_key)
        response = await llm.ainvoke(_to_langchain_messages(messages))
        return response.content or ""

    async def stream(self, messages: list[dict], config: ModelConfig) -> AsyncIterator[str]:
        llm = ChatGoogleGenerativeAI(model=config.model_name, google_api_key=config.api_key)
        async for chunk in llm.astream(_to_langchain_messages(messages)):
            if chunk.content:
                yield chunk.content

    @property
    def context_window(self) -> int:
        return 1000000
