import { Request, Response, NextFunction } from 'express';

/**
 * Recursively sanitizes string inputs to prevent HTML injection and XSS.
 * It strips standard HTML tags and escapes '<' and '>' characters.
 */
export const sanitizeData = (data: any): any => {
    if (typeof data === 'string') {
        // Remove standard HTML tags: <tagName ...> or </tagName>
        let clean = data.replace(/<[^>]*>/g, '');
        // Escape remaining angle brackets to neutralize malicious HTML
        clean = clean
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
        return clean;
    }
    if (Array.isArray(data)) {
        return data.map(item => sanitizeData(item));
    }
    if (typeof data === 'object' && data !== null) {
        const sanitized: any = {};
        for (const key of Object.keys(data)) {
            sanitized[key] = sanitizeData(data[key]);
        }
        return sanitized;
    }
    return data;
};

/**
 * Express middleware to sanitize body, query parameters, and route parameters.
 */
export const sanitizeMiddleware = (req: Request, res: Response, next: NextFunction) => {
    if (req.body) {
        req.body = sanitizeData(req.body);
    }
    if (req.query) {
        for (const key of Object.keys(req.query)) {
            req.query[key] = sanitizeData(req.query[key]);
        }
    }
    if (req.params) {
        for (const key of Object.keys(req.params)) {
            req.params[key] = sanitizeData(req.params[key]);
        }
    }
    next();
};
