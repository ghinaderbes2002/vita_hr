import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1").replace(/\/$/, "");

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const auth = request.headers.get("authorization") || "";
    const authHeader: Record<string, string> = auth ? { Authorization: auth } : {};

    // جلب employeeId من الباك باستخدام الـ token
    let employeeId = formData.get("employeeId") as string | null;
    if (!employeeId) {
      try {
        const profileRes = await fetch(`${BACKEND_URL}/employees/my`, {
          headers: authHeader,
        });
        if (profileRes.ok) {
          const profile = await profileRes.json();
          employeeId = profile?.data?.id || profile?.id || null;
        }
      } catch {}
    }

    if (!employeeId) {
      return NextResponse.json({ error: "لم يتم العثور على سجل الموظف" }, { status: 400 });
    }

    const uploadForm = new FormData();
    uploadForm.append("file", formData.get("file") as File);
    uploadForm.append("employeeId", employeeId);
    uploadForm.append("type", (formData.get("type") as string) || "OTHER");
    uploadForm.append("titleAr", (formData.get("titleAr") as string) || "مرفق");

    const res = await fetch(`${BACKEND_URL}/documents/upload`, {
      method: "POST",
      headers: authHeader,
      body: uploadForm,
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
