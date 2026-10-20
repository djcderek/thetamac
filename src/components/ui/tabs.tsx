"use client"

import * as React from "react"
import * as TabsPrimitive from "@radix-ui/react-tabs"

import { cn } from "@/lib/utils"

function Tabs({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Root>) {
  return (
    <TabsPrimitive.Root
      data-slot="tabs"
      className={cn("flex flex-col gap-2", className)}
      {...props}
    />
  )
}

// Two patterns, after Kurb: "segmented" (white on grey) for a screen's main choice, and
// "chips" (ink when selected, grey otherwise, like Active/Resolved) for secondary filters.
// Both are 44px tall pills, matching buttons and fields.
function TabsList({
  className,
  variant = "segmented",
  ...props
}: React.ComponentProps<typeof TabsPrimitive.List> & { variant?: "segmented" | "chips" }) {
  return (
    <TabsPrimitive.List
      data-slot="tabs-list"
      data-variant={variant}
      className={cn(
        "group/tabs inline-flex w-fit items-center",
        variant === "segmented"
          ? "bg-control text-muted-foreground min-h-11 justify-center rounded-full p-1"
          : "flex-wrap gap-1.5",
        className
      )}
      {...props}
    />
  )
}

function TabsTrigger({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Trigger>) {
  return (
    <TabsPrimitive.Trigger
      data-slot="tabs-trigger"
      className={cn(
        "inline-flex h-9 items-center justify-center gap-1.5 rounded-full px-4 text-sm font-medium whitespace-nowrap transition-[color,background-color] disabled:pointer-events-none disabled:opacity-40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        // segmented
        "group-data-[variant=segmented]/tabs:flex-1 group-data-[variant=segmented]/tabs:text-muted-foreground group-data-[variant=segmented]/tabs:hover:text-foreground group-data-[variant=segmented]/tabs:data-[state=active]:bg-background group-data-[variant=segmented]/tabs:data-[state=active]:text-foreground group-data-[variant=segmented]/tabs:data-[state=active]:shadow-[0_1px_2px_rgb(0_0_0/0.06)] dark:group-data-[variant=segmented]/tabs:data-[state=active]:bg-accent",
        // chips
        "group-data-[variant=chips]/tabs:bg-control group-data-[variant=chips]/tabs:text-foreground group-data-[variant=chips]/tabs:hover:bg-control-hover group-data-[variant=chips]/tabs:data-[state=active]:bg-foreground group-data-[variant=chips]/tabs:data-[state=active]:text-background",
        className
      )}
      {...props}
    />
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
