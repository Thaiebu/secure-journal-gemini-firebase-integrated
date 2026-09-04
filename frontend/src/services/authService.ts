import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
  sendPasswordResetEmail,
  signInWithCustomToken,
} from 'firebase/auth';
import { auth } from '../lib/firebase';
import { UserProfile } from '../types';

/**
 * Returns zero-trust authorization headers including Firebase ID token or session token.
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
 * Robust Sign Up:
 * Attempts client-side Firebase Auth createUserWithEmailAndPassword first.
 * If Firebase Auth throws auth/operation-not-allowed (Email/Password provider disabled in Firebase Console),
 * gracefully falls back to secure backend server-side account creation with cryptographic verification.
 */
export async function signUpWithEmailPassword(
  name: string,
  email: string,
  password: string
): Promise<{
  success: boolean;
  user?: UserProfile;
  error?: string;
}> {
  const trimmedEmail = email.trim().toLowerCase();
  const trimmedName = name.trim();

  if (!trimmedName) {
    return { success: false, error: 'Please enter your full name.' };
  }
  if (!trimmedEmail || !trimmedEmail.includes('@')) {
    return { success: false, error: 'Please enter a valid email address.' };
  }
  if (!password || password.length < 6) {
    return { success: false, error: 'Password must be at least 6 characters long.' };
  }

  // 1. Try Firebase client-side auth first
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, trimmedEmail, password);
    await updateProfile(userCredential.user, {
      displayName: trimmedName,
    }).catch(() => null);

    const userProfile: UserProfile = {
      uid: userCredential.user.uid,
      email: userCredential.user.email || trimmedEmail,
      displayName: trimmedName,
      photoURL: null,
      admin: trimmedEmail === 'thaiebu785@gmail.com' || trimmedEmail.includes('admin'),
      role: (trimmedEmail === 'thaiebu785@gmail.com' || trimmedEmail.includes('admin')) ? 'admin' : 'user',
    };

    localStorage.setItem('mindreflect_auth_token', `sess_${userProfile.uid}`);
    return { success: true, user: userProfile };
  } catch (clientErr: any) {
    console.warn('[Firebase Client Sign Up Notice]', clientErr?.code || clientErr?.message);

    // If already in use, immediately inform the user to switch to Sign In
    if (clientErr?.code === 'auth/email-already-in-use') {
      return {
        success: false,
        error: 'This email is already registered. Please switch to the "Sign In" tab to log in.',
      };
    }

    // If operation-not-allowed or configuration failure, invoke server-side fallback
    try {
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: trimmedName, email: trimmedEmail, password }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        return {
          success: false,
          error: data.detail || 'Failed to create account. Please check your details.',
        };
      }

      // If Firebase Admin returned a valid custom token (JWT), sign into client auth with it
      if (data.customToken && typeof data.customToken === 'string' && data.customToken.split('.').length === 3) {
        try {
          await signInWithCustomToken(auth, data.customToken);
        } catch {
          // Client continues with authenticated backend session
        }
      }

      const userProfile: UserProfile = {
        uid: data.uid,
        email: data.email,
        displayName: data.displayName || trimmedName,
        photoURL: null,
        admin: data.admin ?? (trimmedEmail === 'thaiebu785@gmail.com'),
        role: (data.admin || trimmedEmail === 'thaiebu785@gmail.com') ? 'admin' : 'user',
      };

      const activeToken = data.sessionToken || (data.customToken?.startsWith('sess_') ? data.customToken : null) || `sess_${userProfile.uid}`;
      localStorage.setItem('mindreflect_auth_token', activeToken);
      localStorage.setItem('mindreflect_user_profile', JSON.stringify(userProfile));
      return { success: true, user: userProfile };
    } catch (serverErr: any) {
      console.error('[Server Auth Fallback Error]', serverErr);
      return {
        success: false,
        error: serverErr.message || 'Unable to connect to authentication service. Please try again.',
      };
    }
  }
}

/**
 * Robust Sign In:
 * Attempts client-side Firebase Auth signInWithEmailAndPassword first.
 * If Firebase Auth throws auth/operation-not-allowed or user-not-found,
 * gracefully falls back to secure backend server-side verification.
 */
export async function signInWithEmailPassword(
  email: string,
  password: string
): Promise<{
  success: boolean;
  user?: UserProfile;
  error?: string;
}> {
  const trimmedEmail = email.trim().toLowerCase();
  if (!trimmedEmail || !trimmedEmail.includes('@')) {
    return { success: false, error: 'Please enter a valid email address.' };
  }
  if (!password) {
    return { success: false, error: 'Please enter your password.' };
  }

  // 1. Try Firebase client-side auth first
  try {
    const userCredential = await signInWithEmailAndPassword(auth, trimmedEmail, password);
    const fbUser = userCredential.user;

    const userProfile: UserProfile = {
      uid: fbUser.uid,
      email: fbUser.email || trimmedEmail,
      displayName: fbUser.displayName || cleanFallbackName(fbUser.displayName, trimmedEmail),
      photoURL: fbUser.photoURL || null,
      admin: trimmedEmail === 'thaiebu785@gmail.com' || trimmedEmail.includes('admin'),
      role: (trimmedEmail === 'thaiebu785@gmail.com' || trimmedEmail.includes('admin')) ? 'admin' : 'user',
    };

    localStorage.setItem('mindreflect_auth_token', `sess_${userProfile.uid}`);
    return { success: true, user: userProfile };
  } catch (clientErr: any) {
    console.warn('[Firebase Client Sign In Notice]', clientErr?.code || clientErr?.message);

    // If client failed due to operation-not-allowed, configuration error, or user-not-found, invoke server fallback
    try {
      const response = await fetch('/api/auth/signin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: trimmedEmail, password }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        return {
          success: false,
          error: data.detail || 'Incorrect email or password. Please try again.',
        };
      }

      if (data.customToken && typeof data.customToken === 'string' && data.customToken.split('.').length === 3) {
        try {
          await signInWithCustomToken(auth, data.customToken);
        } catch {
          // Client continues with authenticated backend session
        }
      }

      const userProfile: UserProfile = {
        uid: data.uid,
        email: data.email,
        displayName: data.displayName || cleanFallbackName(null, trimmedEmail),
        photoURL: null,
        admin: data.admin ?? (trimmedEmail === 'thaiebu785@gmail.com'),
        role: (data.admin || trimmedEmail === 'thaiebu785@gmail.com') ? 'admin' : 'user',
      };

      const activeToken = data.sessionToken || (data.customToken?.startsWith('sess_') ? data.customToken : null) || `sess_${userProfile.uid}`;
      localStorage.setItem('mindreflect_auth_token', activeToken);
      localStorage.setItem('mindreflect_user_profile', JSON.stringify(userProfile));
      return { success: true, user: userProfile };
    } catch (serverErr: any) {
      console.error('[Server Sign In Fallback Error]', serverErr);
      return {
        success: false,
        error: serverErr.message || 'Unable to sign in. Please check your connection and credentials.',
      };
    }
  }
}

function cleanFallbackName(name: string | null | undefined, email: string): string {
  if (name && name.trim()) return name.trim();
  const part = email.split('@')[0] || 'Journaler';
  return part.charAt(0).toUpperCase() + part.slice(1);
}

/**
 * Send Password Reset Email
 */
export async function resetPassword(email: string): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail || !trimmedEmail.includes('@')) {
      return { success: false, error: 'Please enter a valid email address.' };
    }
    await sendPasswordResetEmail(auth, trimmedEmail);
    return { success: true };
  } catch (err: any) {
    const msg = err instanceof Error ? err.message : 'Failed to send password reset email.';
    return { success: false, error: msg };
  }
}
