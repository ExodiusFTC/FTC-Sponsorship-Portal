import { mergeProps } from "@base-ui/react/merge-props"
import { useRender } from "@base-ui/react/use-render"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "group/badge inline-flex h-5 w-fit shrink-0 items-center justify-center gap-1 overflow-hidden rounded-full border px-2 py-0.5 text-xs font-medium whitespace-nowrap focus-visible:ring-2 focus-visible:ring-ring/50 [&>svg]:pointer-events-none [&>svg]:size-3!",
  {
    variants: {
      variant: {
        default:
          "border-transparent",
        secondary:
          "border-transparent",
        destructive:
          "border-transparent",
        outline:
          "border-[var(--border-color)] text-[var(--text-primary)]",
        ghost:
          "border-transparent",
        link:
          "border-transparent underline-offset-4 hover:underline",
        approved:
          "border-[var(--badge-success-bg)]",
        pending:
          "border-[var(--badge-pending-bg)]",
        "needs-revision":
          "border-[var(--badge-warning-bg)]",
        rejected:
          "border-[var(--badge-rejected-bg)]",
        draft:
          "border-[var(--badge-pending-bg)]",
        locked:
          "border-[var(--bg-elevated)]",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

const statusStyles: Record<string, React.CSSProperties> = {
  approved: { background: "var(--badge-success-bg)", color: "var(--badge-success-text)" },
  pending: { background: "var(--badge-pending-bg)", color: "var(--badge-pending-text)" },
  "needs-revision": { background: "var(--badge-warning-bg)", color: "var(--badge-warning-text)" },
  rejected: { background: "var(--badge-rejected-bg)", color: "var(--badge-rejected-text)" },
  draft: { background: "var(--badge-pending-bg)", color: "var(--badge-pending-text)" },
  locked: { background: "var(--bg-elevated)", color: "var(--text-muted)" },
}

const STATUS_VARIANTS = ["approved", "pending", "needs-revision", "rejected", "draft", "locked"] as const
type StatusVariant = (typeof STATUS_VARIANTS)[number]

function Badge({
  className,
  variant = "default",
  render,
  style,
  ...props
}: useRender.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants> & {
    style?: React.CSSProperties
  }) {
  const isStatus = variant && STATUS_VARIANTS.includes(variant as StatusVariant)

  const computedStyle: React.CSSProperties = {
    ...(isStatus ? statusStyles[variant as string] : {}),
    ...style,
  }

  return useRender({
    defaultTagName: "span",
    props: mergeProps<"span">(
      {
        className: cn(badgeVariants({ variant }), className),
        style: computedStyle,
      },
      props
    ),
    render,
    state: { slot: "badge", variant },
  })
}

export { Badge, badgeVariants }
