import { Router, Request, Response } from 'express';
import { adminAuth } from '../lib/firebase.js';

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

        // Create the session cookie. This will also verify the ID token in the process.
        // The session cookie will have the same claims as the ID token.
        const sessionCookie = await adminAuth.createSessionCookie(idToken, { expiresIn });

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
router.post('/sessionLogout', (req: Request, res: Response) => {
    res.clearCookie('session');
    res.json({ status: 'success' });
});

export default router;
