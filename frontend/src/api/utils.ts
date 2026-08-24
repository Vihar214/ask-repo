import { jwtDecode } from 'jwt-decode';

export const getDecodedToken = (token: string | null) => {
  if (token) {
    try {
      return jwtDecode(token);
    } catch (e) {
      console.error('Invalid token', e);
    }
  }
  return null;
};

export const isTokenExpired = (token: string | null) => {
  try {
    const decoded = getDecodedToken(token);
    if (!decoded?.exp) return false;
    const now = Math.floor(Date.now() / 1000); // seconds
    return decoded.exp < now;
  } catch (err) {
    console.error('Failed to parse token', err);
    return true;
  }
};

export function getValidAddBankAccountQR(): {
  sessionId: string;
  expiresAt: number;
  source?: string;
  flow?: string;
} | null {
  const raw = localStorage.getItem('addBankAccountQR');

  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw);

    if (Date.now() > parsed.expiresAt) {
      localStorage.removeItem('addBankAccountQR');
      return null;
    }

    return parsed;
  } catch {
    localStorage.removeItem('addBankAccountQR');
    return null;
  }
}
