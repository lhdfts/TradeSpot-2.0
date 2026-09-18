# Documentação: Funcionamento dos Agendamentos CEO

## Visão Geral
Os agendamentos para eventos do CEO funcionam através de um sistema de autoagendamento público, onde o CEO define horários disponíveis e os usuários podem se cadastrar diretamente via um link público.

## Lado do CEO: Seleção de Horários Disponíveis

### 1. Configuração do Cronograma
- O CEO tem um campo `schedule` com `custom_dates`, que é um objeto onde cada data (formato YYYY-MM-DD) mapeia para uma lista de horários disponíveis (ex.: ["12:00", "13:00"]).
- Esses horários são definidos manualmente e representam slots específicos em que o CEO está disponível para reuniões pessoais.

### 2. Como Funciona a Disponibilidade
- Para eventos do setor "CEO", o sistema busca apenas atendentes do setor "CEO".
- Os horários disponíveis são extraídos diretamente do `custom_dates` do CEO para a data específica.
- Cada horário é verificado para conflitos com agendamentos existentes (status "Pendente" ou ativo).
- Se não houver conflito, o horário é marcado como disponível.

### 3. Tipo de Agendamento
- Para eventos CEO, o tipo padrão é "Agendamento Pessoal".

## Lado do Usuário: Preenchimento dos Campos e Criação do Agendamento

### 1. Acesso ao Formulário
- O usuário acessa um link público único (self_scheduling_link) associado ao evento CEO.
- O link redireciona para um formulário onde o usuário pode escolher data e horário disponíveis.

### 2. Campos do Formulário
- **Nome (Lead)**: Nome completo do usuário (validado para letras e sem espaços duplos).
- **Telefone**: Número de telefone (apenas números, mínimo 10 dígitos).
- **Email**: Endereço de email válido.
- **Data**: Data da reunião (formato YYYY-MM-DD ou DD/MM/YYYY).
- **Horário**: Seleção de horário disponível (apenas em intervalos de 15 minutos: 00, 15, 30, 45).

### 3. Processo de Criação
- **Validação de Entrada**: O sistema valida os dados usando esquemas Zod para garantir integridade.
- **Verificação de Antecedência**: O agendamento deve ter pelo menos 30 minutos de antecedência.
- **Regra de Um Agendamento Pendente**: O usuário não pode ter outro agendamento pendente com o mesmo telefone.
- **Atribuição do Atendente**: Para eventos CEO, o sistema atribui automaticamente o CEO como atendente (usando o ID do CEO).
- **Verificação de Conflito**: Double-check para evitar agendamentos simultâneos no mesmo horário.
- **Criação do Cliente**: Se não existir, um novo cliente é criado no banco de dados.
- **Geração do Meet Link**: Um link do Google Meet é criado automaticamente para a reunião.
- **Webhook**: Um webhook é disparado para notificar sistemas externos sobre o novo agendamento.

### 4. Confirmação
- Após criação, o usuário recebe uma mensagem de sucesso.
- O agendamento fica com status "Pendente" e é associado ao CEO.

## Considerações Técnicas
- O sistema usa o banco Supabase para armazenar usuários, eventos, agendamentos e clientes.
- A distribuição automática é feita pela função `findBestAttendant`, que agora respeita o setor CEO.
- Para CEO, não há distribuição por carga; é atribuído diretamente ao CEO disponível.
