import { useState, useEffect } from 'react';
import { api } from '../services/api';
import type { Attendant, Event } from '../types';

export const useFormData = () => {
    const [attendants, setAttendants] = useState<Attendant[]>([]);
    const [events, setEvents] = useState<Event[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
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
        };

        fetchData();
    }, []);

    return { attendants, events, loading };
};
