import { google } from 'googleapis';

// Load credentials from env
const SCOPES = ['https://www.googleapis.com/auth/calendar', 'https://www.googleapis.com/auth/calendar.events'];

const auth = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
);

// You should store a valid refresh token in your .env
// This token should be obtained once manually or via a separate auth flow
if (process.env.GOOGLE_REFRESH_TOKEN) {
    auth.setCredentials({ refresh_token: process.env.GOOGLE_REFRESH_TOKEN });
}

const calendar = google.calendar({ version: 'v3', auth });

export const createGoogleMeetLink = async (summary: string, startTime: string, endTime: string, attendeeEmails: string[] = []) => {
    try {
        const event = {
            summary: summary,
            description: 'Agendamento TradeStars',
            start: {
                dateTime: startTime, // ISO format with timezone !! Important
                timeZone: 'America/Sao_Paulo',
            },
            end: {
                dateTime: endTime,
                timeZone: 'America/Sao_Paulo',
            },
            attendees: attendeeEmails.map(email => ({ email })),
            conferenceData: {
                createRequest: {
                    requestId: `sample-${Date.now()}`,
                    conferenceSolutionKey: {
                        type: 'hangoutsMeet',
                    },
                },
            },
        };

        const response = await calendar.events.insert({
            calendarId: 'primary',
            requestBody: event,
            conferenceDataVersion: 1,
        });

        return {
            meetLink: response.data.hangoutLink,
            eventId: response.data.id
        };

    } catch (error) {
        console.error('Error creating Google Meet link:', error);
        return null;
    }
};

export const deleteGoogleMeetEvent = async (eventId: string) => {
    try {
        await calendar.events.delete({
            calendarId: 'primary',
            eventId: eventId,
        });
        console.log(`Google Meet event ${eventId} deleted successfully.`);
        return true;
    } catch (error) {
        console.error(`Error deleting Google Meet event ${eventId}:`, error);
        return false;
    }
};

export const updateGoogleMeetEvent = async (eventId: string, attendeeEmails?: string[], startTime?: string, endTime?: string) => {
    try {
        const resource: any = {};

        if (attendeeEmails) {
            resource.attendees = attendeeEmails.map(email => ({ email }));
        }

        if (startTime && endTime) {
            resource.start = {
                dateTime: startTime,
                timeZone: 'America/Sao_Paulo',
            };
            resource.end = {
                dateTime: endTime,
                timeZone: 'America/Sao_Paulo',
            };
        }

        if (Object.keys(resource).length === 0) return true;

        await calendar.events.patch({
            calendarId: 'primary',
            eventId: eventId,
            requestBody: resource,
        });
        console.log(`Google Meet event ${eventId} updated successfully.`);
        return true;
    } catch (error) {
        console.error(`Error updating Google Meet event ${eventId}:`, error);
        return false;
    }
};
