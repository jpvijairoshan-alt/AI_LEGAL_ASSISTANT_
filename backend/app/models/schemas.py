from typing import List, Optional

from pydantic import BaseModel


class HistoryMessage(BaseModel):
    role: str
    content: str


class ChatRequest(BaseModel):
    question: str
    history: Optional[List[HistoryMessage]] = None


class Source(BaseModel):
    title: str
    section: str = ""
    act_name: str = ""
    content: str


class ChatResponse(BaseModel):
    answer: str
    sources: List[Source] = []
