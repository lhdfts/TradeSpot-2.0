import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ToastProvider } from './components/ui/toast';
import { ConfirmDialogProvider } from './components/ui/confirm-dialog';

// Dois pacotes separados, baixados sob demanda:
// - /agendar/*: página pública de agendamento. Leve: sem Firebase, gráficos
//   nem o painel interno, que o aluno não usa.
// - o resto: sistema interno (login, painel, docs, vinheta).
const PublicSchedulingApp = lazy(() => import('./views/public/PublicSchedulingApp'));
const InternalApp = lazy(() => import('./InternalApp'));

// Só um spinner em CSS, para não puxar nada para o pacote inicial.
const LoadingScreen = () => (
  <div className="min-h-dvh grid place-items-center" role="status" aria-label="Carregando">
    <div className="size-8 rounded-full border-2 border-border border-t-primary animate-spin" />
  </div>
);

// Toasts (notify / toastManager) e diálogo de confirmação (useConfirm) ficam
// globais: valem tanto no sistema interno quanto na página pública. O
// ToastProvider do InternalApp, aninhado, só repassa os filhos.
function App() {
  return (
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <ToastProvider position="top-right">
        <ConfirmDialogProvider>
          <Suspense fallback={<LoadingScreen />}>
            <Routes>
              <Route path="/agendar/*" element={<PublicSchedulingApp />} />
              <Route path="*" element={<InternalApp />} />
            </Routes>
          </Suspense>
        </ConfirmDialogProvider>
      </ToastProvider>
    </BrowserRouter>
  );
}

export default App;
