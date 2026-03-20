import rateLimit from 'express-rate-limit';
import type { Request } from 'express';

/**
 * Rate limiter for public endpoints (self-scheduling)
 * Prevents abuse of the public appointment creation endpoint
 */
export const publicRateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10, // Limit each IP to 10 requests per window
    message: {
        error: 'Muitas requisições. Por favor, aguarde alguns minutos antes de tentar novamente.'
    },
    standardHeaders: true, // Return rate limit info in headers
    legacyHeaders: false,
});

/**
 * Stricter rate limiter for appointment creation via public link
 * Only 2 appointments per hour per IP to prevent spam
 */
export const strictPublicRateLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 2, // Limit each IP to 2 appointment creations per hour
    message: {
        error: 'Limite de agendamentos atingido. Por favor, aguarde uma hora antes de tentar novamente.'
    },
    standardHeaders: true,
    legacyHeaders: false,
});

/**
 * General API rate limiter for authenticated endpoints
 * More generous limits for logged-in users
 */
export const apiRateLimiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 100, // 100 requests per minute for authenticated users
    message: {
        error: 'Muitas requisições. Por favor, aguarde um momento.'
    },
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req: Request): boolean => {
        // Skip rate limiting for health checks
        return req.path === '/api/health';
    }
});
