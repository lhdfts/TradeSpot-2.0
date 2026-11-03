import { toastManager } from './toast';

// Atalho para os toasts (substitui o alert() nativo):
//   notify.error('Não foi possível salvar', err.message);
//   notify.success('Link copiado');
// O ToastProvider é montado globalmente no App, então funciona em qualquer página.

type NotifyType = 'success' | 'error' | 'info' | 'warning';

const show = (type: NotifyType) => (title: string, description?: string) =>
  toastManager.add({ title, description, type });

export const notify = {
  success: show('success'),
  error: show('error'),
  info: show('info'),
  warning: show('warning'),
};
