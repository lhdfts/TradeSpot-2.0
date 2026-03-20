import { google } from 'googleapis';
import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load env from root
dotenv.config({ path: path.join(__dirname, '../../../.env') });

const clientId = process.env.GOOGLE_CLIENT_ID;
const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
// Ensure this matches exactly what is in Google Cloud Console
const redirectUri = process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000/oauth2callback';

if (!clientId || !clientSecret) {
    console.error('Missing GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET in .env file.');
    process.exit(1);
}

const oauth2Client = new google.auth.OAuth2(
    clientId,
    clientSecret,
    redirectUri
);

const app = express();
const PORT = 3000;

app.get('/oauth2callback', async (req, res) => {
    const { code } = req.query;
    if (code) {
        try {
            const { tokens } = await oauth2Client.getToken(code as string);
            console.log('\n--- YOUR REFRESH TOKEN ---\n');
            console.log(tokens.refresh_token);
            console.log('\n--------------------------\n');
            console.log('Copy this token and add it to your .env file as GOOGLE_REFRESH_TOKEN');

            // Save token to file
            import('fs').then(fs => {
                fs.writeFileSync(path.join(__dirname, 'refresh_token.txt'), tokens.refresh_token || 'No token found');
            });

            res.send('Authentication successful! Check your terminal for the Refresh Token.');
            // Allow time for file write
            setTimeout(() => process.exit(0), 1000);
        } catch (error) {
            console.error('Error retrieving access token', error);
            res.send('Error retrieving access token');
        }
    } else {
        res.send('No code provided');
    }
});

app.listen(PORT, () => {
    // Generate auth url
    const scopes = [
        'https://www.googleapis.com/auth/calendar',
        'https://www.googleapis.com/auth/calendar.events'
    ];

    const url = oauth2Client.generateAuthUrl({
        // 'offline' (gets refresh_token)
        access_type: 'offline',
        // 'force' (forces approval prompt just in case)
        prompt: 'consent',
        scope: scopes
    });

    console.log(`\n1. Ensure your Redirect URI in Google Cloud Console is set to: ${redirectUri}`);
    console.log(`2. Open this URL in your browser:\n\n${url}\n`);
    console.log('3. Grant access (even if it says unsafe, since this is your own app).');

    // Write URL to file to avoid truncation
    import('fs').then(fs => {
        fs.writeFileSync(path.join(__dirname, 'auth_url.txt'), url);
    });
});
