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
    STRICT_TEXT: /[^a-zA-Z0-9\u00C0-\u00FF\s,()."']/g
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
