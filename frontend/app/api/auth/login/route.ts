import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateToken, verifyPassword } from "@/lib/auth";
import { invalidBody, loginSchema, readJson, validate } from "@/lib/validation";

export async function POST(request: NextRequest) {
  try {
    const body = await readJson(request);
    if (body === null) return invalidBody();
    const parsed = validate(loginSchema, body);
    if (parsed.error) return parsed.error;
    const { email, password } = parsed.data;

    const lawyer = await prisma.lawyer.findUnique({ where: { email } });
    if (!lawyer || !(await verifyPassword(password, lawyer.password))) {
      return NextResponse.json({ detail: "Invalid credentials" }, { status: 401 });
    }

    const token = generateToken({
      lawyerId: lawyer.id,
      email: lawyer.email,
      fullName: lawyer.fullName,
    });

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
    console.error("Login error:", error);
    return NextResponse.json({ detail: "Internal server error" }, { status: 500 });
  }
}
