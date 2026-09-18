import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, setPersistence, inMemoryPersistence } from "firebase/auth";

const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
    measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
// Set in-memory persistence to mitigate VULN-005 (IndexedDB Leak)
setPersistence(auth, inMemoryPersistence).catch(console.error);

export const googleProvider = new GoogleAuthProvider();

/**
 * Get the current user's Firebase ID token for API authentication
 * Returns null if user is not authenticated
 */
export const getIdToken = async (): Promise<string | null> => {
    const user = auth.currentUser;
    if (!user) {
        return null;
    }
    try {
        return await user.getIdToken();
    } catch (error) {
        console.error('Failed to get Firebase ID token:', error);
        return null;
    }
};

/**
 * Get authorization headers for API requests
 * Returns empty object if user is not authenticated
 */
export const getAuthHeaders = async (): Promise<Record<string, string>> => {
    // For VULN-005, we now use HttpOnly cookies for session management.
    // The browser will automatically send the 'session' cookie with credentials: 'include'.
    // We no longer manually append the Authorization header on the frontend.
    return {};
};
