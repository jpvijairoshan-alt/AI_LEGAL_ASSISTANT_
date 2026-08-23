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
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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

interface EvidenceItem {
  id: string;
  fileName: string;
  fileUrl?: string;
  fileSize: number;
  mimeType?: string;
  evidenceType: string;
  tag?: string;
  description?: string;
  uploadedAt: string;
  caseTitle?: string;
  caseNumber?: string;
  case?: { caseNumber: string; title: string };
}

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

function formatFileSize(bytes: number) {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1048576) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / 1048576).toFixed(1) + " MB";
}

const MOCK_EVIDENCE: EvidenceItem[] = [
  { id: "mock-1", fileName: "witness_statement_ram.pdf", fileSize: 245000, evidenceType: "PDF", tag: "Witness Statement", description: "Statement of Ram Prasad, eye witness", uploadedAt: "2024-07-01T00:00:00Z", caseTitle: "State vs. Sharma", caseNumber: "CRL/2024/1234" },
  { id: "mock-2", fileName: "cctv_footage_main_road.mp4", fileSize: 15728640, evidenceType: "VIDEO", tag: "CCTV Footage", description: "CCTV from main road junction near scene of crime", uploadedAt: "2024-07-05T00:00:00Z", caseTitle: "State vs. Sharma", caseNumber: "CRL/2024/1234" },
  { id: "mock-3", fileName: "audio_recording_call.mp3", fileSize: 3145728, evidenceType: "AUDIO", tag: "Phone Call Recording", uploadedAt: "2024-07-08T00:00:00Z", caseTitle: "HDFC Bank vs. Ravi Kumar", caseNumber: "NI/2024/9012" },
  { id: "mock-4", fileName: "contract_agreement.pdf", fileSize: 524288, evidenceType: "PDF", tag: "Exhibit A", description: "Original loan agreement dated 01/01/2023", uploadedAt: "2024-06-20T00:00:00Z", caseTitle: "HDFC Bank vs. Ravi Kumar", caseNumber: "NI/2024/9012" },
  { id: "mock-5", fileName: "medical_report_victim.jpg", fileSize: 1048576, evidenceType: "IMAGE", tag: "Medical Report", uploadedAt: "2024-07-08T00:00:00Z", caseTitle: "State vs. Sharma", caseNumber: "CRL/2024/1234" },
  { id: "mock-6", fileName: "property_deed.pdf", fileSize: 786432, evidenceType: "PDF", tag: "Exhibit B", uploadedAt: "2024-06-25T00:00:00Z", caseTitle: "Patel Corp vs. Singh Ltd", caseNumber: "CIV/2024/5678" },
];

export default function EvidencePage() {
  const [evidence, setEvidence] = useState<EvidenceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [uploadDialog, setUploadDialog] = useState(false);
  const [uploadForm, setUploadForm] = useState({ tag: "", description: "", caseId: "" });
  const fileRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [previewItem, setPreviewItem] = useState<EvidenceItem | null>(null);

  useEffect(() => {
    fetchEvidence();
  }, []);

  async function fetchEvidence() {
    try {
      const { data } = await api.get("/evidence");
      const mapped = data.map((e: any) => ({
        id: e.id,
        fileName: e.fileName,
        fileUrl: e.fileUrl,
        fileSize: e.fileSize,
        mimeType: e.mimeType,
        evidenceType: e.evidenceType,
        tag: e.tag,
        description: e.description,
        uploadedAt: e.uploadedAt,
        caseTitle: e.case?.title,
        caseNumber: e.case?.caseNumber,
      }));
      setEvidence(mapped);
    } catch {
      setEvidence(MOCK_EVIDENCE);
    } finally {
      setLoading(false);
    }
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) setSelectedFile(file);
  }

  async function handleUpload() {
    if (!selectedFile) {
      toast.error("Please select a file");
      return;
    }
    setUploading(true);
    try {
      const ext = selectedFile.name.split(".").pop()?.toUpperCase() || "DOCUMENT";
      const typeMap: Record<string, string> = {
        PDF: "PDF", MP3: "AUDIO", WAV: "AUDIO", M4A: "AUDIO", OGG: "AUDIO",
        MP4: "VIDEO", MOV: "VIDEO", AVI: "VIDEO", MKV: "VIDEO",
        JPG: "IMAGE", JPEG: "IMAGE", PNG: "IMAGE", GIF: "IMAGE", WEBP: "IMAGE",
      };
      const evidenceType = typeMap[ext] || "DOCUMENT";

      const reader = new FileReader();
      const fileDataUrl = await new Promise<string>((resolve, reject) => {
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(selectedFile);
      });

      await api.post("/evidence", {
        fileName: selectedFile.name,
        fileUrl: fileDataUrl,
        fileSize: selectedFile.size,
        mimeType: selectedFile.type || "application/octet-stream",
        evidenceType,
        tag: uploadForm.tag || undefined,
        description: uploadForm.description || undefined,
        caseId: uploadForm.caseId || undefined,
      });

      toast.success("Evidence uploaded successfully");
      setUploadDialog(false);
      setSelectedFile(null);
      setUploadForm({ tag: "", description: "", caseId: "" });
      fetchEvidence();
    } catch (err: any) {
      const msg = err.response?.data?.detail || "Upload failed. The evidence was saved locally.";
      toast.error(msg);
    } finally {
      setUploading(false);
    }
  }

  function handleDownload(item: EvidenceItem) {
    if (!item.fileUrl) {
      toast.info("This file does not have a downloadable source (mock data).");
      return;
    }
    if (item.fileUrl.startsWith("data:")) {
      const link = document.createElement("a");
      link.href = item.fileUrl;
      link.download = item.fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      const link = document.createElement("a");
      link.href = item.fileUrl;
      link.download = item.fileName;
      link.target = "_blank";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
    toast.success(`Downloading ${item.fileName}`);
  }

  function handlePreview(item: EvidenceItem) {
    if (!item.fileUrl) {
      toast.info("Preview not available for demo data.");
      return;
    }
    setPreviewItem(item);
  }

  function getPreviewContent(item: EvidenceItem) {
    if (!item.fileUrl) return null;

    const isImage = item.evidenceType === "IMAGE" || item.mimeType?.startsWith("image/");
    const isVideo = item.evidenceType === "VIDEO" || item.mimeType?.startsWith("video/");
    const isAudio = item.evidenceType === "AUDIO" || item.mimeType?.startsWith("audio/");
    const isPdf = item.evidenceType === "PDF" || item.mimeType?.includes("pdf");

    if (isImage && item.fileUrl) {
      return <img src={item.fileUrl} alt={item.fileName} className="max-h-[60vh] mx-auto rounded-lg" />;
    }
    if (isVideo && item.fileUrl) {
      return (
        <video controls className="max-h-[60vh] mx-auto rounded-lg" src={item.fileUrl}>
          Your browser does not support video playback.
        </video>
      );
    }
    if (isAudio && item.fileUrl) {
      return (
        <div className="flex flex-col items-center gap-4 py-8">
          <Music className="h-16 w-16 text-blue-500" />
          <audio controls src={item.fileUrl} className="w-full max-w-md">
            Your browser does not support audio playback.
          </audio>
          <p className="text-sm text-muted-foreground">{item.fileName}</p>
        </div>
      );
    }
    if (isPdf && item.fileUrl) {
      return (
        <iframe
          src={item.fileUrl}
          className="w-full h-[60vh] rounded-lg border"
          title={item.fileName}
        />
      );
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
    const matchSearch =
      e.fileName.toLowerCase().includes(search.toLowerCase()) ||
      e.tag?.toLowerCase().includes(search.toLowerCase()) ||
      (e.caseNumber || "").toLowerCase().includes(search.toLowerCase());
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
                    <p className="text-xs text-muted-foreground">{ev.caseNumber || "N/A"} - {ev.caseTitle || ""}</p>
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

      <Dialog open={!!previewItem} onOpenChange={() => setPreviewItem(null)}>
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
            <Button variant="outline" onClick={() => setPreviewItem(null)}>
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
              <Label>File</Label>
              <input ref={fileRef} type="file" className="hidden" onChange={handleFileSelect} accept=".pdf,.mp3,.wav,.m4a,.mp4,.mov,.jpg,.jpeg,.png,.gif,.doc,.docx" />
              <Button variant="outline" className="w-full" onClick={() => fileRef.current?.click()}>
                {selectedFile ? selectedFile.name : "Choose file (PDF, Audio, Video, Image)"}
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
