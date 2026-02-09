import { getFirebaseAuth } from '../config/firebase-admin.js';

export const updateUserRole = async (uid: string, newRole: string) => {
    const auth = getFirebaseAuth();
    
    await auth.setCustomUserClaims(uid, { role: newRole });
    
    return { success: true };
};