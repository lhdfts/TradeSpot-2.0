import React, { useState, useMemo, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { AppointmentProvider } from './context/AppointmentContext';
import { Sidebar } from './components/Sidebar';
import { MyAppointments } from './views/MyAppointments';
import { AllAppointments } from './views/AllAppointments';
import { Metrics } from './views/Metrics';
import { Attendants } from './views/Attendants';
import { Events } from './views/Events';
import { UnnichatConnections } from './views/UnnichatConnections';
import { CeoScheduler } from './views/CeoScheduler';
import { Profile } from './views/Profile';
import { Logs } from './views/Logs';
import { Login } from './views/Login';
import { SelfScheduling } from './views/public/SelfScheduling';
import { NotFound } from './views/public/NotFound';
import Docs from './views/Docs';
import { PublicLayout } from './layouts/PublicLayout';
import { Modal } from './components/ui/modal';
import { AppointmentForm } from './components/AppointmentForm';
import { EditAppointmentForm } from './components/EditAppointmentForm';
import type { Appointment } from './types';
import { RefreshCw } from 'lucide-react';
import { useAppointments } from './context/AppointmentContext';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Button } from './components/ui/button';
import { ToastProvider } from './components/ui/toast';
import { UpdateNotification } from './components/UpdateNotification';

// Wrapper for Create Appointment to handle search params
const CreateAppointmentWrapper: React.FC<{ onSuccess: () => void }> = ({ onSuccess }) => {
  const [searchParams, setSearchParams] = useSearchParams();

  const prefillData = useMemo(() => {
    const name = searchParams.get('name');
    const email = searchParams.get('email');
    const phone = searchParams.get('phone');
    if (name || email || phone) {
      return {
        lead: name || undefined,
        email: email || undefined,
        phone: phone || undefined
      };
    }
    return undefined;
  }, [searchParams]);

  // Clean URL if we have params to match original behavior
  useEffect(() => {
    if (prefillData) {
      setSearchParams({}, { replace: true });
    }
  }, [prefillData, setSearchParams]);

  return (
    <div>
      <AppointmentForm
        prefillData={prefillData}
        onSuccess={onSuccess}
      />
    </div>
  );
};

// Internal Layout component that wraps authenticated routes
// This component is responsible for providing the AppointmentContext ONLY to internal users
const InternalLayout: React.FC = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAppt, setEditingAppt] = useState<Appointment | null>(null);
  const { refresh, loading } = useAppointments();
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  // Redirect if visiting login while authenticated
  useEffect(() => {
    if (user && location.pathname === '/login') {
      navigate('/');
    }
  }, [user, location.pathname, navigate]);

  const handleEdit = (appt: Appointment) => {
    setEditingAppt(appt);
    setIsModalOpen(true);
  };

  const handleCreate = () => {
    setEditingAppt(null);
    navigate('/create-appointment');
  };

  const handleSuccess = () => {
    setIsModalOpen(false);
    setEditingAppt(null);
    if (location.pathname === '/create-appointment') {
      navigate('/');
    } else {
      refresh(); // Refresh if we are staying on the same view (e.g. edit modal)
    }
  };

  const currentView = location.pathname;

  return (
    <div className="flex h-screen bg-background text-foreground overflow-hidden">
      <Sidebar
        onCreateClick={handleCreate}
      />

      <main className="flex-1 flex flex-col min-w-0 overflow-hidden bg-background transition-colors duration-300">
        <div className="flex-1 overflow-y-auto p-8">
          <div className="max-w-7xl mx-auto space-y-8">
            <header className="flex justify-between items-center">
              <h1 className="text-3xl font-bold text-foreground">
                {(currentView === '/' || currentView === '/my-appointments') && 'Meus Agendamentos'}
                {currentView === '/all-appointments' && 'Todos os Agendamentos'}
                {currentView === '/create-appointment' && 'Criar Agendamento'}
                {currentView === '/metrics' && 'Métricas'}
                {currentView === '/attendants' && 'Gerenciar Atendentes'}
                {currentView === '/events' && 'Gerenciar Eventos'}
                {currentView === '/ceo-scheduler' && 'Configurações CEO'}
                {currentView === '/profile' && 'Perfil'}
              </h1>
              <div className="flex items-center gap-4">
                <div id="header-actions" style={{ display: 'flex', alignItems: 'center' }}></div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => refresh()}
                  disabled={loading}
                  className="rounded-full w-10 h-10 p-0"
                  title="Atualizar"
                >
                  <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
                </Button>
              </div>
            </header>

            <Routes>
              {/* Login Route for consistency, though handled above */}
              <Route path="/login" element={<Navigate to="/" replace />} />
              {/* Protected Routes - All Authenticated Users */}
              <Route element={<ProtectedRoute allowedRoles={[]} />}>
                <Route path="/" element={<MyAppointments onEdit={handleEdit} />} />
                <Route path="/my-appointments" element={<Navigate to="/" replace />} />
                <Route path="/create-appointment" element={<CreateAppointmentWrapper onSuccess={handleSuccess} />} />
                <Route path="/all-appointments" element={<AllAppointments onEdit={handleEdit} />} />
                <Route path="/profile" element={<Profile />} />
              </Route>

              {/* Metrics - Admin, Líder, Co-líder */}
              <Route element={<ProtectedRoute allowedRoles={['Admin', 'Líder', 'Co-líder', 'Dev', 'Qualidade']} />}>
                <Route path="/metrics" element={<Metrics />} />
              </Route>

              {/* Admin/Líder Only Management */}
              <Route element={<ProtectedRoute allowedRoles={['Admin', 'Líder', 'Dev', 'Co-líder', 'Qualidade']} />}>
                <Route path="/attendants" element={<Attendants />} />
              </Route>

              <Route element={<ProtectedRoute allowedRoles={['Admin', 'Líder', 'Dev', 'Co-líder', 'Qualidade', 'Colaborador']} />}>
                <Route path="/events" element={<Events />} />
              </Route>

              {/* Conexões Unnichat - Admin, Dev, Líder */}
              <Route element={<ProtectedRoute allowedRoles={['Admin', 'Dev', 'Líder']} />}>
                <Route path="/unnichat-connections" element={<UnnichatConnections />} />
              </Route>

              {/* Logs de Execução / Distribuição - Admin, Dev */}
              <Route element={<ProtectedRoute allowedRoles={['Admin', 'Dev']} />}>
                <Route path="/logs" element={<Logs />} />
              </Route>

              {/* CEO Only Management */}
              <Route element={<ProtectedRoute allowedRoles={['Admin']} />}>
                <Route path="/ceo-scheduler" element={<CeoScheduler />} />
              </Route>

              {/* Catch all internal routes */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </div>
        </div>
      </main>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Editar Agendamento"
      >
        <EditAppointmentForm
          initialData={editingAppt || undefined}
          onSuccess={handleSuccess}
        />
      </Modal>
    </div>
  );
};

// Main Router component to handle Public vs Internal routing logic
const MainRouter: React.FC = () => {
  const { user } = useAuth();
  const location = useLocation();

  const currentView = location.pathname;
  const isLoginPage = currentView === '/login';

  if (isLoginPage) {
    if (user) {
      return <Navigate to="/" replace />;
    }
    return (
      <div className="flex h-screen bg-background text-foreground overflow-hidden">
        <main className="flex-1 overflow-y-auto">
          <Routes>
            <Route path="/login" element={<Login />} />
          </Routes>
        </main>
      </div>
    );
  }

  // Handle Public Routes (Self-Scheduling)
  // Match "/agendar" exactly, "/agendar/" (trailing), or "/agendar/..."
  if (currentView.startsWith('/agendar')) {
    return (
      <Routes>
        <Route path="/agendar/:link" element={
          <PublicLayout>
            <SelfScheduling />
          </PublicLayout>
        } />
        {/* Catch-all for /agendar base or invalid subpaths */}
        <Route path="*" element={
          <PublicLayout>
            <NotFound />
          </PublicLayout>
        } />
      </Routes>
    );
  }

  // Documentation Route - Public
  if (currentView === '/docs') {
    return (
      <Docs />
    );
  }

  // If user is NOT logged in, and we haven't matched login or public routes by now,
  // we should NOT show the sidebar/app shell. Show NotFound or Redirect.
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Only wrap internal app in AppointmentProvider
  return (
    <AppointmentProvider>
      <InternalLayout />
    </AppointmentProvider>
  );
};

function App() {
  return (
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <AuthProvider>
        <ThemeProvider>
          <ToastProvider position="top-right">
            <MainRouter />
            <UpdateNotification />
          </ToastProvider>
        </ThemeProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
