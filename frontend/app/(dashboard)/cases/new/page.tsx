"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Loader2,
  Save,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import api from "@/lib/api";
import Link from "next/link";

export default function NewCasePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    caseNumber: "",
    title: "",
    clientName: "",
    clientPhone: "",
    clientEmail: "",
    courtName: "",
    courtType: "DISTRICT_COURT",
    judgeName: "",
    opposingCounsel: "",
    stage: "FIR_STAGE",
    description: "",
    filingDate: "",
  });

  function updateField(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post("/cases", form);
      toast.success("Case created successfully!");
      router.push("/cases");
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Failed to create case");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/cases">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">New Case</h1>
          <p className="text-muted-foreground">Register a new legal case</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Case Details</CardTitle>
            <CardDescription>Basic information about the case</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="caseNumber">Case Number *</Label>
                <Input
                  id="caseNumber"
                  placeholder="e.g., CRL/2024/1234"
                  value={form.caseNumber}
                  onChange={(e) => updateField("caseNumber", e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="title">Case Title *</Label>
                <Input
                  id="title"
                  placeholder="e.g., State vs. Sharma"
                  value={form.title}
                  onChange={(e) => updateField("title", e.target.value)}
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Case Description</Label>
              <Textarea
                id="description"
                placeholder="Brief description of the case..."
                rows={3}
                value={form.description}
                onChange={(e) => updateField("description", e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Court Information</CardTitle>
            <CardDescription>Court and judge details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Court Type *</Label>
                <Select value={form.courtType} onValueChange={(v) => updateField("courtType", v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
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
                <Label htmlFor="courtName">Court Name *</Label>
                <Input
                  id="courtName"
                  placeholder="e.g., Delhi High Court"
                  value={form.courtName}
                  onChange={(e) => updateField("courtName", e.target.value)}
                  required
                />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="judgeName">Judge Name</Label>
                <Input
                  id="judgeName"
                  placeholder="e.g., Hon'ble Justice Mehta"
                  value={form.judgeName}
                  onChange={(e) => updateField("judgeName", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="opposingCounsel">Opposing Counsel</Label>
                <Input
                  id="opposingCounsel"
                  placeholder="e.g., Advocate Sharma"
                  value={form.opposingCounsel}
                  onChange={(e) => updateField("opposingCounsel", e.target.value)}
                />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Case Stage *</Label>
                <Select value={form.stage} onValueChange={(v) => updateField("stage", v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="FIR_STAGE">FIR Stage</SelectItem>
                    <SelectItem value="INVESTIGATION">Investigation</SelectItem>
                    <SelectItem value="CHARGE_SHEET">Charge Sheet</SelectItem>
                    <SelectItem value="TRIAL">Trial</SelectItem>
                    <SelectItem value="ARGUMENTS">Arguments</SelectItem>
                    <SelectItem value="CROSS_EXAMINATION">Cross-Examination</SelectItem>
                    <SelectItem value="JUDGMENT">Judgment</SelectItem>
                    <SelectItem value="BAIL">Bail</SelectItem>
                    <SelectItem value="APPEAL">Appeal</SelectItem>
                    <SelectItem value="MISC">Miscellaneous</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="filingDate">Filing Date</Label>
                <Input
                  id="filingDate"
                  type="date"
                  value={form.filingDate}
                  onChange={(e) => updateField("filingDate", e.target.value)}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Client Information</CardTitle>
            <CardDescription>Details about the client</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="clientName">Client Name *</Label>
                <Input
                  id="clientName"
                  placeholder="Full name"
                  value={form.clientName}
                  onChange={(e) => updateField("clientName", e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="clientPhone">Phone</Label>
                <Input
                  id="clientPhone"
                  placeholder="+91 XXXXX XXXXX"
                  value={form.clientPhone}
                  onChange={(e) => updateField("clientPhone", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="clientEmail">Email</Label>
                <Input
                  id="clientEmail"
                  type="email"
                  placeholder="client@email.com"
                  value={form.clientEmail}
                  onChange={(e) => updateField("clientEmail", e.target.value)}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-3">
          <Link href="/cases">
            <Button variant="outline" type="button">Cancel</Button>
          </Link>
          <Button type="submit" disabled={loading}>
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Create Case
          </Button>
        </div>
      </form>
    </div>
  );
}
