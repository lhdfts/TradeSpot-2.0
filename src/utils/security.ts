export const SECURITY_PATTERNS = {
    // Only digits
    DIGITS_ONLY: /\D/g,

    // Letters, accented characters (Brazilian Portuguese), and spaces
    NAME: /[^a-zA-Z\u00C0-\u00FF\s]/g,

    // Alphanumeric + standard email symbols
    EMAIL: /[^a-zA-Z0-9-_.@]/g,

    // Letters, accents, spaces, and basic punctuation for text areas.
    // Explicitly excludes < > ; -- to prevent HTML/XSS/SQL injection vectors.
    TEXT_SAFE: /[^a-zA-Z\u00C0-\u00FF0-9\s,()."'-]/g,

    // Safe characters for search (Alphanumeric, accents, spaces, hyphens)
    SEARCH_SAFE: /[^a-zA-Z0-9\u00C0-\u00FF\s-]/g,

    // Strict text (No numbers, specific punctuation only) per user request for Additional Info
    STRICT_TEXT: /[^a-zA-Z0-9\u00C0-\u00FF\s,()."'\-:;!?]/g
};

export const sanitizeInput = {
    digits: (value: string) => value.replace(SECURITY_PATTERNS.DIGITS_ONLY, ''),

    name: (value: string) => value.replace(SECURITY_PATTERNS.NAME, '').replace(/\s\s+/g, ' '),

    email: (value: string) => value.replace(SECURITY_PATTERNS.EMAIL, ''),

    text: (value: string) => value.replace(SECURITY_PATTERNS.TEXT_SAFE, '').replace(/\s\s+/g, ' '),

    strictText: (value: string) => value.replace(SECURITY_PATTERNS.STRICT_TEXT, '').replace(/\s\s+/g, ' '),

    search: (value: string) => value.replace(SECURITY_PATTERNS.SEARCH_SAFE, '').replace(/\s\s+/g, ' '),

    currency: (value: string) => {
        const digits = value.replace(/\D/g, '');
        if (!digits) return '';
        const number = parseInt(digits, 10) / 100;
        return number.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }
};

export const canViewAllSectors = (user: { email?: string; sector?: string; id?: string; role?: string } | null | undefined) => {
    if (!user) return false;
    const globalRoles = ['Admin', 'Dev', 'TEI', 'Qualidade', 'Suporte'];
    return globalRoles.includes(user.role || '') || user.sector === 'TEI';
};

export const isMedinaUser = (user: { email?: string; id?: string } | null | undefined) => {
    if (!user) return false;
    return user.email === 'medina@tradestars.com.br' || user.id === '216557f7-03be-447c-ab6a-094460504da1';
};

export const getAllowedSectors = (user: { email?: string; sector?: string; id?: string; role?: string } | null | undefined) => {
    if (!user) return [];
    if (user.sector === 'Suporte') return ['Aldeia', 'Perpétuos', 'CEO', 'SDR', 'Tribo', 'Social Seller'];
    if (canViewAllSectors(user)) return ['Aldeia', 'Closer', 'Perpétuos', 'CEO', 'SDR', 'Tribo', 'Social Seller'];
    if (isMedinaUser(user)) return ['SDR', 'Aldeia', 'Tribo'];
    return user.sector ? [user.sector] : [];
};

// Mitigação VULN-009: Formula Injection (CSV)
export const escapeCsvValue = (value: any): string => {
    if (value === null || value === undefined) return '';
    let strValue = String(value);
    
    // Se começar com caracteres perigosos de fórmula (=, +, -, @), injeta aspas simples no início
    if (/^[=+\-@]/.test(strValue)) {
        strValue = "'" + strValue;
    }
    
    // Trata aspas duplas internas de acordo com padrão CSV (RFC 4180)
    if (strValue.includes('"')) {
        strValue = strValue.replace(/"/g, '""');
    }
    
    // Envolve em aspas duplas caso o valor tenha vírgulas, quebras de linha ou as próprias aspas recém-escapadas
    if (strValue.includes(',') || strValue.includes('\n') || strValue.includes('"')) {
        return `"${strValue}"`;
    }
    
    return strValue;
};
