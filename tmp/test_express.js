import express from 'express';
import axios from 'axios';

const app = express();

app.use((req, res, next) => {
    try {
        console.log('Original req.params type:', typeof req.params);
        req.params = { id: 'test' };
        console.log('Successfully reassigned req.params in real middleware!');
        next();
    } catch (e) {
        console.error('CRASH in middleware reassigning req.params:', e.stack || e.message || e);
        res.status(500).send('Middleware crashed: ' + e.message);
    }
});

app.get('/:id', (req, res) => {
    res.send('OK');
});

const server = app.listen(0, async () => {
    const port = server.address().port;
    console.log('Test server running on port', port);
    try {
        await axios.get(`http://localhost:${port}/123`);
        console.log('Request finished successfully');
    } catch (e) {
        console.error('Request failed:', e.response?.data || e.message);
    } finally {
        server.close();
    }
});
