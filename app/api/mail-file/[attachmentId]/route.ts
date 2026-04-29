import { NextRequest } from "next/server";

const BACKEND_URL = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1").replace(/\/$/, "");

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ attachmentId: string }> }
) {
  const { attachmentId } = await params;

  const token =
    request.cookies.get("wso-token")?.value ||
    request.nextUrl.searchParams.get("t") ||
    undefined;

  if (!token) {
    return new Response("Unauthorized", { status: 401 });
  }

  const backendUrl = `${BACKEND_URL}/mail/attachments/${attachmentId}/file`;

  const res = await fetch(backendUrl, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    const errText = await res.text();
    return new Response(`Backend error ${res.status}: ${errText}`, { status: res.status });
  }

  const contentType = res.headers.get("content-type") || "application/octet-stream";
  const buffer = await res.arrayBuffer();
  const base64 = Buffer.from(buffer).toString("base64");

  if (contentType.startsWith("image/")) {
    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>مرفق</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { background: #111; display: flex; align-items: center; justify-content: center; min-height: 100vh; }
    img { max-width: 100vw; max-height: 100vh; object-fit: contain; display: block; }
  </style>
</head>
<body>
  <img src="data:${contentType};base64,${base64}" alt="مرفق">
</body>
</html>`;
    return new Response(html, {
      status: 200,
      headers: { "content-type": "text/html; charset=utf-8" },
    });
  }

  // PDF والأنواع الأخرى — إرجاع raw bytes مباشرة
  const fileName = res.headers.get("content-disposition")?.match(/filename="?([^"]+)"?/)?.[1];
  const disposition = contentType === "application/pdf"
    ? `inline${fileName ? `; filename="${fileName}"` : ""}`
    : (res.headers.get("content-disposition") || "inline");

  return new Response(Buffer.from(buffer), {
    status: 200,
    headers: {
      "content-type": contentType,
      "content-disposition": disposition,
    },
  });
}
