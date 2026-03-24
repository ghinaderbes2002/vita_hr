"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { LogIn, LogOut, MapPin, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { PageHeader } from "@/components/shared/page-header";
import { useCheckIn, useCheckOut, useMyAttendance } from "@/lib/hooks/use-attendance-records";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import { AttendanceStatusBadge } from "@/components/features/attendance/attendance-status-badge";

export default function CheckInOutPage() {
  const t = useTranslations();
  const [location, setLocation] = useState("");
  const [notes, setNotes] = useState("");
  const [currentTime, setCurrentTime] = useState(new Date());
  // Local state to track status after mutation (covers cases where API response structure varies)
  const [localCheckedIn, setLocalCheckedIn] = useState<boolean | null>(null);
  const [localCheckedOut, setLocalCheckedOut] = useState<boolean | null>(null);

  const checkIn = useCheckIn();
  const checkOut = useCheckOut();

  // Get today's attendance record
  const today = format(new Date(), "yyyy-MM-dd");
  const { data: attendanceData } = useMyAttendance({
    dateFrom: today,
    dateTo: today,
  });

  // Match the same parsing used in my-attendance page
  const records: any[] =
    (attendanceData as any)?.items ||
    (attendanceData as any)?.data?.items ||
    (Array.isArray((attendanceData as any)?.data) ? (attendanceData as any).data : []) ||
    [];
  const todayRecord = records[0];

  // Support both field name variants (clockInTime / checkInTime)
  const apiCheckedIn = !!(todayRecord?.clockInTime || (todayRecord as any)?.checkInTime);
  const apiCheckedOut = !!(todayRecord?.clockOutTime || (todayRecord as any)?.checkOutTime);

  const hasCheckedIn = localCheckedIn !== null ? localCheckedIn : apiCheckedIn;
  const hasCheckedOut = localCheckedOut !== null ? localCheckedOut : apiCheckedOut;

  // Update time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleCheckIn = async () => {
    await checkIn.mutateAsync({ location, notes });
    setLocalCheckedIn(true);
    setLocation("");
    setNotes("");
  };

  const handleCheckOut = async () => {
    await checkOut.mutateAsync({ location, notes });
    setLocalCheckedOut(true);
    setLocation("");
    setNotes("");
  };

  const formatTime = (dateString?: string) => {
    if (!dateString) return "-";
    try {
      return format(new Date(dateString), "hh:mm a", { locale: ar });
    } catch {
      return "-";
    }
  };

  const isPending = checkIn.isPending || checkOut.isPending;

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <PageHeader
        title={t("attendance.checkInOutTitle")}
        description={t("attendance.checkInOutDescription")}
      />

      {/* Current Time Card */}
      <Card>
        <CardContent className="pt-6">
          <div className="text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Clock className="h-5 w-5 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">
                {format(currentTime, "EEEE، dd MMMM yyyy", { locale: ar })}
              </span>
            </div>
            <div className="text-4xl font-bold">
              {format(currentTime, "hh:mm:ss a", { locale: ar })}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Today's Status */}
      {(todayRecord || hasCheckedIn) && (
        <Card>
          <CardHeader>
            <CardTitle>{t("attendance.todayStatus")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-muted-foreground">{t("attendance.fields.status")}</Label>
                <div className="mt-1">
                  <AttendanceStatusBadge status={todayRecord.status} />
                </div>
              </div>
              <div>
                <Label className="text-muted-foreground">{t("attendance.fields.checkInTime")}</Label>
                <div className="mt-1 font-medium">
                  {formatTime(todayRecord.clockInTime)}
                </div>
              </div>
              {todayRecord.clockOutTime && (
                <div>
                  <Label className="text-muted-foreground">{t("attendance.fields.checkOutTime")}</Label>
                  <div className="mt-1 font-medium">
                    {formatTime(todayRecord.clockOutTime)}
                  </div>
                </div>
              )}
              {todayRecord.workedMinutes && (
                <div>
                  <Label className="text-muted-foreground">{t("attendance.fields.workHours")}</Label>
                  <div className="mt-1 font-medium">
                    {Math.floor(todayRecord.workedMinutes / 60)}{t("attendance.hourShort")}{" "}
                    {todayRecord.workedMinutes % 60}{t("attendance.minuteShort")}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Check In/Out Form */}
      <Card>
        <CardHeader>
          <CardTitle>
            {!hasCheckedIn ? t("attendance.checkIn") : !hasCheckedOut ? t("attendance.checkOut") : t("attendance.completed")}
          </CardTitle>
          <CardDescription>
            {!hasCheckedIn
              ? t("attendance.checkInNow")
              : !hasCheckedOut
              ? t("attendance.checkOutNow")
              : t("attendance.alreadyCheckedInOut")}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="location">{t("attendance.fields.location")}</Label>
            <div className="relative">
              <MapPin className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="location"
                placeholder={t("attendance.locationPlaceholder")}
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="pr-10"
                disabled={isPending || hasCheckedOut}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">{t("attendance.notesOptional")}</Label>
            <Textarea
              id="notes"
              placeholder={t("attendance.notesPlaceholder")}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              disabled={isPending || hasCheckedOut}
            />
          </div>

          <div className="flex gap-3">
            {!hasCheckedIn && (
              <Button
                onClick={handleCheckIn}
                disabled={isPending}
                className="flex-1"
                size="lg"
              >
                <LogIn className="h-5 w-5 ml-2" />
                {t("attendance.checkIn")}
              </Button>
            )}
            {hasCheckedIn && !hasCheckedOut && (
              <Button
                onClick={handleCheckOut}
                disabled={isPending}
                variant="outline"
                className="flex-1"
                size="lg"
              >
                <LogOut className="h-5 w-5 ml-2" />
                {t("attendance.checkOut")}
              </Button>
            )}
            {hasCheckedOut && (
              <div className="flex-1 p-4 bg-muted rounded-lg text-center text-muted-foreground">
                {t("attendance.completedMessage")}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
