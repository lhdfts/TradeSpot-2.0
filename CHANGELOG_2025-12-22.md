# Registro de Alterações - 22/12/2025

Este documento resume as implementações, correções e melhorias realizadas no dia 22 de dezembro de 2025.

## 1. Autenticação e Login (Firebase + Supabase)
- **Criação da Página de Login**:
  - Implementada nova view `Login.tsx` com design centralizado e logo da TradeStars.
  - Adicionado botão "Entrar com Google".
- **Migração para Firebase Auth**:
  - Instalado SDK do Firebase.
  - Configurado `src/lib/firebase.ts` com as chaves de API.
  - Substituída a lógica de login para utilizar `signInWithPopup` do Firebase.
- **Contexto de Autenticação (`AuthContext`)**:
  - Refatorado para ouvir eventos do Firebase (`onAuthStateChanged`).
  - Implementada lógica híbrida: Autenticação via Firebase -> Busca de dados do usuário (Profile/Role/Sector) na tabela `user` do Supabase via email.
  - Adicionada sincronização opcional do `firebase_uid` para o banco de dados Supabase.
- **Variáveis de Ambiente**:
  - Atualização das chaves do Firebase no `.env` para o prefixo `VITE_` (necessário para o frontend).

## 2. Controle de Acesso e Permissões (RBAC)
- **Regras de Acesso por Página**:
  - **Métricas**: Acesso liberado para Admin, Líder, Co-Líder, Dev e Qualidade.
  - **Atendentes**: Acesso restrito a Admin, Líder e Dev.
  - **Eventos**: Acesso liberado para Admin, Líder, Co-Líder, Dev e Qualidade.
- **Papel 'Dev'**:
  - Garantido acesso irrestrito a todas as rotas e componentes do sistema para usuários com role 'Dev'.
- **Filtros de Visualização (Página Atendentes)**:
  - Usuários do setor **TEI** ou role **Dev** visualizam todos os atendentes.
  - Outros usuários visualizam apenas atendentes do **mesmo setor** (SDR vê SDR, Closer vê Closer).

## 3. Melhorias Visuais na Página de Métricas
- **Novo Gráfico (Recharts)**:
  - Substituição do gráfico SVG manual pela biblioteca `recharts`.
  - Implementação de gráfico de área empilhado ("Stacked Area Chart").
  - Visualização moderna com gradientes (Azul para Total, Verde para Realizados).
  - Adição de Tooltips interativos e eixos auto-ajustáveis.

## 4. Backend e Integrações (n8n & Google Meet)
- **Correção de Webhooks (n8n)**:
  - Ajuste no carregamento de variáveis de ambiente no servidor (`server.ts`).
  - Refatoração da configuração de webhooks para garantir leitura dinâmica das URLs.
- **Integração Google Meet**:
  - Criação do serviço `googleMeet.ts` para interação com a Google Calendar API.
  - Automatização da geração de links do Meet ao criar agendamentos (se necessário).
