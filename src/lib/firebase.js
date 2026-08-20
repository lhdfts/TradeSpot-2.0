"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAuthHeaders = exports.getIdToken = exports.googleProvider = exports.auth = void 0;
const app_1 = require("firebase/app");
const auth_1 = require("firebase/auth");
const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
    measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
};
const app = (0, app_1.initializeApp)(firebaseConfig);
exports.auth = (0, auth_1.getAuth)(app);
// Set in-memory persistence to mitigate VULN-005 (IndexedDB Leak)
(0, auth_1.setPersistence)(exports.auth, auth_1.inMemoryPersistence).catch(console.error);
exports.googleProvider = new auth_1.GoogleAuthProvider();
/**
 * Get the current user's Firebase ID token for API authentication
 * Returns null if user is not authenticated
 */
const getIdToken = () => __awaiter(void 0, void 0, void 0, function* () {
    const user = exports.auth.currentUser;
    if (!user) {
        return null;
    }
    try {
        return yield user.getIdToken();
    }
    catch (error) {
        console.error('Failed to get Firebase ID token:', error);
        return null;
    }
});
exports.getIdToken = getIdToken;
/**
 * Get authorization headers for API requests
 * Returns empty object if user is not authenticated
 */
const getAuthHeaders = () => __awaiter(void 0, void 0, void 0, function* () {
    // For VULN-005, we now use HttpOnly cookies for session management.
    // The browser will automatically send the 'session' cookie with credentials: 'include'.
    // We no longer manually append the Authorization header on the frontend.
    return {};
});
exports.getAuthHeaders = getAuthHeaders;
