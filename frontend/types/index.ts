// Shapes returned by the Next.js API routes (dates arrive as ISO strings).

export type CourtType =
  | "HIGH_COURT"
  | "DISTRICT_COURT"
  | "SUPREME_COURT"
  | "TRIBUNAL"
  | "SESSIONS_COURT"
  | "MAGISTRATE_COURT";

export type EvidenceKind = "AUDIO" | "VIDEO" | "PDF" | "IMAGE" | "DOCUMENT";

export interface CaseSummary {
  id: string;
  caseNumber: string;
  title: string;
}

export interface Case {
  id: string;
  caseNumber: string;
  title: string;
  clientName: string;
  clientPhone: string | null;
  clientEmail: string | null;
  courtName: string;
  courtType: CourtType;
  judgeName: string | null;
  opposingCounsel: string | null;
  stage: string;
  status: string;
  description: string | null;
  nextHearingDate: string | null;
  filingDate: string | null;
  createdAt: string;
  updatedAt: string;
  lawyerId: string;
  _count?: { evidence: number; hearings: number };
}

/** Evidence metadata. File contents are fetched separately via GET /api/evidence/:id/file. */
export interface Evidence {
  id: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  evidenceType: EvidenceKind;
  tag: string | null;
  description: string | null;
  uploadedAt: string;
  caseId: string;
  case?: Pick<CaseSummary, "caseNumber" | "title">;
}

export interface Hearing {
  id: string;
  title: string;
  date: string;
  time: string | null;
  courtName: string;
  courtType: CourtType;
  judgeName: string | null;
  notes: string | null;
  status: string;
  createdAt: string;
  caseId: string;
  lawyerId: string;
  case?: Pick<CaseSummary, "caseNumber" | "title">;
}

export interface TimelineEvent {
  id: string;
  title: string;
  description: string | null;
  eventDate: string;
  eventType: string;
  createdAt: string;
}

/** GET /api/cases/:id */
export interface CaseDetail extends Case {
  evidence: Evidence[];
  hearings: Hearing[];
  timelineEvents: TimelineEvent[];
}

export interface DashboardStats {
  totalCases: number;
  activeCases: number;
  todayHearings: Hearing[];
  recentCases: Pick<Case, "id" | "caseNumber" | "title" | "courtName" | "stage" | "status">[];
  upcomingHearings: Hearing[];
}

export interface ChatSource {
  title: string;
  section: string;
  act_name: string;
  content: string;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  sources?: ChatSource[];
  isError?: boolean;
}
