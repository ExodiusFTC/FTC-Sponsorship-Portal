import { Button as ButtonPrimitive } from "@base-ui/react/button"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center rounded-[6px] text-sm font-medium whitespace-nowrap transition-all outline-none select-none focus-visible:ring-2 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98] [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default:
          "border-0 px-[14px] py-[7px] transition-opacity duration-150 ease-in-out hover:opacity-85",
        primary:
          "border-0 px-[14px] py-[7px] transition-opacity duration-150 ease-in-out hover:opacity-85",
        secondary:
          "border border-[var(--border-color)] bg-transparent text-[var(--text-primary)] px-[14px] py-[7px] hover:bg-[var(--bg-elevated)] transition-[background] duration-100 ease-in-out",
        destructive:
          "border border-[var(--accent-error)] bg-transparent text-[var(--accent-error)] px-[14px] py-[7px]",
        outline:
          "border border-[var(--border-color)] bg-transparent text-[var(--text-primary)] px-[14px] py-[7px] hover:bg-[var(--bg-elevated)] transition-[background] duration-100 ease-in-out",
        ghost:
          "bg-transparent hover:bg-[var(--bg-elevated)] text-[var(--text-secondary)] px-[14px] py-[7px] transition-[background] duration-100 ease-in-out border-0",
        link: "text-[var(--text-primary)] underline-offset-4 hover:underline border-0 bg-transparent p-0",
        icon: "size-8 border-0 bg-transparent hover:bg-[var(--bg-elevated)] transition-[background] duration-100 ease-in-out",
      },
      size: {
        default: "gap-1.5",
        xs: "text-xs rounded-[4px] gap-1 [&_svg:not([class*='size-'])]:size-3",
        sm: "text-[0.8rem] gap-1 [&_svg:not([class*='size-'])]:size-3.5",
        lg: "gap-1.5",
        icon: "size-8",
        "icon-xs": "size-6 rounded-[4px] [&_svg:not([class*='size-'])]:size-3",
        "icon-sm": "size-7 [&_svg:not([class*='size-'])]:size-3.5",
        "icon-lg": "size-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  style,
  ...props
}: ButtonPrimitive.Props &
  VariantProps<typeof buttonVariants> & { style?: React.CSSProperties }) {
  const isPrimary = variant === "default" || variant === "primary"
  const baseStyle: React.CSSProperties = isPrimary
    ? {
        background: "var(--text-primary)",
        color: "var(--bg-app)",
        ...style,
      }
    : style ?? {}

  return (
    <ButtonPrimitive
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      style={baseStyle}
      {...props}
    />
  )
}

export { Button, buttonVariants }
