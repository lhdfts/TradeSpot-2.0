# Guia do Usuário - TradeSpot 2.0
## Manual para Colaboradores

---

## Índice

1. [Introdução](#introdução)
2. [Acesso ao Sistema](#acesso-ao-sistema)
3. [Navegação Principal](#navegação-principal)
4. [Meus Agendamentos](#meus-agendamentos)
5. [Criar Novo Agendamento](#criar-novo-agendamento)
6. [Editar Agendamento](#editar-agendamento)
7. [Filtros e Buscas](#filtros-e-buscas)
8. [Histórico do Cliente](#histórico-do-cliente)
9. [Exportar Dados](#exportar-dados)
10. [Perguntas Frequentes](#perguntas-frequentes)

---

## 1. Introdução

Bem-vindo ao **TradeSpot 2.0**! Este sistema foi desenvolvido para facilitar o gerenciamento de agendamentos e o acompanhamento de leads. Como **Colaborador**, você tem acesso a funcionalidades essenciais para criar, visualizar e gerenciar seus próprios agendamentos.

### O que você pode fazer:
- ✅ Visualizar seus agendamentos
- ✅ Criar novos agendamentos
- ✅ Editar agendamentos existentes
- ✅ Consultar histórico de clientes
- ✅ Filtrar e buscar agendamentos
- ✅ Exportar dados para CSV
- ✅ Alterar status de agendamentos (com restrições)

---

## 2. Acesso ao Sistema

### 2.1 Login

O TradeSpot utiliza autenticação via **Google**.

**Passos para fazer login:**

1. Acesse a página de login do sistema
2. Clique no botão **"Entrar com Google"**
3. Selecione sua conta Google corporativa
4. Aguarde o redirecionamento automático

**[ESPAÇO PARA PRINT: Tela de Login]**

> **Nota:** Certifique-se de usar o e-mail corporativo autorizado. Caso não consiga acessar, entre em contato com o administrador do sistema.

---

## 3. Navegação Principal

Após o login, você verá a interface principal do sistema com uma barra lateral de navegação.

### 3.1 Menu Lateral

O menu lateral contém as seguintes opções:

- **📅 Meus Agendamentos** - Visualize todos os seus agendamentos
- **🌙/☀️ Tema** - Alterne entre modo claro e escuro
- **👤 Perfil** - Informações do seu usuário
- **🚪 Sair** - Fazer logout do sistema

**[ESPAÇO PARA PRINT: Menu Lateral]**

### 3.2 Alternância de Tema

O sistema oferece dois temas visuais:

- **Modo Claro** - Ideal para ambientes bem iluminados
- **Modo Escuro** - Reduz o cansaço visual em ambientes com pouca luz

Para alternar entre os temas, clique no ícone de sol/lua no menu lateral.

**[ESPAÇO PARA PRINT: Comparação Modo Claro vs Modo Escuro]**

---

## 4. Meus Agendamentos

Esta é a tela principal onde você visualiza todos os seus agendamentos.

### 4.1 Visão Geral

A tela "Meus Agendamentos" exibe uma tabela com as seguintes informações:

- **Lead** - Nome do cliente
- **Telefone** - Número de contato (clique para copiar)
- **E-mail** - E-mail do cliente
- **Data** - Data do agendamento
- **Horário** - Hora do agendamento
- **Tipo** - Tipo de agendamento
- **Status** - Status atual do agendamento
- **Atendente** - Nome do atendente responsável
- **Evento** - Evento associado (se houver)
- **Ações** - Botões para editar ou visualizar detalhes

**[ESPAÇO PARA PRINT: Tela Meus Agendamentos - Visão Geral]**

### 4.2 Tipos de Agendamento

O sistema suporta os seguintes tipos de agendamento:

| Tipo | Duração | Descrição |
|------|---------|-----------|
| **Ligação SDR** | 30 minutos | Primeira abordagem com o lead |
| **Ligação Closer** | 1 hora | Ligação de fechamento |
| **Agendamento Pessoal** | 1 hora | Reunião presencial |
| **Reagendamento Closer** | 1 hora | Reagendamento de ligação closer |
| **Upgrade** | 1 hora | Atualização de produto/serviço |
| **Fora da Agenda** | Variável | Agendamento fora do horário padrão |

**[ESPAÇO PARA PRINT: Exemplo de diferentes tipos de agendamento]**

### 4.3 Status de Agendamento

Os agendamentos podem ter os seguintes status, cada um com sua cor característica:

| Status | Cor | Significado |
|--------|-----|-------------|
| **Pendente** | ![#B2B2B2](https://via.placeholder.com/15/B2B2B2/000000?text=+) Cinza | Agendamento aguardando realização |
| **Realizado** | ![#00E676](https://via.placeholder.com/15/00E676/000000?text=+) Verde | Agendamento concluído com sucesso |
| **Cancelado** | ![#FF1744](https://via.placeholder.com/15/FF1744/000000?text=+) Vermelho | Agendamento cancelado |
| **Reagendado** | ![#2979FF](https://via.placeholder.com/15/2979FF/000000?text=+) Azul | Agendamento remarcado |
| **No-show** | ![#FF9100](https://via.placeholder.com/15/FF9100/000000?text=+) Laranja | Cliente não compareceu |
| **Esquecimento** | ![#D500F9](https://via.placeholder.com/15/D500F9/000000?text=+) Roxo | Cliente esqueceu o agendamento |

**[ESPAÇO PARA PRINT: Exemplos de status com cores]**

### 4.4 Copiar Telefone

Para facilitar o contato com os clientes, você pode copiar o número de telefone com um clique:

1. Localize o agendamento desejado
2. Clique no número de telefone
3. Uma mensagem de confirmação aparecerá
4. O número estará copiado e pronto para colar

**[ESPAÇO PARA PRINT: Ação de copiar telefone]**

---

## 5. Criar Novo Agendamento

### 5.1 Acessando o Formulário

Para criar um novo agendamento:

1. Na tela "Meus Agendamentos", clique no botão **"+ Novo Agendamento"**
2. Um formulário será exibido na lateral direita da tela

**[ESPAÇO PARA PRINT: Botão Novo Agendamento]**

### 5.2 Preenchendo o Formulário

O formulário de agendamento contém os seguintes campos:

#### 5.2.1 Informações do Cliente

**Campos obrigatórios:**

- **Nome do Lead** (mínimo 2 caracteres)
  - Digite o nome completo do cliente
  
- **Telefone** (formato: 11 dígitos)
  - Digite apenas números, sem espaços ou caracteres especiais
  - Exemplo: 11987654321
  - O sistema verifica automaticamente se o cliente já existe
  
- **E-mail** (opcional, mas recomendado)
  - Digite um e-mail válido
  - Usado para consultar histórico de compras

**[ESPAÇO PARA PRINT: Seção Informações do Cliente]**

#### 5.2.2 Detalhes do Agendamento

**Campos obrigatórios:**

- **Data**
  - Selecione a data desejada no calendário
  - Não é possível agendar em datas passadas (exceto para tipo "Fora da Agenda")
  
- **Horário**
  - Selecione o horário disponível
  - O sistema mostra apenas horários dentro do expediente do atendente
  - Respeita os intervalos e pausas configurados
  
- **Tipo de Agendamento**
  - Selecione o tipo apropriado conforme a situação
  - A duração é ajustada automaticamente
  
- **Atendente**
  - Por padrão, você será o atendente
  - Dependendo do tipo de agendamento, outros atendentes podem estar disponíveis

**[ESPAÇO PARA PRINT: Seção Detalhes do Agendamento]**

#### 5.2.3 Perfil do Estudante

Esta seção ajuda a qualificar o lead:

- **Nível de Interesse**
  - Alto / Mediano / Desconhecido
  
- **Nível de Conhecimento**
  - Iniciante / Intermediário / Avançado
  
- **Capacidade Financeira**
  - Moeda: BRL (Real) ou USD (Dólar)
  - Valor: Digite o valor disponível para investimento

**[ESPAÇO PARA PRINT: Seção Perfil do Estudante]**

#### 5.2.4 Informações Adicionais

**Campos opcionais:**

- **Evento**
  - Selecione o evento associado (se aplicável)
  - Apenas eventos do seu setor são exibidos
  
- **Link da Reunião**
  - Cole o link do Google Meet, Zoom, etc.
  
- **Observações**
  - Adicione notas importantes sobre o agendamento
  
- **Informações Adicionais**
  - Campo livre para detalhes extras

**[ESPAÇO PARA PRINT: Seção Informações Adicionais]**

### 5.3 Histórico de Compras (Pipedrive)

Quando você preenche o e-mail do cliente, o sistema automaticamente busca o histórico de compras no Pipedrive.

**Informações exibidas:**

- **Total de compras** realizadas
- **Valor total** investido
- **Detalhes de cada compra:**
  - Nome do produto
  - Valor
  - Data da compra
  - Status (Ganho/Perdido/Bloqueado)

**[ESPAÇO PARA PRINT: Histórico de Compras Pipedrive]**

> **Dica:** Use essas informações para personalizar sua abordagem com o cliente!

### 5.4 Validações Automáticas

O sistema realiza diversas validações para garantir a qualidade dos dados:

#### 5.4.1 Validação de Telefone

- Verifica se o número tem 11 dígitos
- Consulta se o cliente já existe no sistema
- Exibe histórico de agendamentos anteriores (se houver)

**[ESPAÇO PARA PRINT: Validação de Telefone - Cliente Existente]**

#### 5.4.2 Validação de Horário

- **Horário mínimo de antecedência:**
  - Tipos "Ligação Closer", "Agendamento Pessoal", "Reagendamento Closer" e "Upgrade": mínimo 10 minutos de antecedência
  - Tipo "Fora da Agenda": pode ser agendado para qualquer horário
  
- **Conflitos de agenda:**
  - O sistema verifica se o atendente já tem outro agendamento no mesmo horário
  - Verifica se o horário está dentro do expediente do atendente
  - Respeita os intervalos e pausas configurados

**[ESPAÇO PARA PRINT: Mensagem de Conflito de Horário]**

#### 5.4.3 Validação de Campos

- **Nome:** Mínimo 2 caracteres, sem caracteres especiais perigosos
- **E-mail:** Formato válido de e-mail
- **Telefone:** Exatamente 11 dígitos numéricos
- **Valores financeiros:** Apenas números positivos

### 5.5 Salvando o Agendamento

Após preencher todos os campos obrigatórios:

1. Revise as informações
2. Clique no botão **"Salvar"**
3. Aguarde a confirmação
4. O agendamento aparecerá na lista

**[ESPAÇO PARA PRINT: Botão Salvar e Mensagem de Sucesso]**

> **Importante:** Se houver erros, o sistema exibirá mensagens específicas para cada campo. Corrija os erros e tente novamente.

### 5.6 Limpando o Formulário

Para limpar todos os campos e começar um novo agendamento:

1. Clique no botão **"Limpar"** (ícone de borracha)
2. Todos os campos serão resetados
3. Você pode começar um novo agendamento do zero

**[ESPAÇO PARA PRINT: Botão Limpar]**

---

## 6. Editar Agendamento

### 6.1 Acessando a Edição

Para editar um agendamento existente:

1. Localize o agendamento na lista
2. Clique no botão **"Editar"** (ícone de lápis) na coluna "Ações"
3. O formulário será aberto com os dados preenchidos

**[ESPAÇO PARA PRINT: Botão Editar na Tabela]**

### 6.2 Campos Editáveis

Ao editar um agendamento, você pode modificar:

- ✅ Nome do Lead
- ✅ E-mail
- ✅ Data e Horário
- ✅ Tipo de Agendamento
- ✅ Status
- ✅ Perfil do Estudante
- ✅ Evento
- ✅ Link da Reunião
- ✅ Observações
- ✅ Informações Adicionais

> **Atenção:** O telefone **não pode ser alterado** após a criação do agendamento.

**[ESPAÇO PARA PRINT: Formulário de Edição]**

### 6.3 Restrições de Edição de Status

**Para colaboradores do setor Closer:**

- Você pode alterar o status **apenas uma vez**
- Após a primeira alteração, o campo de status ficará bloqueado
- Esta regra garante a integridade dos dados e evita alterações indevidas

**[ESPAÇO PARA PRINT: Campo de Status Bloqueado]**

### 6.4 Salvando Alterações

Após fazer as modificações:

1. Revise as alterações
2. Clique em **"Salvar"**
3. O sistema validará as informações
4. Uma mensagem de confirmação será exibida

**[ESPAÇO PARA PRINT: Confirmação de Edição]**

---

## 7. Filtros e Buscas

A tela "Meus Agendamentos" oferece diversos filtros para facilitar a localização de agendamentos específicos.

### 7.1 Barra de Busca

A barra de busca permite pesquisar por:

- Nome do Lead
- Telefone
- E-mail

**Como usar:**

1. Digite o termo de busca na barra
2. Os resultados são filtrados automaticamente
3. A busca é case-insensitive (não diferencia maiúsculas de minúsculas)

**[ESPAÇO PARA PRINT: Barra de Busca em Uso]**

### 7.2 Filtro por Período (Data Range)

Filtre agendamentos por intervalo de datas:

1. Clique no campo **"Período"**
2. Selecione a **data inicial**
3. Selecione a **data final**
4. Os agendamentos serão filtrados automaticamente

**[ESPAÇO PARA PRINT: Filtro de Período]**

> **Dica:** Use este filtro para visualizar agendamentos de uma semana, mês ou período específico.

### 7.3 Filtro por Tipo

Filtre agendamentos por tipo específico:

1. Clique no dropdown **"Tipo"**
2. Selecione um ou mais tipos de agendamento
3. Apenas agendamentos dos tipos selecionados serão exibidos

**Opções disponíveis:**
- Ligação SDR
- Ligação Closer
- Agendamento Pessoal
- Reagendamento Closer
- Upgrade
- Fora da Agenda

**[ESPAÇO PARA PRINT: Filtro por Tipo]**

### 7.4 Filtro por Status

Filtre agendamentos por status:

1. Clique no dropdown **"Status"**
2. Selecione um ou mais status
3. Apenas agendamentos com os status selecionados serão exibidos

**Opções disponíveis:**
- Pendente
- Realizado
- Cancelado
- Reagendado
- No-show
- Esquecimento

**[ESPAÇO PARA PRINT: Filtro por Status]**

### 7.5 Filtro por Evento

Filtre agendamentos por evento específico:

1. Clique no dropdown **"Evento"**
2. Selecione o evento desejado
3. Apenas agendamentos vinculados ao evento serão exibidos

**[ESPAÇO PARA PRINT: Filtro por Evento]**

### 7.6 Combinando Filtros

Você pode combinar múltiplos filtros simultaneamente para uma busca mais precisa:

**Exemplo:**
- Período: 01/01/2026 a 31/01/2026
- Tipo: Ligação Closer
- Status: Realizado

Isso mostrará apenas as ligações closer realizadas em janeiro de 2026.

**[ESPAÇO PARA PRINT: Múltiplos Filtros Aplicados]**

### 7.7 Limpando Filtros

Para remover todos os filtros e ver todos os agendamentos:

1. Clique no botão **"Limpar Filtros"**
2. Todos os filtros serão resetados
3. A lista completa de agendamentos será exibida

**[ESPAÇO PARA PRINT: Botão Limpar Filtros]**

---

## 8. Histórico do Cliente

O sistema oferece uma funcionalidade poderosa para visualizar o histórico completo de interações com cada cliente.

### 8.1 Acessando o Histórico

Para visualizar o histórico de um cliente:

1. Localize o agendamento do cliente
2. Clique no botão **"Ver Histórico"** (ícone de relógio)
3. Uma janela modal será aberta com todas as informações

**[ESPAÇO PARA PRINT: Botão Ver Histórico]**

### 8.2 Informações Exibidas

O histórico do cliente mostra:

#### 8.2.1 Dados do Cliente

- Nome completo
- Telefone
- E-mail
- Perfil do estudante (interesse, conhecimento, capacidade financeira)

**[ESPAÇO PARA PRINT: Dados do Cliente no Histórico]**

#### 8.2.2 Histórico de Agendamentos

Lista cronológica de todos os agendamentos do cliente, incluindo:

- Data e horário
- Tipo de agendamento
- Status
- Atendente responsável
- Evento associado
- Observações

**[ESPAÇO PARA PRINT: Lista de Agendamentos no Histórico]**

#### 8.2.3 Histórico de Compras (Pipedrive)

Se o cliente tiver e-mail cadastrado, o sistema exibe:

- Total de compras realizadas
- Valor total investido
- Detalhes de cada compra:
  - Produto/Serviço
  - Valor
  - Data
  - Status (com ícones visuais)

**Ícones de Status:**
- ✅ **Ganho** - Compra realizada com sucesso
- ❌ **Perdido** - Negociação não concluída
- 🚫 **Bloqueado/Cancelado** - Deal bloqueado ou cancelado

**[ESPAÇO PARA PRINT: Histórico de Compras Pipedrive]**

### 8.3 Usando o Histórico

O histórico é uma ferramenta essencial para:

- **Contextualizar** a conversa com o cliente
- **Evitar** perguntas repetitivas
- **Identificar** padrões de comportamento
- **Personalizar** a abordagem
- **Verificar** investimentos anteriores

> **Dica Profissional:** Sempre consulte o histórico antes de entrar em contato com um cliente recorrente!

---

## 9. Exportar Dados

O sistema permite exportar seus agendamentos para análise externa.

### 9.1 Exportando para CSV

Para exportar seus agendamentos:

1. Aplique os filtros desejados (opcional)
2. Clique no botão **"Exportar CSV"** (ícone de download)
3. O arquivo será baixado automaticamente

**[ESPAÇO PARA PRINT: Botão Exportar CSV]**

### 9.2 Conteúdo do Arquivo CSV

O arquivo exportado contém as seguintes colunas:

- Lead (Nome)
- Telefone
- E-mail
- Data
- Horário
- Tipo
- Status
- Atendente
- Evento
- Criado por
- Observações
- Informações Adicionais

### 9.3 Nome do Arquivo

O arquivo é nomeado automaticamente com:

- Prefixo: "meus_agendamentos"
- Data e hora da exportação
- Extensão: .csv

**Exemplo:** `meus_agendamentos_2026-01-28_14-30.csv`

### 9.4 Usando o CSV

Você pode abrir o arquivo CSV em:

- **Microsoft Excel**
- **Google Sheets**
- **LibreOffice Calc**
- Qualquer editor de planilhas

> **Nota:** O arquivo respeita os filtros aplicados. Se você filtrou apenas agendamentos de janeiro, apenas esses serão exportados.

**[ESPAÇO PARA PRINT: Arquivo CSV Aberto no Excel]**

---

## 10. Perguntas Frequentes

### 10.1 Agendamentos

**P: Posso agendar para um horário que já passou?**

R: Não, exceto para agendamentos do tipo "Fora da Agenda". O sistema bloqueia agendamentos em horários passados para evitar erros.

---

**P: Por que não consigo selecionar determinado horário?**

R: Isso pode ocorrer por diversos motivos:
- O horário está fora do expediente do atendente
- Já existe outro agendamento nesse horário
- O horário coincide com uma pausa do atendente
- O horário é menor que 10 minutos de antecedência (para tipos que exigem)

---

**P: Posso alterar o telefone de um agendamento?**

R: Não. O telefone é usado como identificador único do cliente e não pode ser alterado após a criação. Se precisar corrigir, cancele o agendamento e crie um novo.

---

**P: Quantas vezes posso alterar o status de um agendamento?**

R: Se você é do setor Closer, pode alterar o status **apenas uma vez**. Para outros setores, não há essa restrição.

---

### 10.2 Filtros e Buscas

**P: Os filtros são salvos quando saio do sistema?**

R: Não. Os filtros são resetados quando você faz logout ou fecha o navegador.

---

**P: Posso buscar por parte do nome do cliente?**

R: Sim! A busca é inteligente e encontra correspondências parciais. Por exemplo, buscar "João" encontrará "João Silva", "Maria João", etc.

---

### 10.3 Histórico e Dados

**P: Por que o histórico de compras não aparece?**

R: O histórico de compras só é exibido se:
- O cliente tiver um e-mail cadastrado
- O e-mail existir no Pipedrive
- Houver compras registradas para esse e-mail

---

**P: As informações do Pipedrive são atualizadas em tempo real?**

R: Sim. Sempre que você abre o histórico ou preenche um e-mail, o sistema busca as informações mais recentes no Pipedrive.

---

### 10.4 Problemas Técnicos

**P: O que fazer se o sistema não carregar?**

R: Tente as seguintes soluções:
1. Atualize a página (F5)
2. Limpe o cache do navegador
3. Faça logout e login novamente
4. Verifique sua conexão com a internet
5. Se o problema persistir, contate o suporte

---

**P: Recebi uma mensagem de erro ao salvar. O que fazer?**

R: Leia atentamente a mensagem de erro. Ela geralmente indica:
- Campos obrigatórios não preenchidos
- Formato inválido (telefone, e-mail, etc.)
- Conflito de horário
- Problema de conexão

Corrija o problema indicado e tente novamente.

---

**P: Posso usar o sistema no celular?**

R: Sim! O sistema é responsivo e funciona em dispositivos móveis, mas a experiência é otimizada para desktop.

---

### 10.5 Segurança e Privacidade

**P: Meus dados estão seguros?**

R: Sim. O sistema utiliza:
- Autenticação via Google
- Criptografia de dados
- Validação de entrada para prevenir ataques
- Backup automático

---

**P: Outros usuários podem ver meus agendamentos?**

R: Depende do nível de acesso:
- **Colaboradores** veem apenas seus próprios agendamentos
- **Líderes e Admins** têm acesso a todos os agendamentos

---

## Suporte

Se você tiver dúvidas ou problemas não cobertos neste guia, entre em contato com:

- **Suporte Técnico:** [inserir e-mail/contato]
- **Administrador do Sistema:** [inserir e-mail/contato]

---

## Atualizações do Sistema

Este guia é referente à versão **2.0** do TradeSpot.

**Última atualização:** Janeiro de 2026

---

**Desenvolvido com ❤️ pela equipe TradeSpot**
