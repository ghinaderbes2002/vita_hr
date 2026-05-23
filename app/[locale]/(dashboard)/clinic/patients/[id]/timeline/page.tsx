"use client";

import { useParams, useRouter } from "next/navigation";
import { useLocale } from "next-intl";
import { useQueries } from "@tanstack/react-query";
import { ArrowRight, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { CaseStatusBadge } from "@/components/clinic/case-status-badge";
import { useClinicPatient } from "@/lib/hooks/use-clinic-patients";
import { useProstheticsCasesByPatient } from "@/lib/hooks/use-clinic-prosthetics";
import { usePhysioCasesByPatient } from "@/lib/hooks/use-clinic-physio";
import { clinicProstheticsApi, TimelineEvent } from "@/lib/api/clinic-prosthetics";
import { clinicPhysioApi } from "@/lib/api/clinic-physio";

interface MergedEvent extends TimelineEvent {
  caseType: "PROSTHETICS" | "PHYSIO";
  caseId: string;
}

export default function PatientTimelinePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const locale = useLocale();

  const { data: patient, isLoading: patientLoading } = useClinicPatient(id);
  const { data: prostCases = [], isLoading: prostLoading } = useProstheticsCasesByPatient(id);
  const { data: physioCases = [], isLoading: physioLoading } = usePhysioCasesByPatient(id);

  const prostTimelines = useQueries({
    queries: prostCases.map((c) => ({
      queryKey: ["clinic-prosthetics-timeline", c.id],
      queryFn: () => clinicProstheticsApi.getTimeline(c.id),
    })),
  });

  const physioTimelines = useQueries({
    queries: physioCases.map((c) => ({
      queryKey: ["clinic-physio-timeline", c.id],
      queryFn: () => clinicPhysioApi.getTimeline(c.id),
    })),
  });

  const isLoading =
    patientLoading ||
    prostLoading ||
    physioLoading ||
    prostTimelines.some((q) => q.isLoading) ||
    physioTimelines.some((q) => q.isLoading);

  const allEvents: MergedEvent[] = [
    ...prostTimelines.flatMap((q, i) =>
      (q.data ?? []).map((ev) => ({
        ...ev,
        caseType: "PROSTHETICS" as const,
        caseId: prostCases[i]?.id ?? "",
      }))
    ),
    ...physioTimelines.flatMap((q, i) =>
      ((q.data as TimelineEvent[] | undefined) ?? []).map((ev) => ({
        ...ev,
        caseType: "PHYSIO" as const,
        caseId: physioCases[i]?.id ?? "",
      }))
    ),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const grouped: Record<string, MergedEvent[]> = {};
  for (const ev of allEvents) {
    const key = new Intl.DateTimeFormat(locale, { month: "long", year: "numeric" }).format(
      new Date(ev.date)
    );
    grouped[key] = grouped[key] ?? [];
    grouped[key].push(ev);
  }

  return (
    <div className="container max-w-3xl py-6 space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowRight className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          {patientLoading ? (
            <Skeleton className="h-6 w-40" />
          ) : (
            <h1 className="text-xl font-bold">
              {patient ? `${patient.firstName} ${patient.lastName}` : "—"}
            </h1>
          )}
          <p className="text-sm text-muted-foreground">رحلة المريض الزمنية</p>
        </div>
        {patient && (
          <Badge variant="outline" className="font-mono text-xs">
            {patient.patientNumber}
          </Badge>
        )}
      </div>

      {!patientLoading && (prostCases.length > 0 || physioCases.length > 0) && (
        <div className="flex gap-2 flex-wrap">
          {prostCases.map((c) => (
            <button
              key={c.id}
              onClick={() => router.push(`/${locale}/clinic/prosthetics/${c.id}`)}
              className="flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm hover:bg-muted transition-colors"
            >
              <span className="font-medium text-orange-700">تعويضي</span>
              <span className="text-muted-foreground font-mono text-xs">#{c.id.slice(-6)}</span>
              <CaseStatusBadge status={c.status} size="sm" />
            </button>
          ))}
          {physioCases.map((c) => (
            <button
              key={c.id}
              onClick={() => router.push(`/${locale}/clinic/physio/${c.id}`)}
              className="flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm hover:bg-muted transition-colors"
            >
              <span className="font-medium text-cyan-700">فيزيو</span>
              <span className="text-muted-foreground font-mono text-xs">#{c.id.slice(-6)}</span>
              <CaseStatusBadge status={c.status} size="sm" />
            </button>
          ))}
        </div>
      )}

      {isLoading ? (
        <div className="space-y-5">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex gap-4 items-start">
              <Skeleton className="h-3 w-3 rounded-full mt-2 shrink-0" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-56" />
                <Skeleton className="h-3 w-72" />
              </div>
            </div>
          ))}
        </div>
      ) : allEvents.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-16 text-muted-foreground">
          <Clock className="h-12 w-12 opacity-25" />
          <p className="text-sm">لا توجد أحداث مسجلة بعد</p>
        </div>
      ) : (
        <div className="space-y-8">
          {Object.entries(grouped).map(([month, events]) => (
            <div key={month}>
              <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-4">
                {month}
              </h2>
              <div className="relative space-y-3 pr-6">
                <div className="absolute right-2.5 top-1 bottom-1 w-px bg-border" />
                {events.map((ev) => (
                  <div key={`${ev.caseId}-${ev.id}`} className="relative flex gap-4">
                    <div
                      className={`absolute -right-6 top-2.5 w-2.5 h-2.5 rounded-full ring-2 ring-background shrink-0 ${
                        ev.caseType === "PROSTHETICS" ? "bg-orange-400" : "bg-cyan-400"
                      }`}
                    />
                    <div className="flex-1 rounded-lg border p-3 space-y-1 hover:bg-muted/30 transition-colors">
                      <div className="flex items-start justify-between gap-2 flex-wrap">
                        <p className="font-medium text-sm leading-snug">{ev.title}</p>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <Badge
                            variant="outline"
                            className={`text-xs px-1.5 py-0 ${
                              ev.caseType === "PROSTHETICS"
                                ? "bg-orange-50 text-orange-700 border-orange-200"
                                : "bg-cyan-50 text-cyan-700 border-cyan-200"
                            }`}
                          >
                            {ev.caseType === "PROSTHETICS" ? "تعويضي" : "فيزيو"}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {new Date(ev.date).toLocaleDateString(locale)}
                          </span>
                        </div>
                      </div>
                      {ev.description && (
                        <p className="text-xs text-muted-foreground">{ev.description}</p>
                      )}
                      {ev.actorName && (
                        <p className="text-xs text-muted-foreground/70">بواسطة: {ev.actorName}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
