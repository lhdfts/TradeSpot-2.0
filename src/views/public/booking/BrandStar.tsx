// Estrela da marca (a mesma do favicon), para os momentos da página pública:
// confirmação, avisos e marca d'água. Cópia local do traço para não depender
// das peças internas da vinheta.

import { useEffect, useRef } from 'react';
import { cn } from '../../../lib/utils';

const STAR_PATH =
    'M18.9341 237.716C107.603 253.136 177.649 322.784 193.686 411.267C195.652 422.134 205.171 430.102 216.138 429.999C216.449 429.999 216.862 429.999 217.173 429.999C228.14 429.896 237.555 422.03 239.521 411.267C255.351 323.715 324.052 254.585 411.376 238.13C422.137 236.06 429.897 226.643 430 215.776V214.224C430 203.254 422.137 193.836 411.376 191.87C324.052 175.415 255.455 106.285 239.521 18.7326C237.555 7.96969 228.14 0.104486 217.173 0.000996455H216.138C205.067 -0.102493 195.652 7.8662 193.686 18.7326C177.649 107.216 107.603 176.864 18.9341 192.284C8.07028 194.147 0 203.668 0 214.741V215.259C0 226.332 7.96681 235.853 18.9341 237.716Z';

interface BrandStarProps {
    className?: string;
    /** Entrada curta (escala 0,9 → 1 com leve "mola"); só opacidade se o sistema pede menos movimento. */
    animate?: boolean;
}

export function BrandStar({ className, animate = false }: BrandStarProps) {
    const ref = useRef<SVGSVGElement>(null);

    useEffect(() => {
        const el = ref.current;
        if (!animate || !el || typeof el.animate !== 'function') return;
        const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        const animation = reduce
            ? el.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 150, easing: 'ease-out', fill: 'both' })
            : el.animate(
                [
                    { opacity: 0, transform: 'scale(0.9) rotate(-8deg)' },
                    { opacity: 1, transform: 'scale(1) rotate(0deg)' },
                ],
                // Curva com pequeno excesso, parecida com uma mola curta
                { duration: 420, easing: 'cubic-bezier(0.34, 1.56, 0.64, 1)', fill: 'both' }
            );
        return () => animation.cancel();
    }, [animate]);

    return (
        <svg ref={ref} viewBox="0 0 430 430" fill="currentColor" aria-hidden="true" focusable="false" className={cn('shrink-0', className)}>
            <path d={STAR_PATH} />
        </svg>
    );
}
