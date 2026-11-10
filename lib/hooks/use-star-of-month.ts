import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { starOfMonthApi, StarCompany, StarQuarter, StarRewardDto, StarVoteKind } from "@/lib/api/star-of-month";
import { documentsApi } from "@/lib/api/documents";
import { apiErrorCode, apiErrorMessage } from "@/lib/api/api-errors";

const KEY = "star-of-month";

/** A missing cycle comes back as `notGenerated`, not as an error. */
export function useStarCycle(year: number, month: number) {
  return useQuery({
    queryKey: [KEY, year, month],
    queryFn: async () => {
      try {
        return { cycle: await starOfMonthApi.getCycle(year, month), notGenerated: false };
      } catch (e) {
        const status = (e as { response?: { status?: number } })?.response?.status;
        if (status === 404 || apiErrorCode(e) === "CYCLE_NOT_FOUND") return { cycle: null, notGenerated: true };
        throw e;
      }
    },
  });
}

export function useGenerateStarCycle() {
  const qc = useQueryClient();
  const t = useTranslations("starOfMonth");
  return useMutation({
    mutationFn: ({ year, month }: { year: number; month: number }) => starOfMonthApi.generate(year, month),
    onSuccess: (_, { year, month }) => {
      qc.invalidateQueries({ queryKey: [KEY, year, month] });
      toast.success(t("generated"));
    },
    onError: (e: unknown) => toast.error(apiErrorMessage(e, t("error"))),
  });
}

export function useMyStarVotes(year: number, month: number, enabled: boolean) {
  return useQuery({
    queryKey: [KEY, year, month, "my-vote"],
    queryFn: () => starOfMonthApi.myVotes(year, month),
    enabled,
  });
}

/** Open voting, close it, or break a tie — each changes the whole cycle. */
export function useStarCycleAction() {
  const qc = useQueryClient();
  const t = useTranslations("starOfMonth");
  return useMutation({
    mutationFn: (a: { year: number; month: number } & (
      | { action: "open" } | { action: "close" } | { action: "tieBreak"; company: StarCompany; employeeId: string }
    )) => {
      if (a.action === "open") return starOfMonthApi.openVoting(a.year, a.month);
      if (a.action === "close") return starOfMonthApi.close(a.year, a.month);
      return starOfMonthApi.tieBreak(a.year, a.month, { company: a.company, employeeId: a.employeeId });
    },
    onSuccess: (_, a) => {
      qc.invalidateQueries({ queryKey: [KEY, a.year, a.month] });
      toast.success(t(a.action === "open" ? "votingOpened" : a.action === "close" ? "votingClosed" : "tieBroken"));
    },
    onError: (e: unknown) => toast.error(apiErrorMessage(e, t("error"))),
  });
}

export function useCastStarVote() {
  const qc = useQueryClient();
  const t = useTranslations("starOfMonth");
  return useMutation({
    mutationFn: (v: { year: number; month: number; kind: StarVoteKind; company: StarCompany; candidateId: string }) =>
      starOfMonthApi.vote(v.year, v.month, v.kind, { company: v.company, candidateId: v.candidateId }),
    onSuccess: (_, v) => {
      qc.invalidateQueries({ queryKey: [KEY, v.year, v.month, "my-vote"] });
      toast.success(t("voted"));
    },
    onError: (e: unknown) => {
      // A vote already cast is a state the page should catch up with, not just an error.
      if (apiErrorCode(e) === "ALREADY_VOTED") qc.invalidateQueries({ queryKey: [KEY] });
      toast.error(apiErrorCode(e) === "ALREADY_VOTED" ? t("alreadyVoted") : apiErrorMessage(e, t("error")));
    },
  });
}

export function useCurrentStars() {
  return useQuery({ queryKey: [KEY, "current"], queryFn: starOfMonthApi.current, staleTime: 5 * 60 * 1000 });
}

export function useStarReward() {
  const qc = useQueryClient();
  const t = useTranslations("starOfMonth");
  return useMutation({
    mutationFn: ({ year, month, dto }: { year: number; month: number; dto: StarRewardDto }) =>
      starOfMonthApi.reward(year, month, dto),
    onSuccess: (_, { year, month }) => {
      qc.invalidateQueries({ queryKey: [KEY, year, month] });
      toast.success(t("rewarded"));
    },
    onError: (e: unknown) => {
      const code = apiErrorCode(e);
      toast.error(code === "ALREADY_REWARDED" ? t("alreadyRewarded")
        : code === "NO_WINNER_YET" ? t("noWinnerYet") : apiErrorMessage(e, t("error")));
    },
  });
}

/** Uploads the photo to the winner's own documents, then hands the link over. */
export function useStarWinnerImage() {
  const qc = useQueryClient();
  const t = useTranslations("starOfMonth");
  return useMutation({
    mutationFn: async ({ year, month, company, employeeId, file }: {
      year: number; month: number; company: StarCompany; employeeId: string; file: File;
    }) => {
      const { fileUrl } = await documentsApi.upload({ file, employeeId, type: "PHOTO", titleAr: "صورة نجم الشهر" });
      await starOfMonthApi.setWinnerImage(year, month, { company, imageUrl: fileUrl });
    },
    onSuccess: (_, { year, month }) => {
      qc.invalidateQueries({ queryKey: [KEY, year, month] });
      qc.invalidateQueries({ queryKey: [KEY, "current"] });
      toast.success(t("imageSaved"));
    },
    onError: (e: unknown) => toast.error(apiErrorMessage(e, t("error"))),
  });
}

export function useStarComments(candidateId: string | undefined) {
  return useQuery({
    queryKey: [KEY, "comments", candidateId],
    queryFn: () => starOfMonthApi.comments(candidateId!),
    enabled: !!candidateId,
  });
}

export function useAddStarComment(candidateId: string) {
  const qc = useQueryClient();
  const t = useTranslations("starOfMonth");
  return useMutation({
    mutationFn: (text: string) => starOfMonthApi.addComment(candidateId, text),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY, "comments", candidateId] }),
    onError: (e: unknown) => toast.error(apiErrorMessage(e, t("error"))),
  });
}

export function useDeleteStarComment(candidateId: string) {
  const qc = useQueryClient();
  const t = useTranslations("starOfMonth");
  return useMutation({
    mutationFn: (commentId: string) => starOfMonthApi.deleteComment(commentId),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY, "comments", candidateId] }),
    onError: (e: unknown) => toast.error(apiErrorMessage(e, t("error"))),
  });
}

export function useAddStarHrNominee() {
  const qc = useQueryClient();
  const t = useTranslations("starOfMonth");
  return useMutation({
    mutationFn: ({ year, month, company, employeeId }: { year: number; month: number; company: StarCompany; employeeId: string }) =>
      starOfMonthApi.addHrNominee(year, month, { company, employeeId }),
    onSuccess: (_, { year, month }) => {
      qc.invalidateQueries({ queryKey: [KEY, year, month] });
      toast.success(t("nomineeAdded"));
    },
    onError: (e: unknown) => toast.error(apiErrorMessage(e, t("error"))),
  });
}

// ── Star of the quarter ──

export function useStarQuarter(year: number, quarter: StarQuarter) {
  return useQuery({
    queryKey: [KEY, "quarter", year, quarter],
    queryFn: () => starOfMonthApi.quarter(year, quarter),
  });
}

/** HR: compute a company's quarter by hand, or settle its tie. */
export function useStarQuarterAction() {
  const qc = useQueryClient();
  const t = useTranslations("starOfMonth.quarter");
  return useMutation({
    mutationFn: (a: { year: number; quarter: StarQuarter; company: StarCompany } & (
      | { action: "compute" } | { action: "tieBreak"; employeeId: string }
    )) => a.action === "compute"
      ? starOfMonthApi.computeQuarter(a.year, a.quarter, a.company)
      : starOfMonthApi.quarterTieBreak(a.year, a.quarter, { company: a.company, employeeId: a.employeeId }),
    onSuccess: (_, a) => {
      qc.invalidateQueries({ queryKey: [KEY, "quarter", a.year, a.quarter] });
      toast.success(t(a.action === "compute" ? "computed" : "tieBroken"));
    },
    onError: (e: unknown, a) => {
      // A 400 on compute means the quarter isn't over yet; the server's own wording is colloquial.
      const status = (e as { response?: { status?: number } })?.response?.status;
      toast.error(a.action === "compute" && status === 400 ? t("notReady") : apiErrorMessage(e, t("error")));
    },
  });
}

/** Opens the certificate PDF in a new tab. */
export function useStarQuarterCertificate() {
  const t = useTranslations("starOfMonth.quarter");
  return useMutation({
    mutationFn: ({ year, quarter, company }: { year: number; quarter: StarQuarter; company: StarCompany }) =>
      starOfMonthApi.quarterCertificate(year, quarter, company),
    onSuccess: (blob) => {
      const url = URL.createObjectURL(blob);
      window.open(url);
      setTimeout(() => URL.revokeObjectURL(url), 10000);
    },
    onError: () => toast.error(t("certificateFailed")),
  });
}
