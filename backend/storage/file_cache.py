import hashlib
import os
import json
from datetime import datetime, timezone, timedelta

CACHE_DIR = os.environ.get("CACHE_PATH", "/data/cache")
TTL_HOURS = 24


def _cache_path(key: str) -> str:
    """Generate cache file path from a key.

    Args:
        key: The cache key

    Returns:
        Path to the cache file
    """
    h = hashlib.sha256(key.encode()).hexdigest()[:16]
    return os.path.join(CACHE_DIR, f"{h}.json")


def cache_get(key: str) -> str | None:
    """Retrieve a cached value by key.

    Args:
        key: The cache key

    Returns:
        Cached value or None if not found or expired
    """
    path = _cache_path(key)
    if not os.path.exists(path):
        return None
    with open(path) as f:
        data = json.load(f)
    stored_at = datetime.fromisoformat(data["stored_at"])
    if datetime.now(timezone.utc) - stored_at > timedelta(hours=TTL_HOURS):
        os.remove(path)
        return None
    return data["value"]


def cache_set(key: str, value: str) -> None:
    """Store a value in cache.

    Args:
        key: The cache key
        value: The value to cache
    """
    os.makedirs(CACHE_DIR, exist_ok=True)
    path = _cache_path(key)
    with open(path, "w") as f:
        json.dump(
            {
                "stored_at": datetime.now(timezone.utc).isoformat(),
                "value": value,
            },
            f,
        )
