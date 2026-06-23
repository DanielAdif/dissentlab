import logging
import os
import chromadb
from chromadb.utils import embedding_functions

CHROMA_PATH = os.environ.get("CHROMA_PATH", "/data/chroma")
_EMBED_MODEL = "all-MiniLM-L6-v2"
_logger = logging.getLogger(__name__)

_client: chromadb.ClientAPI | None = None
_collection = None


def _get_client():
    global _client, _collection
    if _client is None:
        _client = chromadb.PersistentClient(path=CHROMA_PATH)
        ef = embedding_functions.SentenceTransformerEmbeddingFunction(
            model_name=_EMBED_MODEL
        )
        _collection = _client.get_or_create_collection(
            "sources", embedding_function=ef
        )
    return _client, _collection


class ChromaClient:
    """Client for Chroma vector store and relevance scoring."""

    def score_relevance(self, text: str, question: str) -> float:
        """Score relevance of text to a question using embedding similarity.

        Args:
            text: The text to score
            question: The question to compare against

        Returns:
            Relevance score between 0.0 and 1.0 (cosine similarity)
        """
        if not text.strip():
            return 0.0
        try:
            from sentence_transformers import SentenceTransformer, util

            model = SentenceTransformer(_EMBED_MODEL)
            q_emb = model.encode(question, convert_to_tensor=True)
            t_emb = model.encode(text[:500], convert_to_tensor=True)
            score = float(util.cos_sim(q_emb, t_emb)[0][0])
            return max(0.0, min(1.0, score))
        except Exception:
            _logger.warning("Failed to score relevance, returning fallback value")
            return 0.5

    def deduplicate(
        self, sources: list[dict], question: str
    ) -> list[dict]:
        """Deduplicate sources by URL and score by relevance.

        Args:
            sources: List of source dicts (must have 'url' and 'summary' keys)
            question: The question to score relevance against

        Returns:
            Deduplicated and scored sources, sorted by relevance (highest first)
        """
        seen_urls: set[str] = set()
        unique = []
        for src in sources:
            if src["url"] not in seen_urls:
                seen_urls.add(src["url"])
                unique.append(src)
        for src in unique:
            src["relevance_score"] = self.score_relevance(
                src.get("summary", ""), question
            )
        return sorted(
            unique, key=lambda s: s["relevance_score"], reverse=True
        )
