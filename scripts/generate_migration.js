import fs from 'fs';

// Raw SQL content provided by user
const rawSql = `INSERT INTO "public"."colaboradores" ("id", "nome", "email", "foto", "setor", "dataNascimento", "dataAdmissao", "sobre", "formacao", "hobby", "filme", "livro", "musica", "created_at", "tamanho_camiseta", "horario_entrada", "horario_saida", "pausa_inicio", "pausa_fim", "segunda_horario_inicio", "segunda_horario_fim", "segunda_pausa_inicio", "segunda_pausa_fim", "terca_horario_inicio", "terca_horario_fim", "terca_pausa_inicio", "terca_pausa_fim", "quarta_horario_inicio", "quarta_horario_fim", "quarta_pausa_inicio", "quarta_pausa_fim", "quinta_horario_inicio", "quinta_horario_fim", "quinta_pausa_inicio", "quinta_pausa_fim", "sexta_horario_inicio", "sexta_horario_fim", "sexta_pausa_inicio", "sexta_pausa_fim", "sabado_horario_inicio", "sabado_horario_fim", "sabado_pausa_inicio", "sabado_pausa_fim", "domingo_horario_inicio", "domingo_horario_fim", "domingo_pausa_inicio", "domingo_pausa_fim") VALUES ('27', 'Genival Pereira', 'comercial05@tradestars.com.br', '', 'Vendas', '16/04/1993', '', '', '', '', '', '', '', '2025-08-01 19:16:34.679776+00', 'M', '08:00:00-03', '18:00:00-03', '12:30:00-03', '13:30:00-03', '07:30:00-03', '19:00:00-03', '13:00:00-03', '14:00:00-03', '07:30:00-03', '19:00:00-03', '13:00:00-03', '14:00:00-03', '07:30:00-03', '22:00:00-03', '13:00:00-03', '14:00:00-03', '08:00:00-03', '17:00:00-03', '13:00:00-03', '14:00:00-03', '08:00:00-03', '16:00:00-03', '12:00:00-03', '13:00:00-03', null, null, null, null, null, null, null, null), ('32', 'Laurence Mafra', 'comercial03@tradestars.com.br', null, 'Vendas', null, null, null, null, null, null, null, null, '2025-08-01 19:16:34.679776+00', null, '08:00:00-03', '18:00:00-03', '12:00:00-03', '13:00:00-03', '08:00:00-03', '23:00:00-03', '13:00:00-03', '15:00:00-03', '08:00:00-03', '23:00:00-03', '13:00:00-03', '15:00:00-03', '08:00:00-03', '23:00:00-03', '13:00:00-03', '15:00:00-03', '08:00:00-03', '23:00:00-03', '13:00:00-03', '15:00:00-03', null, null, null, null, '10:00:00-03', '18:00:00-03', '15:00:00-03', '16:00:00-03', '10:00:00-03', '18:00:00-03', '15:00:00-03', '16:00:00-03'), ('58', 'Marcos Lourencetti', 'comercial11@tradestars.com.br', null, 'Vendas', null, null, null, null, null, null, null, null, '2025-08-01 19:16:34.679776+00', null, '08:00:00-03', null, null, null, '08:00:00-03', '22:00:00-03', '13:00:00-03', '15:00:00-03', '08:00:00-03', '22:00:00-03', '13:00:00-03', '15:00:00-03', '08:00:00-03', '20:00:00-03', '13:00:00-03', '15:00:00-03', '08:00:00-03', '22:00:00-03', '13:00:00-03', '15:00:00-03', '08:00:00-03', '17:00:00-03', '13:00:00-03', '15:00:00-03', '09:00:00-03', '22:00:00-03', null, null, '09:00:00-03', '22:00:00-03', null, null), ('59', 'Marcos Oliveira', 'comercial02@tradestars.com.br', null, 'Vendas', null, null, null, null, null, null, null, null, '2025-08-01 19:16:34.679776+00', null, '08:00:00-03', null, null, null, '08:00:00-03', '00:00:00-03', '12:00:00-03', '14:00:00-03', '08:00:00-03', '00:00:00-03', '12:00:00-03', '14:00:00-03', '08:00:00-03', '00:00:00-03', '12:00:00-03', '15:00:00-03', '08:00:00-03', '00:00:00-03', '12:00:00-03', '14:00:00-03', '08:00:00-03', '17:00:00-03', '12:00:00-03', '14:00:00-03', '10:00:00-03', '00:00:00-03', '12:00:00-03', '13:00:00-03', '10:00:00-03', '00:00:00-03', '12:00:00-03', '13:00:00-03'), ('75', 'Lucas Gonçalves', 'comercial07@tradestars.com.br', null, 'Vendas', null, null, null, null, null, null, null, null, '2025-08-01 19:16:34.679776+00', null, null, null, null, null, '07:59:00-03', '01:59:00-03', '12:59:00-03', '13:59:00-03', '07:59:00-03', '01:59:00-03', '12:59:00-03', '13:59:00-03', '07:59:00-03', '01:59:00-03', '12:59:00-03', '14:59:00-03', '07:59:00-03', '01:59:00-03', '12:59:00-03', '13:59:00-03', '07:59:00-03', '17:00:00-03', '12:59:00-03', '13:59:00-03', '07:59:00-03', '22:59:00-03', null, null, '07:59:00-03', '22:59:00-03', null, null), ('78', 'Simoni Stengrat', 'comercial08@tradestars.com.br', null, 'Vendas', null, null, null, null, null, null, null, null, '2025-08-01 19:16:34.679776+00', null, '08:00:00-03', '18:00:00-03', '12:00:00-03', '13:00:00-03', '07:58:00-03', '00:00:00-03', '12:00:00-03', '14:58:00-03', '07:58:00-03', '00:00:00-03', '12:00:00-03', '15:58:00-03', '07:58:00-03', '00:00:00-03', '12:00:00-03', '14:58:00-03', '07:58:00-03', '00:00:00-03', '12:00:00-03', '14:58:00-03', '07:58:00-03', '17:00:00-03', '12:00:00-03', '15:58:00-03', '09:58:00-03', '20:00:00-03', '12:00:00-03', '14:58:00-03', '10:58:00-03', '22:00:00-03', '13:00:00-03', '14:58:00-03'), ('85', 'Vanessa Santana', 'comercial04@tradestars.com.br', null, 'Vendas', null, null, null, null, null, null, null, null, '2025-08-01 19:16:34.679776+00', null, '08:00:00-03', '18:00:00-03', '12:00:00-03', '13:00:00-03', '08:00:00-03', '23:00:00-03', '13:00:00-03', '14:00:00-03', '08:00:00-03', '19:00:00-03', '13:00:00-03', '14:00:00-03', '08:00:00-03', '00:00:00-03', '13:00:00-03', '14:00:00-03', '08:00:00-03', '15:00:00-03', '13:00:00-03', '14:00:00-03', '08:00:00-03', '17:00:00-03', '13:00:00-03', '14:00:00-03', '08:00:00-03', '13:00:00-03', null, null, '17:00:00-03', '23:00:00-03', null, null), ('89', 'Walquiria Barreiro', 'comercial06@tradestars.com.br', null, 'Vendas', null, null, null, null, null, null, null, null, '2025-08-01 19:16:34.679776+00', null, '08:00:00-03', null, null, null, '07:00:00-03', '15:00:00-03', '12:00:00-03', '14:00:00-03', '07:00:00-03', '12:00:00-03', null, null, '07:00:00-03', '16:00:00-03', '11:00:00-03', '14:00:00-03', '07:00:00-03', '01:00:00-03', '11:00:00-03', '14:00:00-03', '07:00:00-03', '17:00:00-03', '11:00:00-03', '14:00:00-03', '08:00:00-03', '13:00:00-03', null, null, '20:00:00-03', '00:00:00-03', null, null);`;

// Parse values
const regex = /\(([^)]+)\)/g;
let match;
const records = [];

const cleanValue = (val) => {
    val = val.trim();
    if (val === 'null') return null;
    if (val.startsWith("'") && val.endsWith("'")) return val.slice(1, -1);
    return val;
};

// Map time format "08:00:00-03" to "08:00"
const formatTime = (time) => {
    if (!time) return null;
    return time.substring(0, 5);
};

while ((match = regex.exec(rawSql)) !== null) {
    const rawValues = match[1].split(/,(?=(?:[^']*'[^']*')*[^']*$)/);
    const values = rawValues.map(cleanValue);

    // Check if we have enough columns, raw SQL has 47 columns
    // We map by index based on INSERT INTO structure

    /* 
    0: id
    1: nome
    2: email
    ...
    19: segunda_horario_inicio
    20: segunda_horario_fim
    21: segunda_pausa_inicio
    22: segunda_pausa_fim
    ... and so on
    */

    // Extract basic info
    const name = values[1];
    const email = values[2];
    const oldId = values[0]; // We probably want to generate new UUIDs unless we want to keep old int IDs (schema expects uuid)

    // Schedule Mapping
    const schedule = {};
    const pauses = {};

    const daysMap = [
        { name: 'mon', startIdx: 19 },
        { name: 'tue', startIdx: 23 },
        { name: 'wed', startIdx: 27 },
        { name: 'thu', startIdx: 31 },
        { name: 'fri', startIdx: 35 },
        { name: 'sat', startIdx: 39 },
        { name: 'sun', startIdx: 43 }
    ];

    daysMap.forEach(day => {
        const start = formatTime(values[day.startIdx]);
        const end = formatTime(values[day.startIdx + 1]);
        const pStart = formatTime(values[day.startIdx + 2]);
        const pEnd = formatTime(values[day.startIdx + 3]);

        if (start && end) {
            schedule[day.name] = { start, end };
        } else {
            schedule[day.name] = null;
        }

        if (pStart && pEnd) {
            pauses[day.name] = [{ start: pStart, end: pEnd }];
        } else {
            pauses[day.name] = [];
        }
    });

    records.push({
        name,
        email,
        oldId,
        schedule: JSON.stringify(schedule),
        pauses: JSON.stringify(pauses)
    });
}

// Generate new SQL
let outputSql = `-- MIGRATION: IMPORTED ATTENDANTS FROM OLD SYSTEM\n\n`;

// Helper to generate UUID v4-ish (not strict, but good enough for seed if needed, or use proper uuid gen in SQL)
// Actually better to use 'gen_random_uuid()' in SQL insert
records.forEach(rec => {
    outputSql += `INSERT INTO public.users (id, name, email, role, level, sector, schedule, pauses)\n`;
    outputSql += `VALUES (\n`;
    outputSql += `  gen_random_uuid(), -- generated new UUID\n`;
    outputSql += `  '${rec.name}',\n`;
    outputSql += `  '${rec.email}',\n`;
    // Defaulting role to 'Closer' as most are 'Vendas' in input. Can default to 'Closer' or 'SDR' based on preference.
    // User requested adapting. Most seem to be sales ('Vendas').
    outputSql += `  'Colaborador', -- Default role\n`;
    outputSql += `  2, -- Default level\n`;
    outputSql += `  'Closer', -- Default sector\n`;
    outputSql += `  '${rec.schedule}'::jsonb,\n`;
    outputSql += `  '${rec.pauses}'::jsonb\n`;
    outputSql += `);\n\n`;
});

// Write to migration file
fs.writeFileSync('c:\\Users\\TradeStars\\Videos\\Backup SPT2\\Nova pasta (2)\\supabase\\migration_attendants.sql', outputSql);
console.log('Migration script generated!');
