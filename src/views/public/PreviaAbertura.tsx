// ============================================================
//  Prévia da abertura — /abertura
//
//  Para assistir à vinheta sem precisar fazer login. O botão não é enfeite:
//  sem um clique o navegador não libera o som.
// ============================================================

import { useState } from 'react';
import Abertura from '../../components/abertura/Abertura';
import { prepararSomAbertura } from '../../components/abertura/somAbertura';

export function PreviaAbertura() {
    const [som, setSom] = useState<AudioContext | null>(null);
    const [tocando, setTocando] = useState(false);

    function assistir() {
        setSom((atual) => atual ?? prepararSomAbertura());
        setTocando(true);
    }

    return (
        <div className="grid min-h-screen place-items-center bg-[#070707] px-4">
            <button
                type="button"
                onClick={assistir}
                className="flex h-11 items-center justify-center rounded-md border border-white px-6 text-sm font-semibold text-white transition-opacity hover:opacity-80"
            >
                Assistir abertura
            </button>
            {tocando && <Abertura som={som} aoTerminar={() => setTocando(false)} />}
        </div>
    );
}
