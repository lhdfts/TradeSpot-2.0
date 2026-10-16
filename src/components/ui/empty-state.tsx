// Adaptado do "Empty State" do 21st.dev (@serafimcloud): ícones em leque que se
// abrem no hover. As sombras do tema estão desligadas (tailwind.config), por isso
// os cartões dos ícones usam ring em vez de shadow.
import * as React from 'react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '../../lib/utils';
import { Button } from './button';

interface EmptyStateAction {
  label: string;
  onClick: () => void;
  icon?: LucideIcon;
}

interface EmptyStateProps {
  title: string;
  description?: string;
  /** Um ícone, ou três para o leque. */
  icons?: LucideIcon[];
  action?: EmptyStateAction;
  secondaryAction?: EmptyStateAction;
  className?: string;
}

const iconCard =
  'bg-surface size-12 grid place-items-center rounded-xl ring-1 ring-border transition duration-500 group-hover:duration-200';

export function EmptyState({ title, description, icons = [], action, secondaryAction, className }: EmptyStateProps) {
  const iconClass = 'w-6 h-6 text-muted-foreground';
  return (
    <div
      className={cn(
        'group w-full text-center rounded-xl border-2 border-dashed border-border bg-surface/60 px-6 py-14',
        'hover:bg-surface transition duration-500 hover:duration-200 animate-blur-fade',
        className
      )}
    >
      <div className="flex justify-center isolate">
        {icons.length === 3 ? (
          <>
            <div className={cn(iconCard, 'relative left-2.5 top-1.5 -rotate-6 group-hover:-translate-x-5 group-hover:-rotate-12 group-hover:-translate-y-0.5')}>
              {React.createElement(icons[0], { className: iconClass })}
            </div>
            <div className={cn(iconCard, 'relative z-10 group-hover:-translate-y-0.5')}>
              {React.createElement(icons[1], { className: iconClass })}
            </div>
            <div className={cn(iconCard, 'relative right-2.5 top-1.5 rotate-6 group-hover:translate-x-5 group-hover:rotate-12 group-hover:-translate-y-0.5')}>
              {React.createElement(icons[2], { className: iconClass })}
            </div>
          </>
        ) : (
          icons[0] && (
            <div className={cn(iconCard, 'group-hover:-translate-y-0.5')}>
              {React.createElement(icons[0], { className: iconClass })}
            </div>
          )
        )}
      </div>
      <h2 className="text-foreground font-semibold mt-6">{title}</h2>
      {description && <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto whitespace-pre-line">{description}</p>}
      {(action || secondaryAction) && (
        <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
          {secondaryAction && (
            <Button variant="outline" onClick={secondaryAction.onClick}>
              {secondaryAction.icon && <secondaryAction.icon size={16} className="mr-2" />}
              {secondaryAction.label}
            </Button>
          )}
          {action && (
            <Button onClick={action.onClick}>
              {action.icon && <action.icon size={16} className="mr-2" />}
              {action.label}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
