// Entrada do design system do TradeSpot para o Claude Design (design-sync).
// Só reexporta componentes reais de src/ - nada aqui é reimplementação.
// Ficam de fora as telas que chamam a API, dependem de login ou de rotas
// (formulários de agendamento, modais de atendente/evento, Sidebar, ProtectedRoute).

// Base (src/components/ui)
export { Button, buttonVariants, cn } from '../../src/components/ui/button';
export type { ButtonProps } from '../../src/components/ui/button';
export { Checkbox } from '../../src/components/ui/checkbox';
export { Input, Select } from '../../src/components/ui/input';
export { Modal } from '../../src/components/ui/modal';
export { Tabs, TabsList, TabsTab, TabsTrigger, TabsPanel, TabsContent } from '../../src/components/ui/tabs';
export { TooltipProvider, Tooltip, TooltipTrigger, TooltipPopup, TooltipContent } from '../../src/components/ui/tooltip';
export { Skeleton } from '../../src/components/ui/skeleton';
export { EmptyState } from '../../src/components/ui/empty-state';
export { LoadingState } from '../../src/components/ui/loading-state';
export { Pagination, PaginationBar } from '../../src/components/ui/pagination';
export { FadeIn, CountUp } from '../../src/components/ui/animate';
export { ToastProvider, toastManager } from '../../src/components/ui/toast';
export { ConfirmDialogProvider, useConfirm } from '../../src/components/ui/confirm-dialog';
export { notify } from '../../src/components/ui/notify';

// Formulário
export { FloatingInput } from '../../src/components/FloatingInput';
export { FloatingTextArea } from '../../src/components/FloatingTextArea';
export { FloatingSelect } from '../../src/components/FloatingSelect';
export { FloatingSearchSelect } from '../../src/components/FloatingSearchSelect';
export { FloatingMultiSelect } from '../../src/components/FloatingMultiSelect';
export { FloatingCountrySelect } from '../../src/components/FloatingCountrySelect';
export { FloatingDateInput } from '../../src/components/FloatingDateInput';
export { CustomSelect } from '../../src/components/CustomSelect';
export { DateRangePicker } from '../../src/components/DateRangePicker';
export { TimePickerInput } from '../../src/components/TimePickerInput';
export { TimePickerModal } from '../../src/components/TimePickerModal';

// Marca
export { Logo } from '../../src/components/Logo';
export { LogoIcon } from '../../src/components/LogoIcon';
export { CustomPublicLogo } from '../../src/components/CustomPublicLogo';
export { ExportIcon } from '../../src/components/ExportIcon';

// Domínio
export { StatusBadge } from '../../src/components/appointments/StatusBadge';
export { CalendarView } from '../../src/components/CalendarView';
export { ColumnPicker } from '../../src/components/appointments/ColumnPicker';
export { ThemeToggle } from '../../src/components/ThemeToggle';
export { ThemeProvider, useTheme } from '../../src/context/ThemeContext';
