import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';

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

function App() {
  return (
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <Suspense fallback={<LoadingScreen />}>
        <Routes>
          <Route path="/agendar/*" element={<PublicSchedulingApp />} />
          <Route path="*" element={<InternalApp />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}

export default App;
