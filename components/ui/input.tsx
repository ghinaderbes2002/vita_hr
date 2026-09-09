"use client"

import * as React from "react"
import { toast } from "sonner"

import { cn } from "@/lib/utils"
import { hasArabicDigits, stripArabicDigits } from "@/lib/utils/arabic-digits"

/**
 * Arabic-Indic digits never make it into a field: they are dropped as they are
 * typed (or pasted) and the user is told why. Every number in the system —
 * amounts, phone numbers, national ids — is stored and compared as Latin
 * digits, so "٢٥" reaching the server is either rejected or silently kept as a
 * string that no comparison will match.
 *
 * One toast id, so holding a key down does not stack a column of them.
 */
const DIGIT_HINT_ID = "arabic-digits-hint"

function Input({ className, type, onChange, ...props }: React.ComponentProps<"input">) {
  const handleChange = React.useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (hasArabicDigits(e.target.value)) {
        e.target.value = stripArabicDigits(e.target.value)
        toast.info("الأرقام تُكتب بالإنجليزية (1 2 3)", { id: DIGIT_HINT_ID })
      }
      onChange?.(e)
    },
    [onChange],
  )

  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground dark:bg-input/30 border-input h-9 w-full min-w-0 rounded-md border bg-transparent px-3 py-1 text-base shadow-xs transition-[color,box-shadow] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
        "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]",
        "aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
        className
      )}
      onChange={handleChange}
      {...props}
    />
  )
}

export { Input }
