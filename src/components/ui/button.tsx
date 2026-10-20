import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full text-[15px] font-semibold transition-[background-color,color,transform] duration-150 disabled:pointer-events-none [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none active:scale-[0.98] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
  {
    variants: {
      variant: {
        // Disabled states are per variant: half-transparent ink reads as a muddy grey.
        default: "bg-primary text-primary-foreground hover:bg-primary/88 disabled:bg-accent disabled:text-muted-foreground",
        // The one primary action on a screen (Start, Subscribe). Everything else stays ink or grey.
        brand: "bg-brand text-brand-foreground hover:bg-brand/90 disabled:opacity-45",
        destructive:
          "bg-destructive text-white hover:bg-destructive/90 disabled:opacity-50 dark:bg-destructive/60",
        outline:
          "border border-border bg-background hover:bg-secondary disabled:text-muted-foreground disabled:opacity-70",
        secondary:
          "bg-control text-secondary-foreground hover:bg-control-hover disabled:text-muted-foreground disabled:opacity-70",
        ghost:
          "hover:bg-control hover:text-foreground disabled:opacity-50",
        link: "text-primary underline-offset-4 hover:underline disabled:opacity-50",
      },
      size: {
        // Heights match fields: sm 36 · default 44 · lg 52.
        default: "h-11 px-5 has-[>svg]:px-4",
        sm: "h-9 gap-1.5 px-4 text-sm has-[>svg]:px-3.5",
        lg: "h-[52px] px-7 text-base has-[>svg]:px-6",
        icon: "size-11",
        "icon-sm": "size-9",
        "icon-lg": "size-[52px]",
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
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot : "button"

  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
