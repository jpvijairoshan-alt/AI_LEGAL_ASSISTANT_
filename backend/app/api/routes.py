from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field

from app.ai.ingest import COLLECTION_NAME, run_ingestion, vector_count
from app.ai.rag_engine import ServiceUnavailable, rag_engine
from app.auth import get_current_lawyer_id
from app.models.schemas import ChatRequest, ChatResponse

router = APIRouter(prefix="/api", tags=["AI"])


class ReindexRequest(BaseModel):
    limit: int = Field(default=0, ge=0)


# These handlers are plain `def` on purpose: FastAPI runs them in a threadpool,
# so embedding / LLM / Chroma calls do not block the event loop.


@router.post("/chat", response_model=ChatResponse)
def chat(request: ChatRequest, lawyer_id: str = Depends(get_current_lawyer_id)):
    """Answer a legal question using RAG."""
    question = request.question.strip()
    if not question:
        raise HTTPException(status_code=400, detail="Question cannot be empty")

    history = [m.model_dump() for m in request.history] if request.history else None
    try:
        answer, sources = rag_engine.query(question, history)
    except ServiceUnavailable as e:
        raise HTTPException(status_code=503, detail=str(e))
    except Exception as e:
        print(f"[CHAT] error: {type(e).__name__}: {e}")
        raise HTTPException(status_code=500, detail="AI processing error. Check the backend logs.")
    return ChatResponse(answer=answer, sources=sources)


@router.post("/chat/reindex")
def reindex_data(
    request: ReindexRequest = ReindexRequest(),
    lawyer_id: str = Depends(get_current_lawyer_id),
):
    """Rebuild the vector index. Use limit > 0 to index only a subset."""
    try:
        rag_engine.reset()
        chunks = run_ingestion(limit=request.limit)
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        print(f"[REINDEX] error: {type(e).__name__}: {e}")
        raise HTTPException(status_code=500, detail="Reindexing failed. Check the backend logs.")
    rag_engine.reset()
    return {"message": "Data reindexed successfully", "chunks_created": chunks}


@router.get("/chat/sources")
def get_sources(
    question: str = Query(..., min_length=1),
    lawyer_id: str = Depends(get_current_lawyer_id),
):
    """Retrieval sources for a question, without generating an answer."""
    try:
        sources = rag_engine.retrieve(question)
    except ServiceUnavailable as e:
        raise HTTPException(status_code=503, detail=str(e))
    except Exception as e:
        print(f"[SOURCES] error: {type(e).__name__}: {e}")
        raise HTTPException(status_code=500, detail="Retrieval error. Check the backend logs.")
    return {"sources": sources, "count": len(sources)}


@router.get("/chat/health")
def chat_health():
    """Public: is the RAG index ready, and how many vectors does it hold?"""
    count = vector_count()
    return {
        "status": "ready" if count > 0 else "not_indexed",
        "collection": COLLECTION_NAME,
        "vectors": count,
    }
