import fs from "fs/promises";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getLawyerId } from "@/lib/auth";
import { resolveUpload } from "@/lib/storage";
import { unauthorized } from "@/lib/validation";

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const lawyerId = getLawyerId(request);
  if (!lawyerId) return unauthorized();

  try {
    const item = await prisma.evidence.findFirst({
      where: { id: params.id, case: { lawyerId } },
      select: { fileName: true, fileUrl: true, mimeType: true },
    });
    if (!item) return NextResponse.json({ detail: "Evidence not found" }, { status: 404 });

    let bytes: Buffer;
    if (item.fileUrl.startsWith("data:")) {
      // Legacy rows stored the file as a base64 data URL in the database.
      const comma = item.fileUrl.indexOf(",");
      bytes = Buffer.from(item.fileUrl.slice(comma + 1), "base64");
    } else if (item.fileUrl) {
      try {
        bytes = await fs.readFile(resolveUpload(item.fileUrl));
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code === "ENOENT") {
          return NextResponse.json({ detail: "File is missing on the server" }, { status: 404 });
        }
        throw error;
      }
    } else {
      return NextResponse.json({ detail: "No file stored for this evidence" }, { status: 404 });
    }

    const download = request.nextUrl.searchParams.get("download") === "1";
    return new NextResponse(new Uint8Array(bytes), {
      headers: {
        "Content-Type": item.mimeType,
        "Content-Length": String(bytes.length),
        "Content-Disposition": `${download ? "attachment" : "inline"}; filename*=UTF-8''${encodeURIComponent(item.fileName)}`,
        "X-Content-Type-Options": "nosniff",
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    console.error("Evidence file error:", error);
    return NextResponse.json({ detail: "Failed to read file" }, { status: 500 });
  }
}
