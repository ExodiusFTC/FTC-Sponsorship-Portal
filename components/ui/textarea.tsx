import * as React from "react"
import { cn } from "@/lib/utils"

function Textarea({ className, style, ...props }: React.ComponentProps<"textarea"> & { style?: React.CSSProperties }) {
  return (
    <textarea
      data-slot="textarea"
      className={cn("w-full outline-none disabled:cursor-not-allowed disabled:opacity-50", className)}
      style={{
        background: "var(--bg-app)",
        border: "1px solid var(--border-color)",
        borderRadius: "6px",
        padding: "8px 12px",
        fontSize: "14px",
        color: "var(--text-primary)",
        transition: "border-color 100ms ease",
        resize: "vertical",
        ...style,
      }}
      onFocus={(e) => {
        (e.currentTarget as HTMLElement).style.borderColor = "var(--text-secondary)"
        if (props.onFocus) props.onFocus(e)
      }}
      onBlur={(e) => {
        ;(e.currentTarget as HTMLElement).style.borderColor = "var(--border-color)"
        if (props.onBlur) props.onBlur(e)
      }}
      {...props}
    />
  )
}
Textarea.displayName = "Textarea"

export { Textarea }
