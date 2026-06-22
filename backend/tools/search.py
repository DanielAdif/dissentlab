import asyncio
from tavily import TavilyClient


async def tavily_search(query: str, api_key: str, max_results: int = 5) -> list[dict]:
    """Search using Tavily API asynchronously.

    Args:
        query: The search query string
        api_key: Tavily API key
        max_results: Maximum number of results to return

    Returns:
        List of search results with title, url, content, and score
    """
    def _sync_search():
        client = TavilyClient(api_key=api_key)
        result = client.search(query=query, max_results=max_results, include_raw_content=False)
        return result.get("results", [])

    return await asyncio.get_event_loop().run_in_executor(None, _sync_search)
