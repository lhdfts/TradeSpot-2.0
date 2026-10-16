// "Adicionar à agenda" na confirmação: link do Google Agenda e arquivo .ics
// (Apple, Outlook e demais).

// 20261014T180000Z
const toUtcStamp = (ms: number) => new Date(ms).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');

interface CalendarEvent {
    title: string;
    start: number; // ms
    end: number; // ms
    details: string;
}

export function googleCalendarUrl({ title, start, end, details }: CalendarEvent): string {
    const params = new URLSearchParams({
        action: 'TEMPLATE',
        text: title,
        dates: `${toUtcStamp(start)}/${toUtcStamp(end)}`,
        details,
    });
    return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

const escapeIcs = (text: string) => text.replace(/[\\;,]/g, m => `\\${m}`).replace(/\n/g, '\\n');

export function downloadIcs({ title, start, end, details }: CalendarEvent) {
    const ics = [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'PRODID:-//TradeStars//TradeSpot//PT',
        'BEGIN:VEVENT',
        `UID:${start}-${Math.random().toString(36).slice(2)}@tradestars`,
        `DTSTAMP:${toUtcStamp(Date.now())}`,
        `DTSTART:${toUtcStamp(start)}`,
        `DTEND:${toUtcStamp(end)}`,
        `SUMMARY:${escapeIcs(title)}`,
        `DESCRIPTION:${escapeIcs(details)}`,
        'END:VEVENT',
        'END:VCALENDAR',
    ].join('\r\n');

    const url = URL.createObjectURL(new Blob([ics], { type: 'text/calendar;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = 'agendamento-tradestars.ics';
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
}
