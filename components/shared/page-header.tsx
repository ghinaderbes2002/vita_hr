"use client";

import { ReactNode } from "react";

interface PageHeaderProps {
  title: string;
  description?: string;
  actions?: ReactNode;
  count?: number;
}

export function PageHeader({ title, description, actions, count }: PageHeaderProps) {
  return (
    <div className="flex items-start justify-between gap-4 pb-4 border-b">
      <div>
        <div className="flex items-center gap-2.5">
          <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
          {count !== undefined && (
            <span className="inline-flex items-center rounded-full bg-muted px-2.5 py-0.5 text-sm font-medium text-muted-foreground">
              {count}
            </span>
          )}
        </div>
        {description && (
          <p className="text-muted-foreground text-sm mt-1">{description}</p>
        )}
      </div>
      {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
    </div>
  );
}
