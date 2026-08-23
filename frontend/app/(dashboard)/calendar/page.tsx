"use client";

import { useState, useMemo, useEffect } from "react";
import { Calendar as BigCalendar, dateFnsLocalizer, Views } from "react-big-calendar";
import { format, parse, startOfWeek, getDay } from "date-fns";
import "react-big-calendar/lib/css/react-big-calendar.css";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  MapPin,
  Clock,
  User,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { COURT_TYPE_LABELS, formatDate } from "@/lib/utils";
import { toast } from "sonner";
import api from "@/lib/api";

import { enIN } from "date-fns/locale";

const locales = { "en-IN": enIN };
const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek: () => startOfWeek(new Date(), { weekStartsOn: 1 }),
  getDay,
  locales,
});

interface HearingEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  time: string;
  courtName: string;
  courtType: string;
  judgeName: string;
  caseNumber: string;
  notes?: string;
  status: string;
}

const now = new Date();
const MOCK_HEARINGS: HearingEvent[] = [
  {
    id: "mock-1",
    title: "Bail Hearing - State vs. Sharma",
    start: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 10, 30),
    end: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 12, 0),
    time: "10:30 AM",
    courtName: "Delhi High Court",
    courtType: "HIGH_COURT",
    judgeName: "Justice Mehta",
    caseNumber: "CRL/2024/1234",
    status: "SCHEDULED",
  },
  {
    id: "mock-2",
    title: "Arguments - Patel Corp vs. Singh",
    start: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 14, 0),
    end: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 16, 0),
    time: "2:00 PM",
    courtName: "Saket District Court",
    courtType: "DISTRICT_COURT",
    judgeName: "Ms. Judge Kumari",
    caseNumber: "CIV/2024/5678",
    status: "SCHEDULED",
  },
  {
    id: "mock-3",
    title: "Succession Hearing - Mehta Estate",
    start: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 3, 11, 0),
    end: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 3, 13, 0),
    time: "11:00 AM",
    courtName: "Bombay High Court",
    courtType: "HIGH_COURT",
    judgeName: "Justice Patel",
    caseNumber: "CIV/2024/3456",
    status: "SCHEDULED",
  },
  {
    id: "mock-4",
    title: "Check Bounce - NI Act 138",
    start: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 5, 15, 30),
    end: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 5, 17, 0),
    time: "3:30 PM",
    courtName: "Tis Hazari Court",
    courtType: "DISTRICT_COURT",
    judgeName: "Ms. Sharma",
    caseNumber: "NI/2024/7890",
    status: "SCHEDULED",
  },
  {
    id: "mock-5",
    title: "Cross-Examination - Matrimonial",
    start: new Date(now.getFullYear(), now.getMonth(), now.getDate() - 2, 10, 0),
    end: new Date(now.getFullYear(), now.getMonth(), now.getDate() - 2, 12, 0),
    time: "10:00 AM",
    courtName: "Family Court Pune",
    courtType: "TRIBUNAL",
    judgeName: "Mrs. Deshpande",
    caseNumber: "MAT/2024/7890",
    status: "COMPLETED",
  },
  {
    id: "mock-6",
    title: "Filing - Writ Petition",
    start: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 7, 9, 0),
    end: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 7, 10, 0),
    time: "9:00 AM",
    courtName: "Supreme Court of India",
    courtType: "SUPREME_COURT",
    judgeName: "",
    caseNumber: "WPC/2024/5000",
    status: "SCHEDULED",
  },
];

const COURT_EVENT_COLORS: Record<string, string> = {
  HIGH_COURT: "#3b82f6",
  DISTRICT_COURT: "#22c55e",
  SUPREME_COURT: "#9333ea",
  TRIBUNAL: "#f97316",
  SESSIONS_COURT: "#eab308",
  MAGISTRATE_COURT: "#ef4444",
};

function parseTimeTo24(timeStr: string): { hours: number; minutes: number } {
  const match = timeStr.match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
  if (!match) return { hours: 10, minutes: 0 };
  let hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  const ampm = match[3]?.toUpperCase();
  if (ampm === "PM" && hours < 12) hours += 12;
  if (ampm === "AM" && hours === 12) hours = 0;
  return { hours, minutes };
}

function formatTime12(hours: number, minutes: number): string {
  const ampm = hours >= 12 ? "PM" : "AM";
  const h = hours % 12 || 12;
  return `${h}:${String(minutes).padStart(2, "0")} ${ampm}`;
}

export default function CalendarPage() {
  const [events, setEvents] = useState<HearingEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState<HearingEvent | null>(null);
  const [addDialog, setAddDialog] = useState(false);
  const [currentDate, setCurrentDate] = useState(now);
  const [submitting, setSubmitting] = useState(false);
  const [newHearing, setNewHearing] = useState({
    title: "",
    date: "",
    time: "",
    courtName: "",
    courtType: "DISTRICT_COURT",
    judgeName: "",
    caseNumber: "",
    notes: "",
  });

  useEffect(() => {
    fetchHearings();
  }, []);

  async function fetchHearings() {
    try {
      const { data } = await api.get("/hearings");
      const mapped: HearingEvent[] = data.map((h: any) => {
        const d = new Date(h.date);
        const { hours, minutes } = parseTimeTo24(h.time || "10:00");
        const start = new Date(d.getFullYear(), d.getMonth(), d.getDate(), hours, minutes);
        const end = new Date(start.getTime() + 2 * 60 * 60 * 1000);
        return {
          id: h.id,
          title: h.title,
          start,
          end,
          time: h.time || "10:00 AM",
          courtName: h.courtName,
          courtType: h.courtType,
          judgeName: h.judgeName || "",
          caseNumber: h.case?.caseNumber || "",
          notes: h.notes || "",
          status: h.status,
        };
      });
      setEvents(mapped);
    } catch {
      setEvents(MOCK_HEARINGS);
    } finally {
      setLoading(false);
    }
  }

  const calendarEvents = useMemo(
    () =>
      events.map((e) => ({
        ...e,
        title: `${e.title} (${e.courtName})`,
      })),
    [events]
  );

  function eventStyleGetter(event: any) {
    const color = COURT_EVENT_COLORS[event.courtType] || "#6b7280";
    return {
      style: {
        backgroundColor: color,
        borderRadius: "6px",
        opacity: event.status === "COMPLETED" ? 0.6 : 1,
        color: "white",
        border: "none",
        fontSize: "12px",
        padding: "2px 6px",
      },
    };
  }

  async function handleAddHearing() {
    if (!newHearing.title || !newHearing.date) {
      toast.error("Please fill required fields (title and date)");
      return;
    }
    setSubmitting(true);
    try {
      const timeStr = newHearing.time
        ? (() => { const t = parseTimeTo24(newHearing.time); return formatTime12(t.hours, t.minutes); })()
        : "10:00 AM";
      const { data } = await api.post("/hearings", {
        title: newHearing.title,
        date: newHearing.date,
        time: timeStr,
        courtName: newHearing.courtName || "Court TBD",
        courtType: newHearing.courtType,
        judgeName: newHearing.judgeName,
        notes: newHearing.notes,
      });

      const d = new Date(data.date);
      const { hours, minutes } = parseTimeTo24(timeStr);
      const start = new Date(d.getFullYear(), d.getMonth(), d.getDate(), hours, minutes);
      const end = new Date(start.getTime() + 2 * 60 * 60 * 1000);

      const event: HearingEvent = {
        id: data.id,
        title: data.title,
        start,
        end,
        time: timeStr,
        courtName: data.courtName,
        courtType: data.courtType,
        judgeName: data.judgeName || "",
        caseNumber: data.case?.caseNumber || newHearing.caseNumber,
        notes: data.notes || "",
        status: data.status,
      };
      setEvents((prev) => [...prev, event]);
      setAddDialog(false);
      setNewHearing({ title: "", date: "", time: "", courtName: "", courtType: "DISTRICT_COURT", judgeName: "", caseNumber: "", notes: "" });
      toast.success("Hearing scheduled successfully!");
    } catch (err: any) {
      const msg = err.response?.data?.detail || "Failed to schedule hearing";
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Court Calendar</h1>
          <p className="text-muted-foreground">Schedule and track all your court hearings</p>
        </div>
        <Button className="gap-2" onClick={() => setAddDialog(true)}>
          <Plus className="h-4 w-4" /> Schedule Hearing
        </Button>
      </div>

      <div className="flex flex-wrap gap-3">
        {Object.entries(COURT_EVENT_COLORS).map(([type, color]) => (
          <div key={type} className="flex items-center gap-2 text-sm">
            <div className="h-3 w-3 rounded-full" style={{ backgroundColor: color }} />
            <span>{COURT_TYPE_LABELS[type]}</span>
          </div>
        ))}
      </div>

      <Card>
        <CardContent className="p-4">
          <div style={{ height: "600px" }}>
            <BigCalendar
              localizer={localizer}
              events={calendarEvents}
              startAccessor="start"
              endAccessor="end"
              eventPropGetter={eventStyleGetter}
              views={[Views.MONTH, Views.WEEK, Views.DAY]}
              defaultView={Views.MONTH}
              date={currentDate}
              onNavigate={(date) => setCurrentDate(date)}
              onSelectEvent={(event) => setSelectedEvent(event as HearingEvent)}
              popup
            />
          </div>
        </CardContent>
      </Card>

      <Dialog open={!!selectedEvent} onOpenChange={() => setSelectedEvent(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{selectedEvent?.title}</DialogTitle>
            <DialogDescription>Hearing Details</DialogDescription>
          </DialogHeader>
          {selectedEvent && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span>{formatDate(selectedEvent.start)} at {selectedEvent.time}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <span>{selectedEvent.courtName}</span>
              </div>
              {selectedEvent.judgeName && (
                <div className="flex items-center gap-2 text-sm">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span>{selectedEvent.judgeName}</span>
                </div>
              )}
              <p className="text-sm text-muted-foreground">Case: {selectedEvent.caseNumber}</p>
              {selectedEvent.notes && (
                <p className="text-sm text-muted-foreground italic">{selectedEvent.notes}</p>
              )}
              <Badge>{selectedEvent.status}</Badge>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedEvent(null)}>Close</Button>
            {selectedEvent?.status === "SCHEDULED" && (
              <Button variant="destructive" onClick={() => {
                setEvents((prev) => prev.map((e) => e.id === selectedEvent.id ? { ...e, status: "POSTPONED" } : e));
                setSelectedEvent(null);
                toast.success("Hearing postponed");
              }}>Postpone</Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={addDialog} onOpenChange={setAddDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Schedule New Hearing</DialogTitle>
            <DialogDescription>Add a court hearing to your calendar</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Hearing Title *</Label>
              <Input placeholder="e.g., Bail Hearing - State vs. Sharma" value={newHearing.title} onChange={(e) => setNewHearing((p) => ({ ...p, title: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Date *</Label>
                <Input type="date" value={newHearing.date} onChange={(e) => setNewHearing((p) => ({ ...p, date: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Time</Label>
                <Input type="time" value={newHearing.time} onChange={(e) => setNewHearing((p) => ({ ...p, time: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Court Type</Label>
                <Select value={newHearing.courtType} onValueChange={(v) => setNewHearing((p) => ({ ...p, courtType: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="SUPREME_COURT">Supreme Court</SelectItem>
                    <SelectItem value="HIGH_COURT">High Court</SelectItem>
                    <SelectItem value="DISTRICT_COURT">District Court</SelectItem>
                    <SelectItem value="SESSIONS_COURT">Sessions Court</SelectItem>
                    <SelectItem value="MAGISTRATE_COURT">Magistrate Court</SelectItem>
                    <SelectItem value="TRIBUNAL">Tribunal</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Court Name</Label>
                <Input placeholder="e.g., Delhi High Court" value={newHearing.courtName} onChange={(e) => setNewHearing((p) => ({ ...p, courtName: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Judge Name</Label>
                <Input placeholder="e.g., Justice Mehta" value={newHearing.judgeName} onChange={(e) => setNewHearing((p) => ({ ...p, judgeName: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Case Number</Label>
                <Input placeholder="e.g., CRL/2024/1234" value={newHearing.caseNumber} onChange={(e) => setNewHearing((p) => ({ ...p, caseNumber: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea placeholder="Any additional notes..." value={newHearing.notes} onChange={(e) => setNewHearing((p) => ({ ...p, notes: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddDialog(false)} disabled={submitting}>Cancel</Button>
            <Button onClick={handleAddHearing} disabled={submitting}>
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Schedule
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
