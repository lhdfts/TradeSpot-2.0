import { Request, Response, NextFunction } from 'express';
import { getFirebaseAuth } from '../config/firebase-admin.js';
import { supabase } from '../utils/supabaseClient.js';

/**
 * Safely extracts client IP address, handling string, string[], or undefined.
 */
const getClientIp = (req: Request): string => {
    const rawIp = req.headers['x-forwarded-for'];
    const ipString = Array.isArray(rawIp) ? rawIp[0] : rawIp;
    if (typeof ipString === 'string') {
        return ipString.split(',')[0].trim() || req.ip || 'unknown';
    }
    return req.ip || 'unknown';
};

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
    const sessionCookie = req.cookies.session || '';
    const ipAddress = getClientIp(req);
    const userAgent = req.headers['user-agent'] || 'unknown';

    if (!sessionCookie) {
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

    try {
        const auth = getFirebaseAuth();
        const decodedToken = await auth.verifySessionCookie(sessionCookie, true /** checkRevoked */);
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
        let { data: userData, error } = await supabase
            .from('user')
            .select('id, name, role, sector')
            .eq('email', email)
            .single();

        if (error || !userData) {
            // New logic: Auto-register user if they pass Firebase auth
            const defaultName = decodedToken.name || email.split('@')[0];

            logActivity({
                timestamp: new Date().toISOString(),
                userId: decodedToken.uid,
                userName: defaultName,
                userRole: 'Colaborador',
                userSector: 'Suporte',
                action: 'REGISTER_NEW_USER',
                resource: req.originalUrl,
                ipAddress,
                userAgent,
                success: true
            });

            // Insert new user into the database
            const { data: newUser, error: insertError } = await supabase
                .from('user')
                .insert({
                    email: email,
                    name: defaultName,
                    role: 'Colaborador', // Default role
                    sector: 'Suporte',       // Default sector
                    status: true         // Make sure they are active
                })
                .select('id, name, role, sector')
                .single();

            if (insertError || !newUser) {
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
                    errorMessage: 'Failed to create new user in system: ' + (insertError?.message || 'Unknown error')
                });
                return res.status(500).json({ error: 'Erro ao registrar novo usuário no sistema' });
            }

            userData = newUser;
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
        // Handle service unavailability specifically
        if (error.message === 'Firebase Admin not initialized.') {
            console.error('Authentication service unavailable:', error);
            return res.status(500).json({ error: 'Serviço de autenticação indiponível' });
        }

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
        const ipAddress = getClientIp(req);
        const userAgent = req.headers['user-agent'] || 'unknown';

        if (!req.user) {
            return res.status(401).json({ error: 'Não autenticado' });
        }

        // Dev role bypasses all permission checks
        if (req.user.role === 'Dev') {
            return next();
        }

        const normalizedAllowedRoles = allowedRoles.map(r => r.toLowerCase());
        const normalizedUserRole = req.user.role.toLowerCase();
        if (!normalizedAllowedRoles.includes(normalizedUserRole)) {
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

    const ipAddress = getClientIp(req);
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
