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
        from datetime import datetime, timezone
        now = datetime.now(timezone.utc).isoformat()
        metadata = {"user_id": user_id, "created_at": now}
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


def list_all(
    user_id: str = "default",
    project_id: str | None = None,
    limit: int = 50,
) -> list[dict]:
    """列出所有记忆，按添加顺序倒序排列。"""
    try:
        col = _get_collection()
        where: dict = {"user_id": user_id}
        if project_id:
            where = {"$and": [{"user_id": user_id}, {"project_id": project_id}]}
        results = col.get(
            where=where,
            include=["documents", "metadatas"],
            limit=limit,
        )
        ids = results.get("ids", [])
        docs = results.get("documents", [])
        metas = results.get("metadatas", [])
        out = []
        for i in range(len(ids)):
            out.append({
                "id": ids[i],
                "memory": docs[i] if i < len(docs) else "",
                "metadata": metas[i] if i < len(metas) else {},
            })
        # 倒序（最新的在前）
        out.reverse()
        return out
    except Exception as e:
        logger.error("list_all failed: %s", e)
        return []


def delete(memory_id: str) -> bool:
    """通过 ID 删除一条记忆。先校验 ID 存在再删除。"""
    try:
        existing = _get_collection().get(ids=[memory_id], include=[])
        if not existing or not existing.get("ids"):
            return False
        _get_collection().delete(ids=[memory_id])
        return True
    except Exception as e:
        logger.error("delete failed: %s", e)
        return False


def update(memory_id: str, new_content: str) -> bool:
    """更新记忆内容 — 删除原记录后重新插入（ChromaDB 不支持原地更新）。

    若重插入失败，尝试恢复原数据以保证原子性。
    """
    try:
        if not new_content or not new_content.strip():
            return False
        existing = _get_collection().get(ids=[memory_id], include=["metadatas", "documents"])
        if not existing or not existing.get("ids"):
            return False
        old_doc = existing["documents"][0] if existing.get("documents") else ""
        old_meta = existing["metadatas"][0] if existing.get("metadatas") else {}

        _get_collection().delete(ids=[memory_id])
        try:
            vector = _embed(new_content)
            _get_collection().add(
                documents=[new_content],
                embeddings=[vector],
                metadatas=[old_meta],
                ids=[memory_id],
            )
        except Exception:
            # 重插入失败，尝试恢复原数据
            logger.warning("update re-insert failed, attempting rollback for %s", memory_id)
            try:
                old_vector = _embed(old_doc)
                _get_collection().add(
                    documents=[old_doc],
                    embeddings=[old_vector],
                    metadatas=[old_meta],
                    ids=[memory_id],
                )
            except Exception as rb_e:
                logger.error("rollback also failed for %s: %s", memory_id, rb_e)
            raise
        return True
    except Exception as e:
        logger.error("update failed: %s", e)
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
