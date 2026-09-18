# Documentação de Segurança e RLS (Row Level Security) - Supabase TradeSpot

## Visão Geral
O banco de dados do TradeSpot hospedado no Supabase utiliza o recurso de **Row Level Security (RLS)** para garantir que os dados sejam acessados apenas por entidades autorizadas. O acesso público e irrestrito (frequentemente usado em desenvolvimento) foi removido e as tabelas estão protegidas. O acesso aos dados é rigidamente controlado através de políticas (Policies) do Postgres e pelo uso adequado das chaves de API (`publishable key` e `secret key`).

## Configuração Atual do RLS
O RLS está **habilitado** para as principais tabelas do sistema:
- `user` (Usuários / Atendentes)
- `clients` (Clientes)
- `appointments` (Agendamentos)
- `events` (Eventos)

### Regras e Políticas (Policies)
As políticas foram desenhadas para restringir o acesso direto. O funcionamento se divide em:

1. **Acesso pelo Backend (Segurança Máxima)**:
   A maior parte das interações sensíveis ocorre através da API (Node.js/Express) que utiliza a **Secret Key** (`SERVICE_ROLE_KEY`). Esta chave especial tem o poder de realizar um *bypass* (ignorar) nas políticas de RLS, garantindo que o backend possua acesso total aos dados após validar a autenticação do usuário.

2. **Acesso Restrito via Frontend**:
   Para chamadas feitas usando a **Publishable Key** (`anon_key`), as políticas exigem que a requisição possua um contexto autenticado. 
   - **Visualização**: Usuários podem visualizar escalas e dados de acordo com sua função.
   - **Edição Restrita**: Na tabela `user`, os usuários só podem alterar seu próprio perfil.
   - **Hierarquia (Líderes)**: Há regras específicas de RLS que permitem aos usuários com cargo de "Líder" ou "Co-Líder" visualizarem todos os agendamentos (`appointments`) criados pelos membros pertencentes ao seu respectivo setor.

---

## Integração com os Ecossistemas Trade
Além do próprio TradeSpot, o banco de dados é consumido por outros sistemas do ecossistema. Para manter a segurança e a segregação de responsabilidades, cada sistema acessa apenas o que é estritamente necessário. 

Todos os sistemas satélites fazem consultas utilizando o par de chaves **Publishable Key** e **Secret Key**, o que lhes permite acessar o banco com os privilégios necessários para as suas operações:

### TradeLens
- **Escopo de Acesso:** Tabelas `appointments` e `events`.
- **Contexto:** Realiza consultas voltadas para a agenda, visualizando agendamentos e o cronograma de eventos. Não consome dados detalhados de clientes ou perfil estendido de usuários.

### TradeScore e TradeStudio
- **Escopo de Acesso:** Apenas a tabela `user`.
- **Contexto:** Ambos os sistemas realizam consultas focadas unicamente nos dados dos colaboradores (atendentes, líderes, etc.). O TradeScore geralmente para tratar métricas/pontuações e o TradeStudio para dados de perfil e gestão, sem acesso ao banco de agendamentos ou clientes.

### TradeSync
- **Escopo de Acesso:** Todas as tabelas.
- **Contexto:** Atuando como o hub de sincronização e fluxo de dados do ecossistema, o TradeSync possui escopo global e faz consultas em todas as tabelas (`user`, `clients`, `appointments` e `events`) para garantir a integridade e atualização das informações entre plataformas.

> **⚠️ Atenção de Segurança:** Como os sistemas utilizam a **Secret Key** para fazer consultas, eles herdam a capacidade de ignorar as limitações do RLS (bypassing RLS). Por isso, essas integrações ocorrem estritamente em ambientes controlados de servidor (backend/serverless), onde a Secret Key não fica exposta ao cliente/navegador.
