"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Edit,
  Calendar,
  FileText,
  Upload,
  Clock,
  MapPin,
  User,
  Scale,
  Gavel,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  STAGE_LABELS,
  COURT_TYPE_LABELS,
  COURT_TYPE_COLORS,
  STATUS_COLORS,
  HEARING_STATUS_COLORS,
  formatDate,
} from "@/lib/utils";
import api from "@/lib/api";

interface CaseDetail {
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
  evidence: any[];
  hearings: any[];
  timelineEvents: any[];
}

const MOCK_CASE: CaseDetail = {
  id: "1",
  caseNumber: "CRL/2024/1234",
  title: "State vs. Sharma",
  clientName: "Rajesh Sharma",
  clientPhone: "+91 98765 43210",
  clientEmail: "rajesh@email.com",
  courtName: "Delhi High Court",
  courtType: "HIGH_COURT",
  judgeName: "Hon'ble Justice Mehta",
  opposingCounsel: "Advocate Priya Kapoor (Additional PP)",
  stage: "BAIL",
  status: "ACTIVE",
  description: "Bail application under Section 439 CrPC for accused in robbery case FIR No. 234/2024 at Saket Police Station.",
  nextHearingDate: new Date(Date.now() + 86400000).toISOString(),
  filingDate: "2024-06-15T00:00:00Z",
  createdAt: "2024-06-15T00:00:00Z",
  evidence: [
    { id: "e1", fileName: "witness_statement_ram.pdf", evidenceType: "PDF", tag: "Witness Statement", uploadedAt: "2024-07-01T00:00:00Z" },
    { id: "e2", fileName: "cctv_footage_main_road.mp4", evidenceType: "VIDEO", tag: "CCTV Footage", uploadedAt: "2024-07-05T00:00:00Z" },
    { id: "e3", fileName: "fir_copy.pdf", evidenceType: "PDF", tag: "Exhibit A", uploadedAt: "2024-06-20T00:00:00Z" },
    { id: "e4", fileName: "medical_report_victim.jpg", evidenceType: "IMAGE", tag: "Medical Report", uploadedAt: "2024-07-08T00:00:00Z" },
  ],
  hearings: [
    { id: "h1", title: "Bail Hearing - First Motion", date: "2024-07-10T00:00:00Z", time: "10:30 AM", courtName: "Delhi High Court", status: "COMPLETED", judgeName: "Justice Mehta", notes: "Bail application admitted. Counter filed by prosecution. Next date for arguments." },
    { id: "h2", title: "Bail Arguments", date: new Date(Date.now() + 86400000).toISOString(), time: "10:30 AM", courtName: "Delhi High Court", status: "SCHEDULED", judgeName: "Justice Mehta" },
  ],
  timelineEvents: [
    { id: "t1", title: "FIR Registered", description: "FIR No. 234/2024 registered at Saket Police Station under Sections 392/34 IPC", eventDate: "2024-05-20T00:00:00Z", eventType: "FIR" },
    { id: "t2", title: "Client Consultation", description: "Initial consultation with Rajesh Sharma. Discussed case facts and bail prospects.", eventDate: "2024-06-10T00:00:00Z", eventType: "CONSULTATION" },
    { id: "t3", title: "Bail Application Filed", description: "Bail application filed under Section 439 CrPC at Delhi High Court", eventDate: "2024-06-15T00:00:00Z", eventType: "FILING" },
    { id: "t4", title: "First Hearing - Bail Admitted", description: "Bail application admitted. Prosecution given time to file counter.", eventDate: "2024-07-10T00:00:00Z", eventType: "HEARING" },
    { id: "t5", title: "Evidence Submitted", description: "CCTV footage and witness statements submitted to court", eventDate: "2024-07-12T00:00:00Z", eventType: "EVIDENCE" },
  ],
};

const TIMELINE_EVENT_ICONS: Record<string, string> = {
  FIR: "bg-red-100 text-red-600",
  CONSULTATION: "bg-blue-100 text-blue-600",
  FILING: "bg-purple-100 text-purple-600",
  HEARING: "bg-amber-100 text-amber-600",
  EVIDENCE: "bg-emerald-100 text-emerald-600",
  default: "bg-slate-100 text-slate-600",
};

export default function CaseDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [caseData, setCaseData] = useState<CaseDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchCase() {
      try {
        const { data } = await api.get(`/cases/${params.id}`);
        setCaseData(data);
      } catch {
        setCaseData(MOCK_CASE);
      } finally {
        setLoading(false);
      }
    }
    fetchCase();
  }, [params.id]);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!caseData) return <div>Case not found</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/cases">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold tracking-tight">{caseData.title}</h1>
              <Badge className={STATUS_COLORS[caseData.status] || ""}>{caseData.status}</Badge>
              <Badge className={COURT_TYPE_COLORS[caseData.courtType] || ""}>
                {COURT_TYPE_LABELS[caseData.courtType]}
              </Badge>
            </div>
            <p className="text-muted-foreground font-mono text-sm">{caseData.caseNumber}</p>
          </div>
        </div>
        <Link href={`/cases/${caseData.id}?edit=true`}>
          <Button variant="outline" className="gap-2">
            <Edit className="h-4 w-4" /> Edit Case
          </Button>
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Scale className="h-4 w-4" /> Court
            </div>
            <p className="mt-1 font-medium">{caseData.courtName}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Gavel className="h-4 w-4" /> Judge
            </div>
            <p className="mt-1 font-medium">{caseData.judgeName || "N/A"}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <User className="h-4 w-4" /> Client
            </div>
            <p className="mt-1 font-medium">{caseData.clientName}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" /> Stage
            </div>
            <p className="mt-1 font-medium">{STAGE_LABELS[caseData.stage]}</p>
          </CardContent>
        </Card>
      </div>

      {caseData.description && (
        <Card>
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground">{caseData.description}</p>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="timeline">
        <TabsList>
          <TabsTrigger value="timeline" className="gap-1">
            <Clock className="h-4 w-4" /> Timeline ({caseData.timelineEvents.length})
          </TabsTrigger>
          <TabsTrigger value="hearings" className="gap-1">
            <Calendar className="h-4 w-4" /> Hearings ({caseData.hearings.length})
          </TabsTrigger>
          <TabsTrigger value="evidence" className="gap-1">
            <FileText className="h-4 w-4" /> Evidence ({caseData.evidence.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="timeline" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Case Timeline</CardTitle>
              <CardDescription>Chronological events and milestones</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="relative ml-3 border-l-2 border-muted pl-6 space-y-6">
                {caseData.timelineEvents.map((event) => (
                  <div key={event.id} className="relative">
                    <div
                      className={`absolute -left-[31px] flex h-6 w-6 items-center justify-center rounded-full ${
                        TIMELINE_EVENT_ICONS[event.eventType] || TIMELINE_EVENT_ICONS.default
                      }`}
                    >
                      <div className="h-2 w-2 rounded-full bg-current" />
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{event.title}</p>
                        <Badge variant="outline" className="text-xs">
                          {event.eventType}
                        </Badge>
                      </div>
                      {event.description && (
                        <p className="text-sm text-muted-foreground">{event.description}</p>
                      )}
                      <p className="text-xs text-muted-foreground">
                        {formatDate(event.eventDate)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="hearings" className="mt-4">
          <div className="space-y-3">
            {caseData.hearings.map((hearing) => (
              <Card key={hearing.id}>
                <CardContent className="flex items-center justify-between p-5">
                  <div className="space-y-1">
                    <p className="font-medium">{hearing.title}</p>
                    <div className="flex items-center gap-3 text-sm text-muted-foreground">
                      <span>{formatDate(hearing.date)} at {hearing.time}</span>
                      <span>{hearing.courtName}</span>
                      {hearing.judgeName && <span>{hearing.judgeName}</span>}
                    </div>
                    {hearing.notes && (
                      <p className="text-sm text-muted-foreground italic">{hearing.notes}</p>
                    )}
                  </div>
                  <Badge className={HEARING_STATUS_COLORS[hearing.status] || ""}>
                    {hearing.status}
                  </Badge>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="evidence" className="mt-4">
          <div className="flex justify-end mb-4">
            <Link href={`/evidence?caseId=${caseData.id}`}>
              <Button size="sm" className="gap-2">
                <Upload className="h-4 w-4" /> Upload Evidence
              </Button>
            </Link>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {caseData.evidence.map((ev) => (
              <Card key={ev.id}>
                <CardContent className="flex items-center justify-between p-4">
                  <div className="space-y-1">
                    <p className="text-sm font-medium">{ev.fileName}</p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Badge variant="outline">{ev.evidenceType}</Badge>
                      {ev.tag && <span>{ev.tag}</span>}
                      <span>{formatDate(ev.uploadedAt)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
