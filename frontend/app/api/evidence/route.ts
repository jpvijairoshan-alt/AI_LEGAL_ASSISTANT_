import path from "path";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getLawyerId } from "@/lib/auth";
import {
  deleteUpload,
  evidencePublicSelect,
  lookupFileType,
  MAX_UPLOAD_BYTES,
  saveUpload,
} from "@/lib/storage";
import { evidenceCreateSchema, unauthorized, validate } from "@/lib/validation";

export async function GET(request: NextRequest) {
  const lawyerId = getLawyerId(request);
  if (!lawyerId) return unauthorized();

  try {
    const evidence = await prisma.evidence.findMany({
      where: { case: { lawyerId } },
      select: { ...evidencePublicSelect, case: { select: { caseNumber: true, title: true } } },
      orderBy: { uploadedAt: "desc" },
    });
    return NextResponse.json(evidence);
  } catch (error) {
    console.error("Evidence fetch error:", error);
    return NextResponse.json({ detail: "Failed to fetch evidence" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const lawyerId = getLawyerId(request);
  if (!lawyerId) return unauthorized();

  let savedPath: string | null = null;
  try {
    let form: FormData;
    try {
      form = await request.formData();
    } catch {
      return NextResponse.json({ detail: "Request must be multipart/form-data" }, { status: 400 });
    }

    const parsed = validate(evidenceCreateSchema, {
      caseId: form.get("caseId") ?? undefined,
      tag: form.get("tag") ?? undefined,
      description: form.get("description") ?? undefined,
    });
    if (parsed.error) return parsed.error;
    const { caseId, tag, description } = parsed.data;

    const file = form.get("file");
    if (!(file instanceof File) || file.size === 0) {
      return NextResponse.json({ detail: "A non-empty file is required" }, { status: 400 });
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      return NextResponse.json({ detail: "File is too large (max 25 MB)" }, { status: 413 });
    }
    const info = lookupFileType(file.name);
    if (!info) {
      return NextResponse.json(
        { detail: "File type not allowed. Allowed: PDF, MP3, WAV, M4A, OGG, MP4, MOV, JPG, PNG, GIF, WEBP, DOC, DOCX" },
        { status: 415 }
      );
    }

    const ownedCase = await prisma.case.findFirst({ where: { id: caseId, lawyerId }, select: { id: true } });
    if (!ownedCase) return NextResponse.json({ detail: "Case not found" }, { status: 404 });

    savedPath = await saveUpload(lawyerId, info.ext, Buffer.from(await file.arrayBuffer()));

    const evidence = await prisma.evidence.create({
      data: {
        fileName: path.basename(file.name),
        fileUrl: savedPath,
        fileSize: file.size,
        mimeType: info.mime,
        evidenceType: info.type,
        tag,
        description,
        caseId,
      },
      select: evidencePublicSelect,
    });

    return NextResponse.json(evidence, { status: 201 });
  } catch (error) {
    console.error("Evidence creation error:", error);
    await deleteUpload(savedPath); // don't leave an orphan file if the DB insert failed
    return NextResponse.json({ detail: "Failed to upload evidence" }, { status: 500 });
  }
}
