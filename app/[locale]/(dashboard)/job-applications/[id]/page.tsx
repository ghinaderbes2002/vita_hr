"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter, useParams } from "next/navigation";
import { format } from "date-fns";
import {
  ArrowRight, Download, Linkedin, Star, Phone, Mail, Building2, User,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useJobApplication, useUpdateJobApplication } from "@/lib/hooks/use-job-applications";
import { CV_BASE_URL } from "@/lib/api/job-applications";
import { JobApplicationStatus } from "@/types";
import { EmployeeDialog } from "@/components/features/employees/employee-dialog";

const STATUS_CONFIG: Record<JobApplicationStatus, { bg: string; label: string }> = {
  PENDING:         { bg: "bg-amber-100 text-amber-800",   label: "" },
  INTERVIEW_READY: { bg: "bg-blue-100 text-blue-800",     label: "" },
  ACCEPTED:        { bg: "bg-green-100 text-green-800",   label: "" },
  REJECTED:        { bg: "bg-red-100 text-red-800",       label: "" },
  HIRED:           { bg: "bg-purple-100 text-purple-800", label: "" },
};

function StarRating({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button key={star} type="button" onClick={() => onChange(star)}>
          <Star
            className={`h-6 w-6 transition-colors ${star <= value ? "fill-amber-400 text-amber-400" : "text-muted-foreground"}`}
          />
        </button>
      ))}
    </div>
  );
}

export default function JobApplicationDetailPage() {
  const t = useTranslations();
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const { data: application, isLoading } = useJobApplication(id);
  const updateApplication = useUpdateJobApplication();

  const [reviewNotes, setReviewNotes] = useState("");
  const [rejectionNote, setRejectionNote] = useState("");
  const [rating, setRating] = useState(0);
  const [actionStatus, setActionStatus] = useState<JobApplicationStatus | null>(null);
  const [addEmployeeOpen, setAddEmployeeOpen] = useState(false);

  const RATING_TO_EVALUATION: Record<number, "EXCELLENT" | "VERY_GOOD" | "GOOD" | "ACCEPTABLE" | "POOR"> = {
    5: "EXCELLENT",
    4: "VERY_GOOD",
    3: "GOOD",
    2: "ACCEPTABLE",
    1: "POOR",
  };

  const handleAction = (status: JobApplicationStatus) => {
    setActionStatus(status);
    setReviewNotes("");
    setRejectionNote("");
    setRating(0);
  };

  const handleSubmit = async () => {
    if (!actionStatus) return;
    await updateApplication.mutateAsync({
      id,
      data: {
        status: actionStatus,
        reviewNotes: reviewNotes || undefined,
        rejectionNote: actionStatus === "REJECTED" ? rejectionNote : undefined,
        rating: actionStatus === "ACCEPTED" ? rating : undefined,
      },
    });
    setActionStatus(null);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-2 gap-6">
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  }

  if (!application) return null;

  const app = application as any;
  const statusCfg = STATUS_CONFIG[app.status as JobApplicationStatus];
  const cvUrl = app.cvFileUrl ? `${CV_BASE_URL}${app.cvFileUrl}` : null;

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowRight className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">{app.fullName}</h1>
          <p className="text-muted-foreground">{app.specialization}</p>
        </div>
        <span className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-medium ${statusCfg.bg}`}>
          {t(`jobApplications.statuses.${app.status}`)}
        </span>
        {app.rating && (
          <div className="flex items-center gap-1">
            <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
            <span className="font-medium">{app.rating}/5</span>
          </div>
        )}
        {app.status === "ACCEPTED" && (
          <Button size="sm" onClick={() => setAddEmployeeOpen(true)}>
            إضافة كموظف
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Personal Info */}
        <Card>
          <CardHeader><CardTitle className="text-base">{t("jobApplications.sections.personalInfo")}</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <span>{app.email}</span>
            </div>
            <div className="flex items-center gap-2">
              <Phone className="h-4 w-4 text-muted-foreground" />
              <span>{app.phone}</span>
            </div>
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground" />
              <span>{t("jobApplications.fields.education")}: {app.education}</span>
            </div>
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-muted-foreground" />
              <span>{t("jobApplications.fields.yearsOfExperience")}: {app.yearsOfExperience} {t("common.years")}</span>
            </div>
            {app.linkedinUrl && (
              <a href={app.linkedinUrl} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-2 text-blue-600 hover:underline">
                <Linkedin className="h-4 w-4" />
                LinkedIn
              </a>
            )}
            {cvUrl && (
              <a href={cvUrl} target="_blank" rel="noopener noreferrer">
                <Button variant="outline" size="sm" className="gap-2 w-full mt-2">
                  <Download className="h-4 w-4" />
                  {t("jobApplications.downloadCV")}
                </Button>
              </a>
            )}
          </CardContent>
        </Card>

        {/* Cover Letter */}
        <Card>
          <CardHeader><CardTitle className="text-base">{t("jobApplications.sections.coverLetter")}</CardTitle></CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">{app.coverLetter}</p>
          </CardContent>
        </Card>

        {/* Reference 1 */}
        {app.ref1Name && (
          <Card>
            <CardHeader><CardTitle className="text-base">{t("jobApplications.sections.reference1")}</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p className="font-medium">{app.ref1Name}</p>
              <p className="text-muted-foreground">{app.ref1JobTitle} — {app.ref1Company}</p>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Phone className="h-3.5 w-3.5" />
                {app.ref1Phone}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Reference 2 */}
        {app.ref2Name && (
          <Card>
            <CardHeader><CardTitle className="text-base">{t("jobApplications.sections.reference2")}</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p className="font-medium">{app.ref2Name}</p>
              <p className="text-muted-foreground">{app.ref2JobTitle} — {app.ref2Company}</p>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Phone className="h-3.5 w-3.5" />
                {app.ref2Phone}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Review notes if exists */}
      {app.reviewNotes && (
        <Card>
          <CardHeader><CardTitle className="text-base">{t("jobApplications.fields.reviewNotes")}</CardTitle></CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">{app.reviewNotes}</p>
          </CardContent>
        </Card>
      )}
      {app.rejectionNote && (
        <Card className="border-red-200">
          <CardHeader><CardTitle className="text-base text-red-600">{t("jobApplications.fields.rejectionNote")}</CardTitle></CardHeader>
          <CardContent>
            <p className="text-sm">{app.rejectionNote}</p>
          </CardContent>
        </Card>
      )}

      {/* Actions */}
      {app.status !== "HIRED" && (
        <Card>
          <CardHeader><CardTitle className="text-base">{t("jobApplications.actions.title")}</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {/* Action buttons */}
            {!actionStatus && (
              <div className="flex flex-wrap gap-2">
                {app.status !== "INTERVIEW_READY" && app.status !== "ACCEPTED" && (
                  <Button variant="outline" className="border-blue-300 text-blue-700 hover:bg-blue-50"
                    onClick={() => handleAction("INTERVIEW_READY")}>
                    {t("jobApplications.actions.interviewReady")}
                  </Button>
                )}
                {app.status !== "ACCEPTED" && (
                  <Button variant="outline" className="border-green-300 text-green-700 hover:bg-green-50"
                    onClick={() => handleAction("ACCEPTED")}>
                    {t("jobApplications.actions.accept")}
                  </Button>
                )}
                {app.status !== "REJECTED" && (
                  <Button variant="outline" className="border-red-300 text-red-700 hover:bg-red-50"
                    onClick={() => handleAction("REJECTED")}>
                    {t("jobApplications.actions.reject")}
                  </Button>
                )}
                {app.status === "ACCEPTED" && (
                  <Button variant="outline" className="border-purple-300 text-purple-700 hover:bg-purple-50"
                    onClick={() => handleAction("HIRED")}>
                    {t("jobApplications.actions.hire")}
                  </Button>
                )}
              </div>
            )}

            {/* Action form */}
            {actionStatus && (
              <div className="rounded-lg border p-4 space-y-4 bg-muted/30">
                <p className="font-medium">{t(`jobApplications.statuses.${actionStatus}`)}</p>

                {actionStatus === "ACCEPTED" && (
                  <div className="space-y-2">
                    <Label>{t("jobApplications.fields.rating")} *</Label>
                    <StarRating value={rating} onChange={setRating} />
                  </div>
                )}

                {actionStatus === "REJECTED" && (
                  <div className="space-y-2">
                    <Label>{t("jobApplications.fields.rejectionNote")} *</Label>
                    <Textarea
                      rows={3}
                      value={rejectionNote}
                      onChange={(e) => setRejectionNote(e.target.value)}
                      placeholder={t("jobApplications.fields.rejectionNotePlaceholder")}
                    />
                  </div>
                )}

                <div className="space-y-2">
                  <Label>{t("jobApplications.fields.reviewNotes")} ({t("common.optional")})</Label>
                  <Textarea
                    rows={2}
                    value={reviewNotes}
                    onChange={(e) => setReviewNotes(e.target.value)}
                  />
                </div>

                <div className="flex gap-2">
                  <Button
                    onClick={handleSubmit}
                    disabled={
                      updateApplication.isPending ||
                      (actionStatus === "ACCEPTED" && rating === 0) ||
                      (actionStatus === "REJECTED" && !rejectionNote.trim())
                    }
                  >
                    {t("common.save")}
                  </Button>
                  <Button variant="outline" onClick={() => setActionStatus(null)}>
                    {t("common.cancel")}
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <p className="text-xs text-muted-foreground">
        {t("jobApplications.fields.createdAt")}: {format(new Date(app.createdAt), "yyyy/MM/dd HH:mm")}
      </p>

      <EmployeeDialog
        open={addEmployeeOpen}
        onOpenChange={setAddEmployeeOpen}
        defaultInterviewEvaluation={app.rating ? RATING_TO_EVALUATION[app.rating] : undefined}
      />
    </div>
  );
}
