import * as React from "react"

import { cn } from "@/lib/utils"

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, onChange, value, defaultValue, ...props }, ref) => {
    const innerRef = React.useRef<HTMLTextAreaElement>(null);

    const mergedRef = (el: HTMLTextAreaElement | null) => {
      innerRef.current = el;
      if (typeof ref === "function") ref(el);
      else if (ref) (ref as React.MutableRefObject<HTMLTextAreaElement | null>).current = el;
    };

    const autoResize = (el: HTMLTextAreaElement) => {
      el.style.height = "auto";
      el.style.height = `${el.scrollHeight}px`;
    };

    React.useEffect(() => {
      if (innerRef.current) autoResize(innerRef.current);
    }, [value]);

    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      autoResize(e.target);
      onChange?.(e);
    };

    return (
      <textarea
        className={cn(
          "flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none overflow-hidden",
          className
        )}
        ref={mergedRef}
        onChange={handleChange}
        value={value}
        defaultValue={defaultValue}
        {...props}
      />
    );
  }
)
Textarea.displayName = "Textarea"

export { Textarea }
