import { Routes, Route } from 'react-router-dom';
import { PublicLayout } from '../../layouts/PublicLayout';
import { SelfScheduling } from './SelfScheduling';
import { NotFound } from './NotFound';

// Entrada da página pública (/agendar/*), carregada à parte pelo App.
export default function PublicSchedulingApp() {
    return (
        <PublicLayout>
            <Routes>
                <Route path=":link" element={<SelfScheduling />} />
                {/* /agendar sozinho ou caminhos inválidos */}
                <Route path="*" element={<NotFound />} />
            </Routes>
        </PublicLayout>
    );
}
