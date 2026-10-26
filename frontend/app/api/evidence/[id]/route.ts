import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getLawyerId } from "@/lib/auth";
import { deleteUpload } from "@/lib/storage";
import { unauthorized } from "@/lib/validation";

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  const lawyerId = getLawyerId(request);
  if (!lawyerId) return unauthorized();

  try {
    const item = await prisma.evidence.findFirst({
      where: { id: params.id, case: { lawyerId } },
      select: { id: true, fileUrl: true },
    });
    if (!item) return NextResponse.json({ detail: "Evidence not found" }, { status: 404 });

    await prisma.evidence.delete({ where: { id: item.id } });
    await deleteUpload(item.fileUrl);
    return NextResponse.json({ message: "Evidence deleted" });
  } catch (error) {
    console.error("Evidence delete error:", error);
    return NextResponse.json({ detail: "Failed to delete evidence" }, { status: 500 });
  }
}
