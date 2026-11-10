import { apiClient } from "./client";

// Star of the month: the monthly lists and their automatic scores, HR's own
// nominee (phase 1), voting, closing and tie-breaks (phase 2), then the
// winner's reward, photo and comments (phase 3). Notifications and the title in
// the employee's dossier are all server-side.

export type StarCompany = "VITASYR" | "VITAXIR";
export const STAR_COMPANIES: StarCompany[] = ["VITASYR", "VITAXIR"];

export type StarCycleStatus = "NOMINATING" | "VOTING" | "CLOSED";

/** PEER: a colleague (own company only). MANAGER / CEO: either company. */
export type StarVoteKind = "PEER" | "MANAGER" | "CEO";

export interface StarCandidate {
  id: string;
  employeeId: string;
  /** Sent when the server includes it; otherwise the name is looked up. */
  employee?: { id: string; firstNameAr?: string; lastNameAr?: string; employeeNumber?: string; profilePhoto?: string | null } | null;
  company: StarCompany;
  /** AUTO: picked by the system. HR: added by HR (scored by votes only, later). */
  source: "AUTO" | "HR";
  /** Each out of 10; null for an HR nominee. */
  latenessScore: number | null;
  leaveScore: number | null;
  substituteScore: number | null;
  /** Out of 30; null for an HR nominee until voting exists. */
  autoScoreTotal: number | null;
  /** Raw figures behind the scores, for display. */
  lateMinutesTotal: number | null;
  /** Days; hourly leave counted as hours ÷ 8. */
  leaveUnitsTotal: number | null;
  substituteCount: number | null;
  // Results: kept back by the server until the cycle is CLOSED.
  /** Out of 40. */
  peerVoteScore?: number | null;
  /** 0 or 10. */
  managerVoteScore?: number | null;
  /** 0 or 20. */
  ceoVoteScore?: number | null;
  /** Out of 100 (an HR nominee's vote-only score, scaled up to 100). */
  finalScore?: number | null;
  /** Set when the server names the winner (after close, or a CEO tie-break). */
  isWinner?: boolean | null;
  /** The winner's photo, once set. */
  imageUrl?: string | null;
  /** Set once management has chosen the reward. */
  rewardType?: StarRewardType | null;
  rewardAmount?: number | null;
  rewardDays?: number | null;
}

/** CASH goes into the winner's payroll; PAID_LEAVE adds days to annual leave. */
export type StarRewardType = "CASH" | "PAID_LEAVE";
export type StarRewardDto =
  | { company: StarCompany; rewardType: "CASH"; amount?: number }
  | { company: StarCompany; rewardType: "PAID_LEAVE"; days: number };

/** The latest closed cycle's winners, for the home page. */
export interface StarCurrent {
  cycle: { year: number; month: number } | null;
  winners: {
    company: StarCompany;
    employeeId: string;
    /** The winner's candidate id — the key for comments. Sent by the server when available. */
    candidateId?: string;
    employee?: StarCandidate["employee"];
    imageUrl?: string | null;
    title: string;
    finalScore?: number | null;
  }[];
}

export interface StarComment {
  id: string;
  candidateId?: string;
  text: string;
  authorEmployeeId?: string | null;
  author?: { id: string; firstNameAr?: string; lastNameAr?: string; profilePhoto?: string | null } | null;
  createdAt: string;
}

export interface StarCycle {
  id: string;
  year: number;
  /** 1–12: the month being judged (the one that ended). */
  month: number;
  status: StarCycleStatus;
  nominationGeneratedAt?: string | null;
  votingOpenedAt?: string | null;
  /** Three days after voting opens; closed by the server on the hour after that. */
  votingClosesAt?: string | null;
  closedAt?: string | null;
  candidates: StarCandidate[];
  candidatesByCompany: Partial<Record<StarCompany, StarCandidate[]>>;
}

const num = (v: unknown) => (v == null || v === "" ? null : Number(v));
const normCandidate = (c: StarCandidate): StarCandidate => ({
  ...c,
  latenessScore: num(c.latenessScore),
  leaveScore: num(c.leaveScore),
  substituteScore: num(c.substituteScore),
  autoScoreTotal: num(c.autoScoreTotal),
  lateMinutesTotal: num(c.lateMinutesTotal),
  leaveUnitsTotal: num(c.leaveUnitsTotal),
  substituteCount: num(c.substituteCount),
  peerVoteScore: num(c.peerVoteScore),
  managerVoteScore: num(c.managerVoteScore),
  ceoVoteScore: num(c.ceoVoteScore),
  finalScore: num(c.finalScore),
  rewardAmount: num(c.rewardAmount),
  rewardDays: num(c.rewardDays),
});

/** One of my own votes. */
export interface StarMyVote {
  company: StarCompany;
  candidateId: string;
  kind: StarVoteKind;
}

/**
 * The shape of /my-vote isn't fixed in the API notes, so a list of votes is read
 * from the likely places, each vote's kind from its own field or its key.
 */
const normMyVotes = (data: unknown): StarMyVote[] => {
  const d = (data as { data?: unknown })?.data ?? data;
  const kindOf = (v: Record<string, unknown>, fallback: StarVoteKind): StarVoteKind => {
    const k = String(v.voteType ?? v.type ?? v.kind ?? v.role ?? fallback).toUpperCase();
    return k.includes("CEO") ? "CEO" : k.includes("MANAGER") ? "MANAGER" : "PEER";
  };
  const fromList = (list: unknown, fallback: StarVoteKind): StarMyVote[] =>
    (Array.isArray(list) ? list : []).filter((v) => v && (v as { candidateId?: string }).candidateId).map((v) => ({
      company: (v as { company: StarCompany }).company,
      candidateId: (v as { candidateId: string }).candidateId,
      kind: kindOf(v as Record<string, unknown>, fallback),
    }));
  if (Array.isArray(d)) return fromList(d, "PEER");
  const o = (d ?? {}) as Record<string, unknown>;
  return [
    ...fromList(o.votes ?? o.items, "PEER"),
    ...fromList(o.peerVotes, "PEER"),
    ...fromList(o.managerVotes, "MANAGER"),
    ...fromList(o.ceoVotes, "CEO"),
  ];
};
const normCycle = (data: unknown): StarCycle => {
  const c = ((data as { data?: StarCycle })?.data ?? data) as StarCycle;
  const byCompany: StarCycle["candidatesByCompany"] = {};
  for (const company of STAR_COMPANIES) {
    // Grouped by the server when it sends the map; from the flat list otherwise.
    const list = c.candidatesByCompany?.[company] ?? (c.candidates ?? []).filter((x) => x.company === company);
    byCompany[company] = list.map(normCandidate);
  }
  return { ...c, candidates: (c.candidates ?? []).map(normCandidate), candidatesByCompany: byCompany };
};

const BASE = "/star-of-month";

export const starOfMonthApi = {
  /** 404 (CYCLE_NOT_FOUND) while the month's lists haven't been generated. */
  getCycle: async (year: number, month: number): Promise<StarCycle> =>
    normCycle((await apiClient.get(`${BASE}/${year}/${month}`)).data),

  /**
   * Works the automatic lists out again for both companies. Runs by itself on
   * the 1st at 1 a.m. (Damascus) for the month just ended; refused (400) once
   * the cycle is VOTING or CLOSED.
   */
  generate: async (year: number, month: number): Promise<StarCycle> =>
    normCycle((await apiClient.post(`${BASE}/${year}/${month}/generate`)).data),

  /** HR: NOMINATING → VOTING, open for three days from now. */
  openVoting: async (year: number, month: number): Promise<StarCycle> =>
    normCycle((await apiClient.post(`${BASE}/${year}/${month}/open-voting`)).data),

  /**
   * One vote per list. PEER: own company only, never oneself; ALREADY_VOTED (400)
   * on a second try. MANAGER and CEO vote in both companies.
   */
  vote: async (year: number, month: number, kind: StarVoteKind, dto: { company: StarCompany; candidateId: string }) => {
    const path = kind === "CEO" ? "ceo-vote" : kind === "MANAGER" ? "manager-vote" : "vote";
    await apiClient.post(`${BASE}/${year}/${month}/${path}`, dto);
  },

  /** Only my own votes — no one else's are ever readable. */
  myVotes: async (year: number, month: number): Promise<StarMyVote[]> =>
    normMyVotes((await apiClient.get(`${BASE}/${year}/${month}/my-vote`)).data),

  /** Closes early and freezes the scores; otherwise the server closes it after three days. */
  close: async (year: number, month: number): Promise<StarCycle> =>
    normCycle((await apiClient.post(`${BASE}/${year}/${month}/close`)).data),

  /** CEO only, on a CLOSED cycle with a real tie at the top (else 400 NO_TIE). */
  tieBreak: async (year: number, month: number, dto: { company: StarCompany; employeeId: string }): Promise<StarCycle> =>
    normCycle((await apiClient.post(`${BASE}/${year}/${month}/tie-break`, dto)).data),

  /**
   * Management, once the winner is settled (else NO_WINNER_YET). CASH defaults to
   * 50 and goes into payroll by itself; PAID_LEAVE needs `days`. Once only
   * (ALREADY_REWARDED).
   */
  reward: async (year: number, month: number, dto: StarRewardDto): Promise<void> => {
    await apiClient.post(`${BASE}/${year}/${month}/reward`, dto);
  },

  /** The image is uploaded first; only its link is sent. */
  setWinnerImage: async (year: number, month: number, dto: { company: StarCompany; imageUrl: string }): Promise<void> => {
    await apiClient.post(`${BASE}/${year}/${month}/winner-image`, dto);
  },

  /** Always the latest closed cycle, which need not be this calendar month. */
  current: async (): Promise<StarCurrent> => {
    const { data } = await apiClient.get(`${BASE}/current`);
    const d = (data?.data ?? data) as Partial<StarCurrent> | null;
    return {
      cycle: d?.cycle ?? null,
      winners: (d?.winners ?? []).map((w) => ({ ...w, finalScore: num(w.finalScore) })),
    };
  },

  // Comments live under /candidates/… so they can't clash with /:year/:month.
  comments: async (candidateId: string): Promise<StarComment[]> => {
    const { data } = await apiClient.get(`${BASE}/candidates/${candidateId}/comments`);
    const d = data?.data ?? data;
    return Array.isArray(d) ? d : d?.items ?? [];
  },
  addComment: async (candidateId: string, text: string): Promise<StarComment> => {
    const { data } = await apiClient.post(`${BASE}/candidates/${candidateId}/comments`, { text });
    return data?.data ?? data;
  },
  /** HR only (star_of_month.moderate_comments). */
  deleteComment: async (commentId: string): Promise<void> => {
    await apiClient.delete(`${BASE}/comments/${commentId}`);
  },

  /** One per company per cycle; the employee must be active, in that company, with no penalty that month. */
  addHrNominee: async (year: number, month: number, dto: { company: StarCompany; employeeId: string }): Promise<StarCycle> =>
    normCycle((await apiClient.post(`${BASE}/${year}/${month}/hr-nominee`, dto)).data),
};
