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
    const cases = await prisma.case.findMany({
      where: { lawyerId },
      orderBy: { createdAt: "desc" },
      include: { _count: { select: { evidence: true, hearings: true } } },
    });
    return NextResponse.json(cases);
  } catch (error) {
    return NextResponse.json({ detail: "Failed to fetch cases" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const lawyerId = getLawyerId(request);
  if (!lawyerId) {
    return NextResponse.json({ detail: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { caseNumber, title, clientName, courtName, courtType, judgeName, stage, description, clientPhone, clientEmail, opposingCounsel, filingDate } = body;

    if (!caseNumber || !title || !clientName || !courtName) {
      return NextResponse.json({ detail: "Missing required fields" }, { status: 400 });
    }

    const existing = await prisma.case.findUnique({ where: { caseNumber } });
    if (existing) {
      return NextResponse.json({ detail: "Case number already exists" }, { status: 409 });
    }

    const newCase = await prisma.case.create({
      data: {
        caseNumber,
        title,
        clientName,
        clientPhone,
        clientEmail,
        courtName,
        courtType: courtType || "DISTRICT_COURT",
        judgeName,
        opposingCounsel,
        stage: stage || "FIR_STAGE",
        status: "ACTIVE",
        description,
        filingDate: filingDate ? new Date(filingDate) : null,
        lawyerId,
      },
    });

    return NextResponse.json(newCase, { status: 201 });
  } catch (error) {
    return NextResponse.json({ detail: "Failed to create case" }, { status: 500 });
  }
}
