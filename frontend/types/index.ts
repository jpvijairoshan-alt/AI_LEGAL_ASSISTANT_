export interface Lawyer {
  id: string;
  fullName: string;
  email: string;
  barCouncilNo: string;
  phone?: string;
  specialization?: string;
  profileImage?: string;
  createdAt: string;
}

export interface Case {
  id: string;
  caseNumber: string;
  title: string;
  clientName: string;
  clientPhone?: string;
  clientEmail?: string;
  courtName: string;
  courtType: string;
  judgeName?: string;
  opposingCounsel?: string;
  stage: string;
  status: string;
  description?: string;
  nextHearingDate?: string;
  filingDate?: string;
  createdAt: string;
  updatedAt: string;
  lawyerId: string;
  evidence?: Evidence[];
  hearings?: Hearing[];
  timelineEvents?: TimelineEvent[];
}

export interface Evidence {
  id: string;
  fileName: string;
  fileUrl: string;
  fileSize: number;
  mimeType: string;
  evidenceType: string;
  tag?: string;
  description?: string;
  uploadedAt: string;
  caseId: string;
}

export interface Hearing {
  id: string;
  title: string;
  date: string;
  time?: string;
  courtName: string;
  courtType: string;
  judgeName?: string;
  notes?: string;
  status: string;
  createdAt: string;
  caseId: string;
  lawyerId: string;
  case?: Case;
}

export interface TimelineEvent {
  id: string;
  title: string;
  description?: string;
  eventDate: string;
  eventType: string;
  createdAt: string;
}

export interface DashboardStats {
  totalCases: number;
  activeCases: number;
  todayHearings: number;
  pendingEvidence: number;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  sources?: ChatSource[];
  timestamp: string;
}

export interface ChatSource {
  title: string;
  section?: string;
  content: string;
}
