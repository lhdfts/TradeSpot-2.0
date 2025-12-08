/**
 * METRICS SCREEN - COMPLETE CODE EXTRACTION
 * 
 * This file contains all the code related to the Metrics screen functionality
 * from the Appointment Management System
 * 
 * Original file: Untitled-1.html
 * Lines: 8719-9511 (and related functions)
 * 
 * Functions included:
 * - showMetricsView() - Main metrics view initialization
 * - exportAppointmentsToCSV() - CSV export functionality
 * - populateMetricsAttendantFilter() - Populate attendant filter dropdown
 * - populateMetricsEventFilter() - Populate event filter dropdown
 * - applyMetricsFilters() - Apply all metrics filters
 * - filterByPeriod() - Filter appointments by time period
 * - applyAllMetricsFilters() - Combine all filters
 * - renderLeadsRanking() - Render SDR performance ranking
 * - renderClosersRanking() - Render Closer performance ranking
 * - renderAppointmentsChart() - Render appointments chart
 * - createAppointmentsChart() - Create Chart.js visualization
 */

// ===== MAIN METRICS VIEW FUNCTION =====
// Lines: 8719-8755
async function showMetricsView() {
    // Verificar se o usuário tem permissão (apenas nível 5 - TEI e Thiago)
    if (userAccessLevel !== 5) {
        showNotification('Acesso negado: apenas administradores podem visualizar métricas', 'error');
        showMyAppointmentsView();
        return;
    }

    document.getElementById("my-appointments-view").style.display = "none";
    document.getElementById("all-appointments-view").style.display = "none";
    document.getElementById("create-appointment-view").style.display = "none";
    document.getElementById("metrics-view").style.display = "block";
    document.getElementById("attendants-view").style.display = "none";
    document.getElementById("events-view").style.display = "none";

    // Sempre recarregar attendantsData para garantir dados atualizados
    console.log('[METRICS] Carregando attendantsData...');
    await fetchAttendants();
    console.log('[METRICS] attendantsData carregado:', attendantsData.length, 'registros');

    // Renderizar rankings
    renderLeadsRanking();
    renderClosersRanking();
    
    // Renderizar gráfico
    renderAppointmentsChart();

    // Setup dos botões de expandir
    setupMetricsExpandButtons();
    
    // Carregar filtros
    populateMetricsAttendantFilter();
    populateMetricsEventFilter();
    
    // Atualizar selects de eventos
    populateEventSelects();
}

// ===== CSV EXPORT FUNCTION =====
// Lines: 8757-8831
function exportAppointmentsToCSV() {
    if (appointmentsData.length === 0) {
        showNotification('Nenhum agendamento para exportar', 'warning');
        return;
    }

    try {
        // Define as colunas que serão exportadas
        const headers = [
            'ID',
            'Nome do Aluno',
            'Telefone',
            'Tipo',
            'Data',
            'Hora',
            'Status',
            'Atendente',
            'Criado por',
            'Perfil de Interesse',
            'Perfil de Conhecimento',
            'Perfil Financeiro',
            'Google Meet Link',
            'Informações Adicionais'
        ];

        // Converte os dados para CSV
        const rows = appointmentsData.map(app => [
            app.id || '',
            (app.name || '').replace(/"/g, '""'), // Escapar aspas duplas
            app.phone || app.clientPhone || '',
            app.type || '',
            app.date || '',
            app.time || '',
            app.status || '',
            app.attendant || '',
            app.createdBy || '',
            (app.interestProfile || '').replace(/"/g, '""'),
            (app.knowledgeProfile || '').replace(/"/g, '""'),
            (app.financialProfile || '').replace(/"/g, '""'),
            app.googleMeetLink || '',
            (app.additionalInfo || '').replace(/"/g, '""')
        ]);

        // Cria o conteúdo do CSV com BOM (Byte Order Mark) para compatibilidade com Excel em português
        let csv = '\uFEFF'; // BOM para UTF-8
        csv += headers.map(h => `"${h}"`).join(',') + '\n';
        csv += rows.map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');

        // Cria o blob e o link de download
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        
        // Gera o nome do arquivo com a data e hora
        const now = new Date();
        const dateStr = now.toISOString().split('T')[0];
        const timeStr = now.toTimeString().split(' ')[0].replace(/:/g, '-');
        const fileName = `agendamentos_${dateStr}_${timeStr}.csv`;
        
        link.setAttribute('href', url);
        link.setAttribute('download', fileName);
        link.style.visibility = 'hidden';
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        showNotification(`Agendamentos exportados com sucesso! (${appointmentsData.length} registros)`, 'success');
        console.log('[EXPORT] Arquivo baixado:', fileName, '- Total de registros:', appointmentsData.length);
    } catch (error) {
        console.error('[EXPORT] Erro ao exportar agendamentos:', error);
        showNotification('Erro ao exportar agendamentos', 'error');
    }
}

// ===== METRICS FILTER VARIABLES =====
// Lines: 8833-8839
let metricsAttendantFilter = '';
let metricsEventFilter = '';
let metricsPeriodFilter = '';
let metricsPeriodStart = '';
let metricsPeriodEnd = '';

// ===== POPULATE ATTENDANT FILTER =====
// Lines: 8841-8871
function populateMetricsAttendantFilter() {
    const select = document.getElementById('metrics-attendant-filter');
    if (!select) return;

    // Limpar opções antigas (mantém "Todos os Atendentes")
    while (select.options.length > 1) {
        select.remove(1);
    }

    // Filtrar apenas usuários de Vendas e Leads de attendantsData
    const vendledAttendants = attendantsData
        .filter(user => {
            const setor = (user.setor || '').toLowerCase().trim();
            return setor === 'vendas' || setor === 'leads';
        })
        .map(user => user.nome)
        .sort();

    // Adicionar opções
    vendledAttendants.forEach(attendant => {
        const option = document.createElement('option');
        option.value = attendant;
        option.textContent = attendant;
        select.appendChild(option);
    });

    // Adicionar listener para mudança de filtro
    select.removeEventListener('change', applyMetricsFilters);
    select.addEventListener('change', applyMetricsFilters);
}

// ===== POPULATE EVENT FILTER =====
// Lines: 8873-8904
function populateMetricsEventFilter() {
    const select = document.getElementById('metrics-event-filter');
    if (!select) return;

    // Limpar opções antigas (mantém "Todos")
    while (select.options.length > 1) {
        select.remove(1);
    }

    // Obter todos os eventos únicos dos agendamentos
    const events = appointmentsData
        .map(app => {
            const raw = app._raw || {};
            return app.event || raw.event || '';
        })
        .filter((v, i, a) => a.indexOf(v) === i)
        .filter(event => event && event.trim() !== '')
        .sort();

    // Adicionar opções
    events.forEach(event => {
        const option = document.createElement('option');
        option.value = event;
        option.textContent = event;
        select.appendChild(option);
    });

    // Adicionar listener para mudança de filtro
    select.removeEventListener('change', applyMetricsFilters);
    select.addEventListener('change', applyMetricsFilters);
}

// ===== APPLY ALL METRICS FILTERS =====
// Lines: 8906-8974
function applyMetricsFilters() {
    // Atualizar valores dos filtros
    const attendantSelect = document.getElementById('metrics-attendant-filter');
    const eventSelect = document.getElementById('metrics-event-filter');
    const periodSelect = document.getElementById('metrics-period-filter');
    const periodStartInput = document.getElementById('metrics-period-start');
    const periodEndInput = document.getElementById('metrics-period-end');
    const customPeriodDiv = document.getElementById('metrics-custom-period');

    if (attendantSelect) {
        metricsAttendantFilter = attendantSelect.value;
    }
    if (eventSelect) {
        metricsEventFilter = eventSelect.value;
    }
    if (periodSelect) {
        metricsPeriodFilter = periodSelect.value;
        
        // Mostrar/ocultar campos de período personalizado
        if (customPeriodDiv) {
            if (metricsPeriodFilter === 'custom') {
                customPeriodDiv.style.display = 'flex';
            } else {
                customPeriodDiv.style.display = 'none';
                // Limpar valores quando não for personalizado
                if (periodStartInput) periodStartInput.value = '';
                if (periodEndInput) periodEndInput.value = '';
                metricsPeriodStart = '';
                metricsPeriodEnd = '';
            }
        }
    }
    if (periodStartInput) {
        metricsPeriodStart = periodStartInput.value;
    }
    if (periodEndInput) {
        metricsPeriodEnd = periodEndInput.value;
    }

    // Adicionar listener para o select de período
    if (periodSelect) {
        periodSelect.removeEventListener('change', applyMetricsFilters);
        periodSelect.addEventListener('change', applyMetricsFilters);
    }

    // Adicionar listeners para período personalizado
    if (periodStartInput) {
        periodStartInput.removeEventListener('change', applyMetricsFilters);
        periodStartInput.addEventListener('change', applyMetricsFilters);
    }
    if (periodEndInput) {
        periodEndInput.removeEventListener('change', applyMetricsFilters);
        periodEndInput.addEventListener('change', applyMetricsFilters);
    }

    console.log('[METRICS FILTER] Filtros aplicados:', {
        atendente: metricsAttendantFilter,
        evento: metricsEventFilter,
        periodo: metricsPeriodFilter,
        inicio: metricsPeriodStart,
        fim: metricsPeriodEnd
    });
    
    // Re-renderizar rankings e gráfico
    renderLeadsRanking();
    renderClosersRanking();
    renderAppointmentsChart();
}

// ===== FILTER BY PERIOD =====
// Lines: 8976-9045
function filterByPeriod(appointments) {
    if (!metricsPeriodFilter || metricsPeriodFilter === '') {
        return appointments;
    }

    const now = getNowGMT3();
    let startDate = null;
    let endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

    switch (metricsPeriodFilter) {
        case 'today':
            startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
            endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
            break;
        case 'week':
            startDate = new Date(now);
            startDate.setDate(now.getDate() - 7);
            startDate.setHours(0, 0, 0, 0);
            break;
        case 'month':
            startDate = new Date(now);
            startDate.setMonth(now.getMonth() - 1);
            startDate.setHours(0, 0, 0, 0);
            break;
        case '3months':
            startDate = new Date(now);
            startDate.setMonth(now.getMonth() - 3);
            startDate.setHours(0, 0, 0, 0);
            break;
        case '6months':
            startDate = new Date(now);
            startDate.setMonth(now.getMonth() - 6);
            startDate.setHours(0, 0, 0, 0);
            break;
        case 'year':
            startDate = new Date(now);
            startDate.setFullYear(now.getFullYear() - 1);
            startDate.setHours(0, 0, 0, 0);
            break;
        case 'custom':
            if (metricsPeriodStart && metricsPeriodEnd) {
                startDate = new Date(metricsPeriodStart + 'T00:00:00');
                endDate = new Date(metricsPeriodEnd + 'T23:59:59');
            } else {
                return appointments;
            }
            break;
        default:
            return appointments;
    }

    return appointments.filter(app => {
        if (!app.date) return false;

        // Normalizar data do agendamento
        let appointmentDate = null;
        if (app.date.includes('/')) {
            const [day, month, year] = app.date.split('/');
            appointmentDate = new Date(year, month - 1, day, 0, 0, 0);
        } else if (app.date.includes('-')) {
            appointmentDate = new Date(app.date + 'T00:00:00');
        } else {
            return false;
        }

        // Verificar se a data está dentro do período
        return appointmentDate >= startDate && appointmentDate <= endDate;
    });
}

// ===== APPLY ALL METRICS FILTERS COMBINED =====
// Lines: 9047-9069
function applyAllMetricsFilters(data) {
    let filtered = [...data];

    // Filtro por atendente
    if (metricsAttendantFilter && metricsAttendantFilter !== '') {
        filtered = filtered.filter(app => app.attendant === metricsAttendantFilter);
    }

    // Filtro por evento
    if (metricsEventFilter && metricsEventFilter !== '') {
        filtered = filtered.filter(app => {
            const raw = app._raw || {};
            const event = app.event || raw.event || '';
            return event === metricsEventFilter;
        });
    }

    // Filtro por período
    filtered = filterByPeriod(filtered);

    return filtered;
}

// ===== RENDER LEADS RANKING (SDR PERFORMANCE) =====
// Lines: 9071-9251
function renderLeadsRanking() {
    const leadsRankingBody = document.getElementById("leads-ranking-body");
    const modalLeadsBody = document.getElementById("modal-leads-body");
    if (!leadsRankingBody) {
        console.warn('[LEADS RANKING] Elemento leads-ranking-body não encontrado');
        return;
    }

    // Verificar se attendantsData está carregado
    if (!attendantsData || attendantsData.length === 0) {
        console.warn('[LEADS RANKING] attendantsData não está carregado ou está vazio');
        leadsRankingBody.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 20px; color: #9ca3af;">Carregando dados...</td></tr>';
        return;
    }

    // Log detalhado para debug
    console.log('[LEADS RANKING] Total de atendentes em attendantsData:', attendantsData.length);
    console.log('[LEADS RANKING] attendantsData completo:', attendantsData);
    
    // Verificar todos os setores únicos
    const setoresUnicos = [...new Set(attendantsData.map(u => (u.setor || '').toLowerCase().trim()))];
    console.log('[LEADS RANKING] Setores únicos encontrados:', setoresUnicos);
    
    // Verificar usuários com setor Leads (com diferentes variações)
    const leadsUsersInAttendants = attendantsData.filter(user => {
        const setor = (user.setor || '').toLowerCase().trim();
        return setor === 'leads' || setor === 'lead';
    });
    console.log('[LEADS RANKING] Usuários com setor=Leads em attendantsData:', leadsUsersInAttendants);
    console.log('[LEADS RANKING] Nomes dos usuários Leads:', leadsUsersInAttendants.map(u => u.nome));
    console.log('[LEADS RANKING] Setores dos usuários Leads:', leadsUsersInAttendants.map(u => u.setor));

    // Aplicar todos os filtros
    const filteredData = applyAllMetricsFilters(appointmentsData);

    // Função auxiliar para verificar se um nome pertence ao setor Leads
    function isLeadsUser(name) {
        if (!name || name.trim() === '') return false;
        const normalizedName = (name || '').toLowerCase().trim();
        
        const match = attendantsData.some(user => {
            const setor = (user.setor || '').toLowerCase().trim();
            const userName = (user.nome || '').toLowerCase().trim();
            const isLeads = setor === 'leads' || setor === 'lead';
            const nameMatch = userName === normalizedName;
            
            if (isLeads && nameMatch) {
                console.log('[LEADS RANKING] Match encontrado:', { name, userName, setor });
            }
            
            return isLeads && nameMatch;
        });
        
        if (!match) {
            console.log('[LEADS RANKING] Nome não encontrado como Leads:', name);
        }
        
        return match;
    }

    // Obter lista de usuários únicos que criaram agendamentos (baseado em createdBy)
    const uniqueCreators = filteredData
        .map(app => app.createdBy)
        .filter((v, i, a) => a.indexOf(v) === i) // Remover duplicatas
        .filter(name => name && name.trim() !== '');

    console.log('Criadores únicos encontrados:', uniqueCreators);
    console.log('Total de agendamentos filtrados:', filteredData.length);

    // Filtrar apenas os que pertencem ao setor Leads
    const leadsUsers = uniqueCreators.filter(name => isLeadsUser(name));

    console.log('Usuários do setor Leads encontrados:', leadsUsers);
    console.log('Total de usuários Leads:', leadsUsers.length);

    // Contar agendamentos por tipo para cada usuário do setor Leads
    const leadsMetrics = {};
    leadsUsers.forEach(leadName => {
        // Comparação case-insensitive para garantir que funcione
        const ligacaoCloser = filteredData.filter(app => {
            const createdBy = (app.createdBy || '').toLowerCase().trim();
            const leadNameLower = (leadName || '').toLowerCase().trim();
            return createdBy === leadNameLower && app.type === 'Ligação Closer';
        }).length;
        
        const reagendamentoCloser = filteredData.filter(app => {
            const createdBy = (app.createdBy || '').toLowerCase().trim();
            const leadNameLower = (leadName || '').toLowerCase().trim();
            return createdBy === leadNameLower && app.type === 'Reagendamento Closer';
        }).length;

        // Incluir apenas usuários com pelo menos um agendamento
        if (ligacaoCloser > 0 || reagendamentoCloser > 0) {
            leadsMetrics[leadName] = {
                ligacaoCloser,
                reagendamentoCloser,
                total: ligacaoCloser + reagendamentoCloser
            };
        }
    });

    // Ordenar por total (decrescente)
    const sortedLeads = Object.entries(leadsMetrics)
        .sort((a, b) => b[1].total - a[1].total);

    console.log('Leads para renderizar:', sortedLeads);

    // Função para renderizar linhas
    const renderRows = (data, limit = null) => {
        const dataToRender = limit ? data.slice(0, limit) : data;
        return dataToRender.map(([name, metrics], index) => {
            let borderStyle = '';
            let badgeColor = '#6b7280';
            let badgeBg = '#f3f4f6';

            if (index === 0) {
                borderStyle = 'border-left: 4px solid #fbbf24; background-color: #fefce8;';
                badgeColor = 'white';
                badgeBg = '#f59e0b';
            } else if (index === 1) {
                borderStyle = 'border-left: 4px solid #c0cfe4; background-color: #f8fafc;';
                badgeColor = 'white';
                badgeBg = '#94a3b8';
            } else if (index === 2) {
                borderStyle = 'border-left: 4px solid #c98b50; background-color: #fdf4ec;';
                badgeColor = 'white';
                badgeBg = '#d97706';
            }

            return `
            <tr style="${borderStyle} padding: 12px; border-radius: 6px;">
                <td style="text-align: center; padding: 12px;">
                    <span style="background-color: ${badgeBg}; color: ${badgeColor}; padding: 6px 10px; border-radius: 50%; width: 28px; height: 28px; display: inline-flex; align-items: center; justify-content: center; font-size: 13px; font-weight: 700;">${index + 1}</span>
                </td>
                <td style="font-weight: 500; color: #1f2937; padding: 12px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 150px;" title="${name || '(sem nome)'}">
                    ${(name || '(sem nome)').length > 25 ? (name || '(sem nome)').substring(0, 25) + '...' : (name || '(sem nome)')}
                </td>
                <td style="text-align: center; padding: 12px;">
                    <span style="background-color: #e0e7ff; color: #3730a3; padding: 6px 12px; border-radius: 6px; font-weight: 600;">${metrics.total}</span>
                </td>
                <td style="text-align: center; padding: 12px;">
                    <span style="background-color: #dbeafe; color: #1e40af; padding: 6px 12px; border-radius: 6px; font-weight: 600;">${metrics.ligacaoCloser}</span>
                </td>
                <td style="text-align: center; padding: 12px;">
                    <span style="background-color: #fef3c7; color: #b45309; padding: 6px 12px; border-radius: 6px; font-weight: 600;">${metrics.reagendamentoCloser}</span>
                </td>
            </tr>
            `;
        }).join('');
    };

    // Renderizar 5 primeiros na tabela
    if (sortedLeads.length === 0) {
        leadsRankingBody.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 20px; color: #9ca3af;">Sem dados</td></tr>';
    } else {
        leadsRankingBody.innerHTML = renderRows(sortedLeads, 5);
    }

    // Renderizar todos no modal com colunas: Posição, Nome, Agendamentos Marcados, Ligação Closer, Reagendamento Closer
    if (modalLeadsBody) {
        modalLeadsBody.innerHTML = sortedLeads.map(([name, metrics], index) => `
            <tr style="border-bottom: 1px solid #e5e7eb;">
                <td style="padding: 12px; text-align: center; font-weight: 600; color: #3b82f6;">${index + 1}</td>
                <td style="padding: 12px; color: #1f2937;">${name || '(sem nome)'}</td>
                <td style="padding: 12px; text-align: center;">
                    <span style="background-color: #e0e7ff; color: #3730a3; padding: 4px 8px; border-radius: 4px; font-weight: 600;">${metrics.total}</span>
                </td>
                <td style="padding: 12px; text-align: center;">
                    <span style="background-color: #dbeafe; color: #1e40af; padding: 4px 8px; border-radius: 4px; font-weight: 600;">${metrics.ligacaoCloser}</span>
                </td>
                <td style="padding: 12px; text-align: center;">
                    <span style="background-color: #fef3c7; color: #b45309; padding: 4px 8px; border-radius: 4px; font-weight: 600;">${metrics.reagendamentoCloser}</span>
                </td>
            </tr>
        `).join('');
        if (sortedLeads.length === 0) {
            modalLeadsBody.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 20px; color: #9ca3af;">Sem dados</td></tr>';
        }
    }
}

// ===== RENDER CLOSERS RANKING (CLOSER PERFORMANCE) =====
// Lines: 9253-9359
function renderClosersRanking() {
    const closersRankingBody = document.getElementById("closers-ranking-body");
    const modalClosersBody = document.getElementById("modal-closers-body");
    if (!closersRankingBody) return;

    // Aplicar todos os filtros
    let filteredData = applyAllMetricsFilters(appointmentsData);

    // Filtrar apenas agendamentos de Vendas (Ligação Closer e Reagendamento Closer)
    // Excluir "Agendamento Pessoal" das métricas
    const vendorsAppointments = filteredData.filter(app => 
        (app.type === 'Ligação Closer' || app.type === 'Reagendamento Closer') &&
        app.type !== 'Agendamento Pessoal'
    );

    // Obter lista de atendentes únicos
    const closersNames = vendorsAppointments
        .map(app => app.attendant)
        .filter((v, i, a) => a.indexOf(v) === i)
        .filter(name => name && name.trim() !== '');

    // Contar agendamentos por closer
    const closersMetrics = {};
    closersNames.forEach(closerName => {
        const total = vendorsAppointments.filter(app => app.attendant === closerName).length;
        const realizados = vendorsAppointments.filter(app => 
            app.attendant === closerName && app.status === 'Realizado'
        ).length;

        closersMetrics[closerName] = {
            total,
            realizados,
            pendentes: total - realizados
        };
    });

    // Ordenar por realizados (decrescente) - este é o fator determinante
    const sortedClosers = Object.entries(closersMetrics)
        .sort((a, b) => b[1].realizados - a[1].realizados);

    // Função para renderizar linhas
    const renderRows = (data, limit = null) => {
        const dataToRender = limit ? data.slice(0, limit) : data;
        return dataToRender.map(([name, metrics], index) => {
            let borderStyle = '';
            let badgeColor = '#6b7280';
            let badgeBg = '#f3f4f6';

            if (index === 0) {
                borderStyle = 'border-left: 4px solid #fbbf24; background-color: #fefce8;';
                badgeColor = 'white';
                badgeBg = '#f59e0b';
            } else if (index === 1) {
                borderStyle = 'border-left: 4px solid #c0cfe4; background-color: #f8fafc;';
                badgeColor = 'white';
                badgeBg = '#94a3b8';
            } else if (index === 2) {
                borderStyle = 'border-left: 4px solid #c98b50; background-color: #fdf4ec;';
                badgeColor = 'white';
                badgeBg = '#d97706';
            }

            return `
            <tr style="${borderStyle} padding: 12px; border-radius: 6px;">
                <td style="text-align: center; padding: 12px;">
                    <span style="background-color: ${badgeBg}; color: ${badgeColor}; padding: 6px 10px; border-radius: 50%; width: 28px; height: 28px; display: inline-flex; align-items: center; justify-content: center; font-size: 13px; font-weight: 700;">${index + 1}</span>
                </td>
                <td style="font-weight: 500; color: #1f2937; padding: 12px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                    ${name || '(sem nome)'}
                </td>
                <td style="text-align: center; padding: 12px;">
                    <span style="background-color: #dcfce7; color: #166534; padding: 6px 12px; border-radius: 6px; font-weight: 600;">${metrics.realizados}</span>
                </td>
                <td style="text-align: center; padding: 12px;">
                    <span style="background-color: #f0fdf4; color: #15803d; padding: 6px 12px; border-radius: 6px; font-weight: 600;">${metrics.total}</span>
                </td>
            </tr>
            `;
        }).join('');
    };

    // Renderizar 5 primeiros na tabela
    closersRankingBody.innerHTML = renderRows(sortedClosers, 5);
    if (sortedClosers.length === 0) {
        closersRankingBody.innerHTML = '<tr><td colspan="3" style="text-align: center; padding: 20px; color: #9ca3af;">Sem dados</td></tr>';
    }

    // Renderizar todos no modal com colunas: Posição, Nome, Realizados, Total Recebido
    if (modalClosersBody) {
        modalClosersBody.innerHTML = sortedClosers.map(([name, metrics], index) => `
            <tr style="border-bottom: 1px solid #e5e7eb;">
                <td style="padding: 12px; text-align: center; font-weight: 600; color: #3b82f6;">${index + 1}</td>
                <td style="padding: 12px; color: #1f2937;">${name || '(sem nome)'}</td>
                <td style="padding: 12px; text-align: center;">
                    <span style="background-color: #dcfce7; color: #166534; padding: 4px 8px; border-radius: 4px; font-weight: 600;">${metrics.realizados}</span>
                </td>
                <td style="padding: 12px; text-align: center;">
                    <span style="background-color: #f0fdf4; color: #15803d; padding: 4px 8px; border-radius: 4px; font-weight: 600;">${metrics.total}</span>
                </td>
            </tr>
        `).join('');
        if (sortedClosers.length === 0) {
            modalClosersBody.innerHTML = '<tr><td colspan="4" style="text-align: center; padding: 20px; color: #9ca3af;">Sem dados</td></tr>';
        }
    }
}

// ===== RENDER APPOINTMENTS CHART =====
// Lines: 9361-9511 (and beyond)
function renderAppointmentsChart() {
    // Carregar Chart.js se não estiver carregado
    if (typeof Chart === 'undefined') {
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/chart.js@3.9.1/dist/chart.min.js';
        script.onload = () => {
            createAppointmentsChart();
        };
        document.head.appendChild(script);
    } else {
        createAppointmentsChart();
    }
}

function createAppointmentsChart() {
    const canvas = document.getElementById('appointmentsChart');
    if (!canvas) return;

    // Destruir gráfico anterior se existir
    if (window.appointmentsChartInstance) {
        window.appointmentsChartInstance.destroy();
    }

    // Aplicar todos os filtros
    let filteredAppointments = applyAllMetricsFilters(appointmentsData);

    // Agrupar agendamentos por data
    const appointmentsByDate = {};

    filteredAppointments.forEach(app => {
        if (!app.date) return;

        // Normalizar data para YYYY-MM-DD
        let normalizedDate = app.date;
        if (app.date.includes('/')) {
            const [day, month, year] = app.date.split('/');
            normalizedDate = `${year}-${month}-${day}`;
        }

        if (!appointmentsByDate[normalizedDate]) {
            appointmentsByDate[normalizedDate] = {
                total: 0,
                realizados: 0,
                naoRealizados: 0,
                cancelados: 0
            };
        }

        // Contar apenas Ligação Closer e Reagendamento Closer
        // Excluir "Agendamento Pessoal" do gráfico
        if ((app.type === 'Ligação Closer' || app.type === 'Reagendamento Closer') &&
            app.type !== 'Agendamento Pessoal') {
            appointmentsByDate[normalizedDate].total += 1;

            if (app.status === 'Realizado') {
                appointmentsByDate[normalizedDate].realizados += 1;
            } else if (app.status === 'Cancelado') {
                appointmentsByDate[normalizedDate].cancelados += 1;
            } else {
                appointmentsByDate[normalizedDate].naoRealizados += 1;
            }
        }
    });

    // Ordenar datas
    const sortedDates = Object.keys(appointmentsByDate).sort();

    // Preparar dados para gráfico
    const labels = sortedDates.map(date => {
        const [year, month, day] = date.split('-');
        return `${day}/${month}`;
    });

    const totalData = sortedDates.map(date => appointmentsByDate[date].total);
    const realizadosData = sortedDates.map(date => appointmentsByDate[date].realizados);
    const naoRealizadosData = sortedDates.map(date => appointmentsByDate[date].naoRealizados);
    const canceladosData = sortedDates.map(date => appointmentsByDate[date].cancelados);

    // Criar gráfico
    window.appointmentsChartInstance = new Chart(canvas, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Total de Agendamentos Closer',
                    data: totalData,
                    borderColor: '#000AFF',
                    backgroundColor: 'rgba(0, 10, 255, 0.1)',
                    tension: 0.4,
                    fill: true,
                    pointRadius: 5,
                    pointBackgroundColor: '#000AFF',
                    pointBorderColor: '#fff',
                    pointBorderWidth: 2
                },
                {
                    label: 'Agendamentos Realizados',
                    data: realizadosData,
                    borderColor: '#10b981',
                    backgroundColor: 'rgba(16, 185, 129, 0.1)',
                    tension: 0.4,
                    fill: true,
                    pointRadius: 5,
                    pointBackgroundColor: '#10b981',
                    pointBorderColor: '#fff',
                    pointBorderWidth: 2
                },
                {
                    label: 'Agendamentos Não Realizados',
                    data: naoRealizadosData,
                    borderColor: '#f59e0b',
                    backgroundColor: 'rgba(245, 158, 11, 0.1)',
                    tension: 0.4,
                    fill: true,
                    pointRadius: 5,
                    pointBackgroundColor: '#f59e0b',
                    pointBorderColor: '#fff',
                    pointBorderWidth: 2
                },
                {
                    label: 'Agendamentos Cancelados',
                    data: canceladosData,
                    borderColor: '#ef4444',
                    backgroundColor: 'rgba(239, 68, 68, 0.1)',
                    tension: 0.4,
                    fill: true,
                    pointRadius: 5,
                    pointBackgroundColor: '#ef4444',
                    pointBorderColor: '#fff',
                    pointBorderWidth: 2
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            onClick: function(event, activeElements) {
                if (activeElements.length > 0) {
                    const datasetIndex = activeElements[0].datasetIndex;
                    const dataIndex = activeElements[0].index;
                    const date = sortedDates[dataIndex];
                    
                    // Determinar qual tipo de agendamento foi clicado
                    let statusFilter = null;
                    let typeTitle = '';
                    
                    if (datasetIndex === 0) {
                        statusFilter = null; // Todos
                        typeTitle = `Todos os Agendamentos - ${labels[dataIndex]}`;
                    } else if (datasetIndex === 1) {
                        statusFilter = 'Realizado';
                        typeTitle = `Agendamentos Realizados - ${labels[dataIndex]}`;
                    } else if (datasetIndex === 2) {
                        statusFilter = 'Não Realizado';
                        typeTitle = `Agendamentos Não Realizados - ${labels[dataIndex]}`;
                    } else if (datasetIndex === 3) {
                        statusFilter = 'Cancelado';
                        typeTitle = `Agendamentos Cancelados - ${labels[dataIndex]}`;
                    }
                    
                    // Mostrar modal com agendamentos da data
                    showAppointmentsByDateModal(date, statusFilter, typeTitle);
                }
            }
        }
    });
}

/**
 * END OF METRICS SCREEN CODE
 * 
 * This file contains all functions related to the Metrics screen.
 * To integrate this code back into the main system, copy these functions
 * into the main HTML file at the appropriate locations.
 * 
 * Dependencies:
 * - appointmentsData (global variable)
 * - attendantsData (global variable)
 * - userAccessLevel (global variable)
 * - showNotification() function
 * - fetchAttendants() function
 * - getNowGMT3() function
 * - setupMetricsExpandButtons() function
 * - populateEventSelects() function
 * - showAppointmentsByDateModal() function
 * - Chart.js library (loaded dynamically)
 */
