import { useState, useEffect, useCallback } from 'react';
import { api } from '../services/api';
import type { Attendant, Event } from '../types';

export const useFormData = () => {
    const [attendants, setAttendants] = useState<Attendant[]>([]);
    const [events, setEvents] = useState<Event[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchData = useCallback(async () => {
        try {
            const [attendantsData, eventsData] = await Promise.all([
                api.attendants.list(),
                api.events.list()
            ]);
            setAttendants(attendantsData);
            setEvents(eventsData);
        } catch (error) {
            console.error('Failed to fetch form data', error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    // Refresh function to get fresh data before critical operations (e.g. submit)
    const refreshAttendants = useCallback(async (): Promise<Attendant[]> => {
        try {
            const freshAttendants = await api.attendants.list();
            setAttendants(freshAttendants);
            return freshAttendants;
        } catch (error) {
            console.error('Failed to refresh attendants', error);
            return attendants; // Return stale data as fallback
        }
    }, [attendants]);

    return { attendants, events, loading, refreshAttendants };
};
