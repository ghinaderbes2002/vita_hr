"use client";

import { useState } from "react";
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

  const { data: usersData } = useUsers({});
  const linkUser = useLinkUser();

  const users = (usersData as any)?.data?.items || [];

  const handleSubmit = async () => {
    if (!employee || !selectedUserId) return;

    try {
      await linkUser.mutateAsync({ employeeId: employee.id, userId: selectedUserId });
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
