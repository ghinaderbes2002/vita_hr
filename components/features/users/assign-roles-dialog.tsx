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
import { Checkbox } from "@/components/ui/checkbox";
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
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);

  const { data: roles, isLoading: rolesLoading } = useRoles();
  const assignRoles = useAssignRoles();

  useEffect(() => {
    if (user && user.roles) {
      setSelectedRoles(user.roles.map((r) => r.role.id));
    } else {و
      setSelectedRoles([]);
    }
  }, [user]);

  const handleToggleRole = (roleId: string) => {
    setSelectedRoles((prev) =>
      prev.includes(roleId)
        ? prev.filter((id) => id !== roleId)
        : [...prev, roleId]
    );
  };

  const handleSubmit = async () => {
    if (!user) return;

    try {
      await assignRoles.mutateAsync({ id: user.id, roleIds: selectedRoles });
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
              <div className="space-y-3">
                {roles.map((role: any) => (
                  <div
                    key={role.id}
                    className="flex items-start space-x-3 space-y-0"
                  >
                    <Checkbox
                      id={role.id}
                      checked={selectedRoles.includes(role.id)}
                      onCheckedChange={() => handleToggleRole(role.id)}
                    />
                    <div className="grid gap-1 leading-none">
                      <label
                        htmlFor={role.id}
                        className="text-sm font-medium cursor-pointer"
                      >
                        {role.displayNameAr}
                      </label>
                      {role.description && (
                        <p className="text-sm text-muted-foreground">
                          {role.description}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
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
