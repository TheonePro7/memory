"""向量记忆后端 — ChromaDB + fastembed，无外部 LLM 依赖"""

import uuid
import time
import logging
from pathlib import Path

from fastembed import TextEmbedding
import chromadb

logger = logging.getLogger(__name__)

MODEL_NAME = "sentence-transformers/paraphrase-multilingual-mpnet-base-v2"
COLLECTION_NAME = "mem0"

_embedder: TextEmbedding | None = None
_collection = None


def _get_chroma_path() -> Path:
    return Path.cwd() / ".memory" / "chroma"


def _get_embedder() -> TextEmbedding:
    global _embedder
    if _embedder is None:
        _embedder = TextEmbedding(model_name=MODEL_NAME)
    return _embedder


def _get_collection():
    global _collection
    if _collection is None:
        path = str(_get_chroma_path())
        client = chromadb.PersistentClient(path=path)
        try:
            _collection = client.get_collection(COLLECTION_NAME)
        except Exception:
            _collection = client.create_collection(COLLECTION_NAME)
    return _collection


def _embed(text: str) -> list[float]:
    emb = list(_get_embedder().embed([text]))
    vec = emb[0]
    return vec.tolist() if hasattr(vec, "tolist") else vec


def add(
    content: str,
    user_id: str = "default",
    project_id: str | None = None,
    tags: list[str] | None = None,
) -> dict:
    try:
        memory_id = str(uuid.uuid4())
        vector = _embed(content)
        metadata = {"user_id": user_id}
        if project_id:
            metadata["project_id"] = project_id
        if tags:
            metadata["tags"] = ",".join(tags)

        _get_collection().add(
            documents=[content],
            embeddings=[vector],
            metadatas=[metadata],
            ids=[memory_id],
        )
        return {"id": memory_id, "backend": "mem0", "status": "stored"}
    except Exception as e:
        logger.error("add failed: %s", e)
        return {"id": "", "backend": "mem0", "status": "error", "error": str(e)}


def search(
    query: str,
    user_id: str = "default",
    project_id: str | None = None,
    limit: int = 10,
) -> list[dict]:
    try:
        vector = _embed(query)
        where = {"user_id": user_id}
        if project_id:
            where["project_id"] = project_id

        results = _get_collection().query(
            query_embeddings=[vector],
            n_results=limit,
            where=where,
            include=["documents", "metadatas", "distances"],
        )
        out = []
        ids = results.get("ids", [[]])[0]
        docs = results.get("documents", [[]])[0]
        dists = results.get("distances", [[]])[0]
        metas = results.get("metadatas", [[]])[0]

        for i in range(len(ids)):
            out.append({
                "memory": docs[i] if i < len(docs) else "",
                "score": 1.0 / (1.0 + dists[i]) if i < len(dists) else 0,
                "id": ids[i],
                "metadata": metas[i] if i < len(metas) else {},
            })
        return out
    except Exception as e:
        logger.error("search failed: %s", e)
        return []


def delete(memory_id: str, user_id: str = "default") -> bool:
    try:
        _get_collection().delete(ids=[memory_id])
        return True
    except Exception as e:
        logger.error("delete failed: %s", e)
        return False


def stats(user_id: str = "default") -> dict:
    try:
        col = _get_collection()
        count = col.count()
        return {"total": count, "user_id": user_id}
    except Exception as e:
        logger.error("stats failed: %s", e)
        return {"total": 0, "user_id": user_id, "error": str(e)}


def list_all(user_id: str = "default", limit: int = 50) -> list[dict]:
    try:
        col = _get_collection()
        # Chroma count() returns total, then get() with limit
        where = {"user_id": user_id}
        results = col.get(where=where, limit=limit, include=["documents", "metadatas"])
        out = []
        ids = results.get("ids", [])
        docs = results.get("documents", [])
        metas = results.get("metadatas", [])
        for i in range(len(ids)):
            out.append({
                "id": ids[i],
                "memory": docs[i] if i < len(docs) else "",
                "metadata": metas[i] if i < len(metas) else {},
            })
        return out
    except Exception as e:
        logger.error("list_all failed: %s", e)
        return []
