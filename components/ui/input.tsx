import * as React from "react"
import { Input as InputPrimitive } from "@base-ui/react/input"

import { cn } from "@/lib/utils"

function Input({ className, type, style, ...props }: React.ComponentProps<"input"> & { style?: React.CSSProperties }) {
  return (
    <InputPrimitive
      type={type}
      data-slot="input"
      className={cn(
        "w-full min-w-0 outline-none file:inline-flex file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:opacity-50 aria-invalid:ring-0",
        className
      )}
      style={{
        background: "var(--bg-app)",
        border: "1px solid var(--border-color)",
        borderRadius: "6px",
        padding: "8px 12px",
        fontSize: "14px",
        color: "var(--text-primary)",
        transition: "border-color 100ms ease",
        ...style,
      }}
      onFocus={(e) => {
        (e.currentTarget as HTMLElement).style.borderColor = "var(--text-secondary)"
        if (props.onFocus) props.onFocus(e as React.FocusEvent<HTMLInputElement>)
      }}
      onBlur={(e) => {
        const isInvalid = (e.currentTarget as HTMLElement).getAttribute("aria-invalid") === "true"
        ;(e.currentTarget as HTMLElement).style.borderColor = isInvalid ? "var(--accent-error)" : "var(--border-color)"
        if (props.onBlur) props.onBlur(e as React.FocusEvent<HTMLInputElement>)
      }}
      {...props}
    />
  )
}

export { Input }
