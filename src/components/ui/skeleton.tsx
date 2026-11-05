import * as React from "react";
import { cn } from "@/lib/utils";

// Bloco de carregamento. Usa o brilho .animate-shimmer do index.css
// (já desligado com prefers-reduced-motion).
function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn("rounded-sm bg-muted/60 animate-shimmer", className)}
      data-slot="skeleton"
      aria-hidden="true"
      {...props}
    />
  );
}

export { Skeleton };
