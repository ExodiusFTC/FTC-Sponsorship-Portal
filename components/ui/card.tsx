import * as React from "react"

import { cn } from "@/lib/utils"

function Card({
  className,
  size = "default",
  ...props
}: React.ComponentProps<"div"> & { size?: "default" | "sm" }) {
  return (
    <div
      data-slot="card"
      data-size={size}
      className={cn(
        "group/card flex flex-col gap-4 overflow-hidden text-sm data-[size=sm]:gap-3",
        className
      )}
      style={{
        background: "var(--bg-surface)",
        border: "1px solid var(--border-color)",
        borderRadius: "6px",
        padding: "20px 24px",
        color: "var(--text-primary)",
      }}
      {...props}
    />
  )
}

function CardHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-header"
      className={cn(
        "@container/card-header grid auto-rows-min items-start gap-1 has-data-[slot=card-action]:grid-cols-[1fr_auto] has-data-[slot=card-description]:grid-rows-[auto_auto]",
        className
      )}
      {...props}
    />
  )
}

function CardTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-title"
      className={cn("leading-snug", className)}
      style={{ fontSize: "15px", fontWeight: 500, color: "var(--text-primary)" }}
      {...props}
    />
  )
}

function CardDescription({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-description"
      className={cn("text-sm", className)}
      style={{ color: "var(--text-secondary)" }}
      {...props}
    />
  )
}

function CardAction({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-action"
      className={cn("col-start-2 row-span-2 row-start-1 self-start justify-self-end", className)}
      {...props}
    />
  )
}

function CardContent({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-content"
      className={cn("", className)}
      {...props}
    />
  )
}

function CardFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-footer"
      className={cn("flex items-center", className)}
      style={{
        borderTop: "1px solid var(--border-color)",
        padding: "16px 0 0",
        marginTop: "auto",
      }}
      {...props}
    />
  )
}

function CardEmpty({
  icon: Icon,
  title,
  subtitle,
  action,
  className,
  ...props
}: React.ComponentProps<"div"> & {
  icon?: React.ElementType
  title?: string
  subtitle?: string
  action?: React.ReactNode
}) {
  return (
    <div
      className={cn("flex flex-col items-center justify-center text-center", className)}
      style={{ minHeight: "200px" }}
      {...props}
    >
      {Icon && (
        <Icon size={32} style={{ color: "var(--text-muted)" }} />
      )}
      {title && (
        <p style={{ fontSize: "15px", fontWeight: 500, color: "var(--text-primary)", marginTop: "12px" }}>
          {title}
        </p>
      )}
      {subtitle && (
        <p style={{ fontSize: "14px", color: "var(--text-secondary)", maxWidth: "320px", margin: "0 auto", lineHeight: 1.5 }}>
          {subtitle}
        </p>
      )}
      {action && <div style={{ marginTop: "16px" }}>{action}</div>}
    </div>
  )
}

export {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardAction,
  CardDescription,
  CardContent,
  CardEmpty,
}
