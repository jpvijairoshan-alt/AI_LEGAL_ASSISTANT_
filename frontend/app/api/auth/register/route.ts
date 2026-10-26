import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth";
import { invalidBody, readJson, registerSchema, validate } from "@/lib/validation";

export async function POST(request: NextRequest) {
  try {
    const body = await readJson(request);
    if (body === null) return invalidBody();
    const parsed = validate(registerSchema, body);
    if (parsed.error) return parsed.error;
    const { fullName, email, barCouncilNo, password } = parsed.data;

    const existing = await prisma.lawyer.findFirst({
      where: { OR: [{ email }, { barCouncilNo }] },
    });
    if (existing) {
      return NextResponse.json(
        { detail: "Email or Bar Council Number already registered" },
        { status: 409 }
      );
    }

    const lawyer = await prisma.lawyer.create({
      data: { fullName, email, barCouncilNo, password: await hashPassword(password) },
    });

    return NextResponse.json(
      {
        message: "Account created successfully",
        lawyer: { id: lawyer.id, fullName: lawyer.fullName, email: lawyer.email },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Register error:", error);
    return NextResponse.json({ detail: "Internal server error" }, { status: 500 });
  }
}
