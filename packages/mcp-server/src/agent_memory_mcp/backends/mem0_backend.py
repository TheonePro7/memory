"""向量记忆后端 — ChromaDB + fastembed，无外部 LLM 依赖"""

import uuid
import os
import logging
import threading
from pathlib import Path

from fastembed import TextEmbedding
import chromadb

logger = logging.getLogger(__name__)

MODEL_NAME = "sentence-transformers/paraphrase-multilingual-mpnet-base-v2"
COLLECTION_NAME = "agent-memory"

_embedder: TextEmbedding | None = None
_embedder_lock = threading.Lock()
_collection = None
_collection_lock = threading.Lock()


def _get_memory_dir() -> Path:
    """数据目录：优先 AGENT_MEMORY_DIR 环境变量，否则 ~/.agent-memory/chroma/（跨项目共享）。"""
    env = os.environ.get("AGENT_MEMORY_DIR")
    if env:
        return Path(env) / ".memory" / "chroma"
    return Path.home() / ".agent-memory" / "chroma"


def _get_embedder() -> TextEmbedding:
    global _embedder
    if _embedder is None:
        with _embedder_lock:
            if _embedder is None:
                logger.info("loading embedding model %s (first use, may take a minute)...", MODEL_NAME)
                _embedder = TextEmbedding(model_name=MODEL_NAME)
    return _embedder


def _get_collection():
    global _collection
    if _collection is None:
        with _collection_lock:
            if _collection is None:
                path = str(_get_memory_dir())
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
    entities: list[str] | None = None,
    actions: list[str] | None = None,
    llm_summary: str | None = None,
) -> dict:
    try:
        if not content or not content.strip():
            return {"id": "", "backend": "mem0", "status": "error", "error": "empty content"}
        memory_id = str(uuid.uuid4())
        vector = _embed(content)
        metadata = {"user_id": user_id}
        if project_id:
            metadata["project_id"] = project_id
        if tags:
            metadata["tags"] = ",".join(tags)
        if entities:
            metadata["entities"] = ",".join(entities)
        if actions:
            metadata["actions"] = ",".join(actions)
        if llm_summary:
            metadata["llm_summary"] = llm_summary

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
        if not query or not query.strip():
            return []
        vector = _embed(query)
        where: dict = {"user_id": user_id}
        if project_id:
            where = {"$and": [{"user_id": user_id}, {"project_id": project_id}]}

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


def stats(user_id: str = "default", project_id: str | None = None) -> dict:
    try:
        col = _get_collection()
        where: dict = {"user_id": user_id}
        if project_id:
            where = {"$and": [{"user_id": user_id}, {"project_id": project_id}]}
        # 不设 limit 以获取准确总数（原 limit=10000 导致超限时计数偏低）
        results = col.get(where=where, include=[])
        count = len(results.get("ids", []))
        return {"total": count, "user_id": user_id}
    except Exception as e:
        logger.error("stats failed: %s", e)
        return {"total": 0, "user_id": user_id, "error": str(e)}
