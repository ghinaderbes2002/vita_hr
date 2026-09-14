"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useLocale, useTranslations } from "next-intl";
import { Dumbbell, ImageIcon, Loader2, Pencil, Plus, Search, Upload, Video } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { PageGuard } from "@/components/permissions/page-guard";
import { ActionGuard } from "@/components/permissions/action-guard";
import { ClinicCountChips } from "@/components/clinic/clinic-count-chips";
import { ExerciseDialog } from "@/components/patient-app/exercise-dialog";
import { PERMISSIONS } from "@/lib/permissions/catalog";
import { useExercises, useTaxonomy, useUploadExerciseMedia } from "@/lib/hooks/use-patient-app";
import {
  Exercise, exerciseGoalIds, localizedName, MEDIA_ACCEPT, mediaFileProblem, resolveMediaUrl,
} from "@/lib/api/patient-app";

const ALL = "__all__";

export default function PatientAppExercisesPage() {
  const t = useTranslations("patientApp.exercises");
  const tt = useTranslations("patientApp.taxonomy");
  const tc = useTranslations("patientApp.common");
  const tm = useTranslations("patientApp.media");
  const locale = useLocale();
  const [search, setSearch] = useState("");
  const [term, setTerm] = useState("");
  const [bodyRegionId, setBodyRegionId] = useState(ALL);
  const [targetRegionId, setTargetRegionId] = useState(ALL);
  const [goalId, setGoalId] = useState(ALL);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Exercise | null>(null);
  const [preview, setPreview] = useState<Exercise | null>(null);
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const fileRef = useRef<HTMLInputElement>(null);
  const uploadTarget = useRef<string | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setTerm(search.trim()), 300);
    return () => clearTimeout(timer);
  }, [search]);

  const { data: bodyRegions = [] } = useTaxonomy("body-regions");
  const { data: allTargets = [] } = useTaxonomy("target-regions");
  const { data: goals = [] } = useTaxonomy("goals");
  const { data: exercises = [], isLoading } = useExercises({
    search: term || undefined,
    bodyRegionId: bodyRegionId !== ALL ? bodyRegionId : undefined,
    targetRegionId: targetRegionId !== ALL ? targetRegionId : undefined,
    goalId: goalId !== ALL ? goalId : undefined,
  });
  const upload = useUploadExerciseMedia();

  const targetOptions = bodyRegionId === ALL ? [] : allTargets.filter((x) => x.bodyRegionId === bodyRegionId);
  const withMedia = exercises.filter((e) => e.mediaUrl).length;

  const openAdd = () => { setEditing(null); setDialogOpen(true); };
  const openEdit = (ex: Exercise) => { setEditing(ex); setDialogOpen(true); };

  const startUpload = (ex: Exercise) => {
    uploadTarget.current = ex.id;
    fileRef.current?.click();
  };

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    const id = uploadTarget.current;
    if (!file || !id) return;
    const problem = mediaFileProblem(file);
    if (problem) { toast.error(tm(problem)); return; }
    setUploadingId(id);
    setProgress(0);
    try {
      await upload.mutateAsync({ id, file, onProgress: setProgress });
    } catch {
      // toast shown by the hook
    } finally {
      setUploadingId(null);
    }
  };

  return (
    <PageGuard permission={PERMISSIONS.PATIENT_APP.MANAGE_EXERCISE_LIBRARY}>
      <div className="space-y-4">
        <PageHeader
          title={t("title")}
          description={t("description")}
          actions={
            <div className="flex flex-wrap items-center gap-2">
              <ClinicCountChips
                isLoading={isLoading}
                counts={[
                  { icon: Dumbbell, label: t("countExercises"), value: exercises.length },
                  { icon: Video, label: t("countWithMedia"), value: withMedia },
                ]}
              />
              <ActionGuard permission={PERMISSIONS.PATIENT_APP.MANAGE_EXERCISE_LIBRARY}>
                <Button onClick={openAdd} className="gap-2">
                  <Plus className="h-4 w-4" />
                  {t("add")}
                </Button>
              </ActionGuard>
            </div>
          }
        />

        <div className="flex flex-wrap gap-3">
          <div className="relative min-w-56 flex-1">
            <Search className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t("searchPlaceholder")}
              className="ps-9"
            />
          </div>
          <Select value={bodyRegionId} onValueChange={(v) => { setBodyRegionId(v); setTargetRegionId(ALL); }}>
            <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>{tt("allBodyRegions")}</SelectItem>
              {bodyRegions.map((r) => <SelectItem key={r.id} value={r.id}>{localizedName(r, locale)}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={targetRegionId} onValueChange={setTargetRegionId} disabled={bodyRegionId === ALL}>
            <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>{tt("allTargetRegions")}</SelectItem>
              {targetOptions.map((r) => <SelectItem key={r.id} value={r.id}>{localizedName(r, locale)}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={goalId} onValueChange={setGoalId}>
            <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>{t("allGoals")}</SelectItem>
              {goals.map((g) => <SelectItem key={g.id} value={g.id}>{localizedName(g, locale)}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <input ref={fileRef} type="file" accept={MEDIA_ACCEPT} className="hidden" onChange={onFile} />

        <div className="overflow-x-auto rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-24">{t("colMedia")}</TableHead>
                <TableHead>{t("colExercise")}</TableHead>
                <TableHead>{t("colRegion")}</TableHead>
                <TableHead>{t("colDuration")}</TableHead>
                <TableHead>{t("colGoals")}</TableHead>
                <TableHead className="w-24" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 6 }).map((_, j) => (
                      <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                    ))}
                  </TableRow>
                ))
              ) : exercises.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6}>
                    <EmptyState
                      icon={<Dumbbell className="h-8 w-8 text-muted-foreground" />}
                      title={t("emptyTitle")}
                      description={t("emptyDescription")}
                    />
                  </TableCell>
                </TableRow>
              ) : (
                exercises.map((ex) => {
                  const exGoals = exerciseGoalIds(ex)
                    .map((id) => localizedName(goals.find((g) => g.id === id), locale))
                    .filter(Boolean);
                  const region = [
                    localizedName(ex.bodyRegion ?? bodyRegions.find((r) => r.id === ex.bodyRegionId), locale),
                    localizedName(ex.targetRegion ?? allTargets.find((r) => r.id === ex.targetRegionId), locale),
                  ].filter(Boolean).join(" / ");
                  const isUploading = uploadingId === ex.id;
                  // The other language sits underneath as a secondary line.
                  const secondary = locale === "ar" ? ex.nameEn : ex.nameAr;

                  return (
                    <TableRow key={ex.id}>
                      <TableCell>
                        <MediaThumb exercise={ex} onClick={() => setPreview(ex)} />
                      </TableCell>
                      <TableCell>
                        <p className="font-medium">{localizedName(ex, locale)}</p>
                        {secondary && (
                          <p className="text-xs text-muted-foreground" dir={locale === "ar" ? "ltr" : "rtl"}>
                            {secondary}
                          </p>
                        )}
                      </TableCell>
                      <TableCell className="text-sm">{region || "—"}</TableCell>
                      <TableCell className="whitespace-nowrap text-sm">
                        {ex.defaultDurationSeconds ? tc("secondsShort", { count: ex.defaultDurationSeconds }) : "—"}
                      </TableCell>
                      <TableCell>
                        <div className="flex max-w-64 flex-wrap gap-1">
                          {exGoals.length === 0 ? "—" : exGoals.map((name) => (
                            <Badge key={name} variant="secondary" className="text-xs font-normal">{name}</Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell>
                        <ActionGuard permission={PERMISSIONS.PATIENT_APP.MANAGE_EXERCISE_LIBRARY}>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost" size="icon" className="h-8 w-8"
                              title={ex.mediaUrl ? t("replaceMedia") : t("uploadMedia")}
                              disabled={upload.isPending}
                              onClick={() => startUpload(ex)}
                            >
                              {isUploading ? (
                                <span className="text-[10px] font-semibold">{progress}%</span>
                              ) : (
                                <Upload className="h-4 w-4" />
                              )}
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(ex)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                          </div>
                        </ActionGuard>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>

        <ExerciseDialog open={dialogOpen} onOpenChange={setDialogOpen} exercise={editing} />

        <Dialog open={!!preview} onOpenChange={(o) => { if (!o) setPreview(null); }}>
          <DialogContent className="sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle>{localizedName(preview, locale)}</DialogTitle>
            </DialogHeader>
            {preview && <MediaPreview exercise={preview} />}
          </DialogContent>
        </Dialog>
      </div>
    </PageGuard>
  );
}

function MediaThumb({ exercise, onClick }: { exercise: Exercise; onClick: () => void }) {
  const t = useTranslations("patientApp.exercises");
  const src = resolveMediaUrl(exercise.mediaUrl, exercise.updatedAt);
  const thumb = resolveMediaUrl(exercise.thumbnailUrl, exercise.updatedAt);
  const isImage = exercise.mediaType === "IMAGE";

  if (!src) {
    return (
      <div className="flex h-12 w-16 items-center justify-center rounded-md border border-dashed text-[10px] text-muted-foreground">
        {t("noMedia")}
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className="relative flex h-12 w-16 items-center justify-center overflow-hidden rounded-md border bg-muted hover:ring-2 hover:ring-primary/40"
    >
      {thumb || isImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={thumb ?? src} alt="" className="h-full w-full object-cover" />
      ) : isImage ? (
        <ImageIcon className="h-5 w-5 text-muted-foreground" />
      ) : (
        <Video className="h-5 w-5 text-muted-foreground" />
      )}
    </button>
  );
}

function MediaPreview({ exercise }: { exercise: Exercise }) {
  const locale = useLocale();
  const src = resolveMediaUrl(exercise.mediaUrl, exercise.updatedAt);
  const [loading, setLoading] = useState(true);
  if (!src) return null;

  return (
    <div className="relative flex min-h-48 items-center justify-center overflow-hidden rounded-md bg-black">
      {loading && <Loader2 className="absolute h-6 w-6 animate-spin text-white/70" />}
      {exercise.mediaType === "IMAGE" ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={localizedName(exercise, locale)}
          className="max-h-[70dvh] w-full object-contain"
          onLoad={() => setLoading(false)}
        />
      ) : (
        <video src={src} controls className="max-h-[70dvh] w-full" onLoadedData={() => setLoading(false)} />
      )}
    </div>
  );
}
