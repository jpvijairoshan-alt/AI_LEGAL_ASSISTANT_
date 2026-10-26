import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getLawyerId } from "@/lib/auth";
import { caseCreateSchema, invalidBody, readJson, unauthorized, validate } from "@/lib/validation";

export async function GET(request: NextRequest) {
  const lawyerId = getLawyerId(request);
  if (!lawyerId) return unauthorized();

  try {
    const cases = await prisma.case.findMany({
      where: { lawyerId },
      orderBy: { createdAt: "desc" },
      include: { _count: { select: { evidence: true, hearings: true } } },
    });
    return NextResponse.json(cases);
  } catch (error) {
    console.error("Cases fetch error:", error);
    return NextResponse.json({ detail: "Failed to fetch cases" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const lawyerId = getLawyerId(request);
  if (!lawyerId) return unauthorized();

  try {
    const body = await readJson(request);
    if (body === null) return invalidBody();
    const parsed = validate(caseCreateSchema.omit({ status: true }), body);
    if (parsed.error) return parsed.error;

    const existing = await prisma.case.findUnique({ where: { caseNumber: parsed.data.caseNumber } });
    if (existing) {
      return NextResponse.json({ detail: "Case number already exists" }, { status: 409 });
    }

    const newCase = await prisma.case.create({
      data: { ...parsed.data, status: "ACTIVE", lawyerId },
    });
    return NextResponse.json(newCase, { status: 201 });
  } catch (error) {
    console.error("Case creation error:", error);
    return NextResponse.json({ detail: "Failed to create case" }, { status: 500 });
  }
}
