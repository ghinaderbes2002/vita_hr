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

  const checkIn = useCheckIn();
  const checkOut = useCheckOut();

  // Get today's attendance record
  const today = format(new Date(), "yyyy-MM-dd");
  const { data: attendanceData } = useMyAttendance({
    dateFrom: today,
    dateTo: today,
  });

  const todayRecord = Array.isArray(attendanceData)
    ? attendanceData[0]
    : (attendanceData as any)?.data?.items?.[0] || (attendanceData as any)?.data?.[0];

  const hasCheckedIn = todayRecord?.clockInTime;
  const hasCheckedOut = todayRecord?.clockOutTime;

  // Update time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleCheckIn = async () => {
    await checkIn.mutateAsync({ location, notes });
    setLocation("");
    setNotes("");
  };

  const handleCheckOut = async () => {
    await checkOut.mutateAsync({ location, notes });
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
        title="تسجيل الحضور والانصراف"
        description="سجل حضورك وانصرافك اليومي"
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
      {todayRecord && (
        <Card>
          <CardHeader>
            <CardTitle>حالة اليوم</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-muted-foreground">الحالة</Label>
                <div className="mt-1">
                  <AttendanceStatusBadge status={todayRecord.status} />
                </div>
              </div>
              <div>
                <Label className="text-muted-foreground">وقت الحضور</Label>
                <div className="mt-1 font-medium">
                  {formatTime(todayRecord.clockInTime)}
                </div>
              </div>
              {todayRecord.clockOutTime && (
                <div>
                  <Label className="text-muted-foreground">وقت الانصراف</Label>
                  <div className="mt-1 font-medium">
                    {formatTime(todayRecord.clockOutTime)}
                  </div>
                </div>
              )}
              {todayRecord.workedMinutes && (
                <div>
                  <Label className="text-muted-foreground">ساعات العمل</Label>
                  <div className="mt-1 font-medium">
                    {Math.floor(todayRecord.workedMinutes / 60)}س{" "}
                    {todayRecord.workedMinutes % 60}د
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
            {!hasCheckedIn ? "تسجيل حضور" : !hasCheckedOut ? "تسجيل انصراف" : "تم التسجيل"}
          </CardTitle>
          <CardDescription>
            {!hasCheckedIn
              ? "سجل حضورك الآن"
              : !hasCheckedOut
              ? "سجل انصرافك الآن"
              : "لقد قمت بتسجيل حضورك وانصرافك اليوم"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="location">الموقع</Label>
            <div className="relative">
              <MapPin className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="location"
                placeholder="مثال: المكتب الرئيسي"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="pr-10"
                disabled={isPending || hasCheckedOut}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">ملاحظات (اختياري)</Label>
            <Textarea
              id="notes"
              placeholder="أي ملاحظات إضافية..."
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
                تسجيل حضور
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
                تسجيل انصراف
              </Button>
            )}
            {hasCheckedOut && (
              <div className="flex-1 p-4 bg-muted rounded-lg text-center text-muted-foreground">
                تم تسجيل حضورك وانصرافك لهذا اليوم
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
