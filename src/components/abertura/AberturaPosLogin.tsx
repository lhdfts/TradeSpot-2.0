import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import Abertura from './Abertura';
import { aberturaPendente, limparAberturaPendente, pegarSomDoClique } from './controleAbertura';

/**
 * Toca a vinheta por cima do sistema assim que o autenticador devolve o
 * usuário de um login feito agora. O sistema já carrega por baixo, então ao
 * fim da vinheta a tela está pronta.
 */
export function AberturaPosLogin() {
    const { user } = useAuth();
    const [tocando, setTocando] = useState(false);
    const [som, setSom] = useState<AudioContext | null>(null);

    useEffect(() => {
        if (user && aberturaPendente()) {
            limparAberturaPendente();
            setSom(pegarSomDoClique());
            setTocando(true);
        }
    }, [user]);

    if (!tocando) return null;
    return <Abertura som={som} aoTerminar={() => setTocando(false)} />;
}
