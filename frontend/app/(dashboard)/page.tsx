"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  FolderOpen,
  Calendar,
  FileStack,
  Bot,
  TrendingUp,
  Clock,
  AlertCircle,
  ArrowRight,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { STAGE_LABELS, COURT_TYPE_LABELS, formatDate } from "@/lib/utils";
import api from "@/lib/api";

interface DashboardData {
  totalCases: number;
  activeCases: number;
  todayHearings: any[];
  recentCases: any[];
  upcomingHearings: any[];
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData>({
    totalCases: 0,
    activeCases: 0,
    todayHearings: [],
    recentCases: [],
    upcomingHearings: [],
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const { data: stats } = await api.get("/dashboard/stats");
        setData(stats);
      } catch {
        setData({
          totalCases: 24,
          activeCases: 18,
          todayHearings: [
            {
              id: "1",
              title: "State vs. Sharma - Bail Hearing",
              date: new Date().toISOString(),
              time: "10:30 AM",
              courtName: "Delhi High Court",
              courtType: "HIGH_COURT",
              judgeName: "Hon'ble Justice Mehta",
              status: "SCHEDULED",
              case: { caseNumber: "CRL/2024/1234", title: "State vs. Sharma" },
            },
            {
              id: "2",
              title: "Patel Corp vs. Singh Ltd - Arguments",
              date: new Date().toISOString(),
              time: "2:00 PM",
              courtName: "Saket District Court",
              courtType: "DISTRICT_COURT",
              judgeName: "Ms. Judge Kumari",
              status: "SCHEDULED",
              case: { caseNumber: "CIV/2024/5678", title: "Patel Corp vs. Singh Ltd" },
            },
          ],
          recentCases: [
            {
              id: "1",
              caseNumber: "CRL/2024/1234",
              title: "State vs. Sharma",
              courtName: "Delhi High Court",
              stage: "BAIL",
              status: "ACTIVE",
            },
            {
              id: "2",
              caseNumber: "CIV/2024/5678",
              title: "Patel Corp vs. Singh Ltd",
              courtName: "Saket District Court",
              stage: "ARGUMENTS",
              status: "ACTIVE",
            },
            {
              id: "3",
              caseNumber: "NI/2024/9012",
              title: "HDFC Bank vs. Ravi Kumar",
              courtName: "Sessions Court Mumbai",
              stage: "TRIAL",
              status: "ACTIVE",
            },
          ],
          upcomingHearings: [
            {
              id: "3",
              title: "Mehta Estate - Succession",
              date: new Date(Date.now() + 86400000).toISOString(),
              time: "11:00 AM",
              courtName: "Bombay High Court",
              courtType: "HIGH_COURT",
              status: "SCHEDULED",
              case: { caseNumber: "CIV/2024/3456" },
            },
            {
              id: "4",
              title: "Check Bounce - NI Act 138",
              date: new Date(Date.now() + 2 * 86400000).toISOString(),
              time: "3:30 PM",
              courtName: "Tis Hazari Court",
              courtType: "DISTRICT_COURT",
              status: "SCHEDULED",
              case: { caseNumber: "NI/2024/7890" },
            },
          ],
        });
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const stats = [
    {
      title: "Total Cases",
      value: data.totalCases,
      icon: FolderOpen,
      color: "text-blue-600",
      bg: "bg-blue-50",
    },
    {
      title: "Active Cases",
      value: data.activeCases,
      icon: TrendingUp,
      color: "text-emerald-600",
      bg: "bg-emerald-50",
    },
    {
      title: "Today's Hearings",
      value: data.todayHearings.length,
      icon: Clock,
      color: "text-amber-600",
      bg: "bg-amber-50",
    },
    {
      title: "AI Assistant",
      value: "Ready",
      icon: Bot,
      color: "text-purple-600",
      bg: "bg-purple-50",
    },
  ];

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">Welcome back, Advocate. Here is your case overview.</p>
        </div>
        <Link href="/cases/new">
          <Button>+ New Case</Button>
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.title}>
            <CardContent className="flex items-center gap-4 p-6">
              <div className={`rounded-lg p-3 ${stat.bg}`}>
                <stat.icon className={`h-6 w-6 ${stat.color}`} />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{stat.title}</p>
                <p className="text-2xl font-bold">{stat.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg">Today&apos;s Hearings</CardTitle>
            <Link href="/calendar">
              <Button variant="ghost" size="sm">
                View Calendar <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {data.todayHearings.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                <Calendar className="mb-2 h-10 w-10 opacity-40" />
                <p>No hearings scheduled for today</p>
              </div>
            ) : (
              <div className="space-y-3">
                {data.todayHearings.map((hearing: any) => (
                  <div
                    key={hearing.id}
                    className="flex items-center justify-between rounded-lg border p-4"
                  >
                    <div className="space-y-1">
                      <p className="font-medium">{hearing.title}</p>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <span>{hearing.time}</span>
                        <span>·</span>
                        <span>{hearing.courtName}</span>
                        <span>·</span>
                        <span>{hearing.judgeName}</span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {hearing.case?.caseNumber}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={COURT_TYPE_COLORS_MAP[hearing.courtType] || ""}>
                        {COURT_TYPE_LABELS[hearing.courtType] || hearing.courtType}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg">Recent Cases</CardTitle>
            <Link href="/cases">
              <Button variant="ghost" size="sm">
                View All <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {data.recentCases.map((c: any) => (
                <Link
                  key={c.id}
                  href={`/cases/${c.id}`}
                  className="flex items-center justify-between rounded-lg border p-3 transition-colors hover:bg-accent"
                >
                  <div className="space-y-1">
                    <p className="text-sm font-medium">{c.title}</p>
                    <p className="text-xs text-muted-foreground">{c.caseNumber}</p>
                  </div>
                  <Badge variant={c.status === "ACTIVE" ? "default" : "secondary"}>
                    {STAGE_LABELS[c.stage] || c.stage}
                  </Badge>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg">Upcoming Hearings</CardTitle>
            <Link href="/calendar">
            <Button variant="ghost" size="sm">
              View Calendar <ArrowRight className="ml-1 h-4 w-4" />
            </Button>
          </Link>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2">
            {data.upcomingHearings.map((h: any) => (
              <div key={h.id} className="rounded-lg border p-4">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <p className="font-medium">{h.title}</p>
                    <p className="text-sm text-muted-foreground">
                      {formatDate(h.date)} at {h.time}
                    </p>
                    <p className="text-xs text-muted-foreground">{h.courtName}</p>
                  </div>
                  <Badge className={COURT_TYPE_COLORS_MAP[h.courtType] || ""}>
                    {COURT_TYPE_LABELS[h.courtType] || h.courtType}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

const COURT_TYPE_COLORS_MAP: Record<string, string> = {
  HIGH_COURT: "bg-blue-100 text-blue-800 hover:bg-blue-100",
  DISTRICT_COURT: "bg-green-100 text-green-800 hover:bg-green-100",
  SUPREME_COURT: "bg-purple-100 text-purple-800 hover:bg-purple-100",
  TRIBUNAL: "bg-orange-100 text-orange-800 hover:bg-orange-100",
  SESSIONS_COURT: "bg-yellow-100 text-yellow-800 hover:bg-yellow-100",
  MAGISTRATE_COURT: "bg-red-100 text-red-800 hover:bg-red-100",
};
