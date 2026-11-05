// Ferramenta de geração da logo (rodar fora do projeto, com opentype.js e @fontsource/schibsted-grotesk instalados).
// Uso: node gerar-logo.cjs saida.json  → copie viewBox, células e contornos para components/Logo.tsx.
// Gera a logo 1 (grade + "sp●t") com espaçamento óptico igual entre todas as letras
// e caixa simétrica em torno do miolo das minúsculas.
const opentype = require('opentype.js'); const fs = require('fs'); const path = require('path');
const font = opentype.loadSync(path.join(__dirname, 'node_modules/@fontsource/schibsted-grotesk/files/schibsted-grotesk-latin-900-normal.woff'));
const SIZE = 41;            // proporção nome/símbolo igual à da primeira versão (26px de fonte para ~25,5px de grade)
const TRACK = -0.05;        // mesmo tracking da primeira versão: define o espaço entre s e p
const GAP_MARK = 16;        // espaço símbolo → nome
const scale = SIZE / font.unitsPerEm;
const glyph = (c) => font.charToGlyph(c);
const ink = (c) => glyph(c).getPath(0, 0, SIZE).getBoundingBox(); // relativo à origem/linha de base

// Símbolo: grade de 10 com passo 15, ponto azul na linha do meio à direita. Centro vertical y = 0.
const CY = 0;
const cells = [[0,0],[15,0],[30,0],[0,15],[15,15],[0,30],[15,30],[30,30]].map(([x,y]) => [x, y - 20 + CY]);
const markDot = { cx: 35.5, cy: CY, r: 7 };
const markRight = markDot.cx + markDot.r; // 42.5

// Linha de base: miolo do "o" (onde fica o ponto) alinhado ao centro do símbolo.
const o = ink('o'); const oMid = (o.y1 + o.y2) / 2; const baseline = CY - oMid;
const dotR = (o.y2 - o.y1) / 2; // ponto com a altura do "o", com a sobra óptica

// s: tinta começa em xStart
const s = ink('s'), p = ink('p'), t = ink('t');
const xS = markRight + GAP_MARK - s.x1;
// p: posição tipográfica normal com tracking (como na primeira versão)
const xP = xS + glyph('s').advanceWidth * scale + font.getKerningValue(glyph('s'), glyph('p')) * scale + TRACK * SIZE;
const G = (xP + p.x1) - (xS + s.x2); // espaço de tinta entre s e p: vira a regra para todos
const dotCx = xP + p.x2 + G + dotR;
const xT = dotCx + dotR + G - t.x1;
const right = xT + t.x2;

// Caixa simétrica em torno de CY (miolo), cobrindo símbolo, ascendente do t e perna do p.
const top = Math.min(-20, baseline + t.y1), bottom = Math.max(20, baseline + p.y2);
const half = Math.max(CY - top, bottom - CY);
const pad = 1;
const vb = { x: -pad, y: CY - half - pad, w: right + pad * 2, h: 2 * (half + pad) };

const sPath = glyph('s').getPath(xS, baseline, SIZE).toPathData(2);
const pPath = glyph('p').getPath(xP, baseline, SIZE).toPathData(2);
const tPath = glyph('t').getPath(xT, baseline, SIZE).toPathData(2);
const r2 = (n) => Math.round(n * 100) / 100;
const out = {
  viewBox: [vb.x, vb.y, vb.w, vb.h].map(r2).join(' '),
  cells, markDot, letters: sPath + pPath + tPath, wordDot: { cx: r2(dotCx), cy: CY, r: r2(dotR) },
  gaps: { s_p: r2(G), p_dot: r2((dotCx - dotR) - (xP + p.x2)), dot_t: r2((xT + t.x1) - (dotCx + dotR)) },
  gridHeightUnits: 40, totalHeightUnits: r2(vb.h),
};
fs.writeFileSync(process.argv[2], JSON.stringify(out, null, 1));
console.log('gaps', out.gaps, 'viewBox', out.viewBox);
