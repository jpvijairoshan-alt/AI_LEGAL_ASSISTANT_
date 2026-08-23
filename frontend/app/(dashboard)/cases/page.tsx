"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Plus,
  Search,
  Filter,
  MoreHorizontal,
  Eye,
  Edit,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { STAGE_LABELS, STATUS_COLORS, formatDate } from "@/lib/utils";
import api from "@/lib/api";
import { toast } from "sonner";

interface Case {
  id: string;
  caseNumber: string;
  title: string;
  clientName: string;
  courtName: string;
  stage: string;
  status: string;
  nextHearingDate?: string;
  createdAt: string;
}

export default function CasesPage() {
  const [cases, setCases] = useState<Case[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  useEffect(() => {
    fetchCases();
  }, []);

  async function fetchCases() {
    try {
      const { data } = await api.get("/cases");
      setCases(data);
    } catch {
      setCases([
        {
          id: "1",
          caseNumber: "CRL/2024/1234",
          title: "State vs. Sharma",
          clientName: "Rajesh Sharma",
          courtName: "Delhi High Court",
          stage: "BAIL",
          status: "ACTIVE",
          nextHearingDate: new Date(Date.now() + 86400000).toISOString(),
          createdAt: "2024-01-15T00:00:00Z",
        },
        {
          id: "2",
          caseNumber: "CIV/2024/5678",
          title: "Patel Corp vs. Singh Ltd",
          clientName: "Patel Corporation",
          courtName: "Saket District Court",
          stage: "ARGUMENTS",
          status: "ACTIVE",
          nextHearingDate: new Date(Date.now() + 2 * 86400000).toISOString(),
          createdAt: "2024-02-20T00:00:00Z",
        },
        {
          id: "3",
          caseNumber: "NI/2024/9012",
          title: "HDFC Bank vs. Ravi Kumar",
          clientName: "HDFC Bank Ltd",
          courtName: "Sessions Court Mumbai",
          stage: "TRIAL",
          status: "ACTIVE",
          createdAt: "2024-03-10T00:00:00Z",
        },
        {
          id: "4",
          caseNumber: "WPC/2024/3456",
          title: "Rahul Verma v. State of UP",
          clientName: "Rahul Verma",
          courtName: "Allahabad High Court",
          stage: "JUDGMENT",
          status: "DISPOSED",
          createdAt: "2023-11-05T00:00:00Z",
        },
        {
          id: "5",
          caseNumber: "MAT/2024/7890",
          title: "Anita vs. Vikram Divorce",
          clientName: "Anita Desai",
          courtName: "Family Court Pune",
          stage: "CROSS_EXAMINATION",
          status: "ACTIVE",
          nextHearingDate: new Date(Date.now() + 5 * 86400000).toISOString(),
          createdAt: "2024-04-01T00:00:00Z",
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  async function deleteCase(id: string) {
    if (!confirm("Are you sure you want to delete this case?")) return;
    try {
      await api.delete(`/cases/${id}`);
      setCases((prev) => prev.filter((c) => c.id !== id));
      toast.success("Case deleted");
    } catch {
      toast.error("Failed to delete case");
    }
  }

  const filtered = cases.filter((c) => {
    const matchSearch =
      c.title.toLowerCase().includes(search.toLowerCase()) ||
      c.caseNumber.toLowerCase().includes(search.toLowerCase()) ||
      c.clientName.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || c.status === statusFilter;
    return matchSearch && matchStatus;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Cases</h1>
          <p className="text-muted-foreground">Manage all your legal cases</p>
        </div>
        <Link href="/cases/new">
          <Button className="gap-2">
            <Plus className="h-4 w-4" /> New Case
          </Button>
        </Link>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search cases..."
            className="pl-10"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[160px]">
            <Filter className="mr-2 h-4 w-4" />
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="ACTIVE">Active</SelectItem>
            <SelectItem value="DISPOSED">Disposed</SelectItem>
            <SelectItem value="PENDING">Pending</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-muted-foreground">No cases found</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {filtered.map((c) => (
            <Card key={c.id} className="transition-shadow hover:shadow-md">
              <CardContent className="flex items-center justify-between p-5">
                <div className="space-y-1">
                  <div className="flex items-center gap-3">
                    <Link
                      href={`/cases/${c.id}`}
                      className="text-lg font-semibold hover:underline"
                    >
                      {c.title}
                    </Link>
                    <Badge variant={c.status === "ACTIVE" ? "default" : "secondary"}>
                      {c.status}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span className="font-mono text-xs">{c.caseNumber}</span>
                    <span>{c.courtName}</span>
                    <span>Client: {c.clientName}</span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <Badge variant="outline">
                      {STAGE_LABELS[c.stage] || c.stage}
                    </Badge>
                    {c.nextHearingDate && (
                      <span>Next hearing: {formatDate(c.nextHearingDate)}</span>
                    )}
                    <span>Filed: {formatDate(c.createdAt)}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Link href={`/cases/${c.id}`}>
                    <Button variant="ghost" size="icon">
                      <Eye className="h-4 w-4" />
                    </Button>
                  </Link>
                  <Link href={`/cases/${c.id}?edit=true`}>
                    <Button variant="ghost" size="icon">
                      <Edit className="h-4 w-4" />
                    </Button>
                  </Link>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => deleteCase(c.id)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
