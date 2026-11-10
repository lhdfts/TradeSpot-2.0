// Build do pacote do design system para o design-sync (cfg.buildCmd).
// Gera .design-sync/.cache/dist/ a partir do código real de src/:
//   types/  -> .d.ts pelo tsc do projeto (tsconfig.ds.json)
//   index.mjs -> ESM pelo esbuild do projeto (react externo)
//   styles.css -> Tailwind do projeto (tema + safelist) + CSS que os componentes importam
// Rodar da raiz do repositório: node .design-sync/build-ds.mjs
import { execSync } from 'node:child_process';
import { mkdirSync, readFileSync, rmSync, writeFileSync, existsSync } from 'node:fs';
import { build } from 'esbuild';

const OUT = '.design-sync/.cache/dist';
rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });
const run = (cmd) => execSync(cmd, { stdio: 'inherit' });

console.log('[ds] tipos (tsc)');
run('npx tsc -p .design-sync/tsconfig.ds.json');

console.log('[ds] javascript (esbuild)');
await build({
  entryPoints: ['.design-sync/ds/index.ts'],
  outfile: `${OUT}/index.mjs`,
  bundle: true,
  format: 'esm',
  jsx: 'automatic',
  target: 'es2020',
  tsconfig: 'tsconfig.app.json',
  // Só o código de src/ entra aqui; todas as dependências ficam externas e o conversor
  // do design-sync as empacota. Embutir dependências CommonJS com o React externo fazia
  // o bundle chamar require("react") em tempo de execução ("Dynamic require of react").
  packages: 'external',
  define: { 'import.meta.env.DEV': 'false', 'import.meta.env.PROD': 'true', 'import.meta.env.MODE': '"production"' },
  logLevel: 'warning',
});

console.log('[ds] css (tailwind)');
run(`npx tailwindcss -c .design-sync/tailwind.ds.config.js -i src/index.css -o ${OUT}/tailwind.css --minify`);
// CSS importado pelos próprios componentes (ex.: toast.css) sai do esbuild como index.css.
const componentCss = existsSync(`${OUT}/index.css`) ? readFileSync(`${OUT}/index.css`, 'utf8') : '';
writeFileSync(`${OUT}/styles.css`, readFileSync(`${OUT}/tailwind.css`, 'utf8') + '\n' + componentCss);

writeFileSync(`${OUT}/package.json`, JSON.stringify({
  name: '@tradespot/ui',
  version: JSON.parse(readFileSync('package.json', 'utf8')).version || '0.0.0',
  private: true,
  module: 'index.mjs',
  types: 'types/.design-sync/ds/index.d.ts',
}, null, 2));
console.log(`[ds] pronto em ${OUT}`);
