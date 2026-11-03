"use client";

import * as React from "react";
import { Toast } from "@base-ui-components/react/toast";
import {
  CircleAlertIcon,
  CircleCheckIcon,
  InfoIcon,
  LoaderCircleIcon,
  TriangleAlertIcon,
  XIcon,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import "./toast.css";

const toastManager = Toast.createToastManager();

const TOAST_ICONS = {
  error: CircleAlertIcon,
  info: InfoIcon,
  loading: LoaderCircleIcon,
  success: CircleCheckIcon,
  warning: TriangleAlertIcon,
} as const;

// Cor do ícone por tipo (não há tokens info/success/warning no tema:
// info usa o primário; success/warning usam as cores fixas do tailwind.config).
const TOAST_ICON_CLASS: Record<keyof typeof TOAST_ICONS, string> = {
  error: "text-destructive",
  info: "text-primary",
  loading: "animate-spin opacity-70 motion-reduce:animate-none",
  success: "text-success",
  warning: "text-warning",
};

type ToastPosition =
  | "top-left"
  | "top-center"
  | "top-right"
  | "bottom-left"
  | "bottom-center"
  | "bottom-right";

interface ToastProviderProps extends Toast.Provider.Props {
  position?: ToastPosition;
}

// Indica que já existe um ToastProvider acima: um segundo provider aninhado
// (ex.: o do App e o do InternalApp) só repassa os filhos, senão cada toast
// apareceria duas vezes (os dois assinariam o mesmo toastManager).
const ToastMountedContext = React.createContext(false);

function ToastProvider({
  children,
  position = "bottom-right",
  ...props
}: ToastProviderProps) {
  const alreadyMounted = React.useContext(ToastMountedContext);
  if (alreadyMounted) return <>{children}</>;

  return (
    <ToastMountedContext.Provider value>
      <Toast.Provider toastManager={toastManager} {...props}>
        {children}
        <Toasts position={position} />
      </Toast.Provider>
    </ToastMountedContext.Provider>
  );
}

function Toasts({ position }: { position: ToastPosition }) {
  const { toasts } = Toast.useToastManager();
  const isTop = position.startsWith("top");

  return (
    <Toast.Portal data-slot="toast-portal">
      <Toast.Viewport
        className="toast-viewport outline-none"
        data-position={position}
        data-slot="toast-viewport"
      >
        {toasts.map((toast) => {
          const type = toast.type as keyof typeof TOAST_ICONS | undefined;
          const Icon = type ? TOAST_ICONS[type] : null;

          return (
            <Toast.Root
              className="toast-root rounded-lg border border-border bg-popover text-popover-foreground shadow-lg"
              data-position={position}
              key={toast.id}
              swipeDirection={
                position.includes("center")
                  ? [isTop ? "up" : "down"]
                  : position.includes("left")
                    ? ["left", isTop ? "up" : "down"]
                    : ["right", isTop ? "up" : "down"]
              }
              toast={toast}
            >
              <Toast.Content className="pointer-events-auto flex items-start justify-between gap-2 overflow-hidden px-3.5 py-3 text-sm transition-opacity duration-200 data-[behind]:pointer-events-none data-[behind]:opacity-0 data-[expanded]:opacity-100">
                <div className="flex min-w-0 gap-2">
                  {Icon && (
                    <div
                      className="flex h-5 shrink-0 items-center [&_svg]:pointer-events-none"
                      data-slot="toast-icon"
                      aria-hidden="true"
                    >
                      <Icon className={cn("size-4", type && TOAST_ICON_CLASS[type])} />
                    </div>
                  )}

                  <div className="flex min-w-0 flex-col gap-0.5">
                    <Toast.Title
                      className="font-medium text-foreground"
                      data-slot="toast-title"
                    />
                    <Toast.Description
                      className="break-words text-muted-foreground"
                      data-slot="toast-description"
                    />
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  {toast.actionProps && (
                    <Toast.Action
                      className={buttonVariants({ size: "sm" })}
                      data-slot="toast-action"
                    >
                      {toast.actionProps.children}
                    </Toast.Action>
                  )}
                  <Toast.Close
                    aria-label="Fechar notificação"
                    className="-m-1 rounded p-1 text-muted-foreground transition-colors duration-150 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <XIcon className="size-4" aria-hidden="true" />
                  </Toast.Close>
                </div>
              </Toast.Content>
            </Toast.Root>
          );
        })}
      </Toast.Viewport>
    </Toast.Portal>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export { ToastProvider, type ToastPosition, toastManager };
