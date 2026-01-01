import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import pipedriveRoutes from './routes/pipedriveRoutes';

// Load environment variables from the root .env file (going up two levels from src)
// Load environment variables
// 1. Try to load from server/.env (current working directory usually)
dotenv.config();
// 2. Try to load from root .env (going up two levels) - this wont overwrite existing vars from step 1
dotenv.config({ path: path.join(__dirname, '../../.env') });

const app = express();
// Force port 3000 to match Vite proxy configuration and avoid .env conflicts
const PORT = 3000;

app.use(cors());
app.use(express.json());

// Routes
app.use('/api/pipedrive', pipedriveRoutes);
app.use('/api/appointments', require('./routes/appointmentRoutes').default);

app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', message: 'Backend is running' });
});

// Export the app for Vercel serverless functions
export default app;

// Only listen if executed directly (e.g., node server.js) or if explicitly started
if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`Server is running on port ${PORT}`);
    });
}
