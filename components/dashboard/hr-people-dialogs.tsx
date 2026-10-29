"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

export interface InterviewItem {
  applicationId: string;
  candidateName: string;
  jobTitle?: string | null;
  interviewDate?: string | null;
}

export interface WorkforceItem {
  employeeId: string;
  name: string;
  jobTitle?: string | null;
  department?: string | null;
  hireDate?: string | null;
  separationDate?: string | null;
  reason?: "RESIGNATION" | "PROBATION_TERMINATION" | "TERMINATION" | string | null;
}

const fmt = (d?: string | null) => (d ? new Date(d).toLocaleDateString("en-GB", { timeZone: "UTC" }) : "—");

function Empty({ text }: { text: string }) {
  return <p className="py-8 text-center text-sm text-muted-foreground">{text}</p>;
}

function PeopleTable({ head, rows }: { head: string[]; rows: (string | React.ReactNode)[][] }) {
  return (
    <div className="max-h-[60dvh] overflow-auto rounded-md border">
      <table className="w-full text-sm">
        <thead className="sticky top-0 bg-muted/60 text-xs text-muted-foreground">
          <tr>{head.map((h) => <th key={h} className="px-3 py-2 text-start font-medium">{h}</th>)}</tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-t">
              {r.map((c, j) => <td key={j} className="px-3 py-2">{c}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** This month's interviews, by name. */
export function InterviewsDialog({
  open, onOpenChange, items,
}: { open: boolean; onOpenChange: (o: boolean) => void; items: InterviewItem[] }) {
  const t = useTranslations("dashboard.ceo");
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader><DialogTitle>{t("interviewsTitle")}</DialogTitle></DialogHeader>
        {items.length === 0 ? <Empty text={t("interviewsEmpty")} /> : (
          <PeopleTable
            head={[t("colName"), t("colJobTitle"), t("colInterviewDate")]}
            rows={items.map((i) => [<span key="n" className="font-medium">{i.candidateName}</span>, i.jobTitle || "—", fmt(i.interviewDate)])}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

/** This month's joiners and leavers, one tab each. */
export function WorkforceDialog({
  open, onOpenChange, joined, separated,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  joined: WorkforceItem[];
  separated: WorkforceItem[];
}) {
  const t = useTranslations("dashboard.ceo");
  const [tab, setTab] = useState<"joined" | "separated">("joined");
  const reasonLabel = (r?: string | null) =>
    r === "RESIGNATION" ? t("reasonResignation")
    : r === "PROBATION_TERMINATION" ? t("reasonProbation")
    : r ? t("reasonTermination") : "—";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader><DialogTitle>{t("workforceTitle")}</DialogTitle></DialogHeader>
        <div className="inline-flex w-fit rounded-lg border bg-muted/40 p-1">
          {(["joined", "separated"] as const).map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => setTab(k)}
              className={cn(
                "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                tab === k ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {k === "joined" ? t("workforceJoinedTab", { count: joined.length }) : t("workforceSeparatedTab", { count: separated.length })}
            </button>
          ))}
        </div>
        {tab === "joined" ? (
          joined.length === 0 ? <Empty text={t("workforceJoinedEmpty")} /> : (
            <PeopleTable
              head={[t("colName"), t("colJobTitle"), t("colDepartment"), t("colHireDate")]}
              rows={joined.map((e) => [<span key="n" className="font-medium">{e.name}</span>, e.jobTitle || "—", e.department || "—", fmt(e.hireDate)])}
            />
          )
        ) : (
          separated.length === 0 ? <Empty text={t("workforceSeparatedEmpty")} /> : (
            <PeopleTable
              head={[t("colName"), t("colJobTitle"), t("colDepartment"), t("colSeparationDate"), t("colReason")]}
              rows={separated.map((e) => [
                <span key="n" className="font-medium">{e.name}</span>, e.jobTitle || "—", e.department || "—",
                fmt(e.separationDate), reasonLabel(e.reason),
              ])}
            />
          )
        )}
      </DialogContent>
    </Dialog>
  );
}
