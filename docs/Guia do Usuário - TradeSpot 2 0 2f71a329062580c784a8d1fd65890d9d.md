# Guia do Usuário - TradeSpot 2.0

## Manual para Colaboradores

---

## Índice

1. [Introdução](about:blank#introdu%C3%A7%C3%A3o)
2. [Acesso ao Sistema](about:blank#acesso-ao-sistema)
3. [Navegação Principal](about:blank#navega%C3%A7%C3%A3o-principal)
4. [Meus Agendamentos](about:blank#meus-agendamentos)
5. [Criar Novo Agendamento](about:blank#criar-novo-agendamento)
6. [Editar Agendamento](about:blank#editar-agendamento)
7. [Filtros e Buscas](about:blank#filtros-e-buscas)
[Perguntas Frequentes](about:blank#perguntas-frequentes)

---

## 1. Introdução

Bem-vindo ao **TradeSpot 2.0**! Este sistema foi desenvolvido para facilitar o gerenciamento de agendamentos e o acompanhamento de leads. Como **Colaborador**, você tem acesso a funcionalidades essenciais para criar, visualizar e gerenciar seus próprios agendamentos.

### O que você pode fazer:

- Visualizar seus agendamentos
- Criar novos agendamentos
- Editar agendamentos existentes
- Consultar histórico de clientes
- Filtrar e buscar agendamentos
- Exportar dados para CSV

---

## 2. Acesso ao Sistema

### 2.1 Login

O TradeSpot utiliza autenticação via **Google**.

**Passos para fazer login:**

1. Acesse a página de login do sistema
2. Clique no botão **“Entrar com Google”**
3. Selecione sua conta Google corporativa
4. Aguarde o redirecionamento automático

**[ESPAÇO PARA PRINT: Tela de Login]**

> Nota: Certifique-se de usar o e-mail corporativo autorizado. Caso não consiga acessar, entre em contato com o administrador do sistema.
> 

---

## 3. Navegação Principal

Após o login, você verá a interface principal do sistema com uma barra lateral de navegação.

### 3.1 Menu Lateral

O menu lateral contém as seguintes opções:

- **Meus Agendamentos** - Visualize todos os seus agendamentos
- **Tema** - Alterne entre modo claro e escuro
- **Perfil** - Informações do seu usuário
- **Sair** - Fazer logout do sistema

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

A tela “Meus Agendamentos” exibe uma tabela com as seguintes informações:

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

| Tipo | Duração |
| --- | --- |
| **Ligação SDR** | 30 minutos |
| **Ligação Closer** | 1 hora |
| **Agendamento Pessoal** | 1 hora |
| **Reagendamento Closer** | 1 hora |
| **Upgrade** | 1 hora |
| **Fora da Agenda** | Variável |

**[ESPAÇO PARA PRINT: Exemplo de diferentes tipos de agendamento]**

### 4.3 Status de Agendamento

Os agendamentos podem ter os seguintes status, cada um com sua cor característica:

[Sem título](Sem%20t%C3%ADtulo%202f71a3290625814e8913e0f5055093c6.csv)

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

1. Na tela “Meus Agendamentos”, clique no botão **“+ Novo Agendamento”**
2. Um formulário será exibido na lateral direita da tela

**[ESPAÇO PARA PRINT: Botão Novo Agendamento]**

### 5.2 Preenchendo o Formulário

O formulário de agendamento contém os seguintes campos:

### 5.2.1 Informações do Cliente

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

### 5.2.2 Detalhes do Agendamento

**Campos obrigatórios:**

- **Data**
    - Selecione a data desejada no calendário
    - Não é possível agendar em datas passadas (exceto para tipo “Fora da Agenda”)
- **Horário**
    - Selecione o horário disponível
    - O sistema mostra apenas horários dentro do expediente do atendente
    - Respeita os intervalos, outros agendamentos e pausas configurados
- **Tipo de Agendamento**
    - Selecione o tipo apropriado conforme a situação
    - A duração é ajustada automaticamente
- **Atendente**
    - Varia com base no tipo de agendamento, outros atendentes podem estar disponíveis

**[ESPAÇO PARA PRINT: Seção Detalhes do Agendamento]**

### 5.2.3 Perfil do Estudante

Esta seção ajuda a qualificar o lead:

- **Nível de Interesse**
    - Alto / Mediano / Desconhecido
- **Nível de Conhecimento**
    - Iniciante / Intermediário / Avançado
- **Capacidade Financeira**
    - Moeda: BRL (Real), USD (Dólar), EUR (Euro) e KWZ (Kwanzas)
    - Valor: Digite o valor disponível

**[ESPAÇO PARA PRINT: Seção Perfil do Estudante]**

### 5.2.4 Informações Adicionais

**Campos opcionais:**

- **Evento**
    - Selecione o evento associado (se aplicável)
    - Apenas eventos do seu setor são exibidos
- **Link da Reunião**
    - São gerados automaticamente após a criação do agendamento
- **Informações Adicionais**
    - Campo livre para detalhes extras

**[ESPAÇO PARA PRINT: Seção Informações Adicionais]**

### 5.3 Histórico do Aluno (Ligações e Pipedrive)

Quando você preenche o telefone do cliente, o sistema automaticamente busca o histórico de ligações do aluno.

**Informações exibidas:**

- Data do agendamento
- Tipo de agendamento
- Status do agendamento

Quando você preenche o e-mail do cliente, o sistema automaticamente busca o histórico de compras no Pipedrive.

**Informações exibidas:**

- Nome do produto
- Data da compra
- Compra cancelada ou bloqueada (se aplicável)

**[ESPAÇO PARA PRINT: Histórico de Compras Pipedrive]**

### 5.4 Validações Automáticas

O sistema realiza diversas validações para garantir a qualidade dos dados:

### 5.4.1 Validação de Telefone

- Verifica se o número tem 11 dígitos
- Consulta se o cliente já existe no sistema
- Exibe histórico de agendamentos anteriores (se houver)

**[ESPAÇO PARA PRINT: Validação de Telefone - Cliente Existente]**

### 5.4.2 Validação de Horário

- **Horário mínimo de antecedência:**
    - Tipos “Ligação Closer”, “Agendamento Pessoal”, “Reagendamento Closer” e “Upgrade”: mínimo 10 minutos de antecedência
    - Tipo “Fora da Agenda”: pode ser agendado para qualquer horário, mas deve ser verificado com sua liderança se cabe o uso desse tipo de agendamento
- **Conflitos de agenda:**
    - O sistema verifica se o atendente já tem outro agendamento no mesmo horário
    - Verifica se o horário está dentro do expediente do atendente
    - Respeita os intervalos e pausas configurados

**[ESPAÇO PARA PRINT: Mensagem de Conflito de Horário]**

### 5.4.3 Validação de Campos

- **Nome:** Mínimo 2 caracteres, sem caracteres especiais perigosos
- **E-mail:** Formato válido de e-mail
- **Telefone:** Exatamente 11 dígitos numéricos
- **Valores financeiros:** Apenas números positivos

### 5.5 Salvando o Agendamento

Após preencher todos os campos obrigatórios:

1. Revise as informações
2. Clique no botão **“Salvar”**
3. Aguarde a confirmação
4. O agendamento aparecerá na lista

**[ESPAÇO PARA PRINT: Botão Salvar e Mensagem de Sucesso]**

> Importante: Se houver erros, o sistema exibirá mensagens específicas para cada campo. Corrija os erros e tente novamente.
> 

### 5.6 Limpando o Formulário

Para limpar todos os campos e começar um novo agendamento:

1. Clique no botão **“Limpar”** (ícone de borracha)
2. Todos os campos serão resetados
3. Você pode começar um novo agendamento do zero

**[ESPAÇO PARA PRINT: Botão Limpar]**

---

## 6. Editar Agendamento

### 6.1 Acessando a Edição

Para editar um agendamento existente:

1. Localize o agendamento na lista
2. Clique no botão **“Editar”** (ícone de lápis) na coluna “Ações”
3. O formulário será aberto com os dados preenchidos

**[ESPAÇO PARA PRINT: Botão Editar na Tabela]**

### 6.2 Campos Editáveis

Ao editar um agendamento, você pode modificar:

- Nome do Lead
- E-mail
- Data e Horário
- Tipo de Agendamento
- Status
- Perfil do Estudante
- Evento
- Link da Reunião
- Observações
- Informações Adicionais

> Atenção: O telefone não pode ser alterado após a criação do agendamento.
> 

**[ESPAÇO PARA PRINT: Formulário de Edição]**

### 6.3 Restrições de Edição de Status

**Para colaboradores do setor Closer:**

- Você pode alterar o status **apenas três vezes**
- Após a terceira alteração, o campo de status ficará bloqueado
- Esta regra garante a integridade dos dados e evita alterações indevidas

**[ESPAÇO PARA PRINT: Campo de Status Bloqueado]**

### 6.4 Salvando Alterações

Após fazer as modificações:

1. Revise as alterações
2. Clique em **“Salvar”**
3. O sistema validará as informações
4. Uma mensagem de confirmação será exibida

**[ESPAÇO PARA PRINT: Confirmação de Edição]**

---

## 7. Filtros e Buscas

A tela “Meus Agendamentos” oferece diversos filtros para facilitar a localização de agendamentos específicos.

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

1. Clique no campo **“Período”**
2. Selecione a **data inicial**
3. Selecione a **data final**
4. Os agendamentos serão filtrados automaticamente

**[ESPAÇO PARA PRINT: Filtro de Período]**

> Dica: Use este filtro para visualizar agendamentos de uma semana, mês ou período específico.
> 

### 7.3 Filtro por Tipo

Filtre agendamentos por tipo específico:

1. Clique no dropdown **“Tipo”**
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

1. Clique no dropdown **“Status”**
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

1. Clique no dropdown **“Evento”**
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

1. Clique no botão **“Limpar Filtros”**
2. Todos os filtros serão resetados
3. A lista completa de agendamentos será exibida

**[ESPAÇO PARA PRINT: Botão Limpar Filtros]**

---

## Perguntas Frequentes

**P: Posso agendar para um horário que já passou?**

R: Não, exceto para agendamentos do tipo “Fora da Agenda”. O sistema bloqueia agendamentos em horários passados para evitar erros.

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

**P: Os filtros são salvos quando saio do sistema?**

R: Não. Os filtros são resetados quando você faz logout ou fecha o navegador.

---

**P: Posso buscar por parte do nome do cliente?**

R: Sim! A busca é inteligente e encontra correspondências parciais. Por exemplo, buscar “João” encontrará “João Silva”, “Maria João”, etc.

---

**P: Por que o histórico de compras não aparece?**

R: O histórico de compras só é exibido se:
- O cliente tiver um e-mail cadastrado
- O e-mail existir no Pipedrive
- Houver compras registradas para esse e-mail

---

**P: As informações do Pipedrive são atualizadas em tempo real?**

R: Sim. Sempre que você abre o histórico ou preenche um e-mail, o sistema busca as informações mais recentes no Pipedrive

---

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

**P: Outros usuários podem ver meus agendamentos?**

R: Depende do nível de acesso:
- **Colaboradores** veem apenas seus próprios agendamentos
- **Líderes e Admins** têm acesso a todos os agendamentos

---