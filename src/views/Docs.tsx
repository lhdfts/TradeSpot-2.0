
import React, { useState } from 'react';
import { BookOpen, AlertCircle, Sun, Moon, Search } from 'lucide-react';
import { Button } from '../components/ui/button';
import { useTheme } from '../context/ThemeContext';
import { cn } from '../lib/utils';

const Docs: React.FC = () => {
    const { theme, toggleTheme } = useTheme();
    const [searchTerm, setSearchTerm] = useState('');

    const scrollToSection = (id: string) => {
        const element = document.getElementById(id);
        if (element) {
            element.scrollIntoView({ behavior: 'smooth' });
        }
    };

    return (
        <div className="min-h-screen bg-background text-foreground transition-colors duration-300 font-sans">
            {/* Header */}
            <header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
                <div className="container mx-auto px-4 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="bg-primary/10 p-2 rounded-lg">
                            <BookOpen className="text-primary" size={24} />
                        </div>
                        <h1 className="text-xl font-bold tracking-tight">TradeSpot Docs <span className="text-xs font-normal text-muted-foreground ml-2">v2.0</span></h1>
                    </div>
                    <div className="flex items-center gap-4">
                        <Button variant="ghost" size="icon" onClick={toggleTheme} className="rounded-full">
                            {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
                        </Button>
                    </div>
                </div>
            </header>

            <div className="container mx-auto px-4 py-8 grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-10">
                {/* Sidebar Navigation (Desktop) */}
                <aside className="hidden lg:block sticky top-24 h-[calc(100vh-8rem)] overflow-y-auto pr-4 scrollbar-thin">
                    <div className="space-y-6">
                        <div className="bg-muted/50 p-2 rounded-md mb-6">
                            <div className="relative">
                                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                <input
                                    type="text"
                                    placeholder="Buscar..."
                                    className="w-full bg-transparent border-none text-sm pl-9 placeholder:text-muted-foreground focus:outline-none"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                        </div>

                        <div>
                            <h3 className="text-sm font-semibold text-foreground/70 uppercase tracking-wider mb-3 px-2">Manual do Colaborador</h3>
                            <nav className="space-y-1">
                                <NavButton onClick={() => scrollToSection('intro')} label="1. Introdução" />
                                <NavButton onClick={() => scrollToSection('acesso')} label="2. Acesso ao Sistema" />
                                <NavButton onClick={() => scrollToSection('navegacao')} label="3. Navegação Principal" />
                                <NavButton onClick={() => scrollToSection('meus-agendamentos')} label="4. Meus Agendamentos" />
                                <NavButton onClick={() => scrollToSection('criar-agendamento')} label="5. Criar Novo Agendamento" />
                                <NavButton onClick={() => scrollToSection('editar-agendamento')} label="6. Editar Agendamento" />
                                <NavButton onClick={() => scrollToSection('filtros')} label="7. Filtros e Buscas" />
                                <NavButton onClick={() => scrollToSection('faq')} label="Perguntas Frequentes" />
                            </nav>
                        </div>
                    </div>
                </aside>

                {/* Main Content */}
                <main className="space-y-16 max-w-4xl pb-24">

                    {/* 1. Introdução */}
                    <section id="intro" className="scroll-mt-24 space-y-6">
                        <div className="border-b border-border pb-4">
                            <h2 className="text-3xl font-bold tracking-tight">1. Introdução</h2>
                        </div>
                        <div className="prose dark:prose-invert max-w-none text-muted-foreground">
                            <p className="leading-relaxed">
                                Bem-vindo ao <strong>TradeSpot 2.0</strong>! Este sistema foi desenvolvido para facilitar o gerenciamento de agendamentos e o acompanhamento de leads.
                                Como <strong>Colaborador</strong>, você tem acesso a funcionalidades essenciais para criar, visualizar e gerenciar seus próprios agendamentos.
                            </p>
                            <h3 className="text-xl font-semibold text-foreground mt-4 mb-2">O que você pode fazer:</h3>
                            <ul className="list-disc list-inside space-y-1 ml-2">
                                <li>Visualizar seus agendamentos</li>
                                <li>Criar novos agendamentos</li>
                                <li>Editar agendamentos existentes</li>
                                <li>Consultar histórico de clientes</li>
                                <li>Filtrar e buscar agendamentos</li>
                                <li>Exportar dados para CSV</li>
                            </ul>
                        </div>
                    </section>

                    {/* 2. Acesso ao Sistema */}
                    <section id="acesso" className="scroll-mt-24 space-y-6">
                        <div className="border-b border-border pb-4">
                            <h2 className="text-3xl font-bold tracking-tight">2. Acesso ao Sistema</h2>
                        </div>

                        <div className="space-y-6">
                            <div>
                                <h3 className="text-2xl font-semibold mb-3">2.1 Login</h3>
                                <p className="text-muted-foreground mb-4">O TradeSpot utiliza autenticação via <strong>Google</strong>.</p>

                                <strong className="block mb-2">Passos para fazer login:</strong>
                                <ol className="list-decimal list-inside space-y-2 ml-4 text-muted-foreground">
                                    <li>Acesse a página de login do sistema</li>
                                    <li>Clique no botão <strong>“Entrar com Google”</strong></li>
                                    <li>Selecione sua conta Google corporativa</li>
                                    <li>Aguarde o redirecionamento automático</li>
                                </ol>

                                <ImagePlaceholder label="Tela de Login" />

                                <div className="mt-4 p-4 bg-muted border-l-4 border-primary rounded-r-md">
                                    <p className="text-sm">
                                        <strong>Nota:</strong> Certifique-se de usar o e-mail corporativo autorizado. Caso não consiga acessar, entre em contato com o administrador do sistema.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* 3. Navegação Principal */}
                    <section id="navegacao" className="scroll-mt-24 space-y-6">
                        <div className="border-b border-border pb-4">
                            <h2 className="text-3xl font-bold tracking-tight">3. Navegação Principal</h2>
                        </div>

                        <div className="space-y-6 text-muted-foreground">
                            <p>Após o login, você verá a interface principal do sistema com uma barra lateral de navegação.</p>

                            <div>
                                <h3 className="text-2xl font-semibold text-foreground mb-3">3.1 Menu Lateral</h3>
                                <p className="mb-2">O menu lateral contém as seguintes opções:</p>
                                <ul className="list-disc list-inside space-y-1 ml-4 mb-4">
                                    <li><strong>Meus Agendamentos</strong> - Visualize todos os seus agendamentos</li>
                                    <li><strong>Tema</strong> - Alterne entre modo claro e escuro</li>
                                    <li><strong>Perfil</strong> - Informações do seu usuário</li>
                                    <li><strong>Sair</strong> - Fazer logout do sistema</li>
                                </ul>
                                <ImagePlaceholder label="Menu Lateral" height="h-32" />
                            </div>

                            <div>
                                <h3 className="text-2xl font-semibold text-foreground mb-3">3.2 Alternância de Tema</h3>
                                <p className="mb-2">O sistema oferece dois temas visuais:</p>
                                <ul className="list-disc list-inside space-y-1 ml-4 mb-4">
                                    <li><strong>Modo Claro</strong> - Ideal para ambientes bem iluminados</li>
                                    <li><strong>Modo Escuro</strong> - Reduz o cansaço visual em ambientes com pouca luz</li>
                                </ul>
                                <p>Para alternar entre os temas, clique no ícone de sol/lua no menu lateral.</p>
                                <ImagePlaceholder label="Comparação Modo Claro vs Modo Escuro" height="h-48" />
                            </div>
                        </div>
                    </section>

                    {/* 4. Meus Agendamentos */}
                    <section id="meus-agendamentos" className="scroll-mt-24 space-y-6">
                        <div className="border-b border-border pb-4">
                            <h2 className="text-3xl font-bold tracking-tight">4. Meus Agendamentos</h2>
                        </div>

                        <div className="space-y-8 text-muted-foreground">
                            <p>Esta é a tela principal onde você visualiza todos os seus agendamentos.</p>

                            <div>
                                <h3 className="text-2xl font-semibold text-foreground mb-3">4.1 Visão Geral</h3>
                                <p className="mb-2">A tela “Meus Agendamentos” exibe uma tabela com as seguintes informações:</p>
                                <ul className="grid sm:grid-cols-2 gap-x-4 gap-y-2 list-disc list-inside ml-4 mb-4">
                                    <li><strong>Lead</strong> - Nome do cliente</li>
                                    <li><strong>Telefone</strong> - Número de contato (clique para copiar)</li>
                                    <li><strong>E-mail</strong> - E-mail do cliente</li>
                                    <li><strong>Data</strong> - Data do agendamento</li>
                                    <li><strong>Horário</strong> - Hora do agendamento</li>
                                    <li><strong>Tipo</strong> - Tipo de agendamento</li>
                                    <li><strong>Status</strong> - Status atual do agendamento</li>
                                    <li><strong>Atendente</strong> - Nome do atendente responsável</li>
                                    <li><strong>Evento</strong> - Evento associado (se houver)</li>
                                    <li><strong>Ações</strong> - Botões para editar ou visualizar detalhes</li>
                                </ul>
                                <ImagePlaceholder label="Tela Meus Agendamentos - Visão Geral" />
                            </div>

                            <div>
                                <h3 className="text-2xl font-semibold text-foreground mb-3">4.2 Tipos de Agendamento</h3>
                                <p className="mb-4">O sistema suporta os seguintes tipos de agendamento:</p>
                                <div className="border border-border rounded-lg overflow-hidden">
                                    <table className="w-full text-sm">
                                        <thead className="bg-muted">
                                            <tr>
                                                <th className="px-4 py-2 text-left font-medium">Tipo</th>
                                                <th className="px-4 py-2 text-left font-medium">Duração</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-border bg-card">
                                            <tr className="bg-muted/30"><td className="px-4 py-2 font-medium">Ligação SDR</td><td className="px-4 py-2">30 minutos</td></tr>
                                            <tr><td className="px-4 py-2 font-medium">Ligação Closer</td><td className="px-4 py-2">1 hora</td></tr>
                                            <tr className="bg-muted/30"><td className="px-4 py-2 font-medium">Agendamento Pessoal</td><td className="px-4 py-2">1 hora</td></tr>
                                            <tr><td className="px-4 py-2 font-medium">Reagendamento Closer</td><td className="px-4 py-2">1 hora</td></tr>
                                            <tr className="bg-muted/30"><td className="px-4 py-2 font-medium">Upgrade</td><td className="px-4 py-2">1 hora</td></tr>
                                            <tr><td className="px-4 py-2 font-medium">Fora da Agenda</td><td className="px-4 py-2">Variável</td></tr>
                                        </tbody>
                                    </table>
                                </div>
                                <ImagePlaceholder label="Exemplo de diferentes tipos de agendamento" height="h-32" />
                            </div>

                            <div>
                                <h3 className="text-2xl font-semibold text-foreground mb-3">4.3 Status de Agendamento</h3>
                                <p className="mb-4">Os agendamentos podem ter os seguintes status, cada um com sua cor característica:</p>
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
                                    {['Pendente', 'Realizado', 'Cancelado', 'Reagendado', 'No-show', 'Esquecimento'].map(status => (
                                        <div key={status} className="flex items-center gap-2 bg-card p-2 rounded border border-border">
                                            <span className={cn("w-3 h-3 rounded-full shrink-0", getStatusColor(status))} />
                                            <span className="text-sm font-medium text-foreground">{status}</span>
                                        </div>
                                    ))}
                                </div>
                                <ImagePlaceholder label="Exemplos de status com cores" height="h-24" />
                            </div>

                            <div>
                                <h3 className="text-2xl font-semibold text-foreground mb-3">4.4 Copiar Telefone</h3>
                                <p className="mb-2">Para facilitar o contato com os clientes, você pode copiar o número de telefone com um clique:</p>
                                <ol className="list-decimal list-inside space-y-1 ml-4">
                                    <li>Localize o agendamento desejado</li>
                                    <li>Clique no número de telefone</li>
                                    <li>Uma mensagem de confirmação aparecerá</li>
                                    <li>O número estará copiado e pronto para colar</li>
                                </ol>
                                <ImagePlaceholder label="Ação de copiar telefone" height="h-24" />
                            </div>
                        </div>
                    </section>

                    {/* 5. Criar Novo Agendamento */}
                    <section id="criar-agendamento" className="scroll-mt-24 space-y-6">
                        <div className="border-b border-border pb-4">
                            <h2 className="text-3xl font-bold tracking-tight">5. Criar Novo Agendamento</h2>
                        </div>

                        <div className="space-y-8 text-muted-foreground">

                            {/* 5.1 Acessando */}
                            <div>
                                <h3 className="text-2xl font-semibold text-foreground mb-3">5.1 Acessando o Formulário</h3>
                                <p className="mb-2">Para criar um novo agendamento:</p>
                                <ol className="list-decimal list-inside space-y-1 ml-4">
                                    <li>Na tela “Meus Agendamentos”, clique no botão <strong>“+ Novo Agendamento”</strong></li>
                                    <li>Um formulário será exibido na lateral direita da tela</li>
                                </ol>
                                <ImagePlaceholder label="Botão Novo Agendamento" height="h-24" />
                            </div>

                            {/* 5.2 Preenchendo */}
                            <div>
                                <h3 className="text-2xl font-semibold text-foreground mb-3">5.2 Preenchendo o Formulário</h3>
                                <p>O formulário de agendamento contém os seguintes campos:</p>

                                <div className="mt-4 space-y-4">
                                    <div className="bg-card border border-border p-5 rounded-lg">
                                        <h4 className="text-lg font-semibold text-foreground mb-2">5.2.1 Informações do Cliente</h4>
                                        <strong className="text-sm text-foreground">Campos obrigatórios:</strong>
                                        <ul className="list-disc list-inside ml-4 mt-2 space-y-2 text-sm">
                                            <li><strong>Nome do Lead</strong> (mínimo 2 caracteres): Digite o nome completo.</li>
                                            <li><strong>Telefone</strong> (11 dígitos): Apenas números, sem espaços. Ex: 11987654321. O sistema verifica duplicações.</li>
                                            <li><strong>E-mail</strong> (opcional, mas recomendado): Para consulta de histórico Pipedrive.</li>
                                        </ul>
                                        <ImagePlaceholder label="Seção Informações do Cliente" height="h-40" />
                                    </div>

                                    <div className="bg-card border border-border p-5 rounded-lg">
                                        <h4 className="text-lg font-semibold text-foreground mb-2">5.2.2 Detalhes do Agendamento</h4>
                                        <strong className="text-sm text-foreground">Campos obrigatórios:</strong>
                                        <ul className="list-disc list-inside ml-4 mt-2 space-y-2 text-sm">
                                            <li><strong>Data</strong>: Selecione no calendário. Datas passadas bloqueadas (exceto "Fora da Agenda").</li>
                                            <li><strong>Horário</strong>: Apenas horários disponíveis dentro do expediente do atendente aparecem.</li>
                                            <li><strong>Tipo de Agendamento</strong>: Selecione conforme a situação; duração é automática.</li>
                                            <li><strong>Atendente</strong>: Varia com o tipo, mostra disponíveis.</li>
                                        </ul>
                                        <ImagePlaceholder label="Seção Detalhes do Agendamento" height="h-40" />
                                    </div>

                                    <div className="bg-card border border-border p-5 rounded-lg">
                                        <h4 className="text-lg font-semibold text-foreground mb-2">5.2.3 Perfil do Estudante</h4>
                                        <ul className="list-disc list-inside ml-4 mt-2 space-y-2 text-sm">
                                            <li><strong>Nível de Interesse</strong>: Alto / Mediano / Desconhecido</li>
                                            <li><strong>Nível de Conhecimento</strong>: Iniciante / Intermediário / Avançado</li>
                                            <li><strong>Capacidade Financeira</strong>: Moeda (BRL, USD, EUR, KWZ) e Valor disponível.</li>
                                        </ul>
                                        <ImagePlaceholder label="Seção Perfil do Estudante" height="h-32" />
                                    </div>

                                    <div className="bg-card border border-border p-5 rounded-lg">
                                        <h4 className="text-lg font-semibold text-foreground mb-2">5.2.4 Informações Adicionais</h4>
                                        <strong className="text-sm text-foreground">Campos opcionais:</strong>
                                        <ul className="list-disc list-inside ml-4 mt-2 space-y-2 text-sm">
                                            <li><strong>Evento</strong>: Selecione se aplicável (apenas eventos do seu setor).</li>
                                            <li><strong>Link da Reunião</strong>: Gerado automaticamente ou inserido.</li>
                                            <li><strong>Informações Adicionais</strong>: Campo livre para observações.</li>
                                        </ul>
                                        <ImagePlaceholder label="Seção Informações Adicionais" height="h-32" />
                                    </div>
                                </div>
                            </div>

                            {/* 5.3 Histórico */}
                            <div>
                                <h3 className="text-2xl font-semibold text-foreground mb-3">5.3 Histórico do Aluno (Ligações e Pipedrive)</h3>
                                <p className="mb-2">Quando você preenche o telefone do cliente, o sistema busca automaticamente o histórico de ligações. Quando preenche o e-mail, busca compras no Pipedrive.</p>
                                <ul className="list-disc list-inside ml-4 mb-4">
                                    <li><strong>Ligações:</strong> Data, Tipo, Status e Atendente.</li>
                                    <li><strong>Pipedrive:</strong> Produto, Data da Compra e Status (Cancelada/Bloqueada).</li>
                                </ul>
                                <ImagePlaceholder label="Histórico de Compras Pipedrive" height="h-40" />
                            </div>

                            {/* 5.4 Validações */}
                            <div>
                                <h3 className="text-2xl font-semibold text-foreground mb-3">5.4 Validações Automáticas</h3>

                                <div className="space-y-4">
                                    <div>
                                        <h4 className="text-lg font-semibold text-foreground">5.4.1 Validação de Telefone</h4>
                                        <ul className="list-disc list-inside text-sm">
                                            <li>Verifica dígitos (11)</li>
                                            <li>Consulta existência no sistema</li>
                                            <li>Exibe histórico</li>
                                        </ul>
                                        <ImagePlaceholder label="Validação de Telefone - Cliente Existente" height="h-24" />
                                    </div>

                                    <div>
                                        <h4 className="text-lg font-semibold text-foreground">5.4.2 Validação de Horário</h4>
                                        <ul className="list-disc list-inside text-sm">
                                            <li><strong>Mínimo antecedência:</strong> 10 minutos para tipos síncronos.</li>
                                            <li><strong>Conflitos:</strong> Verifica se atendente já tem agendamento ou se está em pausa/fora de expediente.</li>
                                        </ul>
                                        <ImagePlaceholder label="Mensagem de Conflito de Horário" height="h-24" />
                                    </div>

                                    <div>
                                        <h4 className="text-lg font-semibold text-foreground">5.4.3 Validação de Campos</h4>
                                        <ul className="list-disc list-inside text-sm">
                                            <li>Nome: Min 2 chars, sem caracteres perigosos.</li>
                                            <li>E-mail: Formato válido.</li>
                                            <li>Valores: Apenas positivos.</li>
                                        </ul>
                                    </div>
                                </div>
                            </div>

                            {/* 5.5 Salvando */}
                            <div>
                                <h3 className="text-2xl font-semibold text-foreground mb-3">5.5 Salvando o Agendamento</h3>
                                <ol className="list-decimal list-inside space-y-1 ml-4 mb-4">
                                    <li>Revise as informações</li>
                                    <li>Clique no botão <strong>“Salvar”</strong></li>
                                    <li>Aguarde a confirmação</li>
                                </ol>
                                <ImagePlaceholder label="Botão Salvar e Mensagem de Sucesso" height="h-24" />
                                <div className="bg-muted p-4 border-l-4 border-primary rounded-r-md text-sm mt-3">
                                    Importante: Se houver erros, o sistema exibirá mensagens específicas. Corrija e tente novamente.
                                </div>
                            </div>

                            {/* 5.6 Limpando */}
                            <div>
                                <h3 className="text-2xl font-semibold text-foreground mb-3">5.6 Limpando o Formulário</h3>
                                <p className="mb-2">Para resetar todos os campos, clique no botão <strong>“Limpar”</strong> (ícone de borracha).</p>
                                <ImagePlaceholder label="Botão Limpar" height="h-24" />
                            </div>
                        </div>
                    </section>

                    {/* 6. Editar Agendamento */}
                    <section id="editar-agendamento" className="scroll-mt-24 space-y-6">
                        <div className="border-b border-border pb-4">
                            <h2 className="text-3xl font-bold tracking-tight">6. Editar Agendamento</h2>
                        </div>

                        <div className="space-y-8 text-muted-foreground">
                            <div>
                                <h3 className="text-2xl font-semibold text-foreground mb-3">6.1 Acessando a Edição</h3>
                                <p className="mb-2">Localize o agendamento na lista e clique no botão <strong>“Editar”</strong> (ícone de lápis) na coluna “Ações”.</p>
                                <ImagePlaceholder label="Botão Editar na Tabela" height="h-24" />
                            </div>

                            <div>
                                <h3 className="text-2xl font-semibold text-foreground mb-3">6.2 Campos Editáveis</h3>
                                <p>Você pode modificar: Nome, E-mail, Data, Horário, Tipo, Status, Perfil, Evento, Link e Obs.</p>
                                <div className="mt-2 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 p-3 rounded text-sm text-yellow-800 dark:text-yellow-200">
                                    <AlertCircle className="inline mr-2 h-4 w-4" />
                                    Atenção: O telefone não pode ser alterado após a criação.
                                </div>
                                <ImagePlaceholder label="Formulário de Edição" height="h-64" />
                            </div>

                            <div>
                                <h3 className="text-2xl font-semibold text-foreground mb-3">6.3 Restrições de Edição de Status</h3>
                                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4 rounded-lg">
                                    <h4 className="font-semibold text-red-900 dark:text-red-300 mb-2">Para colaboradores do setor Closer:</h4>
                                    <ul className="list-disc list-inside text-sm text-red-800 dark:text-red-200 space-y-1">
                                        <li>Você pode alterar o status <strong>apenas três vezes</strong>.</li>
                                        <li>Após a terceira alteração, o campo de status ficará bloqueado.</li>
                                        <li>Esta regra garante a integridade dos dados.</li>
                                    </ul>
                                </div>
                                <ImagePlaceholder label="Campo de Status Bloqueado" height="h-24" />
                            </div>

                            <div>
                                <h3 className="text-2xl font-semibold text-foreground mb-3">6.4 Salvando Alterações</h3>
                                <p>Revise as alterações e clique em <strong>“Salvar”</strong>.</p>
                                <ImagePlaceholder label="Confirmação de Edição" height="h-24" />
                            </div>
                        </div>
                    </section>

                    {/* 7. Filtros e Buscas */}
                    <section id="filtros" className="scroll-mt-24 space-y-6">
                        <div className="border-b border-border pb-4">
                            <h2 className="text-3xl font-bold tracking-tight">7. Filtros e Buscas</h2>
                        </div>

                        <div className="space-y-8 text-muted-foreground">

                            <div>
                                <h3 className="text-2xl font-semibold text-foreground mb-3">7.1 Barra de Busca</h3>
                                <p className="mb-2">Pesquise por Nome do Lead, Telefone ou E-mail.</p>
                                <ol className="list-decimal list-inside space-y-1 ml-4 mb-2">
                                    <li>Digite o termo de busca</li>
                                    <li>Resultados filtram automaticamente</li>
                                    <li>Busca não diferencia maiúsculas/minúsculas</li>
                                </ol>
                                <ImagePlaceholder label="Barra de Busca em Uso" height="h-24" />
                            </div>

                            <div>
                                <h3 className="text-2xl font-semibold text-foreground mb-3">7.2 Filtro por Período</h3>
                                <p className="mb-2">Filtre por intervalo de datas (Data Inicial e Final).</p>
                                <ImagePlaceholder label="Filtro de Período" height="h-24" />
                            </div>

                            <div>
                                <h3 className="text-2xl font-semibold text-foreground mb-3">7.3 Filtro por Tipo</h3>
                                <p className="mb-2">Selecione um ou mais tipos (Ligação SDR, Closer, Upgrade, etc) no dropdown.</p>
                                <ImagePlaceholder label="Filtro por Tipo" height="h-32" />
                            </div>

                            <div>
                                <h3 className="text-2xl font-semibold text-foreground mb-3">7.4 Filtro por Status</h3>
                                <p className="mb-2">Selecione status específicos (Pendente, Realizado, No-show, etc).</p>
                                <ImagePlaceholder label="Filtro por Status" height="h-32" />
                            </div>

                            <div>
                                <h3 className="text-2xl font-semibold text-foreground mb-3">7.5 Filtro por Evento</h3>
                                <p className="mb-2">Selecione um evento específico para ver apenas agendamentos vinculados.</p>
                                <ImagePlaceholder label="Filtro por Evento" height="h-24" />
                            </div>

                            <div>
                                <h3 className="text-2xl font-semibold text-foreground mb-3">7.6 Combinando Filtros</h3>
                                <p className="mb-2">Exemplo: Período de Janeiro + Tipo 'Ligação Closer' + Status 'Realizado' para ver métricas específicas.</p>
                                <ImagePlaceholder label="Múltiplos Filtros Aplicados" height="h-32" />
                            </div>

                            <div>
                                <h3 className="text-2xl font-semibold text-foreground mb-3">7.7 Limpando Filtros</h3>
                                <p className="mb-2">Clique em <strong>“Limpar Filtros”</strong> para resetar e ver todos os agendamentos novamente.</p>
                                <ImagePlaceholder label="Botão Limpar Filtros" height="h-24" />
                            </div>
                        </div>
                    </section>

                    {/* FAQ */}
                    <section id="faq" className="scroll-mt-24 space-y-6">
                        <div className="border-b border-border pb-4">
                            <h2 className="text-3xl font-bold tracking-tight">Perguntas Frequentes</h2>
                        </div>
                        <div className="space-y-4">
                            <FaqItem question="Posso agendar para um horário que já passou?" answer="Não, exceto para agendamentos do tipo “Fora da Agenda”. O sistema bloqueia agendamentos em horários passados." />
                            <FaqItem question="Por que não consigo selecionar determinado horário?" answer="Pode estar fora do expediente, já ter agendamento, ser uma pausa, ou ser muito próximo (menos de 10 min)." />
                            <FaqItem question="Posso alterar o telefone de um agendamento?" answer="Não. O telefone é o identificador único. Cancele e crie um novo se precisar corrigir." />
                            <FaqItem question="Quantas vezes posso alterar o status de um agendamento?" answer="Closers: apenas 3 vezes. Outros setores: sem limite." />
                            <FaqItem question="Os filtros são salvos quando saio do sistema?" answer="Não, são resetados ao fazer logout." />
                            <FaqItem question="Posso buscar por parte do nome?" answer="Sim, a busca encontra correspondências parciais (ex: 'João' acha 'João Silva')." />
                            <FaqItem question="Por que o histórico de compras não aparece?" answer="Requer e-mail cadastrado que exista no Pipedrive e tenha compras." />
                            <FaqItem question="As informações do Pipedrive são atualizadas?" answer="Sim, tempo real ao abrir o histórico." />
                            <FaqItem question="O que fazer se o sistema não carregar?" answer="Atualize (F5), limpe cache, relogue, verifique internet." />
                            <FaqItem question="Recebi erro ao salvar. O que fazer?" answer="Verifique campos obrigatórios, formato do telefone/email e conflitos de horário." />
                            <FaqItem question="Posso usar no celular?" answer="Sim! O sistema é responsivo." />
                            <FaqItem question="Outros usuários podem ver meus agendamentos?" answer="Colaboradores veem apenas os seus. Líderes/Admins veem todos." />
                        </div>
                    </section>

                </main>
            </div>
        </div>
    );
};

// Sub-components
const NavButton = ({ onClick, label }: { onClick: () => void, label: string }) => (
    <button onClick={onClick} className="block w-full text-left px-3 py-2 text-sm rounded-md text-muted-foreground hover:text-foreground hover:bg-muted font-medium transition-colors">
        {label}
    </button>
);

const ImagePlaceholder = ({ label, height = "h-64" }: { label: string, height?: string }) => (
    <div className={`w-full ${height} bg-muted border-2 border-dashed border-muted-foreground/20 rounded-lg flex flex-col items-center justify-center text-muted-foreground gap-2 my-4`}>
        <div className="p-3 bg-background rounded-full">
            <Search size={20} />
        </div>
        <span className="text-sm font-medium">Imagem: {label}</span>
        <span className="text-xs opacity-70">Coloque o print aqui</span>
    </div>
);

const FaqItem = ({ question, answer }: { question: string, answer: string }) => (
    <div className="bg-card border border-border rounded-lg p-6">
        <h3 className="font-semibold text-foreground mb-2 flex items-start gap-2">
            <span className="text-primary mt-1">P:</span> <span>{question}</span>
        </h3>
        <p className="text-muted-foreground text-sm pl-6 border-l-2 border-muted">
            <span className="font-medium text-foreground">R:</span> {answer}
        </p>
    </div>
);

function getStatusColor(status: string) {
    switch (status) {
        case 'Cancelado': return 'bg-[#FF1744]';
        case 'Esquecimento': return 'bg-[#D500F9]';
        case 'No-show': return 'bg-[#FF9100]';
        case 'Pendente': return 'bg-[#B2B2B2]';
        case 'Realizado': return 'bg-[#00E676]';
        case 'Reagendado': return 'bg-[#2979FF]';
        default: return 'bg-gray-400';
    }
}

export default Docs;
