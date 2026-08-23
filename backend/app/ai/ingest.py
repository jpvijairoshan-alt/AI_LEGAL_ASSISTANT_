"""
Indian Law Data Ingestion Pipeline
Loads the Alpie-core Indian Law JSON dataset, chunks it, computes embeddings, and stores in ChromaDB.

Dataset format: [{ "prompt": "...", "complex_cot": "...", "response": "..." }, ...]
"""

import json
import os
from typing import List, Dict
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_huggingface import HuggingFaceEmbeddings

from langchain_community.vectorstores import Chroma
from app.config import get_settings

settings = get_settings()

CHUNK_SIZE = 1200
CHUNK_OVERLAP = 200
COLLECTION_NAME = "indian_law"
LOCAL_DATA_PATH = "./data/indian_law.json"


def load_dataset(local_path: str = LOCAL_DATA_PATH) -> list:
    """Load the Indian law JSON dataset from local file."""
    if not os.path.exists(local_path):
        raise FileNotFoundError(
            f"Dataset not found at {local_path}. "
            "Place Alpie-core_core_indian_law.json as data/indian_law.json in the backend directory."
        )

    print(f"[INGEST] Loading dataset from {local_path}")
    with open(local_path, "r", encoding="utf-8") as f:
        data = json.load(f)

    print(f"[INGEST] Loaded {len(data)} records")
    return data


def parse_and_chunk(data: list) -> List[Dict]:
    """Parse the JSON data and chunk text for vector storage.

    Each record has: prompt, complex_cot, response.
    We combine prompt + response as the primary searchable content,
    and include a summary of complex_cot as supporting context.
    """
    documents = []
    text_splitter = RecursiveCharacterTextSplitter(
        chunk_size=CHUNK_SIZE,
        chunk_overlap=CHUNK_OVERLAP,
        length_function=len,
        separators=["\n\n", "\n", ". ", " "],
    )

    for i, record in enumerate(data):
        prompt = (record.get("prompt") or "").strip()
        response = (record.get("response") or "").strip()
        complex_cot = (record.get("complex_cot") or "").strip()

        if not response or len(response) < 50:
            continue

        full_text = f"Legal Question: {prompt}\n\nLegal Answer:\n{response}"

        # Extract likely act/law name from the prompt if possible
        act_name = _extract_act_name(prompt)
        title = prompt[:300] if prompt else f"Legal Q&A #{i}"

        # Chunk the full text
        chunks = text_splitter.split_text(full_text)

        for j, chunk in enumerate(chunks):
            if len(chunk.strip()) < 50:
                continue
            documents.append({
                "page_content": chunk,
                "metadata": {
                    "title": title,
                    "section": f"Q&A #{i}",
                    "act_name": act_name,
                    "source": "indian_law_dataset",
                    "chunk_index": j,
                    "document_index": i,
                },
            })

    print(f"[INGEST] Created {len(documents)} chunks from {len(data)} records")
    return documents


def _extract_act_name(text: str) -> str:
    """Best-effort extraction of act/law name from question text."""
    import re
    patterns = [
        (r"under\s+(?:the\s+)?(.+?(?:Act|Code|Constitution|Rules|Regulations)[^,.]*)", 1),
        (r"Section\s+(\d+[A-Z]?\s+(?:of\s+)?(?:the\s+)?[A-Za-z]+)", 1),
        (r"(IPC|CrPC|CPC|BNS|BNSS|NI Act|Constitution|Evidence Act|Transfer of Property Act|Indian Contract Act)", 1),
    ]
    for pattern, group in patterns:
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            return match.group(group)[:300].strip()
    return ""


def build_vector_store(documents: List[Dict]) -> Chroma:
    """Compute embeddings using free HuggingFace model and store in ChromaDB."""
    
    # Using free local HuggingFace embeddings
    embeddings = HuggingFaceEmbeddings(model_name="all-MiniLM-L6-v2")

    texts = [doc["page_content"] for doc in documents]
    metadatas = [doc["metadata"] for doc in documents]

    # Ingest in batches to avoid memory issues
    BATCH_SIZE = 500
    total_batches = (len(texts) + BATCH_SIZE - 1) // BATCH_SIZE

    print(f"[INGEST] Computing embeddings for {len(texts)} chunks in {total_batches} batches...")

    vectorstore = None
    for batch_idx in range(total_batches):
        start = batch_idx * BATCH_SIZE
        end = min(start + BATCH_SIZE, len(texts))
        batch_texts = texts[start:end]
        batch_metadatas = metadatas[start:end]

        print(f"[INGEST] Processing batch {batch_idx + 1}/{total_batches} ({len(batch_texts)} chunks)...")

        if vectorstore is None:
            vectorstore = Chroma.from_texts(
                texts=batch_texts,
                embedding=embeddings,
                metadatas=batch_metadatas,
                collection_name=COLLECTION_NAME,
                persist_directory=settings.CHROMA_PERSIST_DIR,
            )
        else:
            vectorstore.add_texts(
                texts=batch_texts,
                metadatas=batch_metadatas,
            )

    if vectorstore:
        print(f"[INGEST] Vector store built with {vectorstore._collection.count()} vectors")
    return vectorstore


def get_vector_store() -> Chroma:
    """Load existing ChromaDB vector store."""
    embeddings = HuggingFaceEmbeddings(model_name="all-MiniLM-L6-v2")

    return Chroma(
        collection_name=COLLECTION_NAME,
        embedding_function=embeddings,
        persist_directory=settings.CHROMA_PERSIST_DIR,
    )


def run_ingestion(limit: int = 0):
    """Full ingestion pipeline: load -> parse -> chunk -> embed -> store."""
    data = load_dataset()
    if limit > 0:
        data = data[:limit]
        print(f"[INGEST] Limited to first {limit} records")
    documents = parse_and_chunk(data)
    if not documents:
        print("[INGEST] No documents to index!")
        return
    build_vector_store(documents)
    print("[INGEST] Ingestion complete!")


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="Ingest Indian Law dataset into ChromaDB")
    parser.add_argument("--limit", type=int, default=0, help="Limit number of records to ingest (0 = all)")
    args = parser.parse_args()

    print("[INGEST] Starting ingestion pipeline...")
    run_ingestion(limit=args.limit)