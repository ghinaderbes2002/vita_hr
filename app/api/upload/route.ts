import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { randomUUID } from "crypto";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Sanitize filename: keep extension, replace unsafe chars
    const ext = file.name.split(".").pop() ?? "bin";
    const safeName = `${randomUUID()}.${ext}`;

    const uploadsDir = join(process.cwd(), "public", "uploads");
    await mkdir(uploadsDir, { recursive: true });
    await writeFile(join(uploadsDir, safeName), buffer);

    const baseUrl = request.nextUrl.origin;
    const fileUrl = `${baseUrl}/uploads/${safeName}`;

    return NextResponse.json({ fileUrl, fileName: file.name });
  } catch {
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
