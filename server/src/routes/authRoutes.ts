import { Router, Request, Response } from 'express';
import { getFirebaseAuth } from '../config/firebase-admin.js';
import { isAllowedSignInProvider } from '../middleware/firebaseAuth.js';

const router = Router();

// POST /api/auth/sessionLogin
router.post('/sessionLogin', async (req: Request, res: Response) => {
    try {
        const idToken = req.body.idToken?.toString();
        if (!idToken) {
            return res.status(401).send('UNAUTHORIZED REQUEST');
        }

        // Set session expiration to 24 hours.
        const expiresIn = 60 * 60 * 24 * 1000;

        const auth = getFirebaseAuth();

        // Só aceita o provedor de login usado pelo front (SAML do Google Workspace).
        const decoded = await auth.verifyIdToken(idToken);
        if (!isAllowedSignInProvider(decoded)) {
            console.warn(`[AUTH] Login recusado: provedor não permitido (${decoded.firebase?.sign_in_provider}) para ${decoded.email || decoded.uid}`);
            return res.status(401).send('UNAUTHORIZED REQUEST');
        }

        // Create the session cookie. This will also verify the ID token in the process.
        // The session cookie will have the same claims as the ID token.
        const sessionCookie = await auth.createSessionCookie(idToken, { expiresIn });

        // Set cookie policy for session cookie.
        const options = {
            maxAge: expiresIn,
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax' as const,
        };

        res.cookie('session', sessionCookie, options);
        res.json({ status: 'success' });
    } catch (error) {
        console.error('Session login error:', error);
        res.status(401).send('UNAUTHORIZED REQUEST');
    }
});

// POST /api/auth/sessionLogout
router.post('/sessionLogout', async (req: Request, res: Response) => {
    // Revoga as sessões do usuário no Firebase quando o cookie é válido.
    // Qualquer falha aqui não impede o logout.
    const sessionCookie = req.cookies?.session;
    if (sessionCookie) {
        try {
            const auth = getFirebaseAuth();
            const decoded = await auth.verifySessionCookie(sessionCookie);
            await auth.revokeRefreshTokens(decoded.sub);
        } catch (err: any) {
            console.warn('[AUTH] Não foi possível revogar a sessão no logout:', err?.message);
        }
    }
    res.clearCookie('session');
    res.json({ status: 'success' });
});

export default router;
