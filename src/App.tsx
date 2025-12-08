import React, { useState } from 'react';
import { AppointmentProvider } from './context/AppointmentContext';
import { Sidebar } from './components/Sidebar';
import { MyAppointments } from './views/MyAppointments';
import { AllAppointments } from './views/AllAppointments';
import { Metrics } from './views/Metrics';
import { Attendants } from './views/Attendants';
import { Events } from './views/Events';
import { Modal } from './components/ui/Modal';
import { AppointmentForm } from './components/AppointmentForm';
import type { Appointment } from './types';
import { RefreshCw } from 'lucide-react';
import { useAppointments } from './context/AppointmentContext';
import { ThemeProvider } from './context/ThemeContext';
import { ThemeToggle } from './components/ThemeToggle';
import { Button } from './components/ui/Button';

const MainContent: React.FC = () => {
  const [currentView, setCurrentView] = useState('my-appointments');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAppt, setEditingAppt] = useState<Appointment | null>(null);
  const { refresh, loading } = useAppointments();

  const handleEdit = (appt: Appointment) => {
    setEditingAppt(appt);
    setIsModalOpen(true);
  };

  const handleCreate = () => {
    setEditingAppt(null);
    setCurrentView('create-appointment');
  };

  const handleSuccess = () => {
    setIsModalOpen(false);
    setEditingAppt(null);
    if (currentView === 'create-appointment') {
      setCurrentView('my-appointments');
    }
  };

  return (
    <div className="flex h-screen bg-background text-foreground overflow-hidden">
      <Sidebar
        currentView={currentView}
        onNavigate={setCurrentView}
        onCreateClick={handleCreate}
      />

      <main className="flex-1 flex flex-col min-w-0 overflow-hidden bg-background transition-colors duration-300">
        <div className="flex-1 overflow-y-auto p-8">
          <div className="max-w-7xl mx-auto space-y-8">
            <header className="flex justify-between items-center">
              <h1 className="text-3xl font-bold text-foreground">
                {currentView === 'my-appointments' && 'Meus Agendamentos'}
                {currentView === 'all-appointments' && 'Todos os Agendamentos'}
                {currentView === 'create-appointment' && 'Criar Agendamento'}
                {currentView === 'metrics' && 'Métricas'}
                {currentView === 'attendants' && 'Gerenciar Atendentes'}
                {currentView === 'events' && 'Gerenciar Eventos'}
              </h1>
              <div className="flex items-center gap-4">
                <ThemeToggle />
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

            {currentView === 'my-appointments' && <MyAppointments onEdit={handleEdit} />}
            {currentView === 'all-appointments' && <AllAppointments onEdit={handleEdit} />}
            {currentView === 'create-appointment' && (
              <div className="bg-surface rounded-lg shadow p-6">
                <AppointmentForm
                  onSuccess={handleSuccess}
                  onCancel={() => setCurrentView('my-appointments')}
                />
              </div>
            )}
            {currentView === 'metrics' && <Metrics />}
            {currentView === 'attendants' && <Attendants />}
            {currentView === 'events' && <Events />}
          </div>
        </div>
      </main>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Editar Agendamento"
      >
        <AppointmentForm
          initialData={editingAppt}
          onSuccess={handleSuccess}
          onCancel={() => setIsModalOpen(false)}
        />
      </Modal>
    </div>
  );
};

function App() {
  return (
    <ThemeProvider>
      <AppointmentProvider>
        <MainContent />
      </AppointmentProvider>
    </ThemeProvider>
  );
}

export default App;
