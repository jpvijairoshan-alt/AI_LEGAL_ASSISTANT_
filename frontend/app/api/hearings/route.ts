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
    const hearings = await prisma.hearing.findMany({
      where: { lawyerId },
      include: { case: { select: { caseNumber: true, title: true } } },
      orderBy: { date: "asc" },
    });
    return NextResponse.json(hearings);
  } catch (error) {
    console.error("Hearings fetch error:", error);
    return NextResponse.json({ detail: "Failed to fetch hearings" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const lawyerId = getLawyerId(request);
  if (!lawyerId) {
    return NextResponse.json({ detail: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { title, date, time, courtName, courtType, judgeName, notes, caseId } = body;

    if (!title || !date || !courtName) {
      return NextResponse.json({ detail: "Title, date, and court name are required" }, { status: 400 });
    }

    let resolvedCaseId = caseId;
    if (!resolvedCaseId) {
      const firstCase = await prisma.case.findFirst({ where: { lawyerId } });
      if (!firstCase) {
        return NextResponse.json({ detail: "No cases found. Create a case first." }, { status: 400 });
      }
      resolvedCaseId = firstCase.id;
    }

    const hearing = await prisma.hearing.create({
      data: {
        title,
        date: new Date(date),
        time: time || null,
        courtName,
        courtType: courtType || "DISTRICT_COURT",
        judgeName: judgeName || null,
        notes: notes || null,
        status: "SCHEDULED",
        caseId: resolvedCaseId,
        lawyerId,
      },
      include: { case: { select: { caseNumber: true, title: true } } },
    });

    await prisma.case.update({
      where: { id: resolvedCaseId },
      data: { nextHearingDate: new Date(date) },
    });

    return NextResponse.json(hearing, { status: 201 });
  } catch (error) {
    console.error("Hearing creation error:", error);
    return NextResponse.json({ detail: "Failed to create hearing" }, { status: 500 });
  }
}
