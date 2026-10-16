# Vinheta de abertura do TradeCrew

Animação de cerca de 5 segundos que toca depois do login. O "tradestars"
aparece, o "stars" sai e o "Crew" entra no lugar, e a estrela salta até o "C".
Depois a palavra se recolhe na estrela e a câmera mergulha nela. O som é gerado
na hora com Web Audio, sem nenhum arquivo de áudio.

Tudo vem da branch `introducao` do repositório `otaviogasque/TradeCrew`.

## O que tem aqui

| Arquivo | O que é |
|---|---|
| `src/componentes/Abertura.jsx` | A vinheta. Componente React, animado com a Web Animations API |
| `src/componentes/somAbertura.js` | O som e a tabela `TEMPOS`, que comanda o tempo do som e da animação |
| `src/componentes/preferenciaAbertura.js` | Liga e desliga a vinheta. A escolha fica no `localStorage` |
| `src/telas/PreviaAbertura.jsx` + `app/abertura/page.jsx` | Página `/abertura`, para assistir à vinheta sem fazer login |
| `introducao.patch` | Todas as mudanças da branch em relação ao `main`, incluindo Login e Configurações |

## Como integrar

**Se o projeto é o TradeCrew**, aplique o patch na raiz do repositório:

```
git apply introducao.patch
```

**Se for outro projeto**, copie os arquivos de `src/` e `app/` e ligue a
vinheta na tela de login:

```jsx
import Abertura from '@/src/componentes/Abertura'
import { prepararSomAbertura } from '@/src/componentes/somAbertura'
import { aberturaLigada } from '@/src/componentes/preferenciaAbertura'

const [abrindo, setAbrindo] = useState(false)
const som = useRef(null)

async function entrar() {
  // ANTES do primeiro await: o navegador só libera áudio dentro do clique.
  if (aberturaLigada()) som.current ??= prepararSomAbertura()
  // ... autenticação ...
  if (aberturaLigada()) setAbrindo(true)
  else irParaOSistema()
}

// no JSX:
{abrindo && <Abertura som={som.current} aoTerminar={irParaOSistema} />}
```

O botão de configuração é o componente `Toggle` da aba Aparência, ligado a
`aberturaLigada()` e `salvarAberturaLigada()`. Veja no patch, em
`src/telas/Configuracoes.jsx`.

## Bom saber

- **Pular**: espaço ou Esc. O aviso no pé da tela também é clicável, para quem
  está no celular.
- **Menos movimento**: quem ativou "reduzir movimento" no sistema operacional
  não vê a vinheta e entra direto.
- **Som**: o `AudioContext` precisa ser criado dentro do clique. Se for criado
  depois de um `await`, o navegador deixa a vinheta muda.
- **Ajustar o ritmo**: mude `TEMPOS` em `somAbertura.js`. Animação e som leem a
  mesma tabela, então andam juntos.
- **Estilo**: usa as classes Tailwind do design system do TradeCrew
  (`bg-dark-900`, `text-text-on-dark`, `bg-text-on-dark`, `text-caption`). Em
  outro projeto, troque por cores equivalentes.
