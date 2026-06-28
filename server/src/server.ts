import './config/init.js';
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import path from 'path';
import { fileURLToPath } from 'url';

// Firebase Admin initialization (must be early)
import { initFirebaseAdmin } from './config/firebase-admin.js';
initFirebaseAdmin();

// Routes
import pipedriveRoutes from './routes/pipedriveRoutes.js';
import appointmentRoutes from './routes/appointmentRoutes.js';
import publicRoutes from './routes/publicRoutes.js';
import authRoutes from './routes/authRoutes.js';

// Middleware
import { verifyFirebaseToken, requireRole, AuthenticatedRequest } from './middleware/firebaseAuth.js';
import { apiRateLimiter, publicRateLimiter, strictPublicRateLimiter } from './middleware/rateLimiter.js';
import { sanitizeMiddleware } from './utils/sanitize.js';
import { generateRoleIntegrity, verifyRoleIntegrity } from './utils/integrity.js';

// ESM alternative for __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


const app = express();
app.disable('x-powered-by');

// Force port 3000 to match Vite proxy configuration and avoid .env conflicts
const PORT = 3000;

app.use(cors({
    origin: (origin, callback) => {
        // Allow requests with no origin (like mobile apps, curl requests)
        if (!origin) return callback(null, true);
        
        const allowedOrigins = [
            'http://localhost:5173', 
            'http://localhost:3000', 
            'http://127.0.0.1:5173', 
            'https://tradespot-ts.vercel.app'
        ];
        
        if (allowedOrigins.includes(origin)) {
            return callback(null, true);
        }
        
        // Allow Vercel preview deployments for this specific project
        if (/^https:\/\/tradespot[a-zA-Z0-9-]*\.vercel\.app$/.test(origin)) {
            return callback(null, true);
        }
        
        callback(new Error('CORS policy violation'), false);
    },
    credentials: true
}));
app.use(express.json());
app.use(cookieParser());
app.use((req, res, next) => {
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self' https://apis.google.com https://vercel.live; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https:; connect-src 'self' https://*.supabase.co https://*.supabase.in https://api.pipedrive.com https://identitytoolkit.googleapis.com https://securetoken.googleapis.com https://vercel.live https://*.vercel.live; frame-src 'self' https://sistemadepositos-37227.firebaseapp.com https://*.firebaseapp.com https://vercel.live; frame-ancestors 'none';");
    next();
});
app.use(sanitizeMiddleware);

// Essential for Vercel to correctly identify client IP addresses
app.set('trust proxy', 1);


app.get('/api/me', verifyFirebaseToken, (req: AuthenticatedRequest, res) => {
    if (!req.user) return res.status(401).json({ error: 'Não autenticado' });

    // VULN-007 Fix: Include HMAC integrity hash to prevent client-side role tampering
    const _integrity = generateRoleIntegrity({
        uid: req.user.uid,
        role: req.user.role,
        sector: req.user.sector,
        id: req.user.id
    });

    res.json({ ...req.user, _integrity });
});

// VULN-007 Fix: Role integrity verification endpoint
// Frontend calls this to verify that stored user data hasn't been tampered with
app.post('/api/verify-role', verifyFirebaseToken, (req: AuthenticatedRequest, res) => {
    if (!req.user) return res.status(401).json({ error: 'Não autenticado' });

    const { _integrity } = req.body;
    if (!_integrity || typeof _integrity !== 'string') {
        return res.status(400).json({ valid: false, error: 'Hash de integridade não fornecido' });
    }

    const isValid = verifyRoleIntegrity(
        {
            uid: req.user.uid,
            role: req.user.role,
            sector: req.user.sector,
            id: req.user.id
        },
        _integrity
    );

    if (!isValid) {
        console.warn(`[SECURITY] Role integrity check FAILED for user ${req.user.email} (${req.user.uid}). Possible tampering detected.`);
    }

    res.json({ valid: isValid });
});

// Health check - no auth required
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', message: 'Backend is running' });
});

// Public routes - no authentication required
// Apply strict rate limiter only to appointment creation (prevents spam/abuse)
app.use('/api/public/appointments', strictPublicRateLimiter);
// Apply general public rate limiter to event lookup (100 req/15min)
app.use('/api/public/events', publicRateLimiter);
app.use('/api/public', publicRoutes);
app.use('/api/auth', publicRateLimiter, authRoutes);

// Protected routes - require authentication
// Apply authentication middleware AND rate limiting
app.use('/api/appointments', apiRateLimiter, verifyFirebaseToken, requireRole('Admin', 'Dev', 'Líder', 'Co-líder', 'Qualidade', 'Colaborador'), appointmentRoutes);
app.use('/api/pipedrive', apiRateLimiter, verifyFirebaseToken, requireRole('Admin', 'Dev', 'Líder', 'Co-líder', 'Qualidade', 'Colaborador'), pipedriveRoutes);

// Serve static files from the React app
app.use(express.static(path.join(__dirname, '../../dist')));

// The "catchall" handler: for any request that doesn't
// match one above, send back React's index.html file.
app.get(/.*/, (req, res) => {
    res.sendFile(path.join(__dirname, '../../dist/index.html'));
});

// Export the app for Vercel serverless functions
export default app;

// Only listen if executed directly
if (process.argv[1] === __filename) {
    app.listen(PORT, () => {
        console.log(`Server is running on port ${PORT}`);
    });
}
