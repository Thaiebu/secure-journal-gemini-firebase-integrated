/**
 * Strict Undefined-Stripping (Zero-Crash Payload Hygiene)
 * Recursively strips undefined values so Firestore never encounters undefined field values.
 */
export function sanitizePayload<T>(obj: T): T {
  if (obj === null || obj === undefined) {
    return obj;
  }
  if (Array.isArray(obj)) {
    return obj.map((item) => sanitizePayload(item)) as unknown as T;
  }
  if (typeof obj === 'object') {
    const cleanObj: Record<string, any> = {};
    for (const [key, value] of Object.entries(obj)) {
      if (value !== undefined) {
        cleanObj[key] = sanitizePayload(value);
      }
    }
    return cleanObj as T;
  }
  return obj;
}

export function formatDate(timestamp: number): string {
  if (!timestamp) return '';
  const date = new Date(timestamp);
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date);
}

export function formatRelativeDate(timestamp: number): string {
  if (!timestamp) return '';
  const now = Date.now();
  const diffMs = now - timestamp;
  const diffMinutes = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMinutes < 1) return 'Just now';
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
  }).format(new Date(timestamp));
}

export function calculateWordCount(text: string): number {
  if (!text) return 0;
  return text.trim().split(/\s+/).filter(Boolean).length;
}

export function calculateReadingTime(text: string): string {
  const words = calculateWordCount(text);
  const minutes = Math.max(1, Math.ceil(words / 200));
  return `${minutes} min read`;
}

/**
 * Maps raw Firebase authentication errors into clear, friendly, and actionable user messages.
 */
export function getFriendlyAuthErrorMessage(error: any): string {
  if (!error) return 'An unexpected error occurred during authentication. Please try again.';

  const code = (error.code || (typeof error.message === 'string' ? error.message : '')).toLowerCase();

  // Email/Password specific errors
  if (code.includes('operation-not-allowed') || code.includes('auth/operation-not-allowed')) {
    return "Email/Password sign-in is not enabled yet in this Firebase project. Please use 'Continue with Google' to sign in instantly, or enable Email/Password in your Firebase Console.";
  }
  if (code.includes('email-already-in-use') || code.includes('auth/email-already-in-use')) {
    return 'This email address is already registered. Please switch to the Sign In tab or use Continue with Google.';
  }
  if (code.includes('invalid-email') || code.includes('auth/invalid-email')) {
    return 'Please enter a valid email address.';
  }
  if (code.includes('weak-password') || code.includes('auth/weak-password')) {
    return 'Password is too weak. Please use at least 6 characters with a combination of letters and numbers.';
  }
  if (
    code.includes('invalid-credential') ||
    code.includes('auth/invalid-credential') ||
    code.includes('wrong-password') ||
    code.includes('auth/wrong-password') ||
    code.includes('user-not-found') ||
    code.includes('auth/user-not-found')
  ) {
    return 'Invalid email or password. Please check your credentials and try again.';
  }
  if (code.includes('too-many-requests') || code.includes('auth/too-many-requests')) {
    return 'Access temporarily locked due to multiple failed attempts. Please reset your password or try again later.';
  }

  // Google / Popup specific errors
  if (code.includes('popup-closed-by-user') || code.includes('auth/popup-closed-by-user')) {
    return 'Sign-in was cancelled because the Google login window was closed. Click "Sign in with Google" whenever you are ready to continue.';
  }
  if (code.includes('popup-blocked') || code.includes('auth/popup-blocked')) {
    return 'The sign-in popup was blocked by your browser. Please allow popups for this site and try again.';
  }
  if (code.includes('cancelled-popup-request') || code.includes('auth/cancelled-popup-request')) {
    return 'A sign-in window is already open. Please complete or close it to proceed.';
  }
  if (code.includes('network-request-failed') || code.includes('auth/network-request-failed')) {
    return 'Network connection issue. Please check your internet connection and try again.';
  }
  if (code.includes('unauthorized-domain') || code.includes('auth/unauthorized-domain')) {
    return 'This web domain is not authorized in Firebase authentication settings.';
  }
  if (code.includes('user-disabled') || code.includes('auth/user-disabled')) {
    return 'This account has been disabled. Please contact support or use a different account.';
  }
  if (code.includes('account-exists-with-different-credential')) {
    return 'An account already exists with this email using a different sign-in method.';
  }

  // Strip cryptic technical prefix if present (e.g. "Firebase: Error (auth/...)")
  if (typeof error.message === 'string') {
    const cleaned = error.message.replace(/^Firebase:\s*Error\s*\((.*?)\)\.?/i, '$1').trim();
    if (cleaned && cleaned !== error.message) {
      return `Authentication notice: ${cleaned}. Please try again.`;
    }
    return error.message;
  }

  return 'Failed to authenticate. Please check your details and try again.';
}
