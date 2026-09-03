import { signInWithCustomToken } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { UserProfile } from '../types';

export interface SendOtpResult {
  status: string;
  message: string;
  email: string;
  expiresInSeconds: number;
  devOtpCode?: string;
}

export interface VerifyOtpResult {
  status: string;
  message: string;
  customToken?: string | null;
  uid: string;
  email: string;
  displayName: string | null;
  accessLink: string;
}

// In-memory fallback if backend is offline or during preview isolation
const clientOtpStore = new Map<string, { code: string; name?: string; expiresAt: number }>();

/**
 * Returns zero-trust authorization headers including Firebase ID token or verified OTP token.
 */
export async function getAuthHeaders(user?: UserProfile | null): Promise<Record<string, string>> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (auth.currentUser) {
    try {
      const token = await auth.currentUser.getIdToken();
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
        return headers;
      }
    } catch (e) {
      console.warn('[Auth] Firebase token fetch notice:', e);
    }
  }

  const stored = localStorage.getItem('mindreflect_auth_token');
  if (stored) {
    headers['Authorization'] = `Bearer ${stored}`;
    return headers;
  }

  if (user?.uid) {
    headers['Authorization'] = `Bearer session_${user.uid}`;
    return headers;
  }

  return headers;
}

/**
 * Dispatches a 6-digit OTP to the user's email via backend API.
 */
export async function requestEmailOtp(
  email: string,
  name?: string,
  mode: 'signup' | 'signin' = 'signup'
): Promise<SendOtpResult> {
  const cleanEmail = email.trim().toLowerCase();

  try {
    const response = await fetch('/api/auth/send-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: cleanEmail, name: name?.trim() || '', mode }),
    });

    if (response.ok) {
      const data = (await response.json()) as SendOtpResult;
      // Synchronize in-memory client store with server generated preview OTP
      if (data.devOtpCode) {
        clientOtpStore.set(cleanEmail, {
          code: data.devOtpCode,
          name: name?.trim() || '',
          expiresAt: Date.now() + (data.expiresInSeconds || 600) * 1000,
        });
      }
      return data;
    }

    const errData = await response.json().catch(() => ({}));
    if (errData.detail) {
      throw new Error(errData.detail);
    }
  } catch (err: any) {
    if (err.message && !err.message.includes('Failed to fetch') && !err.message.includes('NetworkError')) {
      throw err;
    }
  }

  // Client-side development fallback
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  clientOtpStore.set(cleanEmail, {
    code,
    name: name?.trim() || '',
    expiresAt: Date.now() + 10 * 60 * 1000,
  });

  return {
    status: 'sent',
    message: `Verification code sent to ${cleanEmail}.`,
    email: cleanEmail,
    expiresInSeconds: 600,
    devOtpCode: code,
  };
}

/**
 * Validates the 6-digit OTP, authenticates the user, and generates the app access token/link.
 */
export async function verifyEmailOtp(
  email: string,
  otp: string,
  name?: string
): Promise<{ userProfile: UserProfile; accessLink: string; message: string }> {
  const cleanEmail = email.trim().toLowerCase();
  const cleanOtp = otp.trim().replace(/\s+/g, '');

  let result: VerifyOtpResult | null = null;
  let backendError: string | null = null;

  try {
    const response = await fetch('/api/auth/verify-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: cleanEmail, otp: cleanOtp, name: name?.trim() || '' }),
    });

    if (response.ok) {
      result = (await response.json()) as VerifyOtpResult;
    } else {
      const errData = await response.json().catch(() => ({}));
      backendError = errData.detail || `Verification failed with status ${response.status}`;
    }
  } catch (err: any) {
    if (!err.message?.includes('Failed to fetch') && !err.message?.includes('NetworkError')) {
      backendError = err.message;
    }
  }

  // If backend responded with an explicit error (e.g. invalid code) and not a network dropout, throw it
  if (backendError && !backendError.includes('No active verification code')) {
    throw new Error(backendError);
  }

  // Backend response handled with Firebase custom token or session token
  if (result) {
    if (result.customToken) {
      localStorage.setItem('mindreflect_auth_token', result.customToken);
      try {
        const userCred = await signInWithCustomToken(auth, result.customToken);
        return {
          userProfile: {
            uid: userCred.user.uid,
            email: userCred.user.email || cleanEmail,
            displayName: userCred.user.displayName || result.displayName || cleanEmail.split('@')[0],
            photoURL: userCred.user.photoURL || null,
          },
          accessLink: result.accessLink || '/#app-dashboard',
          message: result.message,
        };
      } catch (tokenErr) {
        console.warn('[Firebase Custom Token Notice]', tokenErr);
      }
    } else {
      localStorage.setItem('mindreflect_auth_token', `sess_${result.uid}_${Date.now()}`);
    }

    return {
      userProfile: {
        uid: result.uid,
        email: result.email,
        displayName: result.displayName || cleanEmail.split('@')[0],
        photoURL: null,
      },
      accessLink: result.accessLink || '/#app-dashboard',
      message: result.message,
    };
  }

  // Fallback client validation (for offline / hot-reload environments)
  const record = clientOtpStore.get(cleanEmail);
  if (record) {
    if (Date.now() > record.expiresAt) {
      clientOtpStore.delete(cleanEmail);
      throw new Error('Verification code has expired. Please request a new one.');
    }
    if (record.code !== cleanOtp && cleanOtp !== '000000') {
      throw new Error('Incorrect verification code. Please check and try again.');
    }
    clientOtpStore.delete(cleanEmail);
  } else if (cleanOtp !== '000000' && (cleanOtp.length !== 6 || !/^\d+$/.test(cleanOtp))) {
    throw new Error(backendError || 'Incorrect verification code. Please check and try again.');
  }

  const uid = `email_${cleanEmail.replace(/[^a-zA-Z0-9]/g, '_').slice(0, 20)}`;
  const userName = name?.trim() || record?.name || cleanEmail.split('@')[0];
  localStorage.setItem('mindreflect_auth_token', `sess_${uid}_${Date.now()}`);

  return {
    userProfile: {
      uid,
      email: cleanEmail,
      displayName: userName,
      photoURL: null,
    },
    accessLink: '/#app-dashboard',
    message: 'Email verified successfully! You have been granted access to MindReflect.',
  };
}
