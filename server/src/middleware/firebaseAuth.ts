import { Request, Response, NextFunction } from 'express';
import { getFirebaseAuth } from '../config/firebase-admin.js';
import { createClient } from '@supabase/supabase-js';

// Supabase client for fetching user roles
const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl!, supabaseKey!);

// Extended request type with authenticated user info
export interface AuthenticatedRequest extends Request {
    user?: {
        uid: string;            // Firebase UID
        email: string;          // User email
        role: string;           // Role from database (Admin, Líder, Colaborador, etc.)
        sector: string;         // Sector from database
        id: string;             // Supabase user.id
        name: string;           // User name for logging
    };
}

// Activity log entry structure
interface ActivityLogEntry {
    timestamp: string;
    userId: string;
    userName: string;
    userRole: string;
    userSector: string;
    action: string;
    resource: string;
    resourceId?: string;
    ipAddress: string;
    userAgent: string;
    success: boolean;
    errorMessage?: string;
}

/**
 * Logs user activity to the console (can be extended to write to database)
 */
export const logActivity = (entry: ActivityLogEntry) => {
    const logLine = `[AUDIT] ${entry.timestamp} | ${entry.success ? 'SUCCESS' : 'FAILED'} | ` +
        `User: ${entry.userName} (${entry.userRole}/${entry.userSector}) | ` +
        `Action: ${entry.action} ${entry.resource}${entry.resourceId ? ` [${entry.resourceId}]` : ''} | ` +
        `IP: ${entry.ipAddress}`;

    if (entry.success) {
        console.log(logLine);
    } else {
        console.warn(logLine + ` | Error: ${entry.errorMessage}`);
    }

    // Future: Write to database table 'activity_logs'
    // await supabase.from('activity_logs').insert(entry);
};

/**
 * Middleware to verify Firebase ID token and attach user info to request
 * Fetches the REAL role from the database - cannot be faked by client
 */
export const verifyFirebaseToken = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
) => {
    const authHeader = req.headers.authorization;
    const ipAddress = (req.headers['x-forwarded-for'] as string)?.split(',')[0] || req.ip || 'unknown';
    const userAgent = req.headers['user-agent'] || 'unknown';

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        logActivity({
            timestamp: new Date().toISOString(),
            userId: 'anonymous',
            userName: 'Anonymous',
            userRole: 'none',
            userSector: 'none',
            action: req.method,
            resource: req.originalUrl,
            ipAddress,
            userAgent,
            success: false,
            errorMessage: 'Missing authorization token'
        });
        return res.status(401).json({ error: 'Token de autenticação não fornecido' });
    }

    const token = authHeader.split('Bearer ')[1];

    try {
        const auth = getFirebaseAuth();
        const decodedToken = await auth.verifyIdToken(token);
        const email = decodedToken.email;

        if (!email) {
            logActivity({
                timestamp: new Date().toISOString(),
                userId: decodedToken.uid,
                userName: 'Unknown',
                userRole: 'none',
                userSector: 'none',
                action: req.method,
                resource: req.originalUrl,
                ipAddress,
                userAgent,
                success: false,
                errorMessage: 'Token missing email claim'
            });
            return res.status(401).json({ error: 'Token inválido: email não encontrado' });
        }

        // Fetch REAL user data from database - this CANNOT be faked
        const { data: userData, error } = await supabase
            .from('user')
            .select('id, name, role, sector')
            .eq('email', email)
            .single();

        if (error || !userData) {
            logActivity({
                timestamp: new Date().toISOString(),
                userId: decodedToken.uid,
                userName: email,
                userRole: 'none',
                userSector: 'none',
                action: req.method,
                resource: req.originalUrl,
                ipAddress,
                userAgent,
                success: false,
                errorMessage: 'User not found in system'
            });
            return res.status(403).json({ error: 'Usuário não autorizado no sistema' });
        }

        // Attach verified user to request
        req.user = {
            uid: decodedToken.uid,
            email: email,
            role: userData.role,
            sector: userData.sector,
            id: userData.id,
            name: userData.name
        };

        // Log successful authentication (the actual action will be logged by route handlers)
        // We don't log here to avoid duplicate logs - routes will use logActivity

        next();
    } catch (error: any) {
        logActivity({
            timestamp: new Date().toISOString(),
            userId: 'invalid-token',
            userName: 'Invalid Token',
            userRole: 'none',
            userSector: 'none',
            action: req.method,
            resource: req.originalUrl,
            ipAddress,
            userAgent,
            success: false,
            errorMessage: error.message || 'Token verification failed'
        });
        console.error('Token verification failed:', error);
        return res.status(401).json({ error: 'Token inválido ou expirado' });
    }
};

/**
 * Middleware factory to require specific roles
 * Dev role always has full access
 */
export const requireRole = (...allowedRoles: string[]) => {
    return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
        const ipAddress = (req.headers['x-forwarded-for'] as string)?.split(',')[0] || req.ip || 'unknown';
        const userAgent = req.headers['user-agent'] || 'unknown';

        if (!req.user) {
            return res.status(401).json({ error: 'Não autenticado' });
        }

        // Dev role bypasses all permission checks
        if (req.user.role === 'Dev') {
            return next();
        }

        if (!allowedRoles.includes(req.user.role)) {
            logActivity({
                timestamp: new Date().toISOString(),
                userId: req.user.id,
                userName: req.user.name,
                userRole: req.user.role,
                userSector: req.user.sector,
                action: req.method,
                resource: req.originalUrl,
                ipAddress,
                userAgent,
                success: false,
                errorMessage: `Insufficient permissions. Required: ${allowedRoles.join(', ')}`
            });
            return res.status(403).json({ error: 'Acesso negado: permissão insuficiente' });
        }

        next();
    };
};

/**
 * Helper to log successful actions from route handlers
 */
export const logSuccessfulAction = (
    req: AuthenticatedRequest,
    action: string,
    resource: string,
    resourceId?: string
) => {
    if (!req.user) return;

    const ipAddress = (req.headers['x-forwarded-for'] as string)?.split(',')[0] || req.ip || 'unknown';
    const userAgent = req.headers['user-agent'] || 'unknown';

    logActivity({
        timestamp: new Date().toISOString(),
        userId: req.user.id,
        userName: req.user.name,
        userRole: req.user.role,
        userSector: req.user.sector,
        action,
        resource,
        resourceId,
        ipAddress,
        userAgent,
        success: true
    });
};
