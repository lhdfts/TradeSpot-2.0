-- MORE APPOINTMENT SEED DATA (5 examples based on CSV structure)

-- 1. Client & Appointment: Lucas Silva (AG-101)
INSERT INTO public.clients (id, name, phone, email, interest_level, knowledge_level, financial_currency, financial_amount)
VALUES ('77777777-7777-7777-7777-777777777701', 'Lucas Silva', '+5511911111111', 'lucas.s@client.com', 'Alto', 'Iniciante', 'BRL', '10000')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.appointments (
    id, client_id, attendant_id, event_id, date, time, type, status, meet_link, notes, additional_info, created_by, interest_level, knowledge_level, financial_currency, financial_amount
)
VALUES (
    'AG-101',
    '77777777-7777-7777-7777-777777777701', -- Client
    'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22', -- Attendant (Bob SDR)
    '11111111-1111-1111-1111-111111111111', -- Event (Active)
    CURRENT_DATE + 5,
    '10:00:00',
    'Ligação SDR',
    'Pendente',
    'meet.google.com/link-101',
    'Cliente muito interessado no curso básico.',
    'Prefere contato pela manhã.',
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', -- Created By (Admin)
    'Alto', 'Iniciante', 'BRL', '10000'
);

-- 2. Client & Appointment: Mariana Costa (AG-102)
INSERT INTO public.clients (id, name, phone, email, interest_level, knowledge_level, financial_currency, financial_amount)
VALUES ('77777777-7777-7777-7777-777777777702', 'Mariana Costa', '+5511922222222', 'mariana.c@client.com', 'Médio', 'Intermediário', 'USD', '5000')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.appointments (
    id, client_id, attendant_id, event_id, date, time, type, status, meet_link, notes, additional_info, created_by, interest_level, knowledge_level, financial_currency, financial_amount
)
VALUES (
    'AG-102',
    '77777777-7777-7777-7777-777777777702', -- Client
    'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33', -- Attendant (Charlie Closer)
    '11111111-1111-1111-1111-111111111111', -- Event (Active)
    CURRENT_DATE + 6,
    '14:30:00',
    'Ligação Closer',
    'Pendente',
    'meet.google.com/link-102',
    'Avaliar perfil para mentoria avançada.',
    NULL,
    'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22', -- Created By (Bob)
    'Médio', 'Intermediário', 'USD', '5000'
);

-- 3. Client & Appointment: Pedro Alves (AG-103)
INSERT INTO public.clients (id, name, phone, email, interest_level, knowledge_level, financial_currency, financial_amount)
VALUES ('77777777-7777-7777-7777-777777777703', 'Pedro Alves', '+5511933333333', 'pedro.a@client.com', 'Baixo', 'Avançado', 'EUR', '2000')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.appointments (
    id, client_id, attendant_id, event_id, date, time, type, status, meet_link, notes, additional_info, created_by, interest_level, knowledge_level, financial_currency, financial_amount
)
VALUES (
    'AG-103',
    '77777777-7777-7777-7777-777777777703', -- Client
    'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22', -- Attendant (Bob SDR)
    '22222222-2222-2222-2222-222222222222', -- Event (Archived)
    CURRENT_DATE - 5,
    '16:00:00',
    'Ligação SDR',
    'Realizado',
    NULL,
    'Reunião realizada, cliente em dúvida.',
    'Retomar contato em 15 dias.',
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', -- Created By (Admin)
    'Baixo', 'Avançado', 'EUR', '2000'
);

-- 4. Client & Appointment: Sofia Lima (AG-104)
INSERT INTO public.clients (id, name, phone, email, interest_level, knowledge_level, financial_currency, financial_amount)
VALUES ('77777777-7777-7777-7777-777777777704', 'Sofia Lima', '+5511944444444', 'sofia.l@client.com', 'Alto', 'Iniciante', 'BRL', '20000')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.appointments (
    id, client_id, attendant_id, event_id, date, time, type, status, meet_link, notes, additional_info, created_by, interest_level, knowledge_level, financial_currency, financial_amount
)
VALUES (
    'AG-104',
    '77777777-7777-7777-7777-777777777704', -- Client
    'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33', -- Attendant (Charlie Closer)
    '33333333-3333-3333-3333-333333333333', -- Event (Archived)
    CURRENT_DATE - 2,
    '09:00:00',
    'Ligação Closer',
    'Cancelado',
    NULL,
    'Cliente desmarcou em cima da hora.',
    NULL,
    'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22', -- Created By (Bob)
    'Alto', 'Iniciante', 'BRL', '20000'
);

-- 5. Client & Appointment: Tiago Souza (AG-105)
INSERT INTO public.clients (id, name, phone, email, interest_level, knowledge_level, financial_currency, financial_amount)
VALUES ('77777777-7777-7777-7777-777777777705', 'Tiago Souza', '+5511955555555', 'tiago.s@client.com', 'Médio', 'Intermediário', 'BRL', '5000')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.appointments (
    id, client_id, attendant_id, event_id, date, time, type, status, meet_link, notes, additional_info, created_by, interest_level, knowledge_level, financial_currency, financial_amount
)
VALUES (
    'AG-105',
    '77777777-7777-7777-7777-777777777705', -- Client
    'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22', -- Attendant (Bob SDR)
    NULL, -- No Event
    CURRENT_DATE + 1,
    '11:30:00',
    'Ligação SDR',
    'Pendente',
    'meet.google.com/link-105',
    'Primeiro contato.',
    NULL,
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', -- Created By (Admin)
    'Médio', 'Intermediário', 'BRL', '5000'
);
