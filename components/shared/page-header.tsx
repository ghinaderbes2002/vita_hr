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
    <div className="relative flex items-start justify-between gap-4 rounded-xl overflow-hidden px-5 py-4 mb-2"
      style={{
        background: "linear-gradient(135deg, oklch(0.702 0.191 47.604 / 0.07) 0%, oklch(0.929 0.013 255 / 0.15) 50%, transparent 100%)",
        borderBottom: "1px solid oklch(0.929 0.013 255.508 / 0.8)",
        boxShadow: "0 1px 3px oklch(0 0 0 / 0.03)",
      }}
    >
      {/* Decorative orange line at start */}
      <div
        className="absolute top-0 bottom-0 start-0 w-1 rounded-e-full"
        style={{
          background: "linear-gradient(180deg, oklch(0.762 0.183 53) 0%, oklch(0.702 0.191 47.604) 50%, oklch(0.640 0.218 41) 100%)",
        }}
      />

      {/* Decorative dot at top-start corner */}
      <div
        className="absolute top-3 start-3 h-6 w-6 rounded-full opacity-15 blur-md"
        style={{ background: "oklch(0.702 0.191 47.604)" }}
      />

      <div className="ps-3">
        <div className="flex items-center gap-2.5">
          <h1
            className="text-2xl font-extrabold tracking-tight"
            style={{
              background: "linear-gradient(135deg, oklch(0.208 0.042 265.755) 30%, oklch(0.372 0.044 257.287) 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
          >
            {title}
          </h1>
          {count !== undefined && (
            <span
              className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold"
              style={{
                background: "linear-gradient(135deg, oklch(0.702 0.191 47.604 / 0.12) 0%, oklch(0.702 0.191 47.604 / 0.06) 100%)",
                color: "oklch(0.640 0.218 41)",
                border: "1px solid oklch(0.702 0.191 47.604 / 0.2)",
              }}
            >
              {count}
            </span>
          )}
        </div>
        {description && (
          <p className="text-muted-foreground text-sm mt-0.5">{description}</p>
        )}
      </div>

      {actions && (
        <div className="flex items-center gap-2 shrink-0">{actions}</div>
      )}
    </div>
  );
}
