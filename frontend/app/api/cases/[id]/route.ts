import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getLawyerId } from "@/lib/auth";
import { deleteUpload } from "@/lib/storage";
import { caseUpdateSchema, invalidBody, readJson, unauthorized, validate } from "@/lib/validation";

type Ctx = { params: { id: string } };

export async function GET(request: NextRequest, { params }: Ctx) {
  const lawyerId = getLawyerId(request);
  if (!lawyerId) return unauthorized();

  try {
    const caseData = await prisma.case.findFirst({
      where: { id: params.id, lawyerId },
      include: {
        evidence: {
          orderBy: { uploadedAt: "desc" },
          select: {
            id: true, fileName: true, fileSize: true, mimeType: true, evidenceType: true,
            tag: true, description: true, uploadedAt: true, caseId: true,
          },
        },
        hearings: { orderBy: { date: "asc" } },
        timelineEvents: { orderBy: { eventDate: "asc" } },
      },
    });

    if (!caseData) return NextResponse.json({ detail: "Case not found" }, { status: 404 });
    return NextResponse.json(caseData);
  } catch (error) {
    console.error("Case fetch error:", error);
    return NextResponse.json({ detail: "Failed to fetch case" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: Ctx) {
  const lawyerId = getLawyerId(request);
  if (!lawyerId) return unauthorized();

  try {
    const body = await readJson(request);
    if (body === null) return invalidBody();
    const parsed = validate(caseUpdateSchema, body);
    if (parsed.error) return parsed.error;

    // Required columns cannot be nulled out; drop undefined keys so Prisma leaves them alone.
    const data = Object.fromEntries(Object.entries(parsed.data).filter(([, v]) => v !== undefined));
    if (Object.keys(data).length === 0) {
      return NextResponse.json({ detail: "No editable fields provided" }, { status: 400 });
    }

    if (typeof data.caseNumber === "string") {
      const clash = await prisma.case.findFirst({
        where: { caseNumber: data.caseNumber, NOT: { id: params.id } },
      });
      if (clash) return NextResponse.json({ detail: "Case number already exists" }, { status: 409 });
    }

    const updated = await prisma.case.updateMany({ where: { id: params.id, lawyerId }, data });
    if (updated.count === 0) return NextResponse.json({ detail: "Case not found" }, { status: 404 });
    return NextResponse.json({ message: "Case updated" });
  } catch (error) {
    console.error("Case update error:", error);
    return NextResponse.json({ detail: "Failed to update case" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: Ctx) {
  const lawyerId = getLawyerId(request);
  if (!lawyerId) return unauthorized();

  try {
    const files = await prisma.evidence.findMany({
      where: { caseId: params.id, case: { lawyerId } },
      select: { fileUrl: true },
    });
    const deleted = await prisma.case.deleteMany({ where: { id: params.id, lawyerId } });
    if (deleted.count === 0) return NextResponse.json({ detail: "Case not found" }, { status: 404 });
    await Promise.all(files.map((f) => deleteUpload(f.fileUrl)));
    return NextResponse.json({ message: "Case deleted" });
  } catch (error) {
    console.error("Case delete error:", error);
    return NextResponse.json({ detail: "Failed to delete case" }, { status: 500 });
  }
}
