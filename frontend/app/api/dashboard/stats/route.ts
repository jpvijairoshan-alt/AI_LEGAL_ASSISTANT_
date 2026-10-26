import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getLawyerId } from "@/lib/auth";

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
