/**
 * Normaliza uma data recebida do cliente para YYYY-MM-DD.
 * Aceita YYYY-MM-DD e, se allowBr = true, DD/MM/YYYY.
 * Retorna null se o formato for inválido ou se não for uma data real do calendário
 * (ex.: 31/02/2026). Assim o Postgres nunca recebe DD/MM (que ele lê como MDY) e
 * `new Date(`${date}T...`)` nunca vira NaN.
 */
export const normalizeDateInput = (raw: string, allowBr = true): string | null => {
    const val = raw.trim();
    let y: number, m: number, d: number;

    let match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(val);
    if (match) {
        [y, m, d] = [Number(match[1]), Number(match[2]), Number(match[3])];
    } else if (allowBr && (match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(val))) {
        [d, m, y] = [Number(match[1]), Number(match[2]), Number(match[3])];
    } else {
        return null;
    }

    if (y < 1900 || y > 2999 || m < 1 || m > 12 || d < 1) return null;
    const check = new Date(Date.UTC(y, m - 1, d));
    if (check.getUTCFullYear() !== y || check.getUTCMonth() !== m - 1 || check.getUTCDate() !== d) {
        return null;
    }

    return `${String(y).padStart(4, '0')}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
};
