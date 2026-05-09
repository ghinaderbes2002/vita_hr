"use client";

import { cloneElement, isValidElement } from "react";
import { usePermissions } from "@/lib/hooks/use-permissions";
import type { PermissionName } from "@/lib/permissions/catalog";

interface EditableGuardProps {
  permission: PermissionName;
  /** عنصر input/select/textarea واحد. عند عدم الصلاحية يُحوّل إلى readonly + disabled */
  children: React.ReactElement;
}

/** يحوّل input إلى readonly بدل إخفائه عند عدم الصلاحية. */
export function EditableGuard({ permission, children }: EditableGuardProps) {
  const { hasPermission, isAdmin } = usePermissions();
  const canEdit = isAdmin() || hasPermission(permission);

  if (!isValidElement(children)) return children;
  if (canEdit) return children;

  return cloneElement(children, {
    ...(children.props as Record<string, unknown>),
    disabled: true,
    readOnly: true,
  } as Partial<unknown>);
}
