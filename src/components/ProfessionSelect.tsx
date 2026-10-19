import React, { useEffect, useState } from 'react';
import { FloatingSearchSelect, type SearchSelectOption } from './FloatingSearchSelect';
import { api } from '../services/api';

interface ProfessionSelectProps {
    value: string;
    onChange: (value: string) => void;
    label?: string;
    disabled?: boolean;
    className?: string;
    error?: string;
}

// Menu de profissões. A lista vem da tabela `professions` do Supabase; quem não
// encontrar a sua escolhe "Outra" e digita. O valor é sempre o nome da profissão.
export const ProfessionSelect: React.FC<ProfessionSelectProps> = ({ label = 'Profissão', ...props }) => {
    const [options, setOptions] = useState<SearchSelectOption[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let cancelled = false;
        api.professions.list()
            .then(names => {
                if (!cancelled) setOptions(names.map(name => ({ value: name, label: name })));
            })
            .catch(err => console.error('Failed to fetch professions', err))
            .finally(() => { if (!cancelled) setLoading(false); });
        return () => { cancelled = true; };
    }, []);

    return (
        <FloatingSearchSelect
            {...props}
            label={label}
            options={options}
            loading={loading}
            searchPlaceholder="Pesquisar profissão..."
            emptyMessage="Nenhuma profissão encontrada"
            allowOther
            otherLabel="Outra"
        />
    );
};
