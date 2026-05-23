"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useRoles } from "@/lib/hooks/use-roles";
import { useAssignRoles } from "@/lib/hooks/use-users";
import { User } from "@/types";
import { Loader2 } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

interface AssignRolesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user?: User;
}

export function AssignRolesDialog({ open, onOpenChange, user }: AssignRolesDialogProps) {
  const t = useTranslations();
  const [selectedRole, setSelectedRole] = useState<string>("");

  const { data: roles, isLoading: rolesLoading } = useRoles();
  const assignRoles = useAssignRoles();

  useEffect(() => {
    if (user?.roles && user.roles.length > 0) {
      setSelectedRole(user.roles[0].role.id);
    } else {
      setSelectedRole("");
    }
  }, [user]);

  const handleSubmit = async () => {
    if (!user) return;
    try {
      await assignRoles.mutateAsync({ id: user.id, roleIds: selectedRole ? [selectedRole] : [] });
      onOpenChange(false);
    } catch (error) {
      // Error handled by mutation
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {t("users.assignRoles")} - {user?.fullName}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <ScrollArea className="h-[350px] rounded-md border p-4">
            {rolesLoading ? (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : !roles || roles.length === 0 ? (
              <div className="text-center text-muted-foreground">
                {t("common.noData")}
              </div>
            ) : (
              <RadioGroup value={selectedRole} onValueChange={setSelectedRole} className="space-y-3">
                {roles.map((role: any) => (
                  <div key={role.id} className="flex items-center gap-3">
                    <RadioGroupItem value={role.id} id={role.id} />
                    <label htmlFor={role.id} className="text-sm font-medium cursor-pointer">
                      {role.displayNameAr}
                    </label>
                  </div>
                ))}
              </RadioGroup>
            )}
          </ScrollArea>

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              {t("common.cancel")}
            </Button>
            <Button onClick={handleSubmit} disabled={assignRoles.isPending}>
              {assignRoles.isPending && (
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
