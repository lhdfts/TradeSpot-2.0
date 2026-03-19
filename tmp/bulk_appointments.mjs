/**
 * Bulk Appointment Creator
 * Cria agendamentos fictícios via endpoint público /api/public/appointments
 *
 * Parâmetros configurados:
 *  - Data: 2026-03-19
 *  - Horário: 14:00 - 16:00 (slots de 15 em 15 minutos)
 *  - Evento: Boas Vindas (57bde58e-dbd7-459f-8ec6-3c3d466b3389)
 *  - Atendente: Distribuição Automática
 *  - Criado por: a6127506-db64-4ac9-ba09-7eac663b0b31 (sistema)
 */

// ─── CONFIGURAÇÃO ───────────────────────────────────────────────────────────
const BASE_URL = 'https://tradespot-git-dev-lhdfs-projects.vercel.app'; // Branch dev
const EVENT_ID = '57bde58e-dbd7-459f-8ec6-3c3d466b3389';
const CREATED_BY = 'a6127506-db64-4ac9-ba09-7eac663b0b31';
const DATE = '2026-03-19';

// 4 agendamentos às 14:00 e 4 às 18:00 = 8 no total
const SLOTS = [
    '14:00', '14:00', '14:00', '14:00',
    '18:00', '18:00', '18:00', '18:00',
];
// ────────────────────────────────────────────────────────────────────────────

// Gerador de horários dentro da janela
function generateTimeSlots(start, end, intervalMinutes) {
    const slots = [];
    const [startH, startM] = start.split(':').map(Number);
    const [endH, endM] = end.split(':').map(Number);
    const endTotal = endH * 60 + endM;

    let current = startH * 60 + startM;
    while (current < endTotal) {
        const h = Math.floor(current / 60);
        const m = current % 60;
        slots.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
        current += intervalMinutes;
    }
    return slots;
}

// Gerador de dados fictícios por índice
function generateFakeClient(index) {
    const firstNames = ['Ana', 'Carla', 'Pedro', 'Lucas', 'Mariana', 'Rafael', 'Juliana', 'Bruno', 'Fernanda', 'Thiago'];
    const lastNames = ['Silva', 'Costa', 'Oliveira', 'Santos', 'Pereira', 'Ferreira', 'Alves', 'Lima', 'Rocha', 'Martins'];

    const first = firstNames[index % firstNames.length];
    const last = lastNames[Math.floor(index / firstNames.length) % lastNames.length];
    const name = `${first} ${last}`;

    const emailUser = `${first.toLowerCase()}.${last.toLowerCase()}${index + 1}`;
    const email = `${emailUser}@testebulk.com`;

    // Telefone fictício: 119XXXXXXXX
    const phone = `119${String(10000000 + index * 1337).padStart(8, '0')}`;

    return { lead: name, email, phone };
}

// Envia um agendamento para o endpoint público
async function createAppointment(client, time, index) {
    const payload = {
        ...client,
        date: DATE,
        time,
        eventId: EVENT_ID,
        attendantId: 'distribuicao_automatica',
        createdBy: CREATED_BY,
    };

    console.log(`\n[${index + 1}] Enviando: ${client.lead} | ${time}`);
    console.log(`    Payload:`, JSON.stringify(payload));

    try {
        const response = await fetch(`${BASE_URL}/api/public/appointments`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });

        const rawText = await response.text();
        let result;
        try {
            result = JSON.parse(rawText);
        } catch {
            console.log(`    ❌ Resposta não-JSON (HTTP ${response.status}):`);
            console.log(`    ${rawText.substring(0, 300)}`);
            return { success: false, time, client: client.lead, error: `HTTP ${response.status}: non-JSON response` };
        }

        if (response.ok) {
            console.log(`    ✅ Criado! ID: ${result.id}`);
        } else {
            console.log(`    ❌ Erro ${response.status}: ${result.error || JSON.stringify(result)}`);
        }
        return { success: response.ok, time, client: client.lead, result };
    } catch (err) {
        console.log(`    ❌ Falha na requisição: ${err.message}`);
        return { success: false, time, client: client.lead, error: err.message };
    }
}

// Main
async function main() {
    const slots = SLOTS;

    console.log('═══════════════════════════════════════════════════');
    console.log('  Bulk Appointment Creator — TradeSpot');
    console.log('═══════════════════════════════════════════════════');
    console.log(`  Data: ${DATE}`);
    console.log(`  Slots configurados: ${[...new Set(slots)].join(', ')} (${slots.length} agendamentos)`);
    console.log(`  Endpoint: ${BASE_URL}/api/public/appointments`);
    console.log('═══════════════════════════════════════════════════\n');

    const results = [];

    for (let i = 0; i < slots.length; i++) {
        const client = generateFakeClient(i);
        const result = await createAppointment(client, slots[i], i);
        results.push(result);

        // Pequeno delay entre requisições para não sobrecarregar
        if (i < slots.length - 1) {
            await new Promise(r => setTimeout(r, 800));
        }
    }

    // Resumo final
    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;

    console.log('\n═══════════════════════════════════════════════════');
    console.log('  RESUMO FINAL');
    console.log('═══════════════════════════════════════════════════');
    console.log(`  ✅ Criados com sucesso: ${successful}`);
    console.log(`  ❌ Falhas: ${failed}`);

    if (failed > 0) {
        console.log('\n  Falhas:');
        results.filter(r => !r.success).forEach(r => {
            console.log(`    - ${r.time} | ${r.client}: ${r.result?.error || r.error}`);
        });
    }
    console.log('═══════════════════════════════════════════════════');
}

main();
