"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useUsers } from "@/lib/hooks/use-users";
import { useLinkUser } from "@/lib/hooks/use-employees";
import { useAuthStore } from "@/lib/stores/auth-store";
import { Employee } from "@/types";
import { Loader2 } from "lucide-react";
import { Label } from "@/components/ui/label";

interface LinkUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employee?: Employee;
}

export function LinkUserDialog({ open, onOpenChange, employee }: LinkUserDialogProps) {
  const t = useTranslations();
  const [selectedUserId, setSelectedUserId] = useState<string>("");

  const { data: usersData } = useUsers({ limit: 500 });
  const linkUser = useLinkUser();
  const { user, setUser } = useAuthStore();

  // When dialog opens, pre-select the already linked user (if any)
  useEffect(() => {
    if (open) setSelectedUserId(employee?.userId || "");
  }, [open, employee?.userId]);

  const users = (usersData as any)?.data?.items || [];
  const linkedUser = users.find((u: any) => u.id === employee?.userId);

  const handleSubmit = async () => {
    if (!employee || !selectedUserId) return;

    try {
      await linkUser.mutateAsync({ employeeId: employee.id, userId: selectedUserId });
      // نحفظ الربط في localStorage عشان يبقى بعد logout/login
      try {
        const map = JSON.parse(localStorage.getItem("vita-user-employee-map") || "{}");
        map[selectedUserId] = employee.id;
        localStorage.setItem("vita-user-employee-map", JSON.stringify(map));
      } catch {}
      // إذا المستخدم المربوط هو نفس المسجل دخول، نحدث الـ store فوراً
      if (user && selectedUserId === user.id) {
        setUser({ ...user, employeeId: employee.id } as any);
      }
      onOpenChange(false);
      setSelectedUserId("");
    } catch (error) {
      // Error handled by mutation
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>
            {t("employees.linkUser")} - {employee?.firstNameAr} {employee?.lastNameAr}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {linkedUser && (
            <div className="p-3 bg-muted rounded-lg text-sm">
              <span className="text-muted-foreground">مرتبط حالياً: </span>
              <span className="font-medium">{linkedUser.fullName} ({linkedUser.username})</span>
            </div>
          )}

          <div className="space-y-2">
            <Label>{t("employees.selectUser")}</Label>
            <Select value={selectedUserId} onValueChange={setSelectedUserId}>
              <SelectTrigger>
                <SelectValue placeholder={t("employees.selectUser")} />
              </SelectTrigger>
              <SelectContent>
                {users.map((user: any) => (
                  <SelectItem key={user.id} value={user.id}>
                    {user.fullName} ({user.username})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              {t("common.cancel")}
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={linkUser.isPending || !selectedUserId}
            >
              {linkUser.isPending && (
                <Loader2 className="h-4 w-4 animate-spin ml-2" />
              )}
              {t("common.save")}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
