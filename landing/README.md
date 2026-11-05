# Spot · landing page

Next.js 15 (App Router, exportação estática), Tailwind CSS 4, GSAP ScrollTrigger e Framer Motion.

```bash
npm install
npm run dev      # http://localhost:3000
npm run build    # gera out/, pronto para Vercel, Netlify ou qualquer hospedagem estática
```

## Onde editar

- `lib/data.ts`: preços (`PRICES`), links de pagamento (`PAYMENT_URLS`), link de demonstração (`DEMO_URL`), módulos, FAQ e a tarde de exemplo da seção "Como funciona".
- `app/globals.css`: paleta e utilitários de textura (`grain`, `grid-lines`).

Sem `DEMO_URL`, o botão "Agendar demonstração" não aparece. Sem link em `PAYMENT_URLS`, o checkout mostra um aviso.

Movimento reduzido: o pin das seções é desligado e os capítulos aparecem empilhados.
