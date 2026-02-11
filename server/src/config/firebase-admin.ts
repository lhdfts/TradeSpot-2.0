import { initializeApp, cert, getApps, type ServiceAccount } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

let firebaseInitialized = false;

export const initFirebaseAdmin = () => {
    if (getApps().length > 0) {
        firebaseInitialized = true;
        return getApps()[0];
    }

    try {
        // Option 1: Full service account JSON in environment variable
        try {
            const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT;

            if (serviceAccountJson) {
                const serviceAccount = JSON.parse(serviceAccountJson) as ServiceAccount;

                initializeApp({
                    credential: cert(serviceAccount)
                });

                firebaseInitialized = true;
                console.log('Firebase Admin initialized with service account JSON');
                return getApps()[0];
            }
        } catch (parseError) {
            // If JSON is invalid, log warning but continue to Option 2
            console.warn('Warning: FIREBASE_SERVICE_ACCOUNT is invalid JSON. Falling back to individual credentials.', parseError);
        }

        // Option 2: Individual environment variables
        const projectId = process.env.FIREBASE_PROJECT_ID;
        const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
        const privateKeyRaw = process.env.FIREBASE_PRIVATE_KEY;

        if (!projectId || !clientEmail || !privateKeyRaw) {
            console.warn('Firebase Admin credentials missing.');
            return null;
        }

        const privateKey = privateKeyRaw.replace(/\\n/g, '\n');

        initializeApp({
            credential: cert({
                projectId,
                clientEmail,
                privateKey
            })
        });

        firebaseInitialized = true;
        console.log('Firebase Admin initialized with individual credentials');
        return getApps()[0];

    } catch (error) {
        console.error('Firebase Admin initialization failed:', error);
        firebaseInitialized = false;
        return null;
    }
};

export const getFirebaseAuth = () => {
    if (!firebaseInitialized && getApps().length === 0) {
        initFirebaseAdmin();
    }

    if (getApps().length === 0) {
        throw new Error('Firebase Admin not initialized.');
    }

    return getAuth();
};
