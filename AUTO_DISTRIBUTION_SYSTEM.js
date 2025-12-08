/**
 * AUTOMATIC DISTRIBUTION SYSTEM - COMPLETE CODE EXTRACTION
 * 
 * This file contains all the code related to the automatic attendant distribution
 * functionality from the Appointment Management System
 * 
 * Original file: Untitled-1.html
 * Lines: 10897-11198 (and related functions)
 * 
 * Functions included:
 * - isAttendantWithinSchedule() - Check if attendant is within work schedule
 * - hasConflictingAppointment() - Check for scheduling conflicts
 * - findAvailableCloser() - Find available closer for automatic distribution
 * 
 * Key Features:
 * - Load-based distribution (least busy attendant)
 * - Random tiebreaker for equal loads
 * - Schedule validation (work hours + breaks)
 * - Conflict detection (30-minute duration)
 * - Excludes "Personal Appointment" from load count but blocks time slot
 */

// ===== CHECK IF ATTENDANT IS WITHIN SCHEDULE =====
// Lines: 10897-10966
function isAttendantWithinSchedule(attendant, appointmentTime, appointmentDate) {
    if (!attendant || !appointmentTime) {
        console.log(`[SCHEDULE] Atendente ou horário inválido:`, attendant, appointmentTime);
        return false;
    }

    // Determinar dia da semana (0 = domingo, 1 = segunda, ..., 6 = sábado)
    let dayOfWeek;
    if (appointmentDate) {
        // Converter DD/MM/YYYY para Date
        let date;
        if (appointmentDate.includes('/')) {
            const [day, month, year] = appointmentDate.split('/');
            date = new Date(year, month - 1, day);
        } else {
            date = new Date(appointmentDate);
        }
        dayOfWeek = date.getDay();
    } else {
        dayOfWeek = new Date().getDay();
    }

    // Mapear dia da semana para nome do campo
    const dayNames = ['domingo', 'segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado'];
    const dayName = dayNames[dayOfWeek];

    // Obter horários do dia específico
    const entryTime = formatTimeFromSupabase(attendant[`${dayName}_horario_inicio`]);
    const exitTime = formatTimeFromSupabase(attendant[`${dayName}_horario_fim`]);
    const pauseStart = formatTimeFromSupabase(attendant[`${dayName}_pausa_inicio`]);
    const pauseEnd = formatTimeFromSupabase(attendant[`${dayName}_pausa_fim`]);

    console.log(`[SCHEDULE] ${attendant.nome} - Dia: ${dayName}, Entrada: ${entryTime}, Saída: ${exitTime}, Pausa: ${pauseStart}-${pauseEnd}`);

    // Se não houver horário configurado para este dia, atendente não está disponível
    if (!entryTime || !exitTime || entryTime === '--:--' || exitTime === '--:--') {
        console.log(`[SCHEDULE] ${attendant.nome} não tem horário configurado para ${dayName}`);
        return false;
    }

    // Converter para minutos para facilitar comparação
    const timeToMinutes = (time) => {
        if (!time || time === '--:--') return 0;
        const [h, m] = time.split(':').map(Number);
        return h * 60 + m;
    };

    const appointmentMinutes = timeToMinutes(appointmentTime);
    const entryMinutes = timeToMinutes(entryTime);
    const exitMinutes = timeToMinutes(exitTime);
    const pauseStartMinutes = timeToMinutes(pauseStart);
    const pauseEndMinutes = timeToMinutes(pauseEnd);

    console.log(`[SCHEDULE] ${appointmentTime} (${appointmentMinutes}min) entre ${entryTime} (${entryMinutes}min) e ${exitTime} (${exitMinutes}min)?`);

    // Verificar se está dentro do horário de trabalho
    if (appointmentMinutes < entryMinutes || appointmentMinutes >= exitMinutes) {
        console.log(`[SCHEDULE] ${attendant.nome} fora do horário de trabalho`);
        return false;
    }

    // Verificar se está no período de pausa (se houver pausa configurada)
    if (pauseStart && pauseEnd && pauseStart !== '--:--' && pauseEnd !== '--:--' && appointmentMinutes >= pauseStartMinutes && appointmentMinutes < pauseEndMinutes) {
        console.log(`[SCHEDULE] ${attendant.nome} está em pausa: ${pauseStart} - ${pauseEnd}, horário solicitado: ${appointmentTime}`);
        return false;
    }

    console.log(`[SCHEDULE] ✓ ${attendant.nome} está disponível para ${appointmentTime}`);
    return true;
}

// ===== CHECK FOR CONFLICTING APPOINTMENTS =====
// Lines: 10968-11075
// Função para verificar se um atendente já tem agendamento conflitante
// Considera que cada agendamento ocupa 30 minutos
// IMPORTANTE: Considera TODOS os tipos de agendamento, incluindo "Agendamento Pessoal"
function hasConflictingAppointment(attendantName, appointmentDate, appointmentTime) {
    // Converter horário para minutos para facilitar cálculo
    const timeToMinutes = (time) => {
        const [h, m] = time.split(':').map(Number);
        return h * 60 + m;
    };

    const newAppointmentStartMinutes = timeToMinutes(appointmentTime);
    const newAppointmentEndMinutes = newAppointmentStartMinutes + 30; // Duração: 30 minutos

    console.log('[CONFLICT CHECK] Verificando conflito para:', {
        attendant: attendantName,
        date: appointmentDate,
        time: appointmentTime,
        totalAppointments: appointmentsData.length,
        nota: 'Verificando TODOS os tipos (Agendamento Pessoal bloqueia horário mas não conta para carga)'
    });

    // Log de todos os agendamentos do atendente nesta data
    const appointmentsOfAttendant = appointmentsData.filter(app => {
        const appAttendant = (app.attendant || '').toLowerCase().trim();
        const reqAttendant = attendantName.toLowerCase().trim();
        return appAttendant === reqAttendant;
    });
    console.log(`[CONFLICT CHECK] Agendamentos de ${attendantName}:`, appointmentsOfAttendant.length);
    appointmentsOfAttendant.forEach(app => {
        console.log(`  - ${app.date} às ${app.time} | Tipo: ${app.type} | Status: ${app.status}`);
    });

    const conflictingAppointments = appointmentsData.filter(appointment => {
        // Comparar nome do atendente (case-insensitive)
        const appointmentAttendant = (appointment.attendant || '').toLowerCase().trim();
        const requestedAttendant = attendantName.toLowerCase().trim();
        
        if (appointmentAttendant !== requestedAttendant) {
            return false;
        }

        // Comparar data - aceitar ambos os formatos (DD/MM/YYYY e YYYY-MM-DD)
        let appointmentDateNormalized = appointmentDate;
        let existingDateNormalized = appointment.date || '';

        // Converter DD/MM/YYYY para YYYY-MM-DD se necessário
        if (appointmentDateNormalized.includes('/')) {
            const [day, month, year] = appointmentDateNormalized.split('/');
            appointmentDateNormalized = `${year}-${month}-${day}`;
        }

        // Converter DD/MM/YYYY para YYYY-MM-DD se necessário
        if (existingDateNormalized.includes('/')) {
            const [day, month, year] = existingDateNormalized.split('/');
            existingDateNormalized = `${year}-${month}-${day}`;
        }

        if (appointmentDateNormalized !== existingDateNormalized) {
            return false;
        }

        // Verificar se o status é pendente (agendamento ativo)
        // Aceitar "Pendente", "pendente", "PENDENTE", etc.
        const status = (appointment.status || '').toLowerCase().trim();
        if (status !== 'pendente') {
            return false;
        }

        // IMPORTANTE: NÃO filtrar por tipo - considerar TODOS os tipos de agendamento
        // Isso inclui "Agendamento Pessoal", "Ligação Closer", "Reagendamento Closer", etc.
        const appointmentType = appointment.type || appointment.appointmentType || '';

        // Calcular horário de início e fim do agendamento existente
        const existingStartMinutes = timeToMinutes(appointment.time);
        const existingEndMinutes = existingStartMinutes + 30; // Duração: 30 minutos

        // Verificar se há sobreposição de horários
        // Conflito ocorre se:
        // - Novo agendamento começa antes do fim do existente E
        // - Novo agendamento termina depois do início do existente
        const hasOverlap = newAppointmentStartMinutes < existingEndMinutes &&
            newAppointmentEndMinutes > existingStartMinutes;

        if (hasOverlap) {
            console.log('[CONFLICT CHECK] ⚠️ CONFLITO DETECTADO:', {
                tipoExistente: appointmentType,
                atendente: appointment.attendant,
                data: appointment.date,
                horarioExistente: appointment.time,
                horarioNovo: appointmentTime,
                status: appointment.status,
                duracao: '30 minutos'
            });
        }

        return hasOverlap;
    });

    const hasConflict = conflictingAppointments.length > 0;

    if (hasConflict) {
        console.log('[CONFLICT CHECK] ❌ Total de conflitos encontrados:', conflictingAppointments.length);
    } else {
        console.log('[CONFLICT CHECK] ✅ Nenhum conflito encontrado');
    }

    return hasConflict;
}

// ===== FIND AVAILABLE CLOSER FOR AUTOMATIC DISTRIBUTION =====
// Lines: 11077-11198
// Função para encontrar um atendente disponível para distribuição automática
// Sistema de distribuição por menor carga com desempate aleatório

function findAvailableCloser(appointmentDate, appointmentTime) {
    // Filtrar apenas atendentes do setor "Vendas"
    let closers = attendantsData.filter(attendant => {
        const sector = (attendant.setor || '').toLowerCase().trim();
        return sector === 'vendas';
    });

    if (closers.length === 0) {
        return null;
    }

    // Filtrar atendentes que têm horário configurado para o dia
    const closersWithSchedule = closers.filter(closer => {
        // Corrigir interpretação da data: converter DD/MM/YYYY para Date corretamente
        const [day, month, year] = appointmentDate.split('/');
        const dateObj = new Date(year, month - 1, day);
        const dayOfWeek = dateObj.getDay();

        const daysMap = {
            1: 'segunda',
            2: 'terca',
            3: 'quarta',
            4: 'quinta',
            5: 'sexta',
            6: 'sabado',
            0: 'domingo'
        };
        const dayName = daysMap[dayOfWeek];
        const startTimeField = `${dayName}_horario_inicio`;
        const endTimeField = `${dayName}_horario_fim`;

        // Verificar se tem horário configurado (não pode ser null/vazio)
        const hasSchedule = closer[startTimeField] && closer[endTimeField];

        return hasSchedule;
    });

    if (closersWithSchedule.length === 0) {
        return null;
    }

    // ===== DISTRIBUIÇÃO POR MENOR CARGA =====
    // Contar agendamentos de cada closer para a data específica
    const closersWithCount = closersWithSchedule.map(closer => {
        const appointmentCount = appointmentsData.filter(appointment => {
            // Comparar nome (case-insensitive)
            const nameMatcher = (appointment.attendant || '').toLowerCase().trim() === closer.nome.toLowerCase().trim();
            
            // Comparar data - converter para formato comum
            let appointmentDateNormalized = appointmentDate;
            let existingDateNormalized = appointment.date || '';
            
            if (appointmentDateNormalized.includes('/')) {
                const [d, m, y] = appointmentDateNormalized.split('/');
                appointmentDateNormalized = `${y}-${m}-${d}`;
            }
            
            if (existingDateNormalized.includes('/')) {
                const [d, m, y] = existingDateNormalized.split('/');
                existingDateNormalized = `${y}-${m}-${d}`;
            }
            
            const dateMatcher = appointmentDateNormalized === existingDateNormalized;
            
            // Apenas contar agendamentos com status "Pendente"
            const statusMatcher = (appointment.status || '').toLowerCase().trim() === 'pendente';
            
            // IMPORTANTE: Excluir "Agendamento Pessoal" da contagem de CARGA
            // Mas "Agendamento Pessoal" ainda bloqueia o horário (verificado em hasConflictingAppointment)
            // Isso significa: não conta para distribuição, mas ocupa o horário
            const typeMatcher = (appointment.type || '').toLowerCase().trim() !== 'agendamento pessoal';
            
            return nameMatcher && dateMatcher && statusMatcher && typeMatcher;
        }).length;
        
        return {
            ...closer,
            appointmentCount: appointmentCount
        };
    });

    // ===== ORDENAR POR CARGA E TENTAR TODOS =====
    // Ordenar closers por carga (menor primeiro)
    const closersOrderedByLoad = closersWithCount.sort((a, b) => {
        // Ordenar por carga (ascendente)
        if (a.appointmentCount !== b.appointmentCount) {
            return a.appointmentCount - b.appointmentCount;
        }
        // Se empate, embaralhar aleatoriamente
        return Math.random() - 0.5;
    });
    
    console.log(`[DISTRIBUTION] Closers ordenados por carga (excluindo Agendamento Pessoal da contagem):`, 
        closersOrderedByLoad.map(c => `${c.nome}(${c.appointmentCount})`).join(' → '));

    // Procurar um atendente disponível na fila ordenada
    for (let i = 0; i < closersOrderedByLoad.length; i++) {
        const closer = closersOrderedByLoad[i];

        // Verificar se está dentro do horário de escala (inclui validação de pausa)
        if (!isAttendantWithinSchedule(closer, appointmentTime, appointmentDate)) {
            console.log(`[DISTRIBUTION] ${closer.nome}(${closer.appointmentCount}) descartado: fora do horário de escala`);
            continue;
        }

        // Verificar se já tem agendamento conflitante no mesmo horário
        if (hasConflictingAppointment(closer.nome, appointmentDate, appointmentTime)) {
            console.log(`[DISTRIBUTION] ${closer.nome}(${closer.appointmentCount}) descartado: conflito de horário`);
            continue;
        }

        // Atendente disponível encontrado
        console.log(`[DISTRIBUTION] ✅ ${closer.nome} atribuído (carga: ${closer.appointmentCount})`);
        return closer;
    }

    console.warn(`[DISTRIBUTION] ❌ Nenhum closer disponível`);
    return null;
}

/**
 * HELPER FUNCTIONS (Dependencies)
 * 
 * These functions are required for the automatic distribution system to work:
 * - formatTimeFromSupabase(time) - Format time from Supabase (08:00:00-03 to 08:00)
 * - appointmentsData - Global array of appointments
 * - attendantsData - Global array of attendants from Supabase
 */

// Função para formatar horário do Supabase (08:00:00-03 para 08:00)
function formatTimeFromSupabase(time) {
    if (!time) return '--:--';
    return time.substring(0, 5);
}

/**
 * DISTRIBUTION ALGORITHM EXPLANATION
 * 
 * 1. FILTER BY SECTOR
 *    - Only attendants from "Vendas" (Sales) sector are considered
 * 
 * 2. FILTER BY SCHEDULE
 *    - Check if attendant has work hours configured for the appointment date
 *    - Exclude attendants with no schedule for that day
 * 
 * 3. COUNT APPOINTMENTS (LOAD)
 *    - Count pending appointments for each attendant on that specific date
 *    - IMPORTANT: Exclude "Personal Appointment" from load count
 *    - But "Personal Appointment" DOES block time slots
 * 
 * 4. SORT BY LOAD
 *    - Sort attendants by appointment count (ascending)
 *    - If tied, use random tiebreaker
 * 
 * 5. VALIDATE AVAILABILITY
 *    For each attendant in sorted order:
 *    a) Check if within work schedule (respects breaks)
 *    b) Check for time conflicts (30-minute duration)
 *    c) Return first available attendant
 * 
 * 6. FALLBACK
 *    - If no attendant available, return null
 * 
 * EXAMPLE:
 * - Attendants: João (2 appointments), Maria (1 appointment), Pedro (1 appointment)
 * - Sorted: Maria (1) → Pedro (1) → João (2)
 * - If Maria has a break at that time, try Pedro
 * - If Pedro has a conflict, try João
 * - If João is also unavailable, return null
 */

/**
 * USAGE IN FORM SUBMISSION
 * 
 * When a user creates an appointment with "Distribuição Automática":
 * 
 * 1. Form captures: date, time, type
 * 2. Check if type is "Ligação Closer" or "Agendamento Pessoal"
 * 3. Call: findAvailableCloser(appointmentDate, appointmentTime)
 * 4. If found: Use attendant.nome as the assigned attendant
 * 5. If not found: Show error "No attendants available"
 * 6. Send appointment to n8n with assigned attendant
 */

/**
 * END OF AUTOMATIC DISTRIBUTION SYSTEM CODE
 * 
 * This file contains all functions related to automatic attendant distribution.
 * To integrate this code back into the main system, copy these functions
 * into the main HTML file at the appropriate locations.
 * 
 * Key Integration Points:
 * - Lines 10897-10966: isAttendantWithinSchedule()
 * - Lines 10968-11075: hasConflictingAppointment()
 * - Lines 11077-11198: findAvailableCloser()
 * 
 * Dependencies:
 * - appointmentsData (global variable)
 * - attendantsData (global variable)
 * - formatTimeFromSupabase() function
 */
