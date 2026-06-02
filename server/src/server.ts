import './config/init.js';
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';

// Firebase Admin initialization (must be early)
import { initFirebaseAdmin } from './config/firebase-admin.js';
initFirebaseAdmin();

// Routes
import pipedriveRoutes from './routes/pipedriveRoutes.js';
import appointmentRoutes from './routes/appointmentRoutes.js';
import publicRoutes from './routes/publicRoutes.js';

// Middleware
import { verifyFirebaseToken, requireRole, AuthenticatedRequest } from './middleware/firebaseAuth.js';
import { apiRateLimiter, publicRateLimiter, strictPublicRateLimiter } from './middleware/rateLimiter.js';

// ESM alternative for __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


const app = express();
// Force port 3000 to match Vite proxy configuration and avoid .env conflicts
const PORT = 3000;

app.use(cors());
// Limit request body size to prevent abuse (100kb is enough for all our use cases)
app.use(express.json({ limit: '100kb' }));

// Essential for Vercel to correctly identify client IP addresses
app.set('trust proxy', 1);

// Security Headers: Prevent clickjacking, MIME sniffing, XSS, etc.
app.use((req, res, next) => {
    // Remove X-Powered-By to avoid exposing backend tech stack
    res.removeHeader('X-Powered-By');
    // Prevent clickjacking (don't allow any framing)
    res.setHeader('X-Frame-Options', 'DENY');
    // Prevent MIME sniffing
    res.setHeader('X-Content-Type-Options', 'nosniff');
    // XSS protection (for older browsers, but still good to have)
    res.setHeader('X-XSS-Protection', '1; mode=block');
    // Basic Content Security Policy (CSP) - can be tightened later if needed
    res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https://*.supabase.co https://*.firebaseapp.com https://*.firebasedatabase.app https://securetoken.googleapis.com https://www.googleapis.com; frame-src 'self' https://*.firebaseapp.com https://*.googleapis.com;");
    next();
});


app.get('/api/me', verifyFirebaseToken, (req: AuthenticatedRequest, res) => {
    // Agora o TypeScript reconhecerá req.user sem erros
    res.json(req.user);
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
