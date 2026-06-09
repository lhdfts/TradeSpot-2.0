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
    
    // In Express 5, req.query is a getter. We cannot mutate it directly using req.query[key] = ...
    // Therefore, we create a new sanitized object and replace the property if possible, 
    // or just leave it be if we only want to sanitize body. However, since we need to sanitize query:
    if (req.query && Object.keys(req.query).length > 0) {
        const sanitizedQuery: any = {};
        for (const key of Object.keys(req.query)) {
            sanitizedQuery[key] = sanitizeData(req.query[key]);
        }
        // Attempt to override the getter by redefining the property
        Object.defineProperty(req, 'query', {
            value: sanitizedQuery,
            writable: true,
            enumerable: true,
            configurable: true
        });
    }

    if (req.params && Object.keys(req.params).length > 0) {
        const sanitizedParams: any = {};
        for (const key of Object.keys(req.params)) {
            sanitizedParams[key] = sanitizeData(req.params[key]);
        }
        Object.defineProperty(req, 'params', {
            value: sanitizedParams,
            writable: true,
            enumerable: true,
            configurable: true
        });
    }
    
    next();
};
