import rateLimit from 'express-rate-limit';
import type { Request } from 'express';

/**
 * Rate limiter for public endpoints (self-scheduling)
 * Prevents abuse of the public appointment creation endpoint
 */
export const publicRateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Increased to 100 requests per window
    message: {
        error: 'Muitas requisições. Por favor, aguarde alguns minutos antes de tentar novamente.'
    },
    standardHeaders: true, // Return rate limit info in headers
    legacyHeaders: false,
    keyGenerator: (req: Request): string => {
        // Use X-Forwarded-For for Vercel, fallback to IP
        return (req.headers['x-forwarded-for'] as string)?.split(',')[0] || req.ip || 'unknown';
    },
});

/**
 * Stricter rate limiter for appointment creation via public link
 * Prevents spam while allowing legitimate business usage
 */
export const strictPublicRateLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 6, // Limit each IP to 6 appointment creations per hour
    message: {
        error: 'Limite de agendamentos atingido para este período. Por favor, aguarde um momento ou tente de outro dispositivo.'
    },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req: Request): string => {
        return (req.headers['x-forwarded-for'] as string)?.split(',')[0] || req.ip || 'unknown';
    },
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
    keyGenerator: (req: Request): string => {
        return (req.headers['x-forwarded-for'] as string)?.split(',')[0] || req.ip || 'unknown';
    },
    skip: (req: Request): boolean => {
        // Skip rate limiting for health checks
        return req.path === '/api/health';
    }
});

/**
 * Extra strict rate limiter for sensitive operations (like imports, bulk actions)
 */
export const sensitiveOperationLimiter = rateLimit({
    windowMs: 5 * 60 * 1000, // 5 minutes
    max: 10, // Only 10 requests per 5 minutes
    message: {
        error: 'Limite de operações sensíveis atingido. Por favor, aguarde alguns minutos.'
    },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req: Request): string => {
        return (req.headers['x-forwarded-for'] as string)?.split(',')[0] || req.ip || 'unknown';
    },
});
