"""
LegalCase AI - FastAPI Backend
Serves the RAG-powered AI legal assistant and API endpoints.
"""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from app.config import get_settings
from app.api.routes import router as ai_router

settings = get_settings()

app = FastAPI(
    title="LegalCase AI Backend",
    description="AI-Powered Legal Case Management System - Backend API",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.FRONTEND_URL, "http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(ai_router)


@app.get("/")
async def root():
    return {
        "name": "LegalCase AI Backend",
        "version": "1.0.0",
        "status": "running",
        "endpoints": {
            "chat": "POST /api/chat",
            "reindex": "POST /api/chat/reindex",
            "sources": "GET /api/chat/sources?question=...",
        },
    }


@app.get("/health")
async def health():
    return {"status": "healthy"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=settings.BACKEND_PORT, reload=True)
