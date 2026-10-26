"""
Indian Law Data Ingestion Pipeline
Loads the Indian Law JSON dataset, chunks it, computes embeddings, and stores in ChromaDB.

Dataset format: [{ "prompt": "...", "complex_cot": "...", "response": "..." }, ...]

Usage (from the backend folder):
    python -m app.ai.ingest                  # real dataset: data/indian_law.json
    python -m app.ai.ingest --limit 500      # first 500 records only
    python -m app.ai.ingest --sample         # generate + index a tiny SAMPLE dataset (testing only)
"""

import json
import re
from functools import lru_cache
from typing import Dict, List

import chromadb
from langchain_community.vectorstores import Chroma
from langchain_text_splitters import RecursiveCharacterTextSplitter

from app.config import get_settings

settings = get_settings()

CHUNK_SIZE = 1200
CHUNK_OVERLAP = 200
COLLECTION_NAME = "indian_law"
EMBEDDING_MODEL = "all-MiniLM-L6-v2"
SAMPLE_LABEL = "SAMPLE DATASET - FOR TESTING ONLY, NOT A LEGAL SOURCE"

_SAMPLE_QA = [
    ("What is anticipatory bail under Section 438 CrPC?",
     "Section 438 CrPC (Section 482 BNSS) lets a person who apprehends arrest for a non-bailable offence apply to the High Court or Court of Session for a direction that, if arrested, they be released on bail. The court may impose conditions such as cooperating with the investigation and not leaving India without permission."),
    ("What are the bail provisions under Section 439 CrPC?",
     "Section 439 CrPC (Section 483 BNSS) gives the High Court and the Court of Session special powers regarding bail. They can direct that any person in custody be released on bail, impose or modify bail conditions, and set aside or modify bail granted by a Magistrate."),
    ("What are the ingredients of an offence under Section 138 of the Negotiable Instruments Act?",
     "Section 138 NI Act applies when a cheque issued for a legally enforceable debt or liability is dishonoured for insufficiency of funds. The cheque must be presented within its validity period, the payee must send a demand notice within 30 days of dishonour, the drawer gets 15 days to pay, and the complaint must be filed within one month after that period ends. Punishment is imprisonment up to two years, or a fine up to twice the cheque amount, or both."),
    ("What is the procedure for registering an FIR?",
     "Under Section 154 CrPC (Section 173 BNSS), information about a cognizable offence given orally or in writing to the officer in charge of a police station must be recorded and signed by the informant, who is entitled to a free copy. If the officer refuses, the informant may send the substance to the Superintendent of Police or approach a Magistrate."),
    ("What does Article 14 of the Constitution of India guarantee?",
     "Article 14 guarantees equality before the law and equal protection of the laws to all persons within the territory of India. It permits reasonable classification based on an intelligible differentia having a rational nexus with the object sought to be achieved, but prohibits arbitrary State action."),
    ("What is protected by Article 21 of the Constitution of India?",
     "Article 21 provides that no person shall be deprived of life or personal liberty except according to procedure established by law. Courts have read it broadly to include the right to livelihood, privacy, speedy trial, free legal aid and a dignified life, and the procedure must be fair, just and reasonable."),
    ("What freedoms are guaranteed under Article 19(1) of the Constitution?",
     "Article 19(1) guarantees citizens freedom of speech and expression, peaceful assembly without arms, forming associations or unions, free movement throughout India, residence in any part of India, and practising any profession or carrying on any occupation, trade or business. These are subject to reasonable restrictions under Articles 19(2) to 19(6)."),
    ("What is the punishment for murder under the Bharatiya Nyaya Sanhita?",
     "Section 103(1) BNS prescribes punishment for murder: death or imprisonment for life, and the offender is also liable to a fine. It corresponds to Section 302 of the Indian Penal Code. Section 101 BNS defines murder, corresponding to Section 300 IPC."),
    ("What is cheating under Section 420 IPC?",
     "Section 420 IPC punishes cheating and dishonestly inducing delivery of property. The accused must deceive a person and thereby dishonestly induce them to deliver property or make or alter a valuable security. Punishment is imprisonment up to seven years and a fine. The corresponding provision in the BNS is Section 318."),
    ("What does Section 498A IPC deal with?",
     "Section 498A IPC deals with cruelty by the husband or his relatives towards a married woman, including wilful conduct likely to drive her to suicide or cause grave injury, and harassment to coerce her or her relatives to meet unlawful demands for property. It is punishable with imprisonment up to three years and a fine. The BNS counterpart is Section 85."),
    ("Who can claim maintenance under Section 125 CrPC?",
     "Section 125 CrPC (Section 144 BNSS) allows a wife unable to maintain herself, legitimate or illegitimate minor children, adult children with a physical or mental disability, and parents who cannot maintain themselves to claim monthly maintenance from a person having sufficient means who neglects or refuses to maintain them."),
    ("What are the essentials of a valid contract under the Indian Contract Act?",
     "Section 10 of the Indian Contract Act, 1872 says all agreements are contracts if made by the free consent of parties competent to contract, for a lawful consideration and with a lawful object, and are not expressly declared void. Writing and registration are required only where a specific law demands them."),
    ("What compensation is available for breach of contract?",
     "Section 73 of the Indian Contract Act, 1872 entitles the party who suffers from a breach to receive compensation for any loss or damage that naturally arose in the usual course of things from the breach, or which the parties knew when making the contract to be likely to result from it. Remote and indirect loss cannot be claimed."),
    ("When is an electronic record admissible in evidence?",
     "Section 65B of the Indian Evidence Act, 1872 makes electronic records admissible as documents if the conditions in that section are met and a certificate identifying the record and describing how it was produced is furnished. The Bharatiya Sakshya Adhiniyam, 2023 contains the corresponding rule in Section 63."),
    ("What are the inherent powers of the High Court under Section 482 CrPC?",
     "Section 482 CrPC (Section 528 BNSS) saves the inherent powers of the High Court to make orders necessary to give effect to any order under the Code, to prevent abuse of the process of any court, or to secure the ends of justice. It is commonly invoked to seek quashing of an FIR or proceedings."),
    ("When can the police arrest without a warrant?",
     "Section 41 CrPC (Section 35 BNSS) lists situations where police may arrest without a warrant, including a person committing a cognizable offence in their presence, or against whom a credible complaint exists for an offence punishable with imprisonment up to seven years where arrest is necessary. Notice of appearance is the preferred route for lesser offences."),
    ("On what grounds can a plaint be rejected under Order VII Rule 11 CPC?",
     "Order VII Rule 11 of the Code of Civil Procedure lets the court reject a plaint where it discloses no cause of action, the relief is undervalued and the plaintiff does not correct the valuation, the plaint is insufficiently stamped and the plaintiff fails to pay on time, or the suit appears from the statements in the plaint to be barred by law."),
    ("How is a sale of immovable property defined under the Transfer of Property Act?",
     "Section 54 of the Transfer of Property Act, 1882 defines sale as the transfer of ownership in exchange for a price paid or promised. A sale of tangible immovable property worth one hundred rupees or more can be made only by a registered instrument, while lower-value property may also be transferred by delivery of possession."),
    ("What is the general effect of the law of limitation on a civil suit?",
     "Section 3 of the Limitation Act, 1963 provides that a suit, appeal or application filed after the prescribed period must be dismissed, even if limitation has not been raised as a defence. Section 5 allows condonation of delay for appeals and applications on showing sufficient cause, but not for suits."),
    ("What is the difference between cognizable and non-cognizable offences?",
     "Under Section 2(c) and 2(l) CrPC, in a cognizable offence the police may arrest without a warrant and start an investigation without a Magistrate's order, while in a non-cognizable offence they need the Magistrate's order for investigation and generally cannot arrest without a warrant. The First Schedule classifies each offence."),
]


def get_sample_records() -> list:
    return [
        {
            "prompt": f"[SAMPLE] {q}",
            "response": f"[{SAMPLE_LABEL}] {a}",
            "complex_cot": "",
            "sample": True,
        }
        for q, a in _SAMPLE_QA
    ]


def write_sample_dataset() -> None:
    path = settings.data_path
    if path.exists():
        try:
            existing = json.loads(path.read_text(encoding="utf-8"))
        except ValueError:
            existing = None
        if not (isinstance(existing, list) and existing and all(r.get("sample") for r in existing)):
            raise SystemExit(
                f"{path} already exists and is not a generated sample. "
                "Refusing to overwrite your real dataset. Delete or move it first if you really want the sample."
            )
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(get_sample_records(), indent=2, ensure_ascii=False), encoding="utf-8")
    print(f"[INGEST] Wrote SAMPLE dataset ({len(_SAMPLE_QA)} records) to {path}")
    print(f"[INGEST] {SAMPLE_LABEL}")


def load_dataset() -> list:
    """Load the Indian law JSON dataset from backend/data/indian_law.json."""
    path = settings.data_path
    if not path.exists():
        raise FileNotFoundError(
            f"Dataset not found at {path}.\n"
            "  - Real dataset: place the Alpie-core Indian law JSON file there as data/indian_law.json\n"
            "  - Just want to test the pipeline? Run: python -m app.ai.ingest --sample"
        )
    print(f"[INGEST] Loading dataset from {path}")
    with open(path, "r", encoding="utf-8") as f:
        data = json.load(f)
    print(f"[INGEST] Loaded {len(data)} records")
    return data


def parse_and_chunk(data: list) -> List[Dict]:
    """Combine prompt + response per record and split into chunks for vector storage."""
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

        if not response or len(response) < 50:
            continue

        full_text = f"Legal Question: {prompt}\n\nLegal Answer:\n{response}"
        act_name = _extract_act_name(prompt)
        title = prompt[:300] if prompt else f"Legal Q&A #{i}"
        is_sample = bool(record.get("sample"))

        for j, chunk in enumerate(text_splitter.split_text(full_text)):
            if len(chunk.strip()) < 50:
                continue
            documents.append({
                "page_content": chunk,
                "metadata": {
                    "title": title,
                    "section": f"Q&A #{i}",
                    "act_name": act_name,
                    "source": "indian_law_sample" if is_sample else "indian_law_dataset",
                    "chunk_index": j,
                    "document_index": i,
                },
            })

    print(f"[INGEST] Created {len(documents)} chunks from {len(data)} records")
    return documents


def _extract_act_name(text: str) -> str:
    """Best-effort extraction of act/law name from question text."""
    patterns = [
        r"under\s+(?:the\s+)?(.+?(?:Act|Code|Constitution|Rules|Regulations)[^,.]*)",
        r"Section\s+(\d+[A-Z]?\s+(?:of\s+)?(?:the\s+)?[A-Za-z]+)",
        r"(IPC|CrPC|CPC|BNS|BNSS|NI Act|Constitution|Evidence Act|Transfer of Property Act|Indian Contract Act)",
    ]
    for pattern in patterns:
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            return match.group(1)[:300].strip()
    return ""


@lru_cache
def get_embeddings():
    from langchain_huggingface import HuggingFaceEmbeddings

    return HuggingFaceEmbeddings(model_name=EMBEDDING_MODEL)


@lru_cache
def _chroma_client():
    return chromadb.PersistentClient(path=settings.chroma_dir)


def vector_count() -> int:
    """Number of indexed vectors (0 if the collection does not exist yet). Does not load the embedding model."""
    try:
        return _chroma_client().get_collection(COLLECTION_NAME).count()
    except Exception:
        return 0


def get_vector_store() -> Chroma:
    """Load existing ChromaDB vector store."""
    return Chroma(
        collection_name=COLLECTION_NAME,
        embedding_function=get_embeddings(),
        client=_chroma_client(),
    )


def build_vector_store(documents: List[Dict]) -> Chroma:
    """Embed the chunks and store them in a freshly created collection (no duplicates on reindex)."""
    client = _chroma_client()
    try:
        client.delete_collection(COLLECTION_NAME)
        print(f"[INGEST] Deleted existing collection '{COLLECTION_NAME}'")
    except Exception:
        pass  # collection did not exist yet

    vectorstore = Chroma(
        collection_name=COLLECTION_NAME,
        embedding_function=get_embeddings(),
        client=client,
    )

    texts = [doc["page_content"] for doc in documents]
    metadatas = [doc["metadata"] for doc in documents]

    BATCH_SIZE = 500
    total_batches = (len(texts) + BATCH_SIZE - 1) // BATCH_SIZE
    print(f"[INGEST] Computing embeddings for {len(texts)} chunks in {total_batches} batches...")

    for batch_idx in range(total_batches):
        start = batch_idx * BATCH_SIZE
        end = min(start + BATCH_SIZE, len(texts))
        print(f"[INGEST] Processing batch {batch_idx + 1}/{total_batches} ({end - start} chunks)...")
        vectorstore.add_texts(texts=texts[start:end], metadatas=metadatas[start:end])

    print(f"[INGEST] Vector store built with {vectorstore._collection.count()} vectors")
    return vectorstore


def run_ingestion(limit: int = 0) -> int:
    """Full ingestion pipeline: load -> parse -> chunk -> embed -> store. Returns chunk count."""
    data = load_dataset()
    if limit > 0:
        data = data[:limit]
        print(f"[INGEST] Limited to first {limit} records")
    documents = parse_and_chunk(data)
    if not documents:
        print("[INGEST] No documents to index!")
        return 0
    build_vector_store(documents)
    print("[INGEST] Ingestion complete!")
    return len(documents)


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="Ingest Indian Law dataset into ChromaDB")
    parser.add_argument("--limit", type=int, default=0, help="Limit number of records to ingest (0 = all)")
    parser.add_argument("--sample", action="store_true", help="Generate a small SAMPLE dataset (testing only) and index it")
    args = parser.parse_args()

    if args.sample:
        write_sample_dataset()
    try:
        run_ingestion(limit=args.limit)
    except FileNotFoundError as e:
        raise SystemExit(f"[INGEST] ERROR: {e}")
