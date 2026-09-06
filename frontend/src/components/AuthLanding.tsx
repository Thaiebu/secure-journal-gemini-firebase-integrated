import React, { useState } from 'react';
import {
  Sparkles,
  Shield,
  Lock,
  Mail,
  User as UserIcon,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Eye,
  EyeOff,
  KeyRound,
} from 'lucide-react';
import {
  signUpWithEmailPassword,
  signInWithEmailPassword,
  resetPassword,
} from '../services/authService';
import { UserProfile } from '../types';

interface AuthLandingProps {
  onGoogleSignIn: () => void;
  onVerifiedAccess: (user: UserProfile) => void;
  isLoading: boolean;
  error: string | null;
  onClearError?: () => void;
}

type AuthTab = 'signup' | 'signin';

export const AuthLanding: React.FC<AuthLandingProps> = ({
  onGoogleSignIn,
  onVerifiedAccess,
  isLoading,
  error,
  onClearError,
}) => {
  const [tab, setTab] = useState<AuthTab>('signup');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const displayedError = localError || error;
  const [successNotice, setSuccessNotice] = useState<string | null>(null);
  const [isResetMode, setIsResetMode] = useState(false);
  const [resetEmailSent, setResetEmailSent] = useState(false);
  const [resetPasswordVal, setResetPasswordVal] = useState('');
  const [showResetPassword, setShowResetPassword] = useState(false);

  const handleTabChange = (newTab: AuthTab) => {
    setTab(newTab);
    setLocalError(null);
    setSuccessNotice(null);
    setIsResetMode(false);
    setResetPasswordVal('');
    if (onClearError) onClearError();
  };

  // Sign Up with Name, Email & Password
  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    setSuccessNotice(null);

    const cleanEmail = email.trim().toLowerCase();
    const cleanName = name.trim();

    if (!cleanName) {
      setLocalError('Please enter your full name.');
      return;
    }
    if (!cleanEmail || !cleanEmail.includes('@')) {
      setLocalError('Please provide a valid email address.');
      return;
    }
    if (!password || password.length < 6) {
      setLocalError('Password must be at least 6 characters long.');
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await signUpWithEmailPassword(cleanName, cleanEmail, password);
      if (res.success && res.user) {
        onVerifiedAccess(res.user);
      } else {
        setLocalError(res.error || 'Failed to create account.');
      }
    } catch (err: any) {
      console.error('[Sign Up Fallback Error]', err);
      setLocalError(err.message || 'Failed to create account.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    setSuccessNotice(null);

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      setLocalError('Please enter your email address.');
      return;
    }
    if (!password) {
      setLocalError('Please enter your password.');
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await signInWithEmailPassword(cleanEmail, password);
      if (res.success && res.user) {
        onVerifiedAccess(res.user);
      } else {
        setLocalError(res.error || 'Incorrect email or password. Please try again.');
      }
    } catch (err: any) {
      console.error('[Sign In Fallback Error]', err);
      setLocalError(err.message || 'Failed to sign in. Please verify your credentials.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    setSuccessNotice(null);

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      setLocalError('Please provide your email address to reset your password.');
      return;
    }

    if (!resetPasswordVal || resetPasswordVal.length < 6) {
      setLocalError('New password must be at least 6 characters long.');
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await resetPassword(cleanEmail, resetPasswordVal);
      if (res.success && res.user) {
        setSuccessNotice('Password successfully updated! Signing you in...');
        setTimeout(() => {
          onVerifiedAccess(res.user!);
        }, 500);
      } else if (res.success) {
        setResetEmailSent(true);
        setSuccessNotice(`Password updated successfully for ${cleanEmail}. You can now sign in.`);
        setIsResetMode(false);
        setTab('signin');
      } else {
        setLocalError(res.error || 'Failed to update password.');
      }
    } catch (err: any) {
      console.error('[Reset Fallback Error]', err);
      setLocalError(err.message || 'Failed to update password.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex flex-col justify-between py-8 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto">
      {/* Hero Header */}
      <div className="text-center max-w-3xl mx-auto pt-4 sm:pt-6">
        <div
          className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full text-xs font-semibold mb-5 border"
          style={{
            backgroundColor: 'var(--color-accent-subtle)',
            borderColor: 'var(--color-accent)',
            color: 'var(--color-accent-text)',
          }}
        >
          <Sparkles className="w-3.5 h-3.5" style={{ color: 'var(--color-accent)' }} />
          <span>Mindful AI Reflection &amp; Cloud Firestore</span>
        </div>
        <h1
          className="font-serif-display text-4xl sm:text-5xl font-bold tracking-tight leading-[1.15]"
          style={{ color: 'var(--color-text)', fontFamily: 'Verdana, Geneva, Tahoma, sans-serif' }}
        >
          Capture today. Reflect tomorrow. Grow along the way.
        </h1>
        <p
          className="mt-4 text-base sm:text-lg leading-relaxed font-light max-w-2xl mx-auto"
          style={{ color: 'var(--color-text-muted)' }}
        >
          Capture reflections, converse with Gemini 3.6 Flash, and secure your thoughts with isolated Cloud Firestore database storage.
        </p>
      </div>

      {/* Authentication Card */}
      <div className="my-8 max-w-md w-full mx-auto">
        <div
          className="p-6 sm:p-8 rounded-2xl border shadow-xl relative overflow-hidden transition-colors"
          style={{
            backgroundColor: 'var(--color-surface)',
            borderColor: 'var(--color-border)',
          }}
        >
          {/* Ambient Accent Glow */}
          <div className="absolute top-0 right-0 -mr-16 -mt-16 w-36 h-36 rounded-full bg-amber-500/10 blur-2xl pointer-events-none" />

          {/* Primary Navigation Tabs: Sign Up vs Sign In */}
          {!isResetMode && (
            <div
              className="flex p-1 rounded-xl border mb-6 transition-colors"
              style={{
                backgroundColor: 'var(--color-surface-elevated)',
                borderColor: 'var(--color-border)',
              }}
            >
              <button
                type="button"
                id="tab-auth-signup"
                onClick={() => handleTabChange('signup')}
                className="flex-1 py-2.5 text-xs sm:text-sm font-semibold rounded-lg transition-all cursor-pointer text-center"
                style={{
                  backgroundColor: tab === 'signup' ? 'var(--color-surface)' : 'transparent',
                  color: tab === 'signup' ? 'var(--color-text)' : 'var(--color-text-muted)',
                  boxShadow: tab === 'signup' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                }}
              >
                Sign Up
              </button>
              <button
                type="button"
                id="tab-auth-signin"
                onClick={() => handleTabChange('signin')}
                className="flex-1 py-2.5 text-xs sm:text-sm font-semibold rounded-lg transition-all cursor-pointer text-center"
                style={{
                  backgroundColor: tab === 'signin' ? 'var(--color-surface)' : 'transparent',
                  color: tab === 'signin' ? 'var(--color-text)' : 'var(--color-text-muted)',
                  boxShadow: tab === 'signin' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                }}
              >
                Sign In
              </button>
            </div>
          )}

          {/* Password Reset Header */}
          {isResetMode && (
            <div className="mb-6 flex items-center justify-between border-b pb-4" style={{ borderColor: 'var(--color-border)' }}>
              <div>
                <h2 className="text-base font-bold" style={{ color: 'var(--color-text)' }}>Reset Password</h2>
                <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>Choose a new password to sign in to your account</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsResetMode(false);
                  setResetEmailSent(false);
                  setLocalError(null);
                }}
                className="text-xs font-semibold text-amber-600 dark:text-amber-400 hover:underline cursor-pointer"
              >
                Back to Sign In
              </button>
            </div>
          )}

          {/* Google 1-Click Authentication Button */}
          {!isResetMode && (
            <>
              <button
                id="btn-google-signin"
                type="button"
                onClick={onGoogleSignIn}
                disabled={isLoading || isSubmitting}
                className="w-full inline-flex items-center justify-center space-x-3 px-5 py-3 rounded-xl bg-neutral-100 text-neutral-950 font-semibold hover:bg-white shadow-xs hover:shadow transition-all active:scale-[0.99] disabled:opacity-60 cursor-pointer text-sm"
              >
                {isLoading ? (
                  <div className="w-4 h-4 border-2 border-neutral-950/30 border-t-neutral-950 rounded-full animate-spin" />
                ) : (
                  <svg className="w-4 h-4" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.34 24 12 24z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.98 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.34 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                    />
                  </svg>
                )}
                <span>Continue with Google</span>
              </button>

              <div className="flex items-center my-5">
                <div className="flex-1 border-t" style={{ borderColor: 'var(--color-border)' }} />
                <span className="px-3 text-xs uppercase tracking-wider font-medium" style={{ color: 'var(--color-text-muted)' }}>
                  or with email and password
                </span>
                <div className="flex-1 border-t" style={{ borderColor: 'var(--color-border)' }} />
              </div>
            </>
          )}

          {/* Feedback Messages */}
          {displayedError && (
            <div
              id="auth-error-banner"
              className="mb-4 p-3 rounded-xl border text-xs flex items-start space-x-2 bg-rose-500/10 border-rose-500/25 text-rose-600 dark:text-rose-400"
            >
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <div className="flex-1">
                <span className="font-medium">{displayedError}</span>
                {displayedError.toLowerCase().includes('sign up first') && tab === 'signin' && (
                  <div className="mt-1.5">
                    <button
                      type="button"
                      onClick={() => handleTabChange('signup')}
                      className="font-bold underline text-amber-600 dark:text-amber-400 hover:text-amber-700 cursor-pointer"
                    >
                      Click here to create an account
                    </button>
                  </div>
                )}
                {(displayedError.toLowerCase().includes('already registered') || displayedError.toLowerCase().includes('switch to sign in')) && (
                  <div className="mt-1.5 flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleTabChange('signin')}
                      className="font-bold underline text-amber-600 dark:text-amber-400 hover:text-amber-700 cursor-pointer"
                    >
                      Click here to Sign In
                    </button>
                    <span className="text-neutral-400">or</span>
                    <button
                      type="button"
                      onClick={() => {
                        setIsResetMode(true);
                        setLocalError(null);
                      }}
                      className="font-bold underline text-amber-600 dark:text-amber-400 hover:text-amber-700 cursor-pointer"
                    >
                      Reset / Update Password
                    </button>
                  </div>
                )}
                {(displayedError.toLowerCase().includes('incorrect password') || displayedError.toLowerCase().includes('invalid credentials')) && (
                  <div className="mt-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        setIsResetMode(true);
                        setLocalError(null);
                      }}
                      className="font-bold underline text-amber-600 dark:text-amber-400 hover:text-amber-700 cursor-pointer"
                    >
                      Forgot password? Click here to Reset Password
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {successNotice && (
            <div
              id="auth-success-banner"
              className="mb-4 p-3 rounded-xl border text-xs flex items-start space-x-2 bg-emerald-500/10 border-emerald-500/25 text-emerald-600 dark:text-emerald-400"
            >
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
              <span className="font-medium">{successNotice}</span>
            </div>
          )}

          {/* RESET PASSWORD FORM */}
          {isResetMode ? (
            <form onSubmit={handlePasswordReset} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--color-text)' }}>
                  Your Account Email
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none" style={{ color: 'var(--color-text-muted)' }}>
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    id="input-reset-email"
                    type="email"
                    required
                    autoCapitalize="none"
                    autoCorrect="off"
                    spellCheck={false}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@example.com"
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border text-sm focus:outline-hidden focus:ring-2 focus:ring-amber-500/20 transition-all"
                    style={{
                      backgroundColor: 'var(--color-surface-elevated)',
                      borderColor: 'var(--color-border)',
                      color: 'var(--color-text)',
                    }}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--color-text)' }}>
                  New Password (minimum 6 characters)
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none" style={{ color: 'var(--color-text-muted)' }}>
                    <KeyRound className="w-4 h-4" />
                  </div>
                  <input
                    id="input-reset-password"
                    type={showResetPassword ? 'text' : 'password'}
                    required
                    minLength={6}
                    autoCapitalize="none"
                    autoCorrect="off"
                    spellCheck={false}
                    value={resetPasswordVal}
                    onChange={(e) => setResetPasswordVal(e.target.value)}
                    placeholder="Enter your new password"
                    className="w-full pl-10 pr-10 py-2.5 rounded-xl border text-sm focus:outline-hidden focus:ring-2 focus:ring-amber-500/20 transition-all"
                    style={{
                      backgroundColor: 'var(--color-surface-elevated)',
                      borderColor: 'var(--color-border)',
                      color: 'var(--color-text)',
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowResetPassword(!showResetPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center cursor-pointer hover:opacity-75"
                    style={{ color: 'var(--color-text-muted)' }}
                  >
                    {showResetPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                id="btn-submit-reset"
                type="submit"
                disabled={isSubmitting || !email || resetPasswordVal.length < 6}
                className="w-full flex items-center justify-center space-x-2 py-3 rounded-xl font-semibold text-sm transition-all cursor-pointer shadow-md disabled:opacity-50 active:scale-98"
                style={{
                  backgroundColor: 'var(--color-accent)',
                  color: 'var(--color-accent-text, #ffffff)',
                }}
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Updating Password...</span>
                  </>
                ) : (
                  <>
                    <span>Reset Password &amp; Sign In</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          ) : tab === 'signup' ? (
            /* SIGN UP FORM (Name, Email, Password) */
            <form onSubmit={handleSignUp} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--color-text)' }}>
                  Full Name
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none" style={{ color: 'var(--color-text-muted)' }}>
                    <UserIcon className="w-4 h-4" />
                  </div>
                  <input
                    id="input-signup-name"
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Maya Lin"
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border text-sm focus:outline-hidden focus:ring-2 focus:ring-amber-500/20 transition-all"
                    style={{
                      backgroundColor: 'var(--color-surface-elevated)',
                      borderColor: 'var(--color-border)',
                      color: 'var(--color-text)',
                    }}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--color-text)' }}>
                  Email Address
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none" style={{ color: 'var(--color-text-muted)' }}>
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    id="input-signup-email"
                    type="email"
                    required
                    autoCapitalize="none"
                    autoCorrect="off"
                    spellCheck={false}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="maya@example.com"
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border text-sm focus:outline-hidden focus:ring-2 focus:ring-amber-500/20 transition-all"
                    style={{
                      backgroundColor: 'var(--color-surface-elevated)',
                      borderColor: 'var(--color-border)',
                      color: 'var(--color-text)',
                    }}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--color-text)' }}>
                  Create Password (minimum 6 characters)
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none" style={{ color: 'var(--color-text-muted)' }}>
                    <KeyRound className="w-4 h-4" />
                  </div>
                  <input
                    id="input-signup-password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    minLength={6}
                    autoCapitalize="none"
                    autoCorrect="off"
                    spellCheck={false}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-10 py-2.5 rounded-xl border text-sm focus:outline-hidden focus:ring-2 focus:ring-amber-500/20 transition-all"
                    style={{
                      backgroundColor: 'var(--color-surface-elevated)',
                      borderColor: 'var(--color-border)',
                      color: 'var(--color-text)',
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center cursor-pointer hover:opacity-75"
                    style={{ color: 'var(--color-text-muted)' }}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                id="btn-submit-signup"
                type="submit"
                disabled={isSubmitting || !name || !email || !password}
                className="w-full flex items-center justify-center space-x-2 py-3 rounded-xl font-semibold text-sm transition-all cursor-pointer shadow-md disabled:opacity-50 active:scale-98"
                style={{
                  backgroundColor: 'var(--color-accent)',
                  color: 'var(--color-accent-text, #ffffff)',
                }}
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Creating Your Account...</span>
                  </>
                ) : (
                  <>
                    <span>Sign Up with Email &amp; Password</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          ) : (
            /* SIGN IN FORM (Email, Password) */
            <form onSubmit={handleSignIn} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--color-text)' }}>
                  Email Address
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none" style={{ color: 'var(--color-text-muted)' }}>
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    id="input-signin-email"
                    type="email"
                    required
                    autoCapitalize="none"
                    autoCorrect="off"
                    spellCheck={false}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@example.com"
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border text-sm focus:outline-hidden focus:ring-2 focus:ring-amber-500/20 transition-all"
                    style={{
                      backgroundColor: 'var(--color-surface-elevated)',
                      borderColor: 'var(--color-border)',
                      color: 'var(--color-text)',
                    }}
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold" style={{ color: 'var(--color-text)' }}>
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setIsResetMode(true);
                      setLocalError(null);
                      setSuccessNotice(null);
                    }}
                    className="text-xs font-medium text-amber-600 dark:text-amber-400 hover:underline cursor-pointer"
                  >
                    Forgot password?
                  </button>
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none" style={{ color: 'var(--color-text-muted)' }}>
                    <KeyRound className="w-4 h-4" />
                  </div>
                  <input
                    id="input-signin-password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    autoCapitalize="none"
                    autoCorrect="off"
                    spellCheck={false}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-10 py-2.5 rounded-xl border text-sm focus:outline-hidden focus:ring-2 focus:ring-amber-500/20 transition-all"
                    style={{
                      backgroundColor: 'var(--color-surface-elevated)',
                      borderColor: 'var(--color-border)',
                      color: 'var(--color-text)',
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center cursor-pointer hover:opacity-75"
                    style={{ color: 'var(--color-text-muted)' }}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                id="btn-submit-signin"
                type="submit"
                disabled={isSubmitting || !email || !password}
                className="w-full flex items-center justify-center space-x-2 py-3 rounded-xl font-semibold text-sm transition-all cursor-pointer shadow-md disabled:opacity-50 active:scale-98"
                style={{
                  backgroundColor: 'var(--color-accent)',
                  color: 'var(--color-accent-text, #ffffff)',
                }}
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Signing In...</span>
                  </>
                ) : (
                  <>
                    <span>Sign In to Studio</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          )}

          {/* Security & Data Isolation Notice */}
          <div
            className="mt-6 pt-5 border-t flex items-center justify-between text-[11px]"
            style={{
              borderColor: 'var(--color-border)',
              color: 'var(--color-text-muted)',
            }}
          >
            <div className="flex items-center space-x-1.5">
              <Lock className="w-3.5 h-3.5 text-emerald-500" />
              <span>Owner-bound Firestore rules</span>
            </div>
            <div className="flex items-center space-x-1.5">
              <Shield className="w-3.5 h-3.5 text-amber-500" />
              <span>Encrypted credentials</span>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer
        className="text-center py-4 text-xs"
        style={{ color: 'var(--color-text-muted)' }}
      >
        <p>MindReflect &copy; {new Date().getFullYear()} &mdash; Private AI Journaling Platform with Multi-Model Fallbacks</p>
      </footer>
    </div>
  );
};
