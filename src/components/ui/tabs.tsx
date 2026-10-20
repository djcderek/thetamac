"use client"

import * as React from "react"
import * as TabsPrimitive from "@radix-ui/react-tabs"
import { motion } from "motion/react"

import { cn } from "@/lib/utils"
import { snapSpring } from "@/lib/motion"

type TabsVariant = "segmented" | "chips"

// The active value and a per-instance id, so the selection pill can be one shared element
// that slides between triggers instead of jumping.
const TabsStateContext = React.createContext<{ value?: string; id: string }>({ id: "" })
const TabsVariantContext = React.createContext<TabsVariant>("segmented")

function Tabs({
  className,
  value,
  defaultValue,
  onValueChange,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Root>) {
  const id = React.useId()
  const [uncontrolledValue, setUncontrolledValue] = React.useState(defaultValue)
  const current = value ?? uncontrolledValue

  return (
    <TabsStateContext.Provider value={{ value: current, id }}>
      <TabsPrimitive.Root
        data-slot="tabs"
        value={value}
        defaultValue={defaultValue}
        onValueChange={(next) => {
          setUncontrolledValue(next)
          onValueChange?.(next)
        }}
        className={cn("flex flex-col gap-2", className)}
        {...props}
      />
    </TabsStateContext.Provider>
  )
}

// Two patterns, after Kurb: "segmented" (white on grey) for a screen's main choice, and
// "chips" (ink when selected, grey otherwise, like Active/Resolved) for secondary filters.
// Both are 44px tall pills, matching buttons and fields.
function TabsList({
  className,
  variant = "segmented",
  ...props
}: React.ComponentProps<typeof TabsPrimitive.List> & { variant?: TabsVariant }) {
  return (
    <TabsVariantContext.Provider value={variant}>
      <TabsPrimitive.List
        data-slot="tabs-list"
        data-variant={variant}
        className={cn(
          "inline-flex w-fit items-center",
          variant === "segmented"
            ? "bg-control text-muted-foreground min-h-11 justify-center rounded-full p-1"
            : "flex-wrap gap-1.5",
          className
        )}
        {...props}
      />
    </TabsVariantContext.Provider>
  )
}

function TabsTrigger({
  className,
  value,
  children,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Trigger>) {
  const { value: current, id } = React.useContext(TabsStateContext)
  const variant = React.useContext(TabsVariantContext)
  const active = current === value

  return (
    <TabsPrimitive.Trigger
      data-slot="tabs-trigger"
      value={value}
      className={cn(
        // `isolate` keeps the sliding pill (-z-10) above the trigger's own fill, below its label.
        "relative isolate inline-flex h-9 items-center justify-center gap-1.5 rounded-full px-4 text-sm font-medium whitespace-nowrap transition-colors duration-200 disabled:pointer-events-none disabled:opacity-40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        variant === "segmented"
          ? "flex-1 text-muted-foreground hover:text-foreground data-[state=active]:text-foreground"
          : "bg-control text-foreground hover:bg-control-hover data-[state=active]:text-background",
        className
      )}
      {...props}
    >
      {active && (
        <motion.span
          layoutId={`${id}-tab-indicator`}
          // Slide only when the selection changes; if the row reflows (content above it
          // appears or goes), the pill moves with its trigger instead of trailing behind.
          layoutDependency={current}
          transition={snapSpring}
          aria-hidden="true"
          className={cn(
            "absolute inset-0 -z-10 rounded-full",
            variant === "segmented"
              ? "bg-background shadow-[0_1px_2px_rgb(0_0_0/0.06)] dark:bg-accent"
              : "bg-foreground"
          )}
        />
      )}
      {children}
    </TabsPrimitive.Trigger>
  )
}

function TabsContent({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Content>) {
  return (
    <TabsPrimitive.Content
      data-slot="tabs-content"
      className={cn("flex-1 outline-none", className)}
      {...props}
    />
  )
}

export { Tabs, TabsList, TabsTrigger, TabsContent }
