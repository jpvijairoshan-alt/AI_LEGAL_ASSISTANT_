"""
RAG Engine for Indian Law Q&A.
LangChain + ChromaDB (local HuggingFace embeddings) + OpenAI chat model.
"""

from typing import Dict, List, Optional, Tuple

from langchain_core.output_parsers import StrOutputParser
from langchain_core.prompts import ChatPromptTemplate
from langchain_openai import ChatOpenAI

from app.ai.ingest import get_vector_store, vector_count
from app.config import get_settings

settings = get_settings()

DISCLAIMER = (
    "Disclaimer: This response is for informational purposes only and is not legal advice. "
    "Verify all provisions against the bare Act and current case law before relying on them."
)

RAG_SYSTEM_PROMPT = """You are an expert Indian legal assistant named LegalCase AI. You help Indian advocates and lawyers with questions about Indian law (IPC, CrPC, CPC, BNS, BNSS, NI Act, the Constitution, Evidence Act, Contract Act, Transfer of Property Act and other statutes).

RULES:
1. Answer based on the retrieved context below.
2. Always cite the specific Act, Section, and relevant provisions when referencing them.
3. If the context does not contain enough information to answer, state what you can and note what is missing. Do not invent provisions or case citations.
4. Use proper legal terminology.
5. Format your response clearly with short headings and bullet points.
6. Your answer is informational only and is NOT legal advice; say so briefly.

Conversation so far:
{history}

Retrieved Context from Legal Database:
{context}

User Question: {question}

Provide a well-structured legal answer. Cite specific provisions wherever possible."""


class ServiceUnavailable(Exception):
    """The RAG system cannot answer right now (no API key / dataset not indexed)."""


def _format_docs(docs) -> str:
    formatted = []
    for i, doc in enumerate(docs, 1):
        header = f"[Source {i}]"
        if doc.metadata.get("act_name"):
            header += f" {doc.metadata['act_name']}"
        if doc.metadata.get("section"):
            header += f" ({doc.metadata['section']})"
        formatted.append(f"{header}\n{doc.page_content}")
    return "\n\n---\n\n".join(formatted)


def _format_history(history: Optional[List[Dict]]) -> str:
    if not history:
        return "(none)"
    lines = []
    for msg in history[-6:]:
        role = "User" if msg.get("role") == "user" else "Assistant"
        lines.append(f"{role}: {str(msg.get('content', ''))[:1000]}")
    return "\n".join(lines)


def _docs_to_sources(docs) -> List[Dict]:
    return [
        {
            "title": doc.metadata.get("title", "Unknown"),
            "section": doc.metadata.get("section", ""),
            "act_name": doc.metadata.get("act_name", ""),
            "content": doc.page_content[:500],
        }
        for doc in docs
    ]


class RAGEngine:
    def __init__(self):
        self._retriever = None
        self._llm = None

    def _ensure_indexed(self):
        if vector_count() == 0:
            raise ServiceUnavailable(
                "The legal dataset has not been indexed yet. "
                "Run `python -m app.ai.ingest` (or `--sample` for test data) in the backend folder."
            )

    def _get_retriever(self):
        if self._retriever is None:
            self._retriever = get_vector_store().as_retriever(
                search_type="similarity", search_kwargs={"k": 8}
            )
        return self._retriever

    def _get_llm(self) -> ChatOpenAI:
        if not settings.OPENAI_API_KEY:
            raise ServiceUnavailable(
                "OPENAI_API_KEY is not configured on the backend. Set it in backend/.env and restart."
            )
        if self._llm is None:
            self._llm = ChatOpenAI(
                model="gpt-4o-mini", temperature=0.1, openai_api_key=settings.OPENAI_API_KEY
            )
        return self._llm

    def _retrieve_docs(self, question: str):
        self._ensure_indexed()
        return self._get_retriever().invoke(question)

    def retrieve(self, question: str) -> List[Dict]:
        """Retrieve relevant source passages for a question (no LLM call)."""
        return _docs_to_sources(self._retrieve_docs(question))

    def query(self, question: str, history: Optional[List[Dict]] = None) -> Tuple[str, List[Dict]]:
        """Full RAG query: retrieve ONCE, reuse the docs for both the context and the sources."""
        llm = self._get_llm()
        docs = self._retrieve_docs(question)

        chain = ChatPromptTemplate.from_template(RAG_SYSTEM_PROMPT) | llm | StrOutputParser()
        answer = chain.invoke(
            {
                "context": _format_docs(docs),
                "question": question,
                "history": _format_history(history),
            }
        )
        return f"{answer}\n\n---\n{DISCLAIMER}", _docs_to_sources(docs)

    def reset(self):
        """Drop cached retriever/LLM (call after reindexing)."""
        self._retriever = None
        self._llm = None


rag_engine = RAGEngine()
