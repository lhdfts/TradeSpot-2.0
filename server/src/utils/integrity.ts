import crypto from 'crypto';

/**
 * VULN-007 Fix: Role Integrity Verification
 * 
 * Generates an HMAC-SHA256 signature of user data to prevent
 * client-side tampering of the /api/me response.
 * 
 * Even if an attacker intercepts and modifies the role in the response,
 * the _integrity hash will not match when verified server-side,
 * causing the frontend to force a re-authentication.
 */

const getIntegritySecret = (): string => {
    // Use a dedicated secret, falling back to Supabase key as seed
    const secret = process.env.ROLE_INTEGRITY_SECRET || 
                   process.env.SUPABASE_SECRET_KEY || 
                   process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!secret) {
        throw new Error('No secret key available for integrity signing');
    }
    
    return secret;
};

/**
 * Generates an HMAC-SHA256 hash of the user's identity + role data.
 * This hash is returned alongside /api/me so the frontend can later
 * verify it hasn't been tampered with.
 */
export const generateRoleIntegrity = (userData: {
    uid: string;
    role: string;
    sector: string;
    id: string;
}): string => {
    const secret = getIntegritySecret();
    const payload = `${userData.uid}:${userData.role}:${userData.sector}:${userData.id}`;
    
    return crypto
        .createHmac('sha256', secret)
        .update(payload)
        .digest('hex');
};

/**
 * Verifies that a given integrity hash matches the expected hash
 * for the provided user data. Returns false if tampered.
 */
export const verifyRoleIntegrity = (
    userData: {
        uid: string;
        role: string;
        sector: string;
        id: string;
    },
    providedHash: string
): boolean => {
    const expectedHash = generateRoleIntegrity(userData);
    
    // Use timingSafeEqual to prevent timing attacks
    try {
        return crypto.timingSafeEqual(
            Buffer.from(expectedHash, 'hex'),
            Buffer.from(providedHash, 'hex')
        );
    } catch {
        return false;
    }
};
