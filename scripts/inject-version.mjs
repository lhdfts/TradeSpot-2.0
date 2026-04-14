import { writeFileSync } from 'fs';
import { execSync } from 'child_process';

// Get the current git commit hash (short)
let version;
try {
    version = execSync('git rev-parse --short HEAD').toString().trim();
} catch {
    // Fallback to timestamp if git is unavailable
    version = Date.now().toString();
}

const content = JSON.stringify({ version }, null, 2);
writeFileSync('public/version.json', content);

console.log(`[version-inject] Build version set to: ${version}`);
