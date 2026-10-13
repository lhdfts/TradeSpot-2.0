import { useSyncExternalStore } from 'react';

/** true enquanto a media query casar; acompanha redimensionamento e zoom. */
export function useMediaQuery(query: string): boolean {
    return useSyncExternalStore(
        (onChange) => {
            const mql = window.matchMedia(query);
            mql.addEventListener('change', onChange);
            return () => mql.removeEventListener('change', onChange);
        },
        () => window.matchMedia(query).matches,
        () => false
    );
}
