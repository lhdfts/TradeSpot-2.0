# TradeSpot UI: convenções

Sistema interno de agendamentos de times comerciais. Textos de interface sempre em **português do Brasil**. Todos os componentes estão em `window.TradeSpotUI`.

## Montagem (providers)

- `ToastProvider` envolve o app inteiro. Sem ele, `notify.*` e `toastManager.add` não mostram nada.
- `ConfirmDialogProvider` fica dentro do `ToastProvider`. Sem ele, `useConfirm()` lança erro.
- `ThemeProvider` só é obrigatório para `ThemeToggle`/`useTheme`. O tema escuro é a classe `dark` no `<html>`: as cores de token trocam sozinhas, então não escreva variantes `dark:`.
- `Modal` e o diálogo de confirmação já criam portal, backdrop e foco preso. Não envolva em `fixed`.

```jsx
const { ToastProvider, ConfirmDialogProvider } = window.TradeSpotUI;
<ToastProvider position="top-right">
  <ConfirmDialogProvider>{/* telas */}</ConfirmDialogProvider>
</ToastProvider>
```

## Estilo: Tailwind com cores de token

Não use cores cruas (`blue-600`, `#fff`). Use estas famílias, com os prefixos `bg-`, `text-` e `border-`, opacidades `/10`, `/20` e `/50`, e `hover:`:

| Uso | Classes |
|---|---|
| Fundo da página / superfícies | `bg-background`, `bg-surface`, `bg-card`, `bg-sidebar`, `bg-popover`, `bg-muted` |
| Texto | `text-foreground`, `text-muted-foreground`, `text-card-foreground` |
| Bordas | `border-border`; campos: `border-input` |
| Ação principal | `bg-primary text-primary-foreground` (azul da marca) |
| Secundário / neutro | `bg-secondary`, `bg-accent text-accent-foreground` |
| Perigo / feedback | `bg-destructive text-destructive-foreground`, `text-success`, `text-warning`, `text-danger` |
| Status de agendamento | `text-status-realizado`, `-pendente`, `-cancelado`, `-reagendado`, `-esquecimento`, `-noshow`, `-iniciando`, `-total`; fundo suave com `bg-status-<x>/10` |

- **Raio:** `rounded-lg` (= `--radius`), `rounded-md` e `rounded-sm`.
- **Sombra:** estética plana. `shadow`/`shadow-sm`/`shadow-md` não desenham nada; só camadas flutuantes usam `shadow-lg`, `shadow-xl` e `shadow-2xl`.
- **Fonte:** Montserrat em tudo, já no `body`.
- **Ícones:** os componentes usam `lucide-react`. Use ícones lucide nas suas telas também.
- **Classes condicionais:** `cn(...)` (clsx + tailwind-merge).

## Componentes-chave

- `Button`: `variant` = `default` | `destructive` | `outline` | `secondary` | `ghost` | `link`; `size` = `default` | `sm` | `lg` | `icon`.
- `StatusBadge status="Realizado"`. Valores aceitos: `Realizado`, `Pendente`, `Cancelado`, `Reagendado`, `Esquecimento`, `No-show`, `Iniciando`, `Ao Vivo`.
- `Modal isOpen onClose title`. `EmptyState title description icons action`.
- Formulários: use a família `Floating*` (`FloatingInput`, `FloatingSelect`, `FloatingSearchSelect`, `FloatingDateInput`, `TimePickerInput`…), que tem rótulo flutuante e é o padrão das telas do app. `Input`/`Select` são a versão simples, com `label` e `error`.
- Avisos: `notify.success(título, descrição?)`, e também `.error`, `.info` e `.warning`. Confirmação: `const confirm = useConfirm(); await confirm({...})`.

## Onde está a verdade

`styles.css` → `_ds_bundle.css`, que tem os tokens de `:root`/`.dark` e as classes geradas. Para cada componente, leia `components/<grupo>/<Nome>/<Nome>.d.ts` (props) e `<Nome>.prompt.md` antes de usar.

## Exemplo

```jsx
const { Button, StatusBadge } = window.TradeSpotUI;
<div className="rounded-lg border border-border bg-card p-4">
  <div className="flex items-center justify-between gap-3">
    <div>
      <p className="font-semibold text-foreground">Marina Souza</p>
      <p className="text-sm text-muted-foreground">Ligação Closer · 15:00</p>
    </div>
    <StatusBadge status="Pendente" />
  </div>
  <div className="mt-4 flex justify-end gap-2">
    <Button variant="outline" size="sm">Reagendar</Button>
    <Button size="sm">Marcar realizado</Button>
  </div>
</div>
```
