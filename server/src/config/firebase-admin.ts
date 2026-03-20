import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

let firebaseInitialized = false;

export const initFirebaseAdmin = () => {
    if (getApps().length > 0) {
        firebaseInitialized = true;
        return getApps()[0];
    }

    try {
        const projectId = process.env.FIREBASE_PROJECT_ID;
        const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
        const privateKeyRaw = process.env.FIREBASE_PRIVATE_KEY;

        if (!projectId || !clientEmail || !privateKeyRaw) {
            console.warn('Firebase Admin credentials missing. Initialization skipped.');
            firebaseInitialized = false;
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
        console.log('Firebase Admin initialized with individual environment variables');

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
