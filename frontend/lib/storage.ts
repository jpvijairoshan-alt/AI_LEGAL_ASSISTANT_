import fs from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";

// Evidence files live on local disk, outside the web root and out of git (see .gitignore).
export const UPLOAD_ROOT = path.resolve(process.cwd(), "uploads");

export const MAX_UPLOAD_BYTES = 25 * 1024 * 1024;

type Kind = "PDF" | "AUDIO" | "VIDEO" | "IMAGE" | "DOCUMENT";

// Allowed extensions -> canonical mime + evidence type. The client-supplied mime type is never trusted.
export const ALLOWED_FILES: Record<string, { mime: string; type: Kind }> = {
  ".pdf": { mime: "application/pdf", type: "PDF" },
  ".mp3": { mime: "audio/mpeg", type: "AUDIO" },
  ".wav": { mime: "audio/wav", type: "AUDIO" },
  ".m4a": { mime: "audio/mp4", type: "AUDIO" },
  ".ogg": { mime: "audio/ogg", type: "AUDIO" },
  ".mp4": { mime: "video/mp4", type: "VIDEO" },
  ".mov": { mime: "video/quicktime", type: "VIDEO" },
  ".jpg": { mime: "image/jpeg", type: "IMAGE" },
  ".jpeg": { mime: "image/jpeg", type: "IMAGE" },
  ".png": { mime: "image/png", type: "IMAGE" },
  ".gif": { mime: "image/gif", type: "IMAGE" },
  ".webp": { mime: "image/webp", type: "IMAGE" },
  ".doc": { mime: "application/msword", type: "DOCUMENT" },
  ".docx": {
    mime: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    type: "DOCUMENT",
  },
};

export function lookupFileType(fileName: string) {
  const ext = path.extname(fileName).toLowerCase();
  const info = ALLOWED_FILES[ext];
  return info ? { ext, ...info } : null;
}

/** Saves bytes under uploads/<lawyerId>/<uuid><ext>; returns the path relative to UPLOAD_ROOT. */
export async function saveUpload(lawyerId: string, ext: string, data: Buffer): Promise<string> {
  const relPath = path.join(lawyerId, `${randomUUID()}${ext}`);
  const abs = resolveUpload(relPath);
  await fs.mkdir(path.dirname(abs), { recursive: true });
  await fs.writeFile(abs, data);
  return relPath;
}

/** Resolves a stored relative path, refusing anything that escapes UPLOAD_ROOT. */
export function resolveUpload(relPath: string): string {
  const abs = path.resolve(UPLOAD_ROOT, relPath);
  if (abs !== UPLOAD_ROOT && !abs.startsWith(UPLOAD_ROOT + path.sep)) {
    throw new Error("Invalid file path");
  }
  return abs;
}

export async function deleteUpload(relPath: string | null | undefined): Promise<void> {
  if (!relPath || relPath.startsWith("data:")) return; // legacy rows stored base64 in the DB
  try {
    await fs.unlink(resolveUpload(relPath));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
      console.error("Failed to delete upload file:", error);
    }
  }
}

// Metadata only: neither file contents nor the server-side path are ever returned.
export const evidencePublicSelect = {
  id: true,
  fileName: true,
  fileSize: true,
  mimeType: true,
  evidenceType: true,
  tag: true,
  description: true,
  uploadedAt: true,
  caseId: true,
} as const;
