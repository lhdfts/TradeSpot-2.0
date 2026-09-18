"use client";

import { Checkbox as CheckboxPrimitive } from "@base-ui-components/react/checkbox";

import { cn } from "@/lib/utils";

function Checkbox({ className, ...props }: CheckboxPrimitive.Root.Props) {
  return (
    <CheckboxPrimitive.Root
      className={cn(
        "relative inline-flex size-4 shrink-0 items-center justify-center rounded-[0.25rem] border border-input bg-background outline-none transition-all focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-primary disabled:cursor-not-allowed disabled:opacity-50 data-[checked]:bg-primary data-[checked]:border-primary",
        className,
      )}
      data-slot="checkbox"
      {...props}
    >
      <CheckboxPrimitive.Indicator
        className="flex items-center justify-center text-white"
        data-slot="checkbox-indicator"
        render={(props) => (
          <span {...props}>
            <svg
              className="size-3"
              fill="none"
              height="24"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="4"
              viewBox="0 0 24 24"
              width="24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path d="M5.252 12.7 10.2 18.63 18.748 5.37" />
            </svg>
          </span>
        )}
      />
    </CheckboxPrimitive.Root>
  );
}

export { Checkbox };
