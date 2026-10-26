"use client";

import { useState, useRef, useEffect } from "react";
import {
  Upload,
  FileText,
  Film,
  Music,
  Image,
  Tag,
  Search,
  Download,
  Eye,
  Loader2,
  Trash2,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatDate } from "@/lib/utils";
import { toast } from "sonner";
import api from "@/lib/api";
import type { Case, Evidence } from "@/types";

type EvidenceItem = Evidence;
type CaseOption = Pick<Case, "id" | "caseNumber" | "title">;

const TYPE_ICONS: Record<string, any> = {
  PDF: FileText,
  VIDEO: Film,
  AUDIO: Music,
  IMAGE: Image,
  DOCUMENT: FileText,
};

const TYPE_COLORS: Record<string, string> = {
  PDF: "bg-red-50 text-red-600",
  VIDEO: "bg-purple-50 text-purple-600",
  AUDIO: "bg-blue-50 text-blue-600",
  IMAGE: "bg-emerald-50 text-emerald-600",
  DOCUMENT: "bg-amber-50 text-amber-600",
};

const MAX_UPLOAD_BYTES = 25 * 1024 * 1024;

function formatFileSize(bytes: number) {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1048576) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / 1048576).toFixed(1) + " MB";
}

export default function EvidencePage() {
  const [evidence, setEvidence] = useState<EvidenceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [uploadDialog, setUploadDialog] = useState(false);
  const [uploadForm, setUploadForm] = useState({ tag: "", description: "", caseId: "" });
  const fileRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [previewItem, setPreviewItem] = useState<EvidenceItem | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [cases, setCases] = useState<CaseOption[]>([]);

  useEffect(() => {
    fetchEvidence();
    api
      .get("/cases")
      .then(({ data }) => {
        setCases(data);
        // /evidence?caseId=... (linked from a case page) preselects the case
        const wanted = new URLSearchParams(window.location.search).get("caseId");
        if (wanted && data.some((c: CaseOption) => c.id === wanted)) {
          setUploadForm((p) => ({ ...p, caseId: wanted }));
        }
      })
      .catch((err) => {
        console.error("Failed to load cases", err);
        toast.error("Could not load your cases for the upload form.");
      });
  }, []);

  // Free the blob URL whenever the preview changes or closes.
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  async function fetchEvidence() {
    try {
      const { data } = await api.get("/evidence");
      setEvidence(data);
      setError(null);
    } catch (err) {
      console.error("Failed to load evidence", err);
      setError("Unable to load evidence. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) setSelectedFile(file);
  }

  async function handleUpload() {
    if (!uploadForm.caseId) {
      toast.error("Please select a case");
      return;
    }
    if (!selectedFile) {
      toast.error("Please select a file");
      return;
    }
    if (selectedFile.size > MAX_UPLOAD_BYTES) {
      toast.error("File is too large (max 25 MB)");
      return;
    }
    setUploading(true);
    try {
      const body = new FormData();
      body.append("file", selectedFile);
      body.append("caseId", uploadForm.caseId);
      if (uploadForm.tag) body.append("tag", uploadForm.tag);
      if (uploadForm.description) body.append("description", uploadForm.description);
      await api.post("/evidence", body);

      toast.success("Evidence uploaded successfully");
      setUploadDialog(false);
      setSelectedFile(null);
      setUploadForm((p) => ({ ...p, tag: "", description: "" }));
      fetchEvidence();
    } catch (err: any) {
      console.error("Upload failed", err);
      toast.error(err.response?.data?.detail || "Upload failed. Please try again.");
    } finally {
      setUploading(false);
    }
  }

  async function fetchBlob(item: EvidenceItem, download: boolean): Promise<Blob> {
    const { data } = await api.get(`/evidence/${item.id}/file${download ? "?download=1" : ""}`, {
      responseType: "blob",
    });
    return data as Blob;
  }

  async function handleDownload(item: EvidenceItem) {
    try {
      const url = URL.createObjectURL(await fetchBlob(item, true));
      const link = document.createElement("a");
      link.href = url;
      link.download = item.fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(url), 10000);
    } catch (err) {
      console.error("Download failed", err);
      toast.error("Could not download this file.");
    }
  }

  async function handlePreview(item: EvidenceItem) {
    setPreviewItem(item);
    setPreviewUrl(null);
    setPreviewLoading(true);
    try {
      setPreviewUrl(URL.createObjectURL(await fetchBlob(item, false)));
    } catch (err) {
      console.error("Preview failed", err);
      toast.error("Could not load this file for preview.");
      setPreviewItem(null);
    } finally {
      setPreviewLoading(false);
    }
  }

  function closePreview() {
    setPreviewItem(null);
    setPreviewUrl(null);
  }

  async function handleDelete(item: EvidenceItem) {
    if (!window.confirm(`Delete "${item.fileName}"? The file will be permanently removed.`)) return;
    try {
      await api.delete(`/evidence/${item.id}`);
      toast.success("Evidence deleted");
      setEvidence((prev) => prev.filter((e) => e.id !== item.id));
    } catch (err: any) {
      console.error("Delete failed", err);
      toast.error(err.response?.data?.detail || "Failed to delete evidence");
    }
  }

  function getPreviewContent(item: EvidenceItem) {
    if (previewLoading || !previewUrl) {
      return (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      );
    }
    if (item.evidenceType === "IMAGE") {
      // eslint-disable-next-line @next/next/no-img-element
      return <img src={previewUrl} alt={item.fileName} className="max-h-[60vh] mx-auto rounded-lg" />;
    }
    if (item.evidenceType === "VIDEO") {
      return (
        <video controls className="max-h-[60vh] mx-auto rounded-lg" src={previewUrl}>
          Your browser does not support video playback.
        </video>
      );
    }
    if (item.evidenceType === "AUDIO") {
      return (
        <div className="flex flex-col items-center gap-4 py-8">
          <Music className="h-16 w-16 text-blue-500" />
          <audio controls src={previewUrl} className="w-full max-w-md">
            Your browser does not support audio playback.
          </audio>
          <p className="text-sm text-muted-foreground">{item.fileName}</p>
        </div>
      );
    }
    if (item.evidenceType === "PDF") {
      return <iframe src={previewUrl} className="w-full h-[60vh] rounded-lg border" title={item.fileName} />;
    }

    return (
      <div className="flex flex-col items-center gap-4 py-8">
        <FileText className="h-16 w-16 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Preview not available for this file type.</p>
        <Button onClick={() => handleDownload(item)} className="gap-2">
          <Download className="h-4 w-4" /> Download to view
        </Button>
      </div>
    );
  }

  const filtered = evidence.filter((e) => {
    const q = search.toLowerCase();
    const matchSearch =
      e.fileName.toLowerCase().includes(q) ||
      (e.tag || "").toLowerCase().includes(q) ||
      (e.case?.caseNumber || "").toLowerCase().includes(q);
    const matchType = typeFilter === "ALL" || e.evidenceType === typeFilter;
    return matchSearch && matchType;
  });

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-4 py-16 text-center">
          <p className="text-sm text-muted-foreground">{error}</p>
          <Button onClick={fetchEvidence}>Retry</Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Evidence Vault</h1>
          <p className="text-muted-foreground">Manage digital evidence for all your cases</p>
        </div>
        <Button className="gap-2" onClick={() => setUploadDialog(true)}>
          <Upload className="h-4 w-4" /> Upload Evidence
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-4">
        {[
          { label: "Total Files", value: evidence.length, icon: FileText, color: "text-blue-600" },
          { label: "PDFs", value: evidence.filter((e) => e.evidenceType === "PDF").length, icon: FileText, color: "text-red-600" },
          { label: "Videos", value: evidence.filter((e) => e.evidenceType === "VIDEO").length, icon: Film, color: "text-purple-600" },
          { label: "Audio", value: evidence.filter((e) => e.evidenceType === "AUDIO").length, icon: Music, color: "text-blue-500" },
        ].map((s) => (
          <Card key={s.label}>
            <CardContent className="flex items-center gap-3 p-4">
              <s.icon className={`h-5 w-5 ${s.color}`} />
              <div>
                <p className="text-xs text-muted-foreground">{s.label}</p>
                <p className="text-xl font-bold">{s.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search evidence..." className="pl-10" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div className="flex gap-2">
          {["ALL", "PDF", "VIDEO", "AUDIO", "IMAGE"].map((t) => (
            <Button key={t} variant={typeFilter === t ? "default" : "outline"} size="sm" onClick={() => setTypeFilter(t)}>
              {t}
            </Button>
          ))}
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((ev) => {
          const Icon = TYPE_ICONS[ev.evidenceType] || FileText;
          return (
            <Card key={ev.id} className="transition-shadow hover:shadow-md">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className={`rounded-lg p-3 ${TYPE_COLORS[ev.evidenceType] || "bg-slate-50 text-slate-600"}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="flex-1 space-y-1 min-w-0">
                    <p className="truncate text-sm font-medium">{ev.fileName}</p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>{formatFileSize(ev.fileSize)}</span>
                      <span>·</span>
                      <span>{formatDate(ev.uploadedAt)}</span>
                    </div>
                    {ev.tag && (
                      <Badge variant="secondary" className="mt-1 text-xs">
                        <Tag className="mr-1 h-3 w-3" />{ev.tag}
                      </Badge>
                    )}
                    <p className="text-xs text-muted-foreground">{ev.case?.caseNumber || "N/A"} - {ev.case?.title || ""}</p>
                  </div>
                  <div className="flex flex-col gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => handlePreview(ev)}
                      title="Preview"
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => handleDownload(ev)}
                      title="Download"
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive"
                      onClick={() => handleDelete(ev)}
                      title="Delete"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
        {filtered.length === 0 && (
          <div className="col-span-full text-center py-12 text-muted-foreground">
            No evidence files found.
          </div>
        )}
      </div>

      <Dialog open={!!previewItem} onOpenChange={(open) => { if (!open) closePreview(); }}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{previewItem?.fileName}</DialogTitle>
            <DialogDescription>
              {previewItem?.tag && `${previewItem.tag} · `}{previewItem?.evidenceType}
            </DialogDescription>
          </DialogHeader>
          <div className="min-h-[200px]">
            {previewItem && getPreviewContent(previewItem)}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closePreview}>
              <X className="mr-2 h-4 w-4" /> Close
            </Button>
            {previewItem && (
              <Button onClick={() => handleDownload(previewItem)} className="gap-2">
                <Download className="h-4 w-4" /> Download
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={uploadDialog} onOpenChange={setUploadDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upload Evidence</DialogTitle>
            <DialogDescription>Attach digital evidence to a case</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Case *</Label>
              <Select value={uploadForm.caseId} onValueChange={(v) => setUploadForm((p) => ({ ...p, caseId: v }))}>
                <SelectTrigger><SelectValue placeholder={cases.length ? "Select a case" : "No cases yet - create a case first"} /></SelectTrigger>
                <SelectContent>
                  {cases.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.caseNumber} - {c.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>File *</Label>
              <input ref={fileRef} type="file" className="hidden" onChange={handleFileSelect} accept=".pdf,.mp3,.wav,.m4a,.ogg,.mp4,.mov,.jpg,.jpeg,.png,.gif,.webp,.doc,.docx" />
              <Button variant="outline" className="w-full" onClick={() => fileRef.current?.click()}>
                {selectedFile ? selectedFile.name : "Choose file (PDF, Audio, Video, Image, Word - max 25 MB)"}
              </Button>
              {selectedFile && (
                <p className="text-xs text-muted-foreground">{formatFileSize(selectedFile.size)}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label>Evidence Tag</Label>
              <Input placeholder="e.g., Exhibit A, Witness Statement" value={uploadForm.tag} onChange={(e) => setUploadForm((p) => ({ ...p, tag: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea placeholder="Brief description..." value={uploadForm.description} onChange={(e) => setUploadForm((p) => ({ ...p, description: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUploadDialog(false)} disabled={uploading}>Cancel</Button>
            <Button onClick={handleUpload} disabled={uploading}>
              {uploading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Upload
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
