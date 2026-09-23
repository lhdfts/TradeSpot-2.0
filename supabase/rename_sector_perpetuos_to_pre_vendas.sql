-- Renomeia o setor "Perpétuos" para "Pré-vendas".
--
-- Rodar SOMENTE depois que o deploy com src/constants/sectors.ts e
-- server/src/constants/sectors.ts estiver no ar: esse código aceita os dois
-- nomes, então o sistema continua funcionando durante e depois da troca.
--
-- Efeito esperado: usuários desse setor que estiverem logados serão
-- desconectados uma vez na próxima navegação (a assinatura de integridade da
-- sessão inclui o setor). Cada um gera uma linha "[SECURITY] Role integrity
-- check FAILED" nos logs da Vercel — é esperado, não é tentativa de ataque.

begin;

update public."user"
   set sector = 'Pré-vendas'
 where sector = 'Perpétuos';

update public.events
   set sector = 'Pré-vendas'
 where sector = 'Perpétuos';

update public.unnichat_connections
   set sector = 'Pré-vendas'
 where sector = 'Perpétuos';

commit;

-- Conferência: as três contagens devem dar zero.
select 'user' as tabela, count(*) as restantes from public."user" where sector = 'Perpétuos'
union all
select 'events', count(*) from public.events where sector = 'Perpétuos'
union all
select 'unnichat_connections', count(*) from public.unnichat_connections where sector = 'Perpétuos';
