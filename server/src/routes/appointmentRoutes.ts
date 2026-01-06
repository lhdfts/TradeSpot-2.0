import { Router, Request, Response } from 'express';
import axios from 'axios';
import { getAppointmentWebhooks } from '../config/webhooks.js';
import { createClient } from '@supabase/supabase-js';
import { createAppointmentSchema } from '../schemas/appointmentSchema.js';
import { findBestAttendant } from '../utils/distribution.js';
import { createGoogleMeetLink } from '../services/googleMeet.js';

const router = Router();

// Initialize Supabase Client (Backend Context)
// WE USE VITE_ KEYS because that's what is in the .env, assuming they are the ones available.
// Ideally, use a SERVICE_ROLE_KEY if available for true backend authority, but we'll stick to what we have known.
const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
// Note: If using ANON key, RLS rules must allow 'public' or logged-in user creation. 
// Since this is a backend proxy, we might be strictly limited by RLS if we don't pass the user's JWT. 
// However, the prompt implies this backend securely handles it. 
// If 'Create Appointment' is public/available, anon key works.
// If it requires auth, we would need to pass the Authorization header from frontend to backend to Supabase.

if (!supabaseUrl || !supabaseKey) {
    console.error("Supabase credentials missing in backend!");
}

const supabase = createClient(supabaseUrl!, supabaseKey!);

// --- Helper Logic ---

// Calculate End Time (Spec 2.B.8)
const calculateEndTime = (startTime: string, type: string): string => {
    let duration = 60; // Default to 1 hour for most types (Ligação Closer, Reagendamento, Upgrade, Pessoal, etc.)

    if (type === 'Ligação SDR') {
        duration = 30;
    }

    const [hours, minutes] = startTime.split(':').map(Number);
    const totalMinutes = hours * 60 + minutes + duration;
    const endHours = Math.floor(totalMinutes / 60) % 24;
    const endMinutes = totalMinutes % 60;

    return `${String(endHours).padStart(2, '0')}:${String(endMinutes).padStart(2, '0')}`;
};

// Check Conflicts (Spec 2.B.7)
const checkConflict = async (date: string, time: string, attendantId: string): Promise<boolean> => {
    // If auto-distribution ('distribuicao_automatica') or missing, we can't check specific conflict yet
    // But the form usually resolves attendantId before submit or we handle distribution here.
    // The Frontend currently resolves 'distribuicao_automatica' to a specific ID before sending? 
    // Yes, AppointmentForm.tsx lines 262-276 resolves it. 
    // So we expect a concrete UUID here.

    if (!attendantId || attendantId === 'distribuicao_automatica') return false;

    const { data, error } = await supabase
        .from('appointments')
        .select('id')
        .eq('date', date)
        .eq('time', time)
        .eq('attendant_id', attendantId)
        .neq('status', 'Cancelado') // Assuming we ignore cancelled
        .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 is 'not found', which is good
        console.error("Error checking conflict:", error);
    }

    return !!data;
};


// POST /api/appointments
router.post('/', async (req: Request, res: Response) => {
    try {
        // 1. Validate Input (Spec 2.B)
        const validation = createAppointmentSchema.safeParse(req.body);

        if (!validation.success) {
            console.error("Validation Error Details:", JSON.stringify(validation.error.format(), null, 2));
            return res.status(400).json({
                error: 'Validation Error',
                details: validation.error.format()
            });
        }

        const data = validation.data;

        // 2. Security & Logic (Spec 2.B.10 & 2.B.8)

        // Sanitize Strings (Spec 2.B.1, 2.B.9)
        // Clean phone for DB storage (remove non-digits)
        const cleanPhone = data.phone.replace(/\D/g, '');
        // Convert to BigInt or simply pass as string/number depending on Supabase (it handles string-encoded-numbers for int8)
        // We'll pass as string of digits, which Postgres can coerce to int8 usually.

        // Agent Logic (Spec 2.B.10)
        let finalAttendantId = data.attendantId;

        if (!finalAttendantId || finalAttendantId === 'distribuicao_automatica') {
            const availableId = await findBestAttendant(data.date, data.time, data.type);

            if (!availableId) {
                return res.status(409).json({ error: 'No attendants available for this time slot.' });
            }
            finalAttendantId = availableId;
        }

        // End Time Calculation (Spec 2.B.8)
        const endTime = calculateEndTime(data.time, data.type);

        // 3. Conflict Check (Spec 2.B.7)
        if (finalAttendantId) {
            const hasConflict = await checkConflict(data.date, data.time, finalAttendantId);
            if (hasConflict) {
                return res.status(409).json({ error: 'Conflict: This attendant is already busy at this time.' });
            }
        }

        // 4. Client Management (Find or Create)
        // We assume 'phone' is the unique identifier for clients.
        let clientId: string | null = null;

        // Check if client exists
        const { data: existingClient, error: findError } = await supabase
            .from('clients')
            .select('id')
            .eq('phone', cleanPhone)
            .single();

        // Sanitize Financial Amount
        let financialAmount = data.studentProfile.financial.amount;
        if (typeof financialAmount === 'string') {
            const clean = financialAmount.replace(/\./g, '').replace(',', '.');
            const parsed = parseFloat(clean);
            financialAmount = isNaN(parsed) ? 0 : Math.round(parsed);
        } else if (typeof financialAmount === 'number') {
            financialAmount = Math.round(financialAmount);
        }

        const clientPayload = {
            name: data.lead,
            phone: cleanPhone,
            email: data.email,
            interest_level: data.studentProfile.interest,
            knowledge_level: data.studentProfile.knowledge,
            financial_currency: data.studentProfile.financial.currency,
            financial_amount: financialAmount
        };

        if (existingClient) {
            clientId = existingClient.id;
            // Update client data with latest info
            await supabase
                .from('clients')
                .update(clientPayload)
                .eq('id', clientId);
        } else {
            // Create new client
            const { data: newClient, error: createError } = await supabase
                .from('clients')
                .insert(clientPayload)
                .select('id')
                .single();

            if (createError) {
                throw new Error(`Failed to create client: ${createError.message}`);
            }
            clientId = newClient.id;
        }

        // 4.5 Generate Google Meet Link if not provided
        // We do this BEFORE saving so we can store the link
        let meetLink = data.meetLink;
        let googleEventId = null;

        if (!meetLink) {
            // Construct ISO dates for Google API
            // Assuming appointment date is YYYY-MM-DD and time is HH:MM
            // We need to valid ISO strings.
            // Note: This relies on the server time-zone or explicit offset handling. 
            // We'll trust the formatting for simplicity or improve standardisation later.
            // Simplest is generic string concat for "America/Sao_Paulo" context.
            const startIso = `${data.date}T${data.time}:00`;
            const endIso = `${data.date}T${endTime}:00`;

            // Fetch emails for Creator and Attendant
            const guestIds = [finalAttendantId, data.createdBy].filter((id): id is string => !!id);
            const attendees: string[] = [clientPayload.email].filter(Boolean) as string[];

            if (guestIds.length > 0) {
                const { data: usersData } = await supabase
                    .from('user')
                    .select('email')
                    .in('id', guestIds);

                if (usersData) {
                    usersData.forEach(u => {
                        if (u.email && !attendees.includes(u.email)) {
                            attendees.push(u.email);
                        }
                    });
                }
            }

            const googleData = await createGoogleMeetLink(
                `Reunião com ${clientPayload.name}`,
                startIso,
                endIso,
                attendees
            );

            if (googleData) {
                meetLink = googleData.meetLink || '';
                googleEventId = googleData.eventId;
            }
        }

        // 5. Create Appointment
        const appointmentPayload = {
            client_id: clientId, // Linked to client
            date: data.date,
            time: data.time,
            end_time: endTime, // Sending to DB
            type: data.type,
            status: data.status || 'Pendente',
            attendant_id: finalAttendantId,
            event_id: data.eventId,
            meet_link: meetLink,
            notes: data.notes,
            additional_info: data.additionalInfo,
            // We could store google_event_id if the DB schema supports it, but for now we skip or add to metadata if needed. 
            // Assuming meet_link is the critical field.

            // Snapshot of profile data on appointment as well (as per schema)
            interest_level: data.studentProfile.interest,
            knowledge_level: data.studentProfile.knowledge,
            financial_currency: data.studentProfile.financial.currency,
            financial_amount: financialAmount,
            created_at: new Date().toISOString(), // Ensure timestamptz compatibility
            created_by: null // Initialize
        };

        // Validate createdBy (Fix for FK Violation with Mock User)
        let finalCreatedBy = data.createdBy;
        if (finalCreatedBy) {
            const { data: userExists } = await supabase
                .from('user')
                .select('id')
                .eq('id', finalCreatedBy)
                .maybeSingle();

            if (!userExists) {
                console.warn(`User ID ${finalCreatedBy} not found in DB. Setting created_by to NULL.`);
                finalCreatedBy = undefined;
            }
        }
        // @ts-ignore
        appointmentPayload.created_by = finalCreatedBy;

        const { data: createdAppointment, error: appError } = await supabase
            .from('appointments')
            .insert(appointmentPayload)
            .select()
            .single();

        if (appError) {
            console.error("Supabase Write Error:", appError);
            return res.status(500).json({ error: 'Database Error', details: appError.message });
        }

        // Return the created appointment (we might need to fetch the joined client data to match frontend expectation)
        // Or simply fail-safe return what we have (frontend might reload or use returned ID)

        // Construct response matching frontend expectation (flattened)
        const responseData = {
            ...createdAppointment,
            lead: clientPayload.name,
            phone: clientPayload.phone,
            email: clientPayload.email,
            student_profile: {
                interest: clientPayload.interest_level,
                knowledge: clientPayload.knowledge_level,
                financial: {
                    currency: clientPayload.financial_currency,
                    amount: clientPayload.financial_amount
                }
            }
        };

        // --- Fetch Names for Webhook ---
        const names: any = {
            attendant_name: null,
            created_by_name: null,
            event_name: null
        };

        const idsToFetch = [];
        if (finalAttendantId) idsToFetch.push(finalAttendantId);
        if (finalCreatedBy) idsToFetch.push(finalCreatedBy);

        if (idsToFetch.length > 0) {
            const { data: users } = await supabase
                .from('user')
                .select('id, name')
                .in('id', idsToFetch);

            if (users) {
                const attendant = users.find(u => u.id === finalAttendantId);
                if (attendant) names.attendant_name = attendant.name;

                const creator = users.find(u => u.id === finalCreatedBy);
                if (creator) names.created_by_name = creator.name;
            }
        }

        if (data.eventId) {
            const { data: event } = await supabase
                .from('events')
                .select('event_name')
                .eq('id', data.eventId)
                .single();

            if (event) names.event_name = event.event_name;
        }

        // --- Webhook Integration ---
        const webhookResponse = {
            ...responseData,
            attendant_name: names.attendant_name,
            created_by_name: names.created_by_name,
            event_name: names.event_name,
            // Remove IDs from webhook payload as requested
            attendant_id: undefined,
            created_by: undefined,
            event_id: undefined,
            updatedBy: undefined // Ensure consistency
        };

        const webhookUrl = getAppointmentWebhooks()[data.type];
        if (webhookUrl) {
            try {
                console.log(`Sending webhook for ${data.type} to ${webhookUrl}`);
                // Fire and forget (awaiting to log success/fail but not blocking response significantly if it's fast)
                await axios.post(webhookUrl, webhookResponse);
                console.log(`Webhook sent successfully.`);
            } catch (webhookError: any) {
                console.error(`Failed to send webhook for ${data.type}:`, webhookError.message);
                // Do not block the success response
            }
        } else {
            console.log(`No webhook configured for appointment type: ${data.type}`);
        }

        res.status(201).json(responseData);

    } catch (err: any) {
        console.error("Create Appointment Error:", err);
        res.status(500).json({ error: 'Internal Server Error', details: err.message });
    }
});

export default router;
