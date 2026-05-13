"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function MyLeavesRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/requests/my-requests");
  }, [router]);
  return null;
}
