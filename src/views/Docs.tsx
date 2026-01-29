
import React from 'react';
import { BookOpen, FileText, Image as ImageIcon } from 'lucide-react';

const Docs: React.FC = () => {
    return (
        <div className="min-h-screen bg-background text-foreground font-sans">
            {/* Header */}
            <header className="border-b border-border bg-surface sticky top-0 z-50">
                <div className="container mx-auto px-4 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <BookOpen className="text-primary" size={24} />
                        <h1 className="text-xl font-bold tracking-tight">TradeSpot Docs</h1>
                    </div>
                </div>
            </header>

            <div className="container mx-auto px-4 py-8 grid grid-cols-1 md:grid-cols-[250px_1fr] gap-8">
                {/* Sidebar Navigation */}
                <aside className="hidden md:block sticky top-24 h-[calc(100vh-8rem)] overflow-y-auto pr-4">
                    <nav className="space-y-6">
                        <div>
                            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2">Introdução</h3>
                            <ul className="space-y-1">
                                <li>
                                    <a href="#visao-geral" className="block px-3 py-2 text-sm rounded-md hover:bg-muted/50 transition-colors text-foreground font-medium bg-muted/20">
                                        Visão Geral
                                    </a>
                                </li>
                                <li>
                                    <a href="#como-usar-imagens" className="block px-3 py-2 text-sm rounded-md hover:bg-muted/50 transition-colors text-muted-foreground">
                                        Como usar Imagens
                                    </a>
                                </li>
                            </ul>
                        </div>
                    </nav>
                </aside>

                {/* Main Content */}
                <main className="space-y-12 max-w-4xl">
                    <section id="visao-geral" className="space-y-4">
                        <div className="flex items-center gap-2 text-primary">
                            <FileText size={20} />
                            <h2 className="text-2xl font-bold">Visão Geral</h2>
                        </div>
                        <p className="text-muted-foreground leading-relaxed">
                            Bem-vindo à documentação oficial do sistema TradeSpot.
                            Aqui você encontrará guias, referências e padrões de desenvolvimento para manter a consistência e qualidade do projeto.
                        </p>
                        <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                            <h4 className="font-semibold text-blue-800 dark:text-blue-300 mb-1">Dica de Desenvolvimento</h4>
                            <p className="text-sm text-blue-700 dark:text-blue-400">
                                Esta página é renderizada a partir do componente <code>src/views/Docs.tsx</code>.
                                Você pode editá-la livremente para adicionar novas seções.
                            </p>
                        </div>
                    </section>

                    <section id="como-usar-imagens" className="space-y-4">
                        <div className="flex items-center gap-2 text-primary">
                            <ImageIcon size={20} />
                            <h2 className="text-2xl font-bold">Como usar Imagens</h2>
                        </div>
                        <p className="text-muted-foreground">
                            Para adicionar imagens à documentação, você tem duas opções principais:
                        </p>

                        <div className="grid gap-6 md:grid-cols-2">
                            <div className="border border-border rounded-xl p-6 hover:shadow-md transition-shadow">
                                <h3 className="font-semibold mb-3 flex items-center gap-2">
                                    <span className="w-6 h-6 rounded-full bg-green-100 text-green-700 flex items-center justify-center text-xs">1</span>
                                    Pasta Public
                                </h3>
                                <p className="text-sm text-muted-foreground mb-4">
                                    Coloque suas imagens em <code>public/docs/</code>. Elas serão servidas estaticamente.
                                </p>
                                <div className="bg-muted p-3 rounded-md text-xs font-mono">
                                    &lt;img src="/docs/exemplo.png" /&gt;
                                </div>
                            </div>

                            <div className="border border-border rounded-xl p-6 hover:shadow-md transition-shadow">
                                <h3 className="font-semibold mb-3 flex items-center gap-2">
                                    <span className="w-6 h-6 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center text-xs">2</span>
                                    Importação Direta
                                </h3>
                                <p className="text-sm text-muted-foreground mb-4">
                                    Importe a imagem diretamente no componente React. Melhor para assets que fazem parte do bundle.
                                </p>
                                <div className="bg-muted p-3 rounded-md text-xs font-mono">
                                    import img from '../assets/img.png';<br />
                                    &lt;img src={'{img}'} /&gt;
                                </div>
                            </div>
                        </div>
                    </section>
                </main>
            </div>
        </div>
    );
};

export default Docs;
