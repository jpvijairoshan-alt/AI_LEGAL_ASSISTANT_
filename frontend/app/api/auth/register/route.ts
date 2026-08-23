import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { fullName, email, barCouncilNo, password } = body;

    if (!fullName || !email || !barCouncilNo || !password) {
      return NextResponse.json({ detail: "All fields are required" }, { status: 400 });
    }

    const existing = await prisma.lawyer.findFirst({
      where: { OR: [{ email }, { barCouncilNo }] },
    });
    if (existing) {
      return NextResponse.json(
        { detail: "Email or Bar Council Number already registered" },
        { status: 409 }
      );
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    const lawyer = await prisma.lawyer.create({
      data: { fullName, email, barCouncilNo, password: hashedPassword },
    });

    return NextResponse.json({
      message: "Account created successfully",
      lawyer: { id: lawyer.id, fullName: lawyer.fullName, email: lawyer.email },
    });
  } catch (error) {
    return NextResponse.json({ detail: "Internal server error" }, { status: 500 });
  }
}
