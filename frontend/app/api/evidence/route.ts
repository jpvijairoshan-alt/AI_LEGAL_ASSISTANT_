import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function getLawyerId(request: NextRequest): string | null {
  const auth = request.headers.get("Authorization");
  if (!auth?.startsWith("Bearer ")) return null;
  try {
    const jwt = require("jsonwebtoken");
    const decoded = jwt.verify(auth.substring(7), process.env.NEXTAUTH_SECRET || "fallback-secret-key");
    return decoded.lawyerId;
  } catch {
    return null;
  }
}

export async function GET(request: NextRequest) {
  const lawyerId = getLawyerId(request);
  if (!lawyerId) {
    return NextResponse.json({ detail: "Unauthorized" }, { status: 401 });
  }

  try {
    const evidence = await prisma.evidence.findMany({
      where: { case: { lawyerId } },
      include: { case: { select: { caseNumber: true, title: true } } },
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
  if (!lawyerId) {
    return NextResponse.json({ detail: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { fileName, fileUrl, fileSize, mimeType, evidenceType, tag, description, caseId } = body;

    if (!fileName || !caseId) {
      return NextResponse.json({ detail: "File name and case ID are required" }, { status: 400 });
    }

    const caseExists = await prisma.case.findFirst({ where: { id: caseId, lawyerId } });
    if (!caseExists) {
      return NextResponse.json({ detail: "Case not found" }, { status: 404 });
    }

    const evidence = await prisma.evidence.create({
      data: {
        fileName,
        fileUrl: fileUrl || "",
        fileSize: fileSize || 0,
        mimeType: mimeType || "application/octet-stream",
        evidenceType: evidenceType || "DOCUMENT",
        tag: tag || null,
        description: description || null,
        caseId,
      },
    });

    return NextResponse.json(evidence, { status: 201 });
  } catch (error) {
    console.error("Evidence creation error:", error);
    return NextResponse.json({ detail: "Failed to upload evidence" }, { status: 500 });
  }
}
