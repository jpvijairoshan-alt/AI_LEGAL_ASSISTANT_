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

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const lawyerId = getLawyerId(request);
  if (!lawyerId) return NextResponse.json({ detail: "Unauthorized" }, { status: 401 });

  try {
    const caseData = await prisma.case.findFirst({
      where: { id: params.id, lawyerId },
      include: {
        evidence: { orderBy: { uploadedAt: "desc" } },
        hearings: { orderBy: { date: "asc" } },
        timelineEvents: { orderBy: { eventDate: "asc" } },
      },
    });

    if (!caseData) return NextResponse.json({ detail: "Case not found" }, { status: 404 });
    return NextResponse.json(caseData);
  } catch (error) {
    return NextResponse.json({ detail: "Failed to fetch case" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  const lawyerId = getLawyerId(request);
  if (!lawyerId) return NextResponse.json({ detail: "Unauthorized" }, { status: 401 });

  try {
    const body = await request.json();
    const updated = await prisma.case.updateMany({
      where: { id: params.id, lawyerId },
      data: body,
    });

    if (updated.count === 0) return NextResponse.json({ detail: "Case not found" }, { status: 404 });
    return NextResponse.json({ message: "Case updated" });
  } catch (error) {
    return NextResponse.json({ detail: "Failed to update case" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  const lawyerId = getLawyerId(request);
  if (!lawyerId) return NextResponse.json({ detail: "Unauthorized" }, { status: 401 });

  try {
    const deleted = await prisma.case.deleteMany({ where: { id: params.id, lawyerId } });
    if (deleted.count === 0) return NextResponse.json({ detail: "Case not found" }, { status: 404 });
    return NextResponse.json({ message: "Case deleted" });
  } catch (error) {
    return NextResponse.json({ detail: "Failed to delete case" }, { status: 500 });
  }
}
