"use client";

// Per-department day board: a colour-coded "free/busy" hour strip (green = free,
// red = busy) for an at-a-glance read of the day, plus a table of that
// department's appointments. Rendered two-up (physio | prosthetics & podiatry).
import { useLocale, useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Appointment, AppointmentStatus } from "@/lib/api/clinic-appointments";

const STATUS_COLOR: Record<AppointmentStatus, string> = {
  SCHEDULED: "bg-blue-100 text-blue-800",
  CONFIRMED: "bg-green-100 text-green-800",
  COMPLETED: "bg-gray-100 text-gray-600",
  CANCELLED: "bg-red-100 text-red-700",
  NO_SHOW: "bg-orange-100 text-orange-700",
  RESCHEDULED: "bg-purple-100 text-purple-800",
};

const START_HOUR = 8;
const END_HOUR = 20;

function apptHour(a: Appointment): number | null {
  const v = a.startTime;
  if (!v) return null;
  if (v.length > 5) return new Date(v).getHours();
  const m = /^(\d{1,2}):/.exec(v);
  return m ? Number(m[1]) : null;
}

const fmtTime = (v?: string | null) =>
  v ? (v.length > 5 ? new Date(v).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }) : v) : "—";

// Green (free) → amber → orange → red (fully booked), light + dark variants.
function heatClass(count: number): string {
  if (count <= 0) return "bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-900";
  if (count === 1) return "bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800";
  if (count === 2) return "bg-orange-200 text-orange-900 border-orange-300 dark:bg-orange-900/40 dark:text-orange-200 dark:border-orange-800";
  return "bg-red-300 text-red-900 border-red-400 dark:bg-red-900/50 dark:text-red-200 dark:border-red-800";
}

function DeptCard({
  title, appointments, onSelect,
}: {
  title: string; appointments: Appointment[]; onSelect: (a: Appointment) => void;
}) {
  const locale = useLocale();
  const isRtl = locale === "ar";
  const t = useTranslations("clinic.appointments");

  const active = appointments.filter((a) => a.status !== "CANCELLED");
  const hours = Array.from({ length: END_HOUR - START_HOUR }, (_, i) => START_HOUR + i);
  const countByHour = (h: number) => active.filter((a) => apptHour(a) === h).length;
  const sorted = appointments.slice().sort((a, b) => (a.startTime || "").localeCompare(b.startTime || ""));

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between gap-2 text-base">
          <span>{title}</span>
          <Badge variant="secondary" className="shrink-0 text-xs">{active.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* free / busy hour strip */}
        <div>
          <div className="flex gap-1 overflow-x-auto pb-1" dir="ltr">
            {hours.map((h) => {
              const c = countByHour(h);
              return (
                <div
                  key={h}
                  title={`${h}:00 — ${c > 0 ? `${c} ${t("board.busy")}` : t("board.free")}`}
                  className={cn("flex min-w-9 flex-1 flex-col items-center justify-center rounded-md border py-1", heatClass(c))}
                >
                  <span className="font-mono text-[10px] leading-none">{h}</span>
                  <span className="mt-0.5 text-[11px] font-bold leading-none">{c > 0 ? c : "·"}</span>
                </div>
              );
            })}
          </div>
          <div className="mt-2 flex items-center gap-4 text-[10px] text-muted-foreground">
            <span className="flex items-center gap-1">
              <span className="h-2.5 w-2.5 rounded-sm bg-emerald-200 dark:bg-emerald-800" />{t("board.free")}
            </span>
            <span className="flex items-center gap-1">
              <span className="h-2.5 w-2.5 rounded-sm bg-red-300 dark:bg-red-800" />{t("board.busy")}
            </span>
          </div>
        </div>

        {/* appointments table */}
        {sorted.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">{t("emptyDay")}</p>
        ) : (
          <div className="overflow-x-auto rounded-md border">
            <table className="w-full text-sm" dir={isRtl ? "rtl" : "ltr"}>
              <thead className="bg-muted/50 text-xs text-muted-foreground">
                <tr>
                  <th className="p-2 text-start font-medium">{t("board.time")}</th>
                  <th className="p-2 text-start font-medium">{t("board.patient")}</th>
                  <th className="p-2 text-start font-medium">{t("board.type")}</th>
                  <th className="p-2 text-start font-medium">{t("board.status")}</th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((a) => (
                  <tr key={a.id} onClick={() => onSelect(a)} className="cursor-pointer border-t hover:bg-muted/30 transition-colors">
                    <td className="whitespace-nowrap p-2 font-mono text-xs">{fmtTime(a.startTime)} — {fmtTime(a.endTime)}</td>
                    <td className="p-2">{a.patient ? `${a.patient.firstName} ${a.patient.lastName}` : (a.patientName || "—")}</td>
                    <td className="p-2 text-xs">{t(`types.${a.appointmentType}`)}</td>
                    <td className="p-2">
                      <Badge variant="outline" className={cn("text-[10px]", STATUS_COLOR[a.status])}>{t(`statuses.${a.status}`)}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function AppointmentScheduleBoard({
  groups, onSelect,
}: {
  groups: { title: string; appointments: Appointment[] }[];
  onSelect: (a: Appointment) => void;
}) {
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {groups.map((g) => (
        <DeptCard key={g.title} title={g.title} appointments={g.appointments} onSelect={onSelect} />
      ))}
    </div>
  );
}
