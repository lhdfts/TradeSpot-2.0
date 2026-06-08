-- ====================================================================
-- SCRIPT DE POLÍTICAS RLS SEGURAS - TRADESPOT 2.0
-- Este script revoga as permissões de desenvolvimento ("Enable all access for everyone")
-- e estabelece políticas de segurança rígidas em ambiente de produção.
-- ====================================================================

-- 1. Remover as políticas inseguras de desenvolvimento
DROP POLICY IF EXISTS "Enable all access for everyone" ON public.user;
DROP POLICY IF EXISTS "Enable all access for everyone" ON public.clients;
DROP POLICY IF EXISTS "Enable all access for everyone" ON public.appointments;
DROP POLICY IF EXISTS "Enable all access for everyone" ON public.events;

-- 2. Garantir que o RLS está habilitado em todas as tabelas
ALTER TABLE public.user ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

-- ====================================================================
-- 3. Definição de Políticas para TABELA: user
-- ====================================================================

-- Leitura: Usuários autenticados no sistema podem listar/ver outros atendentes (para ver escalas de horários)
CREATE POLICY "Permitir leitura de atendentes para usuários autenticados" 
ON public.user 
FOR SELECT 
TO authenticated 
USING (true);

-- Escrita (Inserção/Atualização): Apenas o próprio usuário autenticado pode alterar seu próprio perfil
CREATE POLICY "Permitir alteração apenas do próprio perfil" 
ON public.user 
FOR UPDATE 
TO authenticated 
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- ====================================================================
-- 4. Definição de Políticas para TABELA: clients
-- ====================================================================

-- Apenas usuários autenticados podem interagir (Visualizar, criar e editar clientes)
CREATE POLICY "Permitir leitura de clientes para autenticados" 
ON public.clients 
FOR SELECT 
TO authenticated 
USING (true);

CREATE POLICY "Permitir inserção de clientes para autenticados" 
ON public.clients 
FOR INSERT 
TO authenticated 
WITH CHECK (true);

CREATE POLICY "Permitir atualização de clientes para autenticados" 
ON public.clients 
FOR UPDATE 
TO authenticated 
USING (true)
WITH CHECK (true);

-- ====================================================================
-- 5. Definição de Políticas para TABELA: events
-- ====================================================================

-- Apenas usuários autenticados podem visualizar ou gerenciar eventos
CREATE POLICY "Permitir acesso completo a eventos para autenticados" 
ON public.events 
FOR ALL 
TO authenticated 
USING (true)
WITH CHECK (true);

-- ====================================================================
-- 6. Definição de Políticas para TABELA: appointments
-- ====================================================================

-- Apenas usuários autenticados podem visualizar, agendar ou alterar agendamentos
CREATE POLICY "Permitir leitura de agendamentos para autenticados" 
ON public.appointments 
FOR SELECT 
TO authenticated 
USING (true);

CREATE POLICY "Permitir inserção de agendamentos para autenticados" 
ON public.appointments 
FOR INSERT 
TO authenticated 
WITH CHECK (true);

CREATE POLICY "Permitir atualização de agendamentos para autenticados" 
ON public.appointments 
FOR UPDATE 
TO authenticated 
USING (true)
WITH CHECK (true);

-- ====================================================================
-- NOTA IMPORTANTE PARA INTEGRAÇÃO HYBRIDA (FIREBASE & SUPABASE):
-- Atualmente o frontend utiliza autenticação com Firebase e requisições diretas ao Supabase
-- via anon_key (que atua sob a role 'anon').
--
-- Recomendações para produção:
-- 1. Unificar o login usando Supabase Auth no frontend para que a role 'authenticated'
--    e a variável 'auth.uid()' sejam preenchidas nativamente em todas as requisições do browser.
-- 2. Ou canalizar todas as leituras e escritas do frontend através da API Express (Node.js),
--    onde o backend valida o Token do Firebase usando requireAuth e consulta o Supabase
--    usando a SERVICE_ROLE_KEY (que ignora as regras de RLS com segurança).
-- ====================================================================
