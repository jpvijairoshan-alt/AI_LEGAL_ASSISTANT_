import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getLawyerId } from "@/lib/auth";
import { hearingCreateSchema, invalidBody, readJson, unauthorized, validate } from "@/lib/validation";

export async function GET(request: NextRequest) {
  const lawyerId = getLawyerId(request);
  if (!lawyerId) return unauthorized();

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
  if (!lawyerId) return unauthorized();

  try {
    const body = await readJson(request);
    if (body === null) return invalidBody();
    const parsed = validate(hearingCreateSchema, body);
    if (parsed.error) return parsed.error;
    const { caseId, date, ...rest } = parsed.data;

    const ownedCase = await prisma.case.findFirst({ where: { id: caseId, lawyerId }, select: { id: true } });
    if (!ownedCase) return NextResponse.json({ detail: "Case not found" }, { status: 404 });

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const hearing = await prisma.$transaction(async (tx) => {
      const created = await tx.hearing.create({
        data: { ...rest, date: new Date(date), status: "SCHEDULED", caseId, lawyerId },
        include: { case: { select: { caseNumber: true, title: true } } },
      });

      // Case.nextHearingDate = earliest upcoming SCHEDULED hearing of THIS case.
      const next = await tx.hearing.findFirst({
        where: { caseId, status: "SCHEDULED", date: { gte: startOfToday } },
        orderBy: { date: "asc" },
        select: { date: true },
      });
      await tx.case.update({ where: { id: caseId }, data: { nextHearingDate: next?.date ?? null } });
      return created;
    });

    return NextResponse.json(hearing, { status: 201 });
  } catch (error) {
    console.error("Hearing creation error:", error);
    return NextResponse.json({ detail: "Failed to create hearing" }, { status: 500 });
  }
}
