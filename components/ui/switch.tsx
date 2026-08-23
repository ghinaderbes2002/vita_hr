"use client"

import * as React from "react"
import * as SwitchPrimitive from "@radix-ui/react-switch"

import { cn } from "@/lib/utils"

// Most switches here answer a نعم / لا question on a medical form, so the state
// has to be readable without hunting: hence the bigger track, the visible
// off-state border and the clear colour split between the two states.
function Switch({
  className,
  ...props
}: React.ComponentProps<typeof SwitchPrimitive.Root>) {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      className={cn(
        "peer relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border shadow-xs transition-colors outline-none",
        "border-input bg-muted dark:bg-input/40",
        "data-[state=checked]:border-primary data-[state=checked]:bg-primary",
        "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]",
        "disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        className={cn(
          "pointer-events-none block size-5 rounded-full bg-background shadow-sm ring-0 transition-transform",
          // Tailwind's translate is physical, so RTL needs the mirrored value —
          // otherwise the thumb walks out of the track in Arabic.
          "ltr:data-[state=unchecked]:translate-x-0.5 ltr:data-[state=checked]:translate-x-5",
          "rtl:data-[state=unchecked]:-translate-x-0.5 rtl:data-[state=checked]:-translate-x-5",
          "dark:bg-foreground dark:data-[state=checked]:bg-primary-foreground"
        )}
      />
    </SwitchPrimitive.Root>
  )
}

export { Switch }
