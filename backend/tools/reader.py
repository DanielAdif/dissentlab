import hashlib
import os
import asyncio
import httpx
from urllib.parse import urlparse
from urllib.robotparser import RobotFileParser

CACHE_DIR = os.environ.get("CACHE_PATH", "/data/cache")
RATE_LIMIT = asyncio.Semaphore(2)


def _cache_path(url: str) -> str:
    """Generate a cache file path for a URL."""
    url_hash = hashlib.sha256(url.encode()).hexdigest()[:16]
    return os.path.join(CACHE_DIR, f"{url_hash}.txt")


async def _check_robots(url: str) -> bool:
    """Check if URL is allowed by robots.txt."""
    parsed = urlparse(url)
    robots_url = f"{parsed.scheme}://{parsed.netloc}/robots.txt"
    try:
        async with httpx.AsyncClient(timeout=5) as client:
            r = await client.get(robots_url)
            if r.status_code == 200:
                rp = RobotFileParser()
                rp.parse(r.text.splitlines())
                return rp.can_fetch("*", url)
    except Exception:
        pass
    return True


async def read_url(url: str) -> str:
    """Read and extract text content from a URL.

    Checks robots.txt, uses caching, and extracts text using trafilatura.

    Args:
        url: The URL to read

    Returns:
        Extracted text content (max 50,000 chars) or empty string on failure
    """
    cache = _cache_path(url)
    if os.path.exists(cache):
        with open(cache) as f:
            return f.read()

    allowed = await _check_robots(url)
    if not allowed:
        return ""

    async with RATE_LIMIT:
        try:
            async with httpx.AsyncClient(
                timeout=15,
                follow_redirects=True,
                headers={"User-Agent": "DissentLab/1.0 research bot"},
            ) as client:
                r = await client.get(url)
                r.raise_for_status()
                html = r.text
        except Exception:
            return ""

    try:
        import trafilatura
        text = trafilatura.extract(html, include_comments=False, include_tables=False) or ""
    except Exception:
        text = ""

    if text:
        os.makedirs(CACHE_DIR, exist_ok=True)
        with open(cache, "w") as f:
            f.write(text[:50_000])

    return text[:50_000]
