"""
RAG Engine for Indian Law Q&A.
Uses LangChain with ChromaDB and OpenAI for retrieval-augmented generation.
Dataset: Alpie-core Indian Law Q&A dataset (47k+ legal question-answer pairs).
"""

from langchain_openai import ChatOpenAI, OpenAIEmbeddings
from langchain_community.vectorstores import Chroma
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.runnables import RunnablePassthrough
from langchain_core.output_parsers import StrOutputParser

from app.config import get_settings
from app.ai.ingest import get_vector_store, COLLECTION_NAME
from typing import List, Dict, Tuple

settings = get_settings()

RAG_SYSTEM_PROMPT = """You are an expert Indian legal assistant named LegalCase AI. You help Indian advocates and lawyers with questions about Indian law.

You have access to a comprehensive dataset of 47,000+ legal question-answer pairs covering:
- Indian Penal Code (IPC)
- Code of Criminal Procedure (CrPC)
- Code of Civil Procedure (CPC)
- Bharatiya Nyaya Sanhita (BNS)
- Bharatiya Nagarik Suraksha Sanhita (BNSS)
- Negotiable Instruments Act (NI Act)
- Indian Constitution
- Indian Evidence Act
- Transfer of Property Act
- Indian Contract Act
- Family Law, Corporate Law, Environmental Law
- And many other Indian statutes and legal topics

RULES:
1. Answer based on the retrieved context from the legal dataset.
2. Always cite the specific Act, Section, and relevant provisions when referencing them.
3. If the context does not contain enough information to answer, state what you can and note what is missing.
4. Use proper legal terminology and reference specific sections.
5. Format your response clearly with headings, sections, and bullet points.
6. If referencing case law, mention the case name and citation if available.
7. Provide practical guidance for advocates where possible.

Retrieved Context from Legal Database:
{context}

User Question: {question}

Provide a comprehensive, well-structured legal answer. Cite specific provisions wherever possible."""


class RAGEngine:
    def __init__(self):
        self._vectorstore = None
        self._retriever = None
        self._llm = None

    def _get_vectorstore(self) -> Chroma:
        if self._vectorstore is None:
            self._vectorstore = get_vector_store()
        return self._vectorstore

    def _get_retriever(self):
        if self._retriever is None:
            vs = self._get_vectorstore()
            self._retriever = vs.as_retriever(
                search_type="similarity",
                search_kwargs={"k": 8},
            )
        return self._retriever

    def _get_llm(self) -> ChatOpenAI:
        if self._llm is None:
            self._llm = ChatOpenAI(
                model="gpt-4o-mini",
                temperature=0.1,
                openai_api_key=settings.OPENAI_API_KEY,
            )
        return self._llm

    def retrieve(self, question: str) -> List[Dict]:
        """Retrieve relevant documents for a question."""
        retriever = self._get_retriever()
        docs = retriever.invoke(question)
        return [
            {
                "title": doc.metadata.get("title", "Unknown"),
                "section": doc.metadata.get("section", ""),
                "act_name": doc.metadata.get("act_name", ""),
                "content": doc.page_content[:500],
            }
            for doc in docs
        ]

    def query(self, question: str) -> Tuple[str, List[Dict]]:
        """Full RAG query: retrieve + generate."""
        retriever = self._get_retriever()
        llm = self._get_llm()

        prompt = ChatPromptTemplate.from_template(RAG_SYSTEM_PROMPT)

        def format_docs(docs):
            formatted = []
            for i, doc in enumerate(docs, 1):
                title = doc.metadata.get("title", "Unknown")
                section = doc.metadata.get("section", "")
                act = doc.metadata.get("act_name", "")
                header = f"[Source {i}]"
                if act:
                    header += f" {act}"
                if section:
                    header += f" ({section})"
                formatted.append(f"{header}\n{doc.page_content}")
            return "\n\n---\n\n".join(formatted)

        rag_chain = (
            {"context": retriever | format_docs, "question": RunnablePassthrough()}
            | prompt
            | llm
            | StrOutputParser()
        )

        answer = rag_chain.invoke(question)
        sources = self.retrieve(question)
        return answer, sources

    def reset(self):
        """Reset cached instances."""
        self._vectorstore = None
        self._retriever = None
        self._llm = None


rag_engine = RAGEngine()
