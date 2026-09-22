import { useEffect, useRef, useState } from 'react';

const POLL_INTERVAL_MS = 60 * 1000; // Check every 60 seconds

export function useVersionChecker() {
    const currentVersion = useRef<string | null>(null);
    const [updateAvailable, setUpdateAvailable] = useState(false);

    useEffect(() => {
        const checkVersion = async () => {
            try {
                // Cache-bust so we always get the latest version.json from the server
                const res = await fetch(`/version.json?t=${Date.now()}`, {
                    cache: 'no-store',
                });
                if (!res.ok) return;

                const data = await res.json();
                const latest = data?.version;

                if (!latest) return;

                if (currentVersion.current === null) {
                    // First load — store this as the current version
                    currentVersion.current = latest;
                } else if (currentVersion.current !== latest) {
                    // Version changed → new deployment detected
                    setUpdateAvailable(true);
                }
            } catch {
                // Silently ignore network errors (user may be offline, etc.)
            }
        };

        // Check immediately on mount, then poll
        checkVersion();
        const interval = setInterval(checkVersion, POLL_INTERVAL_MS);

        return () => clearInterval(interval);
    }, []);

    const reload = () => window.location.reload();

    return { updateAvailable, reload };
}
