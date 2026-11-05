// Compila a landing page (landing/, Next.js) e publica em dist/testedelpdasilva/,
// servida pela rota /testedelpdasilva (vercel.json). Roda depois do vite build,
// que limpa a dist/.
//
// Se a LP falhar, o deploy do sistema NÃO é interrompido: o build só avisa no log
// e a rota fica sem a página. Para tornar a falha bloqueante, use LANDING_STRICT=1.
import { execSync } from 'node:child_process';
import { cpSync, existsSync, rmSync } from 'node:fs';

const ROUTE = 'testedelpdasilva';
const strict = process.env.LANDING_STRICT === '1';
const run = (cmd) => execSync(cmd, { cwd: 'landing', stdio: 'inherit', env: { ...process.env, NEXT_TELEMETRY_DISABLED: '1' } });

try {
    if (!existsSync('landing/package.json')) throw new Error('pasta landing/ não encontrada');
    console.log('[landing] Instalando dependências...');
    run('npm ci --no-audit --no-fund');
    console.log('[landing] Gerando a página...');
    run('npm run build');
    rmSync(`dist/${ROUTE}`, { recursive: true, force: true });
    cpSync('landing/out', `dist/${ROUTE}`, { recursive: true });
    console.log(`[landing] Publicada em dist/${ROUTE}/`);
} catch (err) {
    console.warn(`\n[landing] AVISO: a LP não foi gerada (${err.message}). O sistema segue sem a rota /${ROUTE}.\n`);
    if (strict) process.exit(1);
}
