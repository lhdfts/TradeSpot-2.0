// O CSP do sistema (vercel.json) só aceita scripts do próprio domínio: script-src 'self',
// sem 'unsafe-inline'. A exportação do Next põe scripts de inicialização inline no HTML,
// que seriam bloqueados. Este passo move cada um para um .js em out/_inline/ e troca a tag
// por <script src>. Scripts síncronos externos rodam na mesma ordem, então nada muda.
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { BASE_PATH } from '../next.config.mjs';

const OUT = new URL('../out/', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
const INLINE_DIR = join(OUT, '_inline');
mkdirSync(INLINE_DIR, { recursive: true });

const htmlFiles = (dir) =>
  readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) return name === '_next' || name === '_inline' ? [] : htmlFiles(full);
    return name.endsWith('.html') ? [full] : [];
  });

let moved = 0;
for (const file of htmlFiles(OUT)) {
  const html = readFileSync(file, 'utf8');
  const out = html.replace(/<script\b([^>]*)>([\s\S]*?)<\/script>/g, (tag, attrs, code) => {
    if (/\bsrc\s*=/.test(attrs) || !code.trim()) return tag;
    const type = /\btype\s*=\s*["']?([^"'\s>]+)/.exec(attrs)?.[1];
    if (type && !/^(text|application)\/javascript$|^module$/.test(type)) return tag; // JSON etc.
    const name = createHash('sha256').update(code).digest('hex').slice(0, 16) + '.js';
    writeFileSync(join(INLINE_DIR, name), code);
    moved++;
    return `<script${attrs} src="${BASE_PATH}/_inline/${name}"></script>`;
  });
  if (/<script\b(?![^>]*\bsrc=)[^>]*>\s*\S/.test(out)) {
    console.error(`[inline-scripts] Sobrou script inline em ${relative(OUT, file)}`);
    process.exit(1);
  }
  writeFileSync(file, out);
}
console.log(`[inline-scripts] ${moved} scripts inline movidos para _inline/`);
