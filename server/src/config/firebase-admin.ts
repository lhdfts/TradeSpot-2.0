import { initializeApp, cert, getApps, type ServiceAccount } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

// Firebase Admin SDK initialization
// Uses FIREBASE_SERVICE_ACCOUNT environment variable (JSON string) or individual variables

let firebaseAdmin: ReturnType<typeof initializeApp> | null = null;

export const initFirebaseAdmin = () => {
    if (getApps().length > 0) {
        console.log('Firebase Admin already initialized');
        return getApps()[0];
    }

    try {
        // Option 1: Full service account JSON in environment variable
        const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT;

        if (serviceAccountJson) {
            const serviceAccount = JSON.parse(serviceAccountJson) as ServiceAccount;
            firebaseAdmin = initializeApp({
                credential: cert(serviceAccount)
            });
            console.log('Firebase Admin initialized with service account JSON');
            return firebaseAdmin;
        }

        // Option 2: Individual environment variables
        const projectId = process.env.FIREBASE_PROJECT_ID;
        const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
        const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

        if (projectId && clientEmail && privateKey) {
            firebaseAdmin = initializeApp({
                credential: cert({
                    projectId,
                    clientEmail,
                    privateKey
                })
            });
            console.log('Firebase Admin initialized with individual credentials');
            return firebaseAdmin;
        }

        console.error('Firebase Admin: No valid credentials found. Set FIREBASE_SERVICE_ACCOUNT or individual variables.');
        return null;

    } catch (error) {
        console.error('Firebase Admin initialization failed:', error);
        return null;
    }
};

export const getFirebaseAuth = () => {
    if (getApps().length === 0) {
        initFirebaseAdmin();
    }
    return getAuth();
};

export { firebaseAdmin };
