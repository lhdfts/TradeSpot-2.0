import * as React from 'react';
import { AlertDialog } from '@base-ui-components/react/alert-dialog';
import { cn } from '../../lib/utils';
import { buttonVariants } from './button';

export interface ConfirmOptions {
  title: string;
  description?: string;
  confirmLabel: string;
  /** Padrão: "Cancelar" */
  cancelLabel?: string;
  /** Ação destrutiva (excluir, arquivar...): botão vermelho e foco inicial no Cancelar. */
  destructive?: boolean;
}

type ConfirmFn = (opts: ConfirmOptions) => Promise<boolean>;

const ConfirmContext = React.createContext<ConfirmFn | null>(null);

interface PendingConfirm {
  opts: ConfirmOptions;
  resolve: (value: boolean) => void;
}

/**
 * Substitui o window.confirm() nativo por um AlertDialog acessível.
 * Uso:
 *   const confirm = useConfirm();
 *   if (!(await confirm({ title: 'Excluir atendente?', confirmLabel: 'Excluir', destructive: true }))) return;
 */
export function ConfirmDialogProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = React.useState(false);
  // Mantido até o fim da animação de saída, para o conteúdo não sumir antes do diálogo
  const [pending, setPending] = React.useState<PendingConfirm | null>(null);
  const pendingRef = React.useRef<PendingConfirm | null>(null);
  const cancelRef = React.useRef<HTMLButtonElement>(null);
  const confirmRef = React.useRef<HTMLButtonElement>(null);

  const settle = React.useCallback((value: boolean) => {
    pendingRef.current?.resolve(value);
    pendingRef.current = null;
    setOpen(false);
  }, []);

  const confirm = React.useCallback<ConfirmFn>((opts) => {
    // Um pedido novo enquanto outro está aberto cancela o anterior
    pendingRef.current?.resolve(false);
    return new Promise<boolean>((resolve) => {
      const next = { opts, resolve };
      pendingRef.current = next;
      setPending(next);
      setOpen(true);
    });
  }, []);

  // Se o provider desmontar com um pedido aberto, a promessa não fica pendurada
  React.useEffect(() => () => pendingRef.current?.resolve(false), []);

  const opts = pending?.opts;

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <AlertDialog.Root
        open={open}
        onOpenChange={(next) => {
          if (!next) settle(false);
        }}
        onOpenChangeComplete={(isOpen) => {
          if (!isOpen && !pendingRef.current) setPending(null);
        }}
      >
        <AlertDialog.Portal>
          <AlertDialog.Backdrop
            data-confirm-dialog=""
            className={cn(
              'fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm',
              'transition-opacity duration-200 [transition-timing-function:cubic-bezier(0.23,1,0.32,1)]',
              'data-[starting-style]:opacity-0 data-[ending-style]:opacity-0'
            )}
          />
          <AlertDialog.Viewport data-confirm-dialog="" className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <AlertDialog.Popup
              initialFocus={opts?.destructive ? cancelRef : confirmRef}
              className={cn(
                'w-full max-w-md rounded-xl border border-border bg-surface p-5 sm:p-6 text-foreground shadow-2xl outline-none',
                // Opacidade + leve escala; movimento reduzido: só opacidade
                'transition-[opacity,transform] duration-200 [transition-timing-function:cubic-bezier(0.23,1,0.32,1)]',
                'data-[starting-style]:opacity-0 data-[starting-style]:scale-[0.96] data-[ending-style]:opacity-0 data-[ending-style]:scale-[0.96]',
                'motion-reduce:transition-opacity motion-reduce:data-[starting-style]:scale-100 motion-reduce:data-[ending-style]:scale-100'
              )}
            >
              <AlertDialog.Title className="text-base sm:text-lg font-semibold text-foreground text-pretty">
                {opts?.title}
              </AlertDialog.Title>
              {opts?.description && (
                <AlertDialog.Description className="mt-2 text-sm text-muted-foreground text-pretty whitespace-pre-line">
                  {opts.description}
                </AlertDialog.Description>
              )}
              <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <button
                  ref={cancelRef}
                  type="button"
                  onClick={() => settle(false)}
                  className={buttonVariants({ variant: 'outline' })}
                >
                  {opts?.cancelLabel ?? 'Cancelar'}
                </button>
                <button
                  ref={confirmRef}
                  type="button"
                  onClick={() => settle(true)}
                  className={cn(
                    buttonVariants({ variant: opts?.destructive ? 'destructive' : 'default' }),
                    opts?.destructive && 'bg-destructive text-destructive-foreground'
                  )}
                >
                  {opts?.confirmLabel}
                </button>
              </div>
            </AlertDialog.Popup>
          </AlertDialog.Viewport>
        </AlertDialog.Portal>
      </AlertDialog.Root>
    </ConfirmContext.Provider>
  );
}

/** Retorna confirm(opts) => Promise<boolean> (true = confirmou). */
// eslint-disable-next-line react-refresh/only-export-components
export function useConfirm(): ConfirmFn {
  const ctx = React.useContext(ConfirmContext);
  // Fora do provider (não deveria acontecer): cai no confirm nativo em vez de quebrar
  return ctx ?? ((opts) => Promise.resolve(window.confirm(opts.description ? `${opts.title}\n\n${opts.description}` : opts.title)));
}
