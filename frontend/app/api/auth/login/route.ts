import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const prisma = new PrismaClient();
const JWT_SECRET = process.env.NEXTAUTH_SECRET || "fallback-secret-key";

export async function POST(request: NextRequest) {
  console.log("LOGIN API CALLED");
  try {
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json({ detail: "Email and password are required" }, { status: 400 });
    }

    const lawyer = await prisma.lawyer.findUnique({ where: { email } });
    if (!lawyer) {
      return NextResponse.json({ detail: "Invalid credentials" }, { status: 401 });
    }

    const valid = await bcrypt.compare(password, lawyer.password);
    if (!valid) {
      return NextResponse.json({ detail: "Invalid credentials" }, { status: 401 });
    }

    const token = jwt.sign(
      { lawyerId: lawyer.id, email: lawyer.email, fullName: lawyer.fullName },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    return NextResponse.json({
      token,
      lawyer: {
        id: lawyer.id,
        fullName: lawyer.fullName,
        email: lawyer.email,
        barCouncilNo: lawyer.barCouncilNo,
      },
    });
  } catch (error) {
  console.error("LOGIN ERROR:", error);

  return NextResponse.json(
    { detail: "Internal server error" },
    { status: 500 }
  );
}
}
