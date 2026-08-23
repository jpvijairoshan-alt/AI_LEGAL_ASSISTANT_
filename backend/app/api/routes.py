from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from typing import Optional, List
from app.models.schemas import ChatRequest, ChatResponse
from app.ai.rag_engine import rag_engine

router = APIRouter(prefix="/api", tags=["AI"])


class ReindexRequest(BaseModel):
    limit: int = 0


class IngestStatusResponse(BaseModel):
    message: str
    records_processed: int = 0
    chunks_created: int = 0


@router.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    """Chat endpoint using RAG to answer legal questions."""
    if not request.question.strip():
        raise HTTPException(status_code=400, detail="Question cannot be empty")

    try:
        answer, sources = rag_engine.query(request.question)
        return ChatResponse(answer=answer, sources=sources)
    except ValueError as e:
        raise HTTPException(status_code=500, detail=f"Configuration error: {str(e)}")
    except FileNotFoundError as e:
        raise HTTPException(
            status_code=503,
            detail=f"Dataset not available: {str(e)}. Run the ingestion pipeline first.",
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI processing error: {str(e)}")


@router.post("/chat/reindex")
async def reindex_data(request: ReindexRequest = ReindexRequest()):
    """Re-trigger data ingestion pipeline. Use limit > 0 to index a subset."""
    try:
        from app.ai.ingest import run_ingestion
        rag_engine.reset()
        run_ingestion(limit=request.limit)
        return {
            "message": f"Data reindexed successfully{' (limited to ' + str(request.limit) + ' records)' if request.limit else ''}",
        }
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Reindexing failed: {str(e)}")


@router.get("/chat/sources")
async def get_sources(question: str = Query(..., min_length=1)):
    """Get retrieval sources for a question without generating an answer."""
    try:
        sources = rag_engine.retrieve(question)
        return {"sources": sources, "count": len(sources)}
    except FileNotFoundError as e:
        raise HTTPException(
            status_code=503,
            detail=f"Dataset not available: {str(e)}. Run the ingestion pipeline first.",
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/chat/health")
async def chat_health():
    """Check if the RAG system is ready."""
    try:
        from app.ai.ingest import get_vector_store
        vs = get_vector_store()
        count = vs._collection.count()
        return {"status": "ready", "vectors": count}
    except Exception as e:
        return {"status": "not_ready", "error": str(e)}
