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
app.use(express.json());

// Essential for Vercel to correctly identify client IP addresses
app.set('trust proxy', 1);


app.get('/api/me', verifyFirebaseToken, (req: AuthenticatedRequest, res) => {
    // Agora o TypeScript reconhecerá req.user sem erros
    res.json(req.user);
});

// Health check - no auth required
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', message: 'Backend is running' });
});

// Public routes - rate limited but no authentication
// Apply general rate limiter to most endpoints, strict limiter only to appointment creation
app.use('/api/public/appointments', strictPublicRateLimiter);
app.use('/api/public', publicRateLimiter, publicRoutes);

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
