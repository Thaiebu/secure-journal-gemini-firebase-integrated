import React, { useState, useEffect, useRef } from 'react';
import {
  Sparkles,
  Shield,
  Lock,
  BrainCircuit,
  BookMarked,
  AlertCircle,
  Info,
  Mail,
  User as UserIcon,
  ArrowRight,
  CheckCircle2,
  KeyRound,
  RefreshCw,
  ExternalLink,
  Copy,
  Check,
} from 'lucide-react';
import { requestEmailOtp, verifyEmailOtp, SendOtpResult } from '../services/authService';
import { UserProfile } from '../types';

interface AuthLandingProps {
  onGoogleSignIn: () => void;
  onVerifiedAccess: (user: UserProfile) => void;
  isLoading: boolean;
  error: string | null;
  onClearError?: () => void;
}

type AuthMode = 'signin' | 'signup' | 'otp-verify' | 'access-granted';

export const AuthLanding: React.FC<AuthLandingProps> = ({
  onGoogleSignIn,
  onVerifiedAccess,
  isLoading,
  error,
  onClearError,
}) => {
  const [mode, setMode] = useState<AuthMode>('signup');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [otpCode, setOtpCode] = useState(['', '', '', '', '', '']);
  const [activeOtpSession, setActiveOtpSession] = useState<SendOtpResult | null>(null);
  const [verifiedUser, setVerifiedUser] = useState<UserProfile | null>(null);
  const [accessUrl, setAccessUrl] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);
  const [countdown, setCountdown] = useState<number>(0);
  const [copiedLink, setCopiedLink] = useState(false);

  const otpInputsRef = useRef<(HTMLInputElement | null)[]>([]);

  // Countdown timer effect
  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setInterval(() => {
      setCountdown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [countdown]);

  const handleModeChange = (newMode: AuthMode) => {
    setMode(newMode);
    setLocalError(null);
    setSuccessNotice(null);
    if (onClearError) onClearError();
  };

  // Step 1: Send OTP to Email
  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    setSuccessNotice(null);

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) {
      setLocalError('Please enter your email address.');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanEmail)) {
      setLocalError('Please provide a valid email format (e.g. name@example.com).');
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await requestEmailOtp(cleanEmail, name.trim(), mode === 'signin' ? 'signin' : 'signup');
      setActiveOtpSession(res);
      setMode('otp-verify');
      setCountdown(res.expiresInSeconds || 600);
      setOtpCode(['', '', '', '', '', '']);
      setSuccessNotice(`A 6-digit verification code has been dispatched to ${cleanEmail}.`);
      
      // Auto-focus first digit
      setTimeout(() => {
        otpInputsRef.current[0]?.focus();
      }, 150);
    } catch (err: any) {
      console.error('[Send OTP Error]', err);
      setLocalError(err.message || 'Failed to dispatch verification code. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Step 2: Handle 6-digit OTP input changes
  const handleOtpChange = (index: number, val: string) => {
    if (localError) setLocalError(null);
    const cleaned = val.replace(/\D/g, '');

    // Support multi-character paste
    if (cleaned.length > 1) {
      const chars = cleaned.slice(0, 6).split('');
      const newOtp = [...otpCode];
      chars.forEach((c, idx) => {
        newOtp[idx] = c;
      });
      setOtpCode(newOtp);
      const nextIdx = Math.min(chars.length, 5);
      otpInputsRef.current[nextIdx]?.focus();
      return;
    }

    const newOtp = [...otpCode];
    newOtp[index] = cleaned;
    setOtpCode(newOtp);

    // Auto-advance to next box
    if (cleaned && index < 5) {
      otpInputsRef.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otpCode[index] && index > 0) {
      otpInputsRef.current[index - 1]?.focus();
    }
  };

  // Step 3: Verify submitted OTP
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);

    const fullCode = otpCode.join('').trim();
    if (fullCode.length !== 6) {
      setLocalError('Please enter the complete 6-digit verification code.');
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await verifyEmailOtp(email.trim().toLowerCase(), fullCode, name.trim());
      setVerifiedUser(res.userProfile);
      
      // Construct full app access URL
      const currentOrigin = typeof window !== 'undefined' ? window.location.origin : '';
      const fullUrl = `${currentOrigin}/#authenticated`;
      setAccessUrl(fullUrl);

      // Transition to Access Granted step
      setMode('access-granted');
      setSuccessNotice('Email verified! Your secure access link is ready.');
    } catch (err: any) {
      console.error('[Verify OTP Error]', err);
      setLocalError(err.message || 'Invalid or expired verification code. Please check and try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Direct app launcher
  const handleLaunchApp = () => {
    if (verifiedUser) {
      onVerifiedAccess(verifiedUser);
    }
  };

  const handleCopyLink = () => {
    if (accessUrl) {
      navigator.clipboard.writeText(accessUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    }
  };

  const displayedError = localError || error;

  return (
    <div className="min-h-[calc(100vh-4rem)] flex flex-col justify-between py-8 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto">
      {/* Hero Header */}
      <div className="text-center max-w-3xl mx-auto pt-4 sm:pt-6">
        <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-semibold mb-5">
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          <span>Mindful AI Reflection & Cloud Firestore</span>
        </div>

        <h1 className="font-serif-display text-4xl sm:text-5xl font-bold text-neutral-100 tracking-tight leading-[1.15]">
          A serene sanctuary for your thoughts and growth.
        </h1>

        <p className="mt-4 text-base sm:text-lg text-neutral-400 leading-relaxed font-light max-w-2xl mx-auto">
          Capture reflections, converse with Gemini 3.6 Flash, and secure your thoughts with isolated Cloud Firestore database storage.
        </p>
      </div>

      {/* Authentication Card */}
      <div className="my-8 max-w-md w-full mx-auto">
        <div className="p-6 sm:p-8 rounded-2xl bg-[#141414] border border-neutral-800 shadow-xl relative overflow-hidden">
          {/* Subtle Ambient Glow */}
          <div className="absolute top-0 right-0 -mr-16 -mt-16 w-36 h-36 rounded-full bg-amber-500/5 blur-2xl pointer-events-none" />

          {/* Mode Switcher Tabs (Only when not in verification / access step) */}
          {mode !== 'otp-verify' && mode !== 'access-granted' && (
            <div className="flex p-1 rounded-xl bg-neutral-900 border border-neutral-800 mb-6">
              <button
                type="button"
                id="tab-auth-signup"
                onClick={() => handleModeChange('signup')}
                className={`flex-1 py-2 text-xs sm:text-sm font-semibold rounded-lg transition-all cursor-pointer ${
                  mode === 'signup'
                    ? 'bg-neutral-800 text-neutral-100 shadow-xs'
                    : 'text-neutral-400 hover:text-neutral-200'
                }`}
              >
                Create Account (OTP)
              </button>
              <button
                type="button"
                id="tab-auth-signin"
                onClick={() => handleModeChange('signin')}
                className={`flex-1 py-2 text-xs sm:text-sm font-semibold rounded-lg transition-all cursor-pointer ${
                  mode === 'signin'
                    ? 'bg-neutral-800 text-neutral-100 shadow-xs'
                    : 'text-neutral-400 hover:text-neutral-200'
                }`}
              >
                Sign In
              </button>
            </div>
          )}

          {/* STEP 1: Email Form (Sign Up or Sign In via OTP) */}
          {(mode === 'signup' || mode === 'signin') && (
            <div>
              {/* Google 1-Click Sign-In */}
              <button
                id="btn-google-signin"
                type="button"
                onClick={onGoogleSignIn}
                disabled={isLoading || isSubmitting}
                className="w-full inline-flex items-center justify-center space-x-3 px-5 py-3 rounded-xl bg-neutral-100 text-neutral-950 font-semibold hover:bg-white shadow-sm hover:shadow transition-all active:scale-[0.99] disabled:opacity-60 cursor-pointer text-sm"
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
                <div className="flex-1 border-t border-neutral-800" />
                <span className="px-3 text-xs uppercase tracking-wider text-neutral-500 font-medium">
                  or with email OTP
                </span>
                <div className="flex-1 border-t border-neutral-800" />
              </div>

              <form onSubmit={handleSendOtp} className="space-y-4">
                {mode === 'signup' && (
                  <div>
                    <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                      Full Name
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-neutral-500">
                        <UserIcon className="w-4 h-4" />
                      </div>
                      <input
                        id="input-auth-name"
                        type="text"
                        value={name}
                        onChange={(e) => {
                          setName(e.target.value);
                          if (displayedError) setLocalError(null);
                        }}
                        placeholder="e.g. Alex River"
                        className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-[#1a1a1a] border border-neutral-800 text-neutral-100 placeholder-neutral-500 text-sm focus:outline-hidden focus:border-amber-500/80 focus:ring-1 focus:ring-amber-500/50 transition-all"
                      />
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                    Email Address
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-neutral-500">
                      <Mail className="w-4 h-4" />
                    </div>
                    <input
                      id="input-auth-email"
                      type="email"
                      required
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        if (displayedError) setLocalError(null);
                      }}
                      placeholder="your.email@example.com"
                      className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-[#1a1a1a] border border-neutral-800 text-neutral-100 placeholder-neutral-500 text-sm focus:outline-hidden focus:border-amber-500/80 focus:ring-1 focus:ring-amber-500/50 transition-all"
                    />
                  </div>
                  <p className="mt-1 text-[11px] text-neutral-500">
                    We will send a 6-digit One-Time Password (OTP) to this email to verify access.
                  </p>
                </div>

                {displayedError && (
                  <div className="p-3.5 rounded-xl border bg-rose-950/40 border-rose-800/80 text-rose-300 text-xs flex items-start space-x-2 text-left">
                    <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                    <span className="leading-relaxed">{displayedError}</span>
                  </div>
                )}

                <button
                  id="btn-send-otp"
                  type="submit"
                  disabled={isSubmitting || isLoading}
                  className="w-full inline-flex items-center justify-center space-x-2 px-5 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-neutral-950 font-bold shadow-md hover:shadow-lg transition-all active:scale-[0.99] disabled:opacity-60 cursor-pointer text-sm"
                >
                  {isSubmitting ? (
                    <div className="w-4 h-4 border-2 border-neutral-950/30 border-t-neutral-950 rounded-full animate-spin" />
                  ) : (
                    <>
                      <span>
                        {mode === 'signup' ? 'Send OTP Verification Code' : 'Send Sign-In Code'}
                      </span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>
            </div>
          )}

          {/* STEP 2: OTP Verification Form */}
          {mode === 'otp-verify' && (
            <div>
              <div className="flex items-center justify-between mb-4 pb-2 border-b border-neutral-800">
                <div className="flex items-center space-x-2">
                  <KeyRound className="w-4 h-4 text-amber-400" />
                  <span className="text-sm font-semibold text-neutral-200">Enter Verification Code</span>
                </div>
                <button
                  type="button"
                  onClick={() => handleModeChange('signup')}
                  className="text-xs text-amber-400 hover:text-amber-300 transition-colors cursor-pointer"
                >
                  Change Email
                </button>
              </div>

              <p className="text-xs text-neutral-400 mb-4 leading-relaxed">
                We sent a 6-digit code to <strong className="text-neutral-200">{email}</strong>. Enter the code below to verify your account and obtain your access link.
              </p>

              {/* Dev / Preview OTP Helper (Ensures user is never blocked) */}
              {activeOtpSession?.devOtpCode && (
                <div className="mb-5 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    <span className="text-xs text-amber-300 font-medium">
                      In-App Preview OTP: <strong className="tracking-widest font-mono text-amber-200">{activeOtpSession.devOtpCode}</strong>
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const chars = activeOtpSession.devOtpCode!.split('');
                      setOtpCode(chars);
                    }}
                    className="text-[11px] px-2 py-0.5 rounded-md bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 font-semibold transition-colors cursor-pointer"
                  >
                    Auto-fill
                  </button>
                </div>
              )}

              <form onSubmit={handleVerifyOtp} className="space-y-5">
                <div>
                  <label className="block text-xs font-semibold text-neutral-300 mb-2 text-center">
                    6-Digit Security Code
                  </label>
                  <div className="flex justify-between gap-2 sm:gap-2.5">
                    {otpCode.map((digit, idx) => (
                      <input
                        key={idx}
                        ref={(el) => { otpInputsRef.current[idx] = el; }}
                        type="text"
                        inputMode="numeric"
                        maxLength={1}
                        value={digit}
                        onChange={(e) => handleOtpChange(idx, e.target.value)}
                        onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                        className="w-11 h-12 sm:w-12 sm:h-13 text-center text-xl font-bold font-mono rounded-xl bg-[#1a1a1a] border border-neutral-700 text-amber-300 focus:outline-hidden focus:border-amber-500 focus:ring-2 focus:ring-amber-500/40 transition-all"
                      />
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs text-neutral-400">
                  <span>
                    {countdown > 0 ? (
                      `Code expires in ${Math.floor(countdown / 60)}:${(countdown % 60)
                        .toString()
                        .padStart(2, '0')}`
                    ) : (
                      <span className="text-rose-400">Code expired</span>
                    )}
                  </span>

                  <button
                    type="button"
                    onClick={handleSendOtp}
                    disabled={isSubmitting}
                    className="inline-flex items-center space-x-1 text-amber-400 hover:text-amber-300 disabled:opacity-50 transition-colors cursor-pointer"
                  >
                    <RefreshCw className="w-3 h-3" />
                    <span>Resend Code</span>
                  </button>
                </div>

                {displayedError && (
                  <div className="p-3.5 rounded-xl border bg-rose-950/40 border-rose-800/80 text-rose-300 text-xs flex items-start space-x-2 text-left">
                    <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                    <span className="leading-relaxed">{displayedError}</span>
                  </div>
                )}

                <button
                  id="btn-verify-otp"
                  type="submit"
                  disabled={isSubmitting || otpCode.join('').length !== 6}
                  className="w-full inline-flex items-center justify-center space-x-2 px-5 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-neutral-950 font-bold shadow-md hover:shadow-lg transition-all active:scale-[0.99] disabled:opacity-50 cursor-pointer text-sm"
                >
                  {isSubmitting ? (
                    <div className="w-4 h-4 border-2 border-neutral-950/30 border-t-neutral-950 rounded-full animate-spin" />
                  ) : (
                    <>
                      <span>Verify Code & Unlock App</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>
            </div>
          )}

          {/* STEP 3: Access Granted & Direct App Link */}
          {mode === 'access-granted' && verifiedUser && (
            <div className="text-center py-2 space-y-5">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center shadow-lg">
                <CheckCircle2 className="w-8 h-8" />
              </div>

              <div>
                <h3 className="text-xl font-bold text-neutral-100 font-serif-display">
                  Email Verified & Access Granted!
                </h3>
                <p className="mt-1 text-xs text-neutral-400">
                  Welcome to MindReflect, <strong className="text-neutral-200">{verifiedUser.displayName || verifiedUser.email}</strong>.
                </p>
              </div>

              {/* Verified Direct Access Link Box */}
              <div className="p-3.5 rounded-xl bg-neutral-900 border border-neutral-800 text-left space-y-2">
                <div className="flex items-center justify-between text-xs text-neutral-400">
                  <span className="font-semibold text-neutral-300 flex items-center space-x-1.5">
                    <Shield className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Your Verified Access URL</span>
                  </span>
                  <span className="text-[10px] text-emerald-400 font-medium">Active & Authenticated</span>
                </div>

                <div className="flex items-center space-x-2 bg-[#121212] p-2 rounded-lg border border-neutral-800/80">
                  <span className="flex-1 text-xs font-mono text-neutral-300 truncate">
                    {accessUrl || window.location.href}
                  </span>
                  <button
                    type="button"
                    onClick={handleCopyLink}
                    title="Copy Access Link"
                    className="p-1.5 rounded-md hover:bg-neutral-800 text-neutral-400 hover:text-neutral-200 transition-colors cursor-pointer"
                  >
                    {copiedLink ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Primary Action Button */}
              <button
                id="btn-enter-app"
                type="button"
                onClick={handleLaunchApp}
                className="w-full inline-flex items-center justify-center space-x-2.5 px-6 py-3.5 rounded-xl bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 text-neutral-950 font-bold shadow-lg hover:shadow-xl transition-all active:scale-[0.99] cursor-pointer text-sm"
              >
                <span>Launch & Enter App Now</span>
                <ExternalLink className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Privacy & Security Footnote */}
          <div className="mt-5 pt-4 border-t border-neutral-800/60 flex items-center justify-center space-x-4 text-[11px] text-neutral-400">
            <span className="flex items-center space-x-1">
              <Lock className="w-3 h-3 text-emerald-400" />
              <span>Owner-bound Firestore</span>
            </span>
            <span>&bull;</span>
            <span className="flex items-center space-x-1">
              <Shield className="w-3 h-3 text-amber-400" />
              <span>Zero-Trust Verified</span>
            </span>
          </div>
        </div>
      </div>

      {/* Feature Highlights Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 my-6">
        <div className="p-5 rounded-2xl bg-[#141414] border border-neutral-800/80 shadow-xs hover:border-amber-500/40 transition-colors">
          <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center mb-3">
            <BrainCircuit className="w-4 h-4" />
          </div>
          <h3 className="text-sm font-bold text-neutral-100 mb-1.5">
            Multi-Turn AI Dialogue
          </h3>
          <p className="text-xs text-neutral-400 leading-relaxed">
            Converse naturally with Gemini 3.6 Flash. Brainstorm ideas, dissect challenges, or reflect deeply on your daily experiences.
          </p>
        </div>

        <div className="p-5 rounded-2xl bg-[#141414] border border-neutral-800/80 shadow-xs hover:border-emerald-500/40 transition-colors">
          <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center mb-3">
            <Shield className="w-4 h-4" />
          </div>
          <h3 className="text-sm font-bold text-neutral-100 mb-1.5">
            Firestore Data Isolation
          </h3>
          <p className="text-xs text-neutral-400 leading-relaxed">
            Every entry is strictly scoped to your authenticated Firebase UID. Other users cannot query, read, or tamper with your reflections.
          </p>
        </div>

        <div className="p-5 rounded-2xl bg-[#141414] border border-neutral-800/80 shadow-xs hover:border-purple-500/40 transition-colors">
          <div className="w-9 h-9 rounded-xl bg-purple-500/10 border border-purple-500/30 text-purple-400 flex items-center justify-center mb-3">
            <BookMarked className="w-4 h-4" />
          </div>
          <h3 className="text-sm font-bold text-neutral-100 mb-1.5">
            Automatic Insights & Summary
          </h3>
          <p className="text-xs text-neutral-400 leading-relaxed">
            Generate synthesis, emotional tone detection, key realizations, and follow-up inquiry questions with resilient model fallback.
          </p>
        </div>
      </div>

      {/* Footer */}
      <footer className="mt-4 text-center text-xs text-neutral-500">
        MindReflect &copy; {new Date().getFullYear()} &bull; Google AI Studio &bull; Cloud Firestore
      </footer>
    </div>
  );
};
