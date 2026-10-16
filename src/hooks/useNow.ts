import { useEffect, useState } from 'react';

const FIVE_MINUTES = 5 * 60_000;

/**
 * Hora atual que só muda nas viradas de 5 minutos (:00, :05, :10…). É quando os
 * status "Iniciando" e "Ao Vivo" podem mudar, já que os agendamentos começam
 * em :00/:15/:30/:45. Assim a lista redesenha 12 vezes por hora, não a cada segundo.
 */
export function useNow(stepMs = FIVE_MINUTES): number {
    const [now, setNow] = useState(() => Date.now());

    useEffect(() => {
        let timer: ReturnType<typeof setTimeout>;
        const schedule = () => {
            // +50ms para cair já depois da virada
            timer = setTimeout(() => {
                setNow(Date.now());
                schedule();
            }, stepMs - (Date.now() % stepMs) + 50);
        };
        schedule();

        // Com o computador suspenso o timer atrasa: ao voltar para a aba, atualiza na hora.
        const onVisible = () => {
            if (document.visibilityState !== 'visible') return;
            clearTimeout(timer);
            setNow(Date.now());
            schedule();
        };
        document.addEventListener('visibilitychange', onVisible);
        return () => {
            clearTimeout(timer);
            document.removeEventListener('visibilitychange', onVisible);
        };
    }, [stepMs]);

    return now;
}
