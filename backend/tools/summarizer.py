from models.gateway import ModelGateway, ModelConfig


async def summarize_for_claim(
    text: str, question: str, gateway: ModelGateway, config: ModelConfig
) -> str:
    """Summarize text content relevant to a research question.

    Args:
        text: The text to summarize
        question: The question being researched
        gateway: Model gateway for generating summaries
        config: Model configuration

    Returns:
        Summary text or empty string on failure
    """
    if not text.strip():
        return ""

    snippet = text[:3000]
    messages = [
        {
            "role": "user",
            "content": (
                f"Question being researched: {question}\n\n"
                f"Web page content:\n{snippet}\n\n"
                "In 2-3 sentences, summarize what this page says that is relevant to the question. "
                "If it says nothing relevant, reply with: [Not relevant]"
            ),
        }
    ]
    try:
        return await gateway.generate(messages, config)
    except Exception:
        return ""
