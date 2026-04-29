import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1").replace(/\/$/, "");

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const auth = request.headers.get("authorization") || "";

    const res = await fetch(`${BACKEND_URL}/documents/upload`, {
      method: "POST",
      headers: { ...(auth ? { Authorization: auth } : {}) },
      body: formData,
    });

    if (!res.ok) {
      const err = await res.text();
      return NextResponse.json({ error: err || "Upload failed" }, { status: res.status });
    }

    const data = await res.json();
    const payload = data?.data || data;
    return NextResponse.json({ fileUrl: payload.fileUrl, fileName: payload.fileName });
  } catch {
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
