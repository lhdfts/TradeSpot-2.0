"use client";

import { Tabs as TabsPrimitive } from "@base-ui-components/react/tabs";

import { cn } from "@/lib/utils";

type TabsVariant = "default" | "underline";

function Tabs({ className, ...props }: TabsPrimitive.Root.Props) {
  return (
    <TabsPrimitive.Root
      className={cn(
        "flex flex-col gap-2 data-[orientation=vertical]:flex-row",
        className,
      )}
      data-slot="tabs"
      {...props}
    />
  );
}

function TabsList({
  variant = "default",
  className,
  children,
  ...props
}: TabsPrimitive.List.Props & {
  variant?: TabsVariant;
}) {
  return (
    <TabsPrimitive.List
      className={cn(
        "relative z-0 flex w-fit items-center justify-center gap-x-0.5 text-muted-foreground",
        "data-[orientation=vertical]:flex-col",
        variant === "default"
          ? "rounded-lg bg-muted p-0.5 text-muted-foreground/70"
          : "data-[orientation=vertical]:px-1 data-[orientation=horizontal]:py-1 [&>[data-slot=tabs-trigger]:hover]:bg-accent",
        className,
      )}
      data-slot="tabs-list"
      {...props}
    >
      {children}
      {/* Indicador deslizante: posição e tamanho vêm das variáveis --active-tab-* do Base UI */}
      <TabsPrimitive.Indicator
        className={cn(
          "absolute left-0 top-0 transition-[width,height,transform] duration-200 [transition-timing-function:cubic-bezier(0.23,1,0.32,1)] motion-reduce:transition-none",
          variant === "underline"
            ? cn(
                "z-10 bg-primary",
                "data-[orientation=horizontal]:h-0.5 data-[orientation=horizontal]:w-[var(--active-tab-width)] data-[orientation=horizontal]:[transform:translate(var(--active-tab-left),calc(var(--active-tab-top)+var(--active-tab-height)-2px))]",
                "data-[orientation=vertical]:w-0.5 data-[orientation=vertical]:h-[var(--active-tab-height)] data-[orientation=vertical]:[transform:translate(var(--active-tab-left),var(--active-tab-top))]",
              )
            : "-z-10 h-[var(--active-tab-height)] w-[var(--active-tab-width)] rounded-md bg-background [transform:translate(var(--active-tab-left),var(--active-tab-top))] dark:bg-accent",
        )}
        data-slot="tab-indicator"
      />
    </TabsPrimitive.List>
  );
}

function TabsTab({ className, ...props }: TabsPrimitive.Tab.Props) {
  return (
    <TabsPrimitive.Tab
      className={cn(
        "flex flex-1 shrink-0 cursor-pointer items-center justify-center whitespace-nowrap rounded-md border border-transparent font-medium text-sm outline-none transition-[color,background-color,box-shadow] duration-150 focus-visible:ring-2 focus-visible:ring-ring data-[disabled]:pointer-events-none data-[disabled]:opacity-60 [&_svg:not([class*='size-'])]:size-4 [&_svg]:pointer-events-none [&_svg]:shrink-0",
        "hover:text-foreground data-[active]:text-foreground",
        "gap-1.5 px-[calc(0.625rem-1px)] py-[calc(0.375rem-1px)]",
        "data-[orientation=vertical]:w-full data-[orientation=vertical]:justify-start",
        className,
      )}
      data-slot="tabs-trigger"
      {...props}
    />
  );
}

function TabsPanel({ className, ...props }: TabsPrimitive.Panel.Props) {
  return (
    <TabsPrimitive.Panel
      className={cn("flex-1 outline-none", className)}
      data-slot="tabs-content"
      {...props}
    />
  );
}

export {
  Tabs,
  TabsList,
  TabsTab,
  TabsTab as TabsTrigger,
  TabsPanel,
  TabsPanel as TabsContent,
};
