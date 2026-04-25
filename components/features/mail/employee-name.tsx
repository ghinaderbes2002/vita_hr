"use client";

import { useUser } from "@/lib/hooks/use-users";

interface Props {
  userId: string;
}

export function EmployeeName({ userId }: Props) {
  const { data } = useUser(userId);
  if (data?.fullName) return <>{data.fullName}</>;
  return <>{userId}</>;
}
