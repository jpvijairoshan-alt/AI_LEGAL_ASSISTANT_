from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime


class ChatRequest(BaseModel):
    question: str
    history: Optional[List[dict]] = None


class ChatResponse(BaseModel):
    answer: str
    sources: List[dict] = []


class LawyerCreate(BaseModel):
    fullName: str
    email: str
    barCouncilNo: str
    password: str


class LawyerLogin(BaseModel):
    email: str
    password: str


class CaseCreate(BaseModel):
    caseNumber: str
    title: str
    clientName: str
    clientPhone: Optional[str] = None
    clientEmail: Optional[str] = None
    courtName: str
    courtType: str = "DISTRICT_COURT"
    judgeName: Optional[str] = None
    opposingCounsel: Optional[str] = None
    stage: str = "FIR_STAGE"
    description: Optional[str] = None
    filingDate: Optional[str] = None


class HearingCreate(BaseModel):
    title: str
    date: str
    time: Optional[str] = None
    courtName: str
    courtType: str = "DISTRICT_COURT"
    judgeName: Optional[str] = None
    notes: Optional[str] = None
    caseId: str
