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
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const [totalCases, activeCases, todayHearings, recentCases, upcomingHearings] = await Promise.all([
      prisma.case.count({ where: { lawyerId } }),
      prisma.case.count({ where: { lawyerId, status: "ACTIVE" } }),
      prisma.hearing.findMany({
        where: {
          lawyerId,
          date: { gte: today, lt: tomorrow },
        },
        include: { case: { select: { caseNumber: true, title: true } } },
        orderBy: { date: "asc" },
      }),
      prisma.case.findMany({
        where: { lawyerId },
        orderBy: { createdAt: "desc" },
        take: 5,
        select: { id: true, caseNumber: true, title: true, courtName: true, stage: true, status: true },
      }),
      prisma.hearing.findMany({
        where: {
          lawyerId,
          date: { gt: today },
          status: "SCHEDULED",
        },
        include: { case: { select: { caseNumber: true } } },
        orderBy: { date: "asc" },
        take: 5,
      }),
    ]);

    return NextResponse.json({
      totalCases,
      activeCases,
      todayHearings,
      recentCases,
      upcomingHearings,
    });
  } catch (error) {
    console.error("Dashboard stats error:", error);
    return NextResponse.json({ detail: "Failed to fetch dashboard stats" }, { status: 500 });
  }
}
