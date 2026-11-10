"use client";

// نجم الشهر: قائمة المرشحين لكل شركة ونقاطهم التلقائية، مرشح HR، ثم التصويت
// (الزملاء + المدير الإداري + المدير التنفيذي)، والنتائج بعد الإغلاق، وحسم التعادل.
// النتائج لا يرسلها الباك إلا بعد إغلاق التصويت.

import { useRef, useState, type ReactNode } from "react";
import { useLocale, useTranslations } from "next-intl";
import {
  CalendarClock, Check, ChevronLeft, ChevronRight, ChevronsUpDown, Crown, Gift, ImagePlus, Loader2, Lock,
  MessageCircle, RefreshCw, Star, UserPlus, Vote,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { StarComments } from "@/components/features/star-of-month/star-comments";
import { QuarterStars } from "@/components/features/star-of-month/quarter-stars";
import { assetUrl } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList,
} from "@/components/ui/command";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { PageGuard } from "@/components/permissions/page-guard";
import { PERMISSIONS } from "@/lib/permissions/catalog";
import { ROLES } from "@/lib/permissions/roles";
import { usePermissions } from "@/lib/hooks/use-permissions";
import { useEmployeesBasicList, useEmployeesByCompany, useMyEmployee } from "@/lib/hooks/use-employees";
import {
  useAddStarHrNominee, useCastStarVote, useGenerateStarCycle, useMyStarVotes, useStarCycle, useStarCycleAction,
  useStarReward, useStarWinnerImage,
} from "@/lib/hooks/use-star-of-month";
import {
  STAR_COMPANIES, StarCandidate, StarCompany, StarCycle, StarMyVote, StarVoteKind,
} from "@/lib/api/star-of-month";
import { cn } from "@/lib/utils";

const COMPANY_NAME: Record<StarCompany, string> = { VITASYR: "VitaSyr", VITAXIR: "VitaXir" };

/** The month just ended — the one a fresh cycle judges. */
function previousMonth() {
  const d = new Date();
  d.setDate(1);
  d.setMonth(d.getMonth() - 1);
  return { year: d.getFullYear(), month: d.getMonth() + 1 };
}

const fmtNum = (v: number | null | undefined, digits = 2) =>
  v == null ? "—" : Number(v).toLocaleString("en-US", { maximumFractionDigits: digits });

/** What the signed-in user may do in this cycle, and who they are. */
interface Viewer {
  employeeId?: string;
  company?: string;
  canNominate: boolean;
  /** A colleague's vote (star_of_month.vote) — HR and HR_Specialist don't have it. */
  canPeerVote: boolean;
  canManagerVote: boolean;
  canCeoVote: boolean;
  /** Management: the winner's reward and photo. */
  canReward: boolean;
  myVotes: StarMyVote[];
}

/** A vote waiting on the confirm dialog. */
interface PendingVote {
  kind: StarVoteKind;
  company: StarCompany;
  candidate: StarCandidate;
  name: string;
}

export default function StarOfMonthPage() {
  return (
    <PageGuard permission={PERMISSIONS.STAR_OF_MONTH.VIEW}>
      <StarOfMonthContent />
    </PageGuard>
  );
}

function StarOfMonthContent() {
  const t = useTranslations("starOfMonth");
  const locale = useLocale();
  const { hasPermission, hasRole } = usePermissions();
  const { data: me } = useMyEmployee();

  const [{ year, month }, setPeriod] = useState(previousMonth);
  const { data, isLoading, isError } = useStarCycle(year, month);
  const cycle = data?.cycle ?? null;
  const voting = cycle?.status === "VOTING";
  const { data: myVotes = [] } = useMyStarVotes(year, month, !!cycle && cycle.status !== "NOMINATING");

  const generate = useGenerateStarCycle();
  const cycleAction = useStarCycleAction();
  const castVote = useCastStarVote();
  const [confirm, setConfirm] = useState<"regenerate" | "open" | "close" | null>(null);
  const [pendingVote, setPendingVote] = useState<PendingVote | null>(null);
  const [pendingTie, setPendingTie] = useState<{ company: StarCompany; candidate: StarCandidate; name: string } | null>(null);

  const viewer: Viewer = {
    employeeId: me?.id,
    company: (me as { company?: string } | undefined)?.company,
    canNominate: hasPermission(PERMISSIONS.STAR_OF_MONTH.NOMINATE),
    canPeerVote: hasPermission(PERMISSIONS.STAR_OF_MONTH.VOTE),
    // The roles back the permissions up until they are assigned on every role.
    canManagerVote: hasPermission(PERMISSIONS.STAR_OF_MONTH.MANAGER_VOTE) || hasRole(ROLES.DIRECT_MANAGER),
    canCeoVote: hasPermission(PERMISSIONS.STAR_OF_MONTH.CEO_VOTE) || hasRole(ROLES.CEO),
    canReward: hasPermission(PERMISSIONS.STAR_OF_MONTH.REWARD),
    myVotes,
  };

  // Syrian month names in Arabic ("تشرين الأول"), the locale's own elsewhere.
  const monthLabel = new Intl.DateTimeFormat(locale === "ar" ? "ar-SY" : locale, { month: "long", year: "numeric" })
    .format(new Date(year, month - 1, 1));
  const dateTime = (iso: string) =>
    new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" }).format(new Date(iso));
  const shift = (delta: number) => setPeriod(({ year: y, month: m }) => {
    const d = new Date(y, m - 1 + delta, 1);
    return { year: d.getFullYear(), month: d.getMonth() + 1 };
  });
  const latest = previousMonth();
  const atLatest = year === latest.year && month === latest.month;
  const nominating = !cycle || cycle.status === "NOMINATING";

  const runConfirm = () => {
    const action = confirm;
    setConfirm(null);
    if (action === "regenerate") generate.mutate({ year, month });
    else if (action === "open") cycleAction.mutate({ year, month, action: "open" });
    else if (action === "close") cycleAction.mutate({ year, month, action: "close" });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("title")}
        description={t("description")}
        actions={viewer.canNominate && cycle ? (
          <div className="flex flex-wrap gap-2">
            {nominating && (
              <>
                <Button variant="outline" className="gap-2" disabled={generate.isPending} onClick={() => setConfirm("regenerate")}>
                  {generate.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                  {t("regenerate")}
                </Button>
                <Button className="gap-2" disabled={cycleAction.isPending} onClick={() => setConfirm("open")}>
                  <Vote className="h-4 w-4" />
                  {t("openVoting")}
                </Button>
              </>
            )}
            {voting && (
              <Button variant="outline" className="gap-2" disabled={cycleAction.isPending} onClick={() => setConfirm("close")}>
                <Lock className="h-4 w-4" />
                {t("closeVoting")}
              </Button>
            )}
          </div>
        ) : undefined}
      />

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1 rounded-lg border bg-background p-1">
          {/* Arrows follow the reading direction: "back" points to the start. */}
          <Button variant="ghost" size="icon" className="h-8 w-8" aria-label={t("previousMonth")} onClick={() => shift(-1)}>
            <ChevronRight className="h-4 w-4 ltr:rotate-180" />
          </Button>
          <span className="min-w-36 text-center text-sm font-semibold">{monthLabel}</span>
          <Button variant="ghost" size="icon" className="h-8 w-8" aria-label={t("nextMonth")} disabled={atLatest} onClick={() => shift(1)}>
            <ChevronLeft className="h-4 w-4 ltr:rotate-180" />
          </Button>
        </div>
        {cycle && <StatusBadge status={cycle.status} />}
        {cycle?.nominationGeneratedAt && cycle.status === "NOMINATING" && (
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <CalendarClock className="h-3.5 w-3.5" />
            {t("generatedAt", { date: dateTime(cycle.nominationGeneratedAt) })}
          </span>
        )}
      </div>

      {voting && (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-900 dark:border-sky-900 dark:bg-sky-950/40 dark:text-sky-100">
          <Vote className="h-4 w-4 shrink-0" />
          <span className="font-medium">
            {cycle?.votingClosesAt ? t("votingUntil", { date: dateTime(cycle.votingClosesAt) }) : t("votingOpenNow")}
          </span>
          <span className="text-sky-800/80 dark:text-sky-200/80">{t("votingRules")}</span>
        </div>
      )}

      {isLoading ? (
        <div className="grid gap-6 lg:grid-cols-2">
          {STAR_COMPANIES.map((c) => <Skeleton key={c} className="h-96 rounded-xl" />)}
        </div>
      ) : isError ? (
        <p className="text-sm text-destructive">{t("loadFailed")}</p>
      ) : !cycle ? (
        <EmptyState
          icon={<Star className="h-8 w-8 text-muted-foreground" />}
          title={t("notGenerated")}
          description={t("notGeneratedHint")}
          action={viewer.canNominate ? (
            <Button className="gap-2" disabled={generate.isPending} onClick={() => generate.mutate({ year, month })}>
              {generate.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              {t("generate")}
            </Button>
          ) : undefined}
        />
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          {STAR_COMPANIES.map((company) => (
            <CompanyList
              key={company}
              cycle={cycle}
              company={company}
              viewer={viewer}
              onVote={setPendingVote}
              onTieBreak={(candidate, name) => setPendingTie({ company, candidate, name })}
            />
          ))}
        </div>
      )}

      <QuarterStars canManage={viewer.canNominate} />

      <ConfirmDialog
        open={!!confirm}
        onOpenChange={(o) => { if (!o) setConfirm(null); }}
        title={confirm ? t(`confirm.${confirm}.title`) : ""}
        description={confirm ? t(`confirm.${confirm}.description`) : undefined}
        onConfirm={runConfirm}
      />
      <ConfirmDialog
        open={!!pendingVote}
        onOpenChange={(o) => { if (!o) setPendingVote(null); }}
        title={pendingVote ? t(`voteTitle.${pendingVote.kind}`) : ""}
        description={pendingVote
          ? t("voteDescription", { name: pendingVote.name, company: COMPANY_NAME[pendingVote.company] })
          : undefined}
        onConfirm={() => {
          if (pendingVote) {
            castVote.mutate({ year, month, kind: pendingVote.kind, company: pendingVote.company, candidateId: pendingVote.candidate.id });
          }
          setPendingVote(null);
        }}
      />
      <ConfirmDialog
        open={!!pendingTie}
        onOpenChange={(o) => { if (!o) setPendingTie(null); }}
        title={t("tieBreakTitle")}
        description={pendingTie ? t("tieBreakDescription", { name: pendingTie.name, company: COMPANY_NAME[pendingTie.company] }) : undefined}
        onConfirm={() => {
          if (pendingTie) {
            cycleAction.mutate({ year, month, action: "tieBreak", company: pendingTie.company, employeeId: pendingTie.candidate.employeeId });
          }
          setPendingTie(null);
        }}
      />
    </div>
  );
}

function StatusBadge({ status }: { status: StarCycle["status"] }) {
  const t = useTranslations("starOfMonth");
  const cls = status === "NOMINATING" ? "border-amber-300 bg-amber-50 text-amber-800"
    : status === "VOTING" ? "border-sky-300 bg-sky-50 text-sky-800"
      : "border-slate-300 bg-slate-100 text-slate-600";
  return <Badge variant="outline" className={cn("text-xs", cls)}>{t(`status.${status}`)}</Badge>;
}

/** The name the server embeds, else the shared employee list, else a short id. */
function useCandidateName() {
  const { data } = useEmployeesBasicList();
  const employees = Array.isArray(data) ? data : [];
  return (c: StarCandidate) => {
    const e = c.employee ?? employees.find((x) => x.id === c.employeeId);
    const name = e ? `${e.firstNameAr ?? ""} ${e.lastNameAr ?? ""}`.trim() : "";
    return { name: name || c.employeeId.slice(0, 8), number: e?.employeeNumber };
  };
}

function CompanyList({
  cycle, company, viewer, onVote, onTieBreak,
}: {
  cycle: StarCycle;
  company: StarCompany;
  viewer: Viewer;
  onVote: (v: PendingVote) => void;
  onTieBreak: (candidate: StarCandidate, name: string) => void;
}) {
  const t = useTranslations("starOfMonth");
  const nameOf = useCandidateName();
  const [nominateOpen, setNominateOpen] = useState(false);
  const all = cycle.candidatesByCompany[company] ?? [];
  const closed = cycle.status === "CLOSED";

  // Before the close: highest automatic score first, HR's nominee last. After:
  // by final score — the results only arrive once voting has closed.
  const ordered = closed
    ? [...all].sort((a, b) => (b.finalScore ?? -1) - (a.finalScore ?? -1))
    : [
      ...all.filter((c) => c.source !== "HR").sort((a, b) => (b.autoScoreTotal ?? 0) - (a.autoScoreTotal ?? 0)),
      ...all.filter((c) => c.source === "HR"),
    ];

  // The winner: named by the server when it says so, else the one clear top score.
  const top = closed ? Math.max(...all.map((c) => c.finalScore ?? -1)) : -1;
  const leaders = closed ? all.filter((c) => (c.finalScore ?? -1) === top && top >= 0) : [];
  const named = all.find((c) => c.isWinner);
  const winnerId = named?.id ?? (leaders.length === 1 ? leaders[0].id : undefined);
  const tie = closed && !named && leaders.length > 1;

  const myVoteFor = (kind: StarVoteKind) => viewer.myVotes.find((v) => v.company === company && v.kind === kind);
  const peerVote = myVoteFor("PEER");
  const managerVote = myVoteFor("MANAGER");
  const ceoVote = myVoteFor("CEO");
  // Colleagues vote only in their own company's list.
  const inMyCompany = !!viewer.company && viewer.company === company;
  const hasHr = all.some((c) => c.source === "HR");
  const canAddHr = viewer.canNominate && cycle.status === "NOMINATING" && !hasHr;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-3">
        <CardTitle className="text-base">{COMPANY_NAME[company]}</CardTitle>
        <span className="text-xs text-muted-foreground">{t("candidatesCount", { count: all.length })}</span>
      </CardHeader>
      <CardContent className="space-y-3">
        {tie && (
          <p className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
            {viewer.canCeoVote ? t("tieCeo") : t("tieWaiting")}
          </p>
        )}
        {all.filter((c) => c.source !== "HR").length === 0 && (
          <p className="rounded-md border border-dashed p-4 text-center text-sm text-muted-foreground">{t("noEligible")}</p>
        )}
        {ordered.map((c) => {
          const { name, number } = nameOf(c);
          const autoRank = c.source === "HR" ? undefined
            : ordered.filter((x) => x.source !== "HR").indexOf(c) + 1;
          const isSelf = !!viewer.employeeId && c.employeeId === viewer.employeeId;
          const actions: { kind: StarVoteKind; label: string }[] = [];
          if (cycle.status === "VOTING") {
            if (viewer.canPeerVote && inMyCompany && !peerVote && !isSelf) actions.push({ kind: "PEER", label: t("voteAction.PEER") });
            if (viewer.canManagerVote && !managerVote) actions.push({ kind: "MANAGER", label: t("voteAction.MANAGER") });
            if (viewer.canCeoVote && !ceoVote) actions.push({ kind: "CEO", label: t("voteAction.CEO") });
          }
          const myMarks: StarVoteKind[] = [peerVote, managerVote, ceoVote]
            .filter((v): v is StarMyVote => !!v && v.candidateId === c.id)
            .map((v) => v.kind);
          return (
            <CandidateCard
              key={c.id}
              candidate={c}
              name={name}
              number={number}
              rank={closed ? undefined : autoRank}
              closed={closed}
              isWinner={c.id === winnerId}
              inTie={tie && leaders.some((l) => l.id === c.id)}
              myMarks={myMarks}
              voteActions={actions.map((a) => ({
                ...a,
                onClick: () => onVote({ kind: a.kind, company, candidate: c, name }),
              }))}
              onTieBreak={tie && viewer.canCeoVote && leaders.some((l) => l.id === c.id) ? () => onTieBreak(c, name) : undefined}
              extra={c.id === winnerId ? <WinnerPanel cycle={cycle} company={company} candidate={c} canReward={viewer.canReward} /> : undefined}
            />
          );
        })}
        {canAddHr && (
          <Button variant="outline" className="w-full gap-2 border-dashed" onClick={() => setNominateOpen(true)}>
            <UserPlus className="h-4 w-4" />
            {t("addHrNominee")}
          </Button>
        )}
        {cycle.status === "VOTING" && inMyCompany && peerVote && (
          <p className="text-center text-xs text-muted-foreground">{t("youVoted")}</p>
        )}
      </CardContent>
      <HrNomineeDialog
        open={nominateOpen}
        onOpenChange={setNominateOpen}
        cycle={cycle}
        company={company}
        excludeIds={all.map((c) => c.employeeId)}
      />
    </Card>
  );
}

function CandidateCard({
  candidate: c, name, number, rank, closed, isWinner, inTie, myMarks, voteActions, onTieBreak, extra,
}: {
  candidate: StarCandidate;
  name: string;
  number?: string;
  rank?: number;
  closed: boolean;
  isWinner: boolean;
  inTie: boolean;
  /** Which of my own votes went to this candidate. */
  myMarks: StarVoteKind[];
  voteActions: { kind: StarVoteKind; label: string; onClick: () => void }[];
  onTieBreak?: () => void;
  /** The winner's photo, reward and comments. */
  extra?: ReactNode;
}) {
  const t = useTranslations("starOfMonth");
  const isHr = c.source === "HR";

  return (
    <div className={cn(
      "rounded-lg border p-3",
      isHr && "border-violet-200 bg-violet-50/40 dark:border-violet-900 dark:bg-violet-950/20",
      isWinner && "border-amber-400 bg-amber-50/60 ring-1 ring-amber-300 dark:bg-amber-950/30",
    )}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span className={cn(
            "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold",
            isWinner ? "bg-amber-400 text-white" : rank === 1 ? "bg-amber-100 text-amber-700" : "bg-muted text-muted-foreground",
          )}>
            {isWinner ? <Crown className="h-4 w-4" /> : isHr ? "HR" : rank ?? "•"}
          </span>
          <div className="min-w-0">
            <p className="truncate font-medium">{name}</p>
            <div className="flex flex-wrap items-center gap-1">
              {number && <span className="font-mono text-xs text-muted-foreground">{number}</span>}
              {isHr && <Badge variant="outline" className="border-violet-300 text-[10px] text-violet-700">{t("hrNominee")}</Badge>}
              {isWinner && <Badge className="bg-amber-500 text-[10px] hover:bg-amber-500">{t("winner")}</Badge>}
              {inTie && <Badge variant="outline" className="border-amber-400 text-[10px] text-amber-800">{t("tie")}</Badge>}
            </div>
          </div>
        </div>
        <div className="shrink-0 text-end">
          {closed ? (
            <>
              <p className="text-lg font-bold tabular-nums leading-none">
                {fmtNum(c.finalScore)}<span className="text-xs font-normal text-muted-foreground"> / 100</span>
              </p>
              <p className="text-[10px] text-muted-foreground">{t("finalScore")}</p>
            </>
          ) : !isHr ? (
            <>
              <p className="text-lg font-bold tabular-nums leading-none">
                {fmtNum(c.autoScoreTotal)}<span className="text-xs font-normal text-muted-foreground"> / 30</span>
              </p>
              <p className="text-[10px] text-muted-foreground">{t("autoScore")}</p>
            </>
          ) : null}
        </div>
      </div>

      {closed ? (
        // The full breakdown, out of 100.
        <div className="mt-3 grid grid-cols-4 gap-2">
          <ScoreCell label={t("parts.auto")} score={isHr ? null : c.autoScoreTotal} max={30} />
          <ScoreCell label={t("parts.peers")} score={c.peerVoteScore ?? null} max={40} />
          <ScoreCell label={t("parts.manager")} score={c.managerVoteScore ?? null} max={10} />
          <ScoreCell label={t("parts.ceo")} score={c.ceoVoteScore ?? null} max={20} />
        </div>
      ) : isHr ? (
        <p className="mt-2 text-xs text-muted-foreground">{t("hrNomineeHint")}</p>
      ) : (
        <div className="mt-3 grid grid-cols-3 gap-2">
          <ScoreCell label={t("criteria.lateness")} score={c.latenessScore} max={10}
            detail={t("lateMinutes", { value: fmtNum(c.lateMinutesTotal, 0) })} />
          <ScoreCell label={t("criteria.leave")} score={c.leaveScore} max={10}
            detail={t("leaveDays", { value: fmtNum(c.leaveUnitsTotal) })} />
          <ScoreCell label={t("criteria.substitute")} score={c.substituteScore} max={10}
            detail={t("substituteTimes", { value: fmtNum(c.substituteCount, 0) })} />
        </div>
      )}

      {(myMarks.length > 0 || voteActions.length > 0 || onTieBreak) && (
        <div className="mt-3 flex flex-wrap items-center gap-2 border-t pt-3">
          {myMarks.map((k) => (
            <Badge key={k} variant="outline" className="gap-1 border-green-300 bg-green-50 text-xs text-green-800">
              <Check className="h-3 w-3" />
              {t(`myVote.${k}`)}
            </Badge>
          ))}
          {voteActions.map((a) => (
            <Button key={a.kind} size="sm" variant={a.kind === "PEER" ? "default" : "outline"} className="h-8 gap-1.5" onClick={a.onClick}>
              <Vote className="h-3.5 w-3.5" />
              {a.label}
            </Button>
          ))}
          {onTieBreak && (
            <Button size="sm" className="h-8 gap-1.5 bg-amber-500 hover:bg-amber-600" onClick={onTieBreak}>
              <Crown className="h-3.5 w-3.5" />
              {t("pickWinner")}
            </Button>
          )}
        </div>
      )}
      {extra}
    </div>
  );
}

/** The settled winner: photo (management sets it), reward (once), and comments. */
function WinnerPanel({
  cycle, company, candidate: c, canReward,
}: { cycle: StarCycle; company: StarCompany; candidate: StarCandidate; canReward: boolean }) {
  const t = useTranslations("starOfMonth");
  const fileRef = useRef<HTMLInputElement>(null);
  const image = useStarWinnerImage();
  const [rewardOpen, setRewardOpen] = useState(false);
  const [commentsOpen, setCommentsOpen] = useState(false);

  const rewardText = c.rewardType === "CASH"
    ? t("rewardCash", { amount: fmtNum(c.rewardAmount ?? 50) })
    : c.rewardType === "PAID_LEAVE"
      ? t("rewardLeave", { days: fmtNum(c.rewardDays, 0) })
      : null;

  return (
    <div className="mt-3 space-y-3 border-t border-amber-200 pt-3">
      <div className="flex items-center gap-3">
        <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-lg border bg-muted">
          {c.imageUrl
            ? <img src={assetUrl(c.imageUrl)} alt="" className="h-full w-full object-cover" />
            : <Star className="h-6 w-6 text-amber-400" />}
        </div>
        <div className="min-w-0 flex-1 space-y-1.5">
          <p className="flex items-center gap-1.5 text-sm">
            <Gift className="h-4 w-4 text-amber-600" />
            {rewardText ?? <span className="text-muted-foreground">{t("noRewardYet")}</span>}
          </p>
          {canReward && (
            <div className="flex flex-wrap gap-2">
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  e.target.value = "";
                  if (file) image.mutate({ year: cycle.year, month: cycle.month, company, employeeId: c.employeeId, file });
                }}
              />
              <Button size="sm" variant="outline" className="h-8 gap-1.5" disabled={image.isPending} onClick={() => fileRef.current?.click()}>
                {image.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ImagePlus className="h-3.5 w-3.5" />}
                {c.imageUrl ? t("changeImage") : t("addImage")}
              </Button>
              {!c.rewardType && (
                <Button size="sm" className="h-8 gap-1.5" onClick={() => setRewardOpen(true)}>
                  <Gift className="h-3.5 w-3.5" />
                  {t("setReward")}
                </Button>
              )}
            </div>
          )}
        </div>
      </div>

      <Button variant="ghost" size="sm" className="h-8 gap-1.5 px-2" onClick={() => setCommentsOpen((v) => !v)}>
        <MessageCircle className="h-4 w-4" />
        {commentsOpen ? t("hideComments") : t("showComments")}
      </Button>
      {commentsOpen && <StarComments candidateId={c.id} />}

      <RewardDialog open={rewardOpen} onOpenChange={setRewardOpen} cycle={cycle} company={company} />
    </div>
  );
}

function RewardDialog({
  open, onOpenChange, cycle, company,
}: { open: boolean; onOpenChange: (o: boolean) => void; cycle: StarCycle; company: StarCompany }) {
  const t = useTranslations("starOfMonth");
  const reward = useStarReward();
  const [type, setType] = useState<"CASH" | "PAID_LEAVE">("CASH");
  const [amount, setAmount] = useState("50");
  const [days, setDays] = useState("");
  const amountN = Number(amount);
  const daysN = Number(days);
  const valid = type === "CASH"
    ? amount.trim() !== "" && Number.isFinite(amountN) && amountN > 0
    : Number.isInteger(daysN) && daysN > 0;

  const submit = async () => {
    if (!valid) return;
    try {
      await reward.mutateAsync({
        year: cycle.year,
        month: cycle.month,
        dto: type === "CASH" ? { company, rewardType: "CASH", amount: amountN } : { company, rewardType: "PAID_LEAVE", days: daysN },
      });
      onOpenChange(false);
    } catch {
      // Toasted by the hook.
    }
  };

  const options = [
    { value: "CASH" as const, label: t("rewardTypeCash"), hint: t("rewardTypeCashHint") },
    { value: "PAID_LEAVE" as const, label: t("rewardTypeLeave"), hint: t("rewardTypeLeaveHint") },
  ];

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!reward.isPending) onOpenChange(o); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("rewardTitle", { company: COMPANY_NAME[company] })}</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-2" role="radiogroup">
          {options.map((o) => (
            <button
              key={o.value}
              type="button"
              role="radio"
              aria-checked={type === o.value}
              onClick={() => setType(o.value)}
              className={cn(
                "rounded-md border p-3 text-start transition-colors",
                type === o.value ? "border-primary bg-primary/5 ring-1 ring-primary" : "hover:bg-muted/50",
              )}
            >
              <span className="block text-sm font-medium">{o.label}</span>
              <span className="block text-xs text-muted-foreground">{o.hint}</span>
            </button>
          ))}
        </div>
        {type === "CASH" ? (
          <div className="space-y-1.5">
            <Label htmlFor="reward-amount">{t("rewardAmount")}</Label>
            <Input id="reward-amount" type="number" min={0} step="any" dir="ltr" value={amount} onChange={(e) => setAmount(e.target.value)} />
          </div>
        ) : (
          <div className="space-y-1.5">
            <Label htmlFor="reward-days">{t("rewardDays")}</Label>
            <Input id="reward-days" type="number" min={1} step={1} dir="ltr" value={days} onChange={(e) => setDays(e.target.value)} />
          </div>
        )}
        <p className="text-xs text-muted-foreground">{t("rewardOnce")}</p>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={reward.isPending}>{t("cancel")}</Button>
          <Button onClick={submit} disabled={!valid || reward.isPending}>
            {reward.isPending && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
            {t("confirmReward")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** One part of the score, against its maximum, with an optional raw figure. */
function ScoreCell({ label, score, max, detail }: { label: string; score: number | null; max: number; detail?: string }) {
  const pct = score == null ? 0 : Math.max(0, Math.min(100, (score / max) * 100));
  return (
    <div className="space-y-1 rounded-md bg-muted/40 p-2">
      <p className="truncate text-[11px] text-muted-foreground">{label}</p>
      <p className="text-sm font-semibold tabular-nums">
        {fmtNum(score)}
        <span className="text-[10px] font-normal text-muted-foreground"> / {max}</span>
      </p>
      <div className="h-1 overflow-hidden rounded-full bg-muted">
        <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
      </div>
      {detail && <p className="truncate text-[10px] text-muted-foreground">{detail}</p>}
    </div>
  );
}

function HrNomineeDialog({
  open, onOpenChange, cycle, company, excludeIds,
}: {
  open: boolean; onOpenChange: (o: boolean) => void; cycle: StarCycle; company: StarCompany; excludeIds: string[];
}) {
  const t = useTranslations("starOfMonth");
  const add = useAddStarHrNominee();
  const { data: employees = [] } = useEmployeesByCompany(open ? company : null);
  const [employeeId, setEmployeeId] = useState("");
  const [pickerOpen, setPickerOpen] = useState(false);
  // Someone already on the list can't be nominated again.
  const options = employees.filter((e) => !excludeIds.includes(e.id));
  const picked = employees.find((e) => e.id === employeeId);

  const submit = async () => {
    if (!employeeId) return;
    try {
      await add.mutateAsync({ year: cycle.year, month: cycle.month, company, employeeId });
      setEmployeeId("");
      onOpenChange(false);
    } catch {
      // Toasted by the hook (e.g. a penalty this month).
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!add.isPending) onOpenChange(o); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("addHrNomineeTitle", { company: COMPANY_NAME[company] })}</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">{t("addHrNomineeHint")}</p>
        <Popover open={pickerOpen} onOpenChange={setPickerOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" role="combobox" className={cn("w-full justify-between font-normal", !picked && "text-muted-foreground")}>
              <span className="truncate">{picked ? `${picked.firstNameAr} ${picked.lastNameAr}` : t("selectEmployee")}</span>
              <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-(--radix-popover-trigger-width) p-0" align="start">
            <Command>
              <CommandInput placeholder={t("searchEmployee")} />
              <CommandList>
                <CommandEmpty>{t("noEmployees")}</CommandEmpty>
                <CommandGroup>
                  {options.map((e) => (
                    <CommandItem
                      key={e.id}
                      value={`${e.firstNameAr} ${e.lastNameAr} ${e.employeeNumber ?? ""}`}
                      onSelect={() => { setEmployeeId(e.id); setPickerOpen(false); }}
                    >
                      <Check className={cn("h-4 w-4", e.id === employeeId ? "opacity-100" : "opacity-0")} />
                      <span className="truncate">{e.firstNameAr} {e.lastNameAr}</span>
                      {e.employeeNumber && <span className="ms-auto font-mono text-xs text-muted-foreground">{e.employeeNumber}</span>}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={add.isPending}>{t("cancel")}</Button>
          <Button onClick={submit} disabled={!employeeId || add.isPending}>
            {add.isPending && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
            {t("add")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
