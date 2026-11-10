// Tailwind do design system: o tema é o do app (../tailwind.config.js), mais uma
// safelist das cores de token. O JIT só gera classes usadas em src/; sem isso o
// agente do Claude Design escreveria bg-card/text-muted-foreground etc. em telas
// novas e elas sairiam sem estilo quando o app nunca usou aquela combinação.
import base from '../tailwind.config.js';

const colors = [
  'background', 'foreground', 'surface', 'sidebar', 'border', 'input', 'ring',
  'primary', 'primary-foreground', 'secondary', 'secondary-foreground',
  'muted', 'muted-foreground', 'accent', 'accent-foreground',
  'card', 'card-foreground', 'popover', 'popover-foreground',
  'destructive', 'destructive-foreground', 'success', 'warning', 'danger',
  'status-realizado', 'status-pendente', 'status-cancelado', 'status-reagendado',
  'status-esquecimento', 'status-noshow', 'status-iniciando', 'status-total',
].join('|');

export default {
  ...base,
  // Caminhos relativos à raiz do repositório (o build roda de lá).
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}', './.design-sync/previews/**/*.tsx'],
  safelist: [
    // Só fundo/texto/borda, 3 opacidades e hover: o conjunto completo (todos os prefixos,
    // opacidades e variantes) passava de 1,8 MB de CSS. Sem 'dark:' - as cores de token
    // já trocam sozinhas com a classe .dark (variáveis em src/index.css).
    // Lista explícita: no Tailwind 3 os padrões (regex) não geram opacidades (/50)
    // nem a variante hover: de forma confiável - nomes por extenso sempre geram.
    ...colors.split('|').flatMap((c) => ['bg', 'text', 'border'].flatMap((p) =>
      ['', '/10', '/20', '/50'].flatMap((o) => [`${p}-${c}${o}`, `hover:${p}-${c}${o}`]))),
    { pattern: /^rounded(-(sm|md|lg|xl|2xl|full))?$/ },
    { pattern: /^shadow(-(lg|xl|2xl|none))?$/ },
    { pattern: /^font-(montserrat|normal|medium|semibold|bold)$/ },
  ],
};
