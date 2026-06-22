import pytest
from unittest.mock import AsyncMock, patch, MagicMock
from models.gateway import ModelGateway, ModelConfig


@pytest.mark.asyncio
async def test_gateway_generate_openai():
    config = ModelConfig(provider="openai", model_name="gpt-4o-mini", api_key="test-key")
    gateway = ModelGateway()
    messages = [{"role": "user", "content": "Say hello"}]

    with patch("models.providers.openai.AsyncOpenAI") as mock_client_class:
        mock_client = MagicMock()
        mock_client_class.return_value = mock_client
        mock_response = MagicMock()
        mock_response.choices = [MagicMock()]
        mock_response.choices[0].message.content = "Hello!"
        mock_client.chat.completions.create = AsyncMock(return_value=mock_response)

        result = await gateway.generate(messages, config)
        assert result == "Hello!"


def test_gateway_supports_tool_calling():
    gateway = ModelGateway()
    openai_config = ModelConfig(provider="openai", model_name="gpt-4o", api_key="k")
    hf_config = ModelConfig(provider="huggingface", model_name="Qwen3-0.6B", api_key=None)
    assert gateway.supports_tool_calling(openai_config) is True
    assert gateway.supports_tool_calling(hf_config) is False
