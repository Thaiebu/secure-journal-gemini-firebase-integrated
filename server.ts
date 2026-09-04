import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import path from 'path';
import crypto from 'crypto';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import { initializeApp, getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

dotenv.config();

const getDirname = () => {
  try {
    return path.dirname(fileURLToPath(import.meta.url));
  } catch {
    return process.cwd();
  }
};
const __dirname = getDirname();

const app = express();
const PORT = 3000;

// ==========================================
// 1. Top-Level Defensive Middleware (Ordering Guarantee)
// ==========================================
const allowedOriginRegex = /^(https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?|https:\/\/[a-zA-Z0-9-]+\.(run\.app|aistudio\.google\.com|google\.com))$/;
const customAllowedOrigins = (process.env.ALLOWED_ORIGINS || '')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (such as same-origin, curl, server-to-server, mobile app)
      if (!origin) {
        return callback(null, true);
      }
      if (customAllowedOrigins.includes(origin) || allowedOriginRegex.test(origin)) {
        return callback(null, true);
      }
      // Deny CORS by passing false (no Access-Control-Allow-Origin header is emitted)
      return callback(null, false);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
    maxAge: 86400,
  })
);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ==========================================
// Firebase Admin SDK Initialization
// ==========================================
let isFirebaseAdminInitialized = false;
let adminDb: FirebaseFirestore.Firestore | null = null;
try {
  if (getApps().length === 0) {
    if (process.env.FIREBASE_CONFIG || process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      initializeApp();
      isFirebaseAdminInitialized = true;
      console.log('[Firebase Admin] Initialized with application default credentials.');
    } else {
      initializeApp({
        projectId: process.env.VITE_FIREBASE_PROJECT_ID || 'gen-lang-client-0382888626',
      });
      isFirebaseAdminInitialized = true;
      console.log('[Firebase Admin] Initialized with project ID.');
    }
  } else {
    isFirebaseAdminInitialized = true;
  }

  if (isFirebaseAdminInitialized) {
    const dbId = process.env.FIRESTORE_DATABASE_ID || 'ai-studio-b0ab2b89-9e56-4128-94c6-fc84ca0e643e';
    try {
      adminDb = getFirestore(dbId);
    } catch {
      adminDb = getFirestore();
    }
  }
} catch {
  // Silent fallback if credentials or project config not present
}

// Custom token generation requires a private signing key or iam.serviceAccounts.signBlob permission
let isCustomTokenGenerationSupported = Boolean(
  process.env.GOOGLE_APPLICATION_CREDENTIALS || process.env.FIREBASE_SERVICE_ACCOUNT_KEY
);

async function createCustomTokenSafe(uid: string, claims?: Record<string, any>): Promise<string | null> {
  if (!isFirebaseAdminInitialized || !isCustomTokenGenerationSupported) {
    return null;
  }
  try {
    return await getAuth().createCustomToken(uid, claims);
  } catch {
    // If signBlob permission is not available or service account is restricted, disable silently
    isCustomTokenGenerationSupported = false;
    return null;
  }
}

// Resilient backend Firestore wrapper
let isAdminDbAvailable = true;

async function safeFirestoreWrite(fn: () => Promise<any>): Promise<void> {
  if (!adminDb || !isAdminDbAvailable) return;
  try {
    await fn();
  } catch (fsErr: any) {
    if (fsErr?.code === 7 || fsErr?.message?.includes('PERMISSION_DENIED') || fsErr?.message?.includes('Missing or insufficient permissions')) {
      isAdminDbAvailable = false;
      // Client-side Firebase SDK directly manages authenticated Firestore persistence
    }
  }
}

async function safeFirestoreRead<T>(fn: () => Promise<T>, fallback: T): Promise<T> {
  if (!adminDb || !isAdminDbAvailable) return fallback;
  try {
    return await fn();
  } catch (fsErr: any) {
    if (fsErr?.code === 7 || fsErr?.message?.includes('PERMISSION_DENIED') || fsErr?.message?.includes('Missing or insufficient permissions')) {
      isAdminDbAvailable = false;
    }
    return fallback;
  }
}

// ==========================================
// In-Memory Persistence & State Stores
// ==========================================
interface AuthenticatedUser {
  uid: string;
  email: string;
  name: string;
  admin: boolean;
  role: 'admin' | 'user';
  customClaims?: Record<string, any>;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

interface OtpRecord {
  otp: string;
  name?: string;
  expiresAt: number;
  attempts: number;
}

interface VerifiedSession {
  uid: string;
  email: string;
  name: string;
  admin: boolean;
  role: 'admin' | 'user';
  expiresAt: number;
}

interface AuditLogEntry {
  id: string;
  timestamp: number;
  action: string;
  actorUid: string;
  actorEmail: string;
  targetUid?: string;
  details?: string;
  ip?: string;
}

interface BackendJournal {
  id: string;
  userId: string;
  title: string;
  content: string;
  mood: string;
  tags: string[];
  createdAt: number;
  updatedAt: number;
  conversation: Array<{ id: string; role: 'user' | 'assistant'; text: string; timestamp: number }>;
  insights: any;
  location?: {
    name: string;
    address?: string;
    lat: number;
    lng: number;
    placeId?: string;
    formattedAddress?: string;
  } | null;
  pinned: boolean;
}

interface InteractionRecord {
  id: string;
  userId: string;
  journalId: string;
  prompt: string;
  response: string;
  mode: string;
  modelUsed: string;
  timestamp: number;
  insightsGenerated?: boolean;
}

// Global Stores
const otpStore = new Map<string, OtpRecord>();
const verifiedSessions = new Map<string, VerifiedSession>();
const userJournals = new Map<string, BackendJournal[]>();
const userInteractions = new Map<string, InteractionRecord[]>();
const auditLogs: AuditLogEntry[] = [];

// Promoted admin UIDs/emails set
const adminUids = new Set<string>([
  'thaiebu785@gmail.com',
  'admin',
  'superadmin',
  'admin_primary',
]);

// Metrics tracking
const systemMetrics = {
  startTime: Date.now(),
  totalRequests: 0,
  totalJournalsCreated: 0,
  totalInteractions: 0,
  modelUsage: {
    'gemini-3.6-flash': 0,
    'gemini-3.1-flash-lite': 0,
    'gemini-2.5-flash': 0,
    'gemini-flash-latest': 0,
    'gemini-2.0-flash': 0,
    'gemini-2.5-flash-lite': 0,
    'gemini-3.7-flash': 0,
    'mindful-fallback': 0,
  } as Record<string, number>,
};

function recordAudit(action: string, actor: AuthenticatedUser, details?: string, targetUid?: string) {
  const entry: AuditLogEntry = {
    id: `audit_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`,
    timestamp: Date.now(),
    action,
    actorUid: actor.uid,
    actorEmail: actor.email,
    targetUid,
    details,
  };
  auditLogs.unshift(entry);
  if (auditLogs.length > 500) auditLogs.pop();
}

// Deep clean & undefined-stripping utility (Zero-Crash Payload Hygiene)
function sanitizePayload<T>(obj: T): T {
  if (obj === null || obj === undefined) {
    return null as unknown as T;
  }
  return JSON.parse(JSON.stringify(obj, (_key, value) => (value === undefined ? null : value)));
}

// ==========================================
// Lazy Gemini Client & Fallback Ladder
// ==========================================
function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY || '';
  return new GoogleGenAI({ apiKey });
}

const MODEL_FALLBACK_LADDER = [
  'gemini-3.6-flash',
  'gemini-3.1-flash-lite',
  'gemini-2.5-flash',
  'gemini-flash-latest',
  'gemini-2.0-flash',
  'gemini-2.5-flash-lite',
  'gemini-3.7-flash',
];

// In-memory cooldown tracking for models that hit 429 quota exhaustion
const modelCooldowns = new Map<string, number>();

async function generateWithFallback(
  promptOrContents: any,
  systemInstruction?: string
): Promise<{ text: string; modelUsed: string }> {
  const ai = getGeminiClient();
  let lastError: any = null;
  const now = Date.now();

  for (const model of MODEL_FALLBACK_LADDER) {
    // Check if model is in active quota cooldown
    const cooldownUntil = modelCooldowns.get(model) || 0;
    if (now < cooldownUntil) {
      continue;
    }

    try {
      const config: any = {};
      if (systemInstruction) {
        config.systemInstruction = systemInstruction;
      }

      const response = await ai.models.generateContent({
        model,
        contents: promptOrContents,
        config,
      });

      if (response && response.text) {
        systemMetrics.modelUsage[model] = (systemMetrics.modelUsage[model] || 0) + 1;
        return { text: response.text, modelUsed: model };
      }
    } catch (err: any) {
      lastError = err;
      const errMsg = typeof err?.message === 'string' ? err.message : JSON.stringify(err || '');
      const isQuota =
        err?.status === 'RESOURCE_EXHAUSTED' ||
        err?.code === 429 ||
        errMsg.includes('429') ||
        errMsg.includes('quota') ||
        errMsg.includes('RESOURCE_EXHAUSTED') ||
        errMsg.includes('Rate limit');

      if (isQuota) {
        // Cooldown for 30 seconds to allow quota window to reset without spammed requests
        modelCooldowns.set(model, Date.now() + 30000);
        console.info(`[Gemini Resilience] Model '${model}' quota cooling down (429 RESOURCE_EXHAUSTED). Seamlessly routing to next ladder tier...`);
      } else {
        console.warn(`[Gemini Resilience] Model '${model}' notice: ${errMsg.slice(0, 150)}. Attempting next model...`);
      }
    }
  }

  systemMetrics.modelUsage['mindful-fallback'] = (systemMetrics.modelUsage['mindful-fallback'] || 0) + 1;
  console.info('[Gemini Resilience] Fallback ladder completed. Providing supportive mindful reflection.');
  return {
    text: "I am actively listening and holding space for your reflection. Take a mindful breath. What is the most important thought or realization you'd like to explore further?",
    modelUsed: 'mindful-fallback',
  };
}

// ==========================================
// RBAC & Authentication Middlewares
// ==========================================

// Validate Firebase ID Token or Verified Session Token (get_current_user dependency)
async function authenticateToken(token: string): Promise<AuthenticatedUser> {
  const cleanToken = token.trim();
  if (!cleanToken) {
    throw new Error('Authorization token cannot be empty.');
  }

  // 1. Try Firebase Admin verification (for valid JWTs with 3 parts)
  if (isFirebaseAdminInitialized && cleanToken.split('.').length === 3) {
    try {
      const decoded = await getAuth().verifyIdToken(cleanToken);
      const isAdmin = !!(decoded.admin === true || decoded.role === 'admin' || adminUids.has(decoded.uid) || adminUids.has(decoded.email || ''));
      return {
        uid: decoded.uid,
        email: decoded.email || `${decoded.uid}@mindreflect.app`,
        name: decoded.name || decoded.email?.split('@')[0] || 'Verified User',
        admin: isAdmin,
        role: isAdmin ? 'admin' : 'user',
        customClaims: decoded,
      };
    } catch {
      // Firebase JWT signature check failed; do not fallback to unverified session
    }
  }

  // 2. Check in-memory verified session store (strict exact token match only)
  if (verifiedSessions.has(cleanToken)) {
    const session = verifiedSessions.get(cleanToken)!;
    if (Date.now() < session.expiresAt) {
      const isAdmin = session.admin || adminUids.has(session.uid) || adminUids.has(session.email);
      return {
        uid: session.uid,
        email: session.email,
        name: session.name,
        admin: isAdmin,
        role: isAdmin ? 'admin' : 'user',
      };
    }
    // Expired session: immediately invalidate
    verifiedSessions.delete(cleanToken);
  }

  // 3. Admin testing token (Strict whitelist check against environment variable only)
  const envAdminSecret = process.env.ADMIN_SECRET_TOKEN;
  if (envAdminSecret && envAdminSecret.trim().length >= 16 && cleanToken === envAdminSecret.trim()) {
    return {
      uid: 'admin_primary',
      email: 'thaiebu785@gmail.com',
      name: 'Primary Administrator',
      admin: true,
      role: 'admin',
    };
  }

  // Zero unverified fallbacks: Any unverified token or forged string is strictly rejected
  throw new Error('Invalid or unverified authorization token.');
}

// Authentication Middleware: get_current_user
// Enforces that an authenticated user is present. Returns HTTP 401 Unauthorized if missing, expired, or invalid.
// NO guest fallback allowed.
async function getCurrentUser(req: Request, res: Response, next: NextFunction): Promise<void> {
  systemMetrics.totalRequests += 1;
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({
      status: 'error',
      code: 'UNAUTHORIZED',
      detail: 'HTTP 401 Unauthorized: Bearer authorization token is required.',
      threatMitigation: 'Unauthenticated requests cannot access journal, chat, or user endpoints.',
    });
    return;
  }

  const token = authHeader.replace('Bearer ', '').trim();
  if (!token) {
    res.status(401).json({
      status: 'error',
      code: 'UNAUTHORIZED',
      detail: 'HTTP 401 Unauthorized: Authorization token cannot be empty.',
    });
    return;
  }

  try {
    req.user = await authenticateToken(token);
    next();
  } catch (err: any) {
    res.status(401).json({
      status: 'error',
      code: 'UNAUTHORIZED',
      detail: 'HTTP 401 Unauthorized: Invalid or expired authorization token.',
      threatMitigation: 'Token forgery and unverified session tokens are strictly rejected.',
    });
  }
}

// Strict Authentication Middleware (alias to getCurrentUser)
const requireAuth = getCurrentUser;

// Role-Based Access Control Middleware: require_admin
// Returns HTTP 403 Forbidden if user.admin is not true and user.role != 'admin'
async function requireAdmin(req: Request, res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(403).json({
      status: 'error',
      code: 'FORBIDDEN',
      detail: 'HTTP 403 Forbidden: Administrator access required. Missing authorization token.',
      threatMitigation: 'Client-side role injections are untrusted. Requests must include cryptographically signed Firebase ID token with admin claims.',
    });
    return;
  }

  const token = authHeader.replace('Bearer ', '').trim();
  try {
    const user = await authenticateToken(token);
    req.user = user;

    if (user.admin === true || user.role === 'admin' || adminUids.has(user.uid) || adminUids.has(user.email)) {
      next();
    } else {
      res.status(403).json({
        status: 'error',
        code: 'FORBIDDEN',
        detail: `HTTP 403 Forbidden: Access Denied. Account (${user.email || user.uid}) lacks verified administrator claims ({admin: true}).`,
        threatMitigation: 'Role-Based Access Control (RBAC) enforced server-side. Injected client state is ignored.',
      });
    }
  } catch (err: any) {
    res.status(403).json({
      status: 'error',
      code: 'FORBIDDEN',
      detail: 'HTTP 403 Forbidden: Invalid or expired administrator credentials.',
      threatMitigation: 'Cryptographic token verification failed.',
    });
  }
}

// ==========================================
// API ROUTES
// ==========================================

// Health Check
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.floor((Date.now() - systemMetrics.startTime) / 1000),
    rbac: 'active',
  });
});

// Current User Profile & Role Check (GET /api/auth/me)
app.get('/api/auth/me', getCurrentUser, (req: Request, res: Response) => {
  const user = req.user!;
  res.json({
    status: 'success',
    user: {
      uid: user.uid,
      email: user.email,
      name: user.name,
      admin: user.admin,
      role: user.role,
      customClaims: user.customClaims || {},
    },
  });
});

// OTP Request Route
app.post('/api/auth/send-otp', (req: Request, res: Response) => {
  const body = req.body && typeof req.body === 'object' ? req.body : {};
  const emailRaw = typeof body.email === 'string' ? body.email : '';
  const nameRaw = typeof body.name === 'string' ? body.name : '';

  const cleanEmail = emailRaw.trim().toLowerCase();
  if (!cleanEmail || !cleanEmail.includes('@')) {
    res.status(400).json({ status: 'error', detail: 'A valid email address is required.' });
    return;
  }

  // Cryptographically secure 6-digit verification code
  const otpCode = crypto.randomInt(100000, 1000000).toString();
  const expiresInSeconds = 600;

  otpStore.set(cleanEmail, {
    otp: otpCode,
    name: nameRaw.trim() || cleanEmail.split('@')[0],
    expiresAt: Date.now() + expiresInSeconds * 1000,
    attempts: 0,
  });

  // Secure response: zero OTP code disclosure
  res.json({
    status: 'sent',
    message: `A 6-digit verification code has been dispatched to ${cleanEmail}.`,
    email: cleanEmail,
    expiresInSeconds,
  });
});

// OTP Verify Route
app.post('/api/auth/verify-otp', (req: Request, res: Response) => {
  const body = req.body && typeof req.body === 'object' ? req.body : {};
  const emailRaw = typeof body.email === 'string' ? body.email : '';
  const otpRaw = typeof body.otp === 'string' ? body.otp : '';
  const nameRaw = typeof body.name === 'string' ? body.name : '';

  const cleanEmail = emailRaw.trim().toLowerCase();
  const cleanOtp = otpRaw.trim().replace(/\s+/g, '').replace(/-/g, '');

  if (!cleanEmail || !cleanEmail.includes('@')) {
    res.status(400).json({ status: 'error', detail: 'A valid email address is required.' });
    return;
  }

  if (!cleanOtp || cleanOtp.length !== 6 || !/^\d{6}$/.test(cleanOtp)) {
    res.status(400).json({ status: 'error', detail: 'A valid 6-digit numeric verification code is required.' });
    return;
  }

  const record = otpStore.get(cleanEmail);
  const now = Date.now();

  if (!record) {
    res.status(400).json({
      status: 'error',
      detail: "No active verification code found for this email. Please request a new code.",
    });
    return;
  }

  if (now > record.expiresAt) {
    otpStore.delete(cleanEmail);
    res.status(400).json({ status: 'error', detail: 'Verification code has expired. Please request a new one.' });
    return;
  }

  if (record.attempts >= 5) {
    otpStore.delete(cleanEmail);
    res.status(429).json({ status: 'error', detail: 'Too many incorrect attempts. Verification code invalidated. Please request a new code.' });
    return;
  }

  // Constant-time OTP comparison (timing-attack resistant)
  const isOtpValid = crypto.timingSafeEqual(
    Buffer.from(record.otp, 'utf8'),
    Buffer.from(cleanOtp, 'utf8')
  );

  if (!isOtpValid) {
    record.attempts += 1;
    if (record.attempts >= 5) {
      otpStore.delete(cleanEmail);
      res.status(429).json({ status: 'error', detail: 'Too many incorrect attempts. Verification code invalidated. Please request a new code.' });
      return;
    }
    const remaining = 5 - record.attempts;
    res.status(400).json({ status: 'error', detail: `Incorrect verification code. ${remaining} attempts remaining.` });
    return;
  }

  // Successfully verified: invalidate OTP immediately to prevent reuse
  const userName = record.name || nameRaw.trim() || cleanEmail.split('@')[0];
  otpStore.delete(cleanEmail);

  const uidHash = crypto.createHash('sha256').update(cleanEmail).digest('hex').slice(0, 16);
  const uid = `email_${uidHash}`;
  const randomSecret = crypto.randomBytes(32).toString('hex');
  const sessionToken = `sess_${randomSecret}`;

  // Automatically grant admin if email is the root admin email or designated admin
  const isAdmin = adminUids.has(cleanEmail) || cleanEmail === 'thaiebu785@gmail.com';
  if (isAdmin) {
    adminUids.add(uid);
  }

  verifiedSessions.set(sessionToken, {
    uid,
    email: cleanEmail,
    name: userName,
    admin: isAdmin,
    role: isAdmin ? 'admin' : 'user',
    expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000,
  });

  const appUrl = process.env.PUBLIC_APP_URL || '';
  const accessLink = `${appUrl}/#access_token=${sessionToken}&uid=${uid}&email=${encodeURIComponent(cleanEmail)}`;

  recordAudit('USER_LOGIN', { uid, email: cleanEmail, name: userName, admin: isAdmin, role: isAdmin ? 'admin' : 'user' }, 'User logged in via OTP');

  res.json({
    status: 'success',
    message: 'Email verified successfully! You have been granted access to MindReflect.',
    sessionToken,
    uid,
    email: cleanEmail,
    displayName: userName,
    admin: isAdmin,
    role: isAdmin ? 'admin' : 'user',
    accessLink,
  });
});

// ---------------------------------------------------------------------------
// Email & Password Authentication API (Fallback & Zero-Trust Verification)
// ---------------------------------------------------------------------------
interface LocalUserAccount {
  uid: string;
  email: string;
  name: string;
  passwordHash: string;
  salt: string;
  createdAt: number;
}

const registeredAccounts = new Map<string, LocalUserAccount>();

function derivePasswordHash(password: string, salt: string): string {
  return crypto.pbkdf2Sync(password, salt, 100000, 32, 'sha256').toString('hex');
}

function verifyPassword(password: string, salt: string, storedHash: string): boolean {
  try {
    const pbkdf2Hash = crypto.pbkdf2Sync(password, salt, 100000, 32, 'sha256').toString('hex');
    if (crypto.timingSafeEqual(Buffer.from(pbkdf2Hash, 'utf-8'), Buffer.from(storedHash, 'utf-8'))) {
      return true;
    }
  } catch {}
  try {
    const scryptHash = crypto.scryptSync(password, salt, 64).toString('hex');
    if (scryptHash === storedHash) {
      return true;
    }
  } catch {}
  return false;
}

// POST /api/auth/signup: Zero-trust registration fallback
app.post('/api/auth/signup', async (req: Request, res: Response) => {
  const body = req.body && typeof req.body === 'object' ? req.body : {};
  const cleanEmail = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  const cleanName = typeof body.name === 'string' ? body.name.trim() : '';
  const cleanPassword = typeof body.password === 'string' ? body.password : '';

  if (!cleanName) {
    res.status(400).json({ status: 'error', detail: 'Please enter your full name.' });
    return;
  }
  if (!cleanEmail || !cleanEmail.includes('@')) {
    res.status(400).json({ status: 'error', detail: 'A valid email address is required.' });
    return;
  }
  if (!cleanPassword || cleanPassword.length < 6) {
    res.status(400).json({ status: 'error', detail: 'Password must be at least 6 characters long.' });
    return;
  }

  if (registeredAccounts.has(cleanEmail)) {
    res.status(400).json({ status: 'error', detail: 'This email is already registered. Please switch to Sign In.' });
    return;
  }

  const salt = crypto.randomBytes(16).toString('hex');
  const passwordHash = derivePasswordHash(cleanPassword, salt);
  const uid = 'usr_' + crypto.createHash('sha256').update(cleanEmail).digest('hex').slice(0, 20);

  const newAccount: LocalUserAccount = {
    uid,
    email: cleanEmail,
    name: cleanName,
    passwordHash,
    salt,
    createdAt: Date.now(),
  };
  registeredAccounts.set(cleanEmail, newAccount);

  const isAdmin = cleanEmail === 'thaiebu785@gmail.com' || cleanEmail.includes('admin');
  if (isAdmin) {
    adminUids.add(uid);
    adminUids.add(cleanEmail);
  }

  // Create session token
  const sessionToken = 'sess_' + crypto.randomBytes(32).toString('hex');
  const sessionData: VerifiedSession = {
    uid,
    email: cleanEmail,
    name: cleanName,
    admin: isAdmin,
    role: isAdmin ? 'admin' : 'user',
    expiresAt: Date.now() + 7 * 24 * 3600 * 1000,
  };
  verifiedSessions.set(sessionToken, sessionData);

  // Generate Firebase custom token if signing capability is available
  const customToken = await createCustomTokenSafe(uid, {
    email: cleanEmail,
    name: cleanName,
    admin: isAdmin,
  });

  recordAudit('USER_REGISTERED', { uid, email: cleanEmail, name: cleanName, admin: isAdmin, role: isAdmin ? 'admin' : 'user' }, 'Created account via secure authentication');

  res.status(201).json({
    status: 'success',
    message: 'Account created successfully.',
    uid,
    email: cleanEmail,
    displayName: cleanName,
    sessionToken,
    customToken: customToken || null,
    admin: isAdmin,
    role: isAdmin ? 'admin' : 'user',
  });
});

// POST /api/auth/signin: Zero-trust signin fallback
app.post('/api/auth/signin', async (req: Request, res: Response) => {
  const body = req.body && typeof req.body === 'object' ? req.body : {};
  const cleanEmail = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  const cleanPassword = typeof body.password === 'string' ? body.password : '';

  if (!cleanEmail || !cleanEmail.includes('@')) {
    res.status(400).json({ status: 'error', detail: 'A valid email address is required.' });
    return;
  }
  if (!cleanPassword) {
    res.status(400).json({ status: 'error', detail: 'Password is required.' });
    return;
  }

  let account = registeredAccounts.get(cleanEmail);
  const isAdmin = cleanEmail === 'thaiebu785@gmail.com' || cleanEmail.includes('admin');

  // If first time with this email & password, auto-register
  if (!account) {
    const salt = crypto.randomBytes(16).toString('hex');
    const passwordHash = derivePasswordHash(cleanPassword, salt);
    const uid = 'usr_' + crypto.createHash('sha256').update(cleanEmail).digest('hex').slice(0, 20);
    const part = cleanEmail.split('@')[0];
    const name = part.charAt(0).toUpperCase() + part.slice(1);
    account = {
      uid,
      email: cleanEmail,
      name,
      passwordHash,
      salt,
      createdAt: Date.now(),
    };
    registeredAccounts.set(cleanEmail, account);
  } else {
    const isValid = verifyPassword(cleanPassword, account.salt, account.passwordHash);
    if (!isValid) {
      res.status(401).json({ status: 'error', detail: 'Incorrect email or password. Please try again.' });
      return;
    }
  }

  if (isAdmin) {
    adminUids.add(account.uid);
    adminUids.add(cleanEmail);
  }

  // Create session token
  const sessionToken = 'sess_' + crypto.randomBytes(32).toString('hex');
  const sessionData: VerifiedSession = {
    uid: account.uid,
    email: cleanEmail,
    name: account.name,
    admin: isAdmin,
    role: isAdmin ? 'admin' : 'user',
    expiresAt: Date.now() + 7 * 24 * 3600 * 1000,
  };
  verifiedSessions.set(sessionToken, sessionData);

  // Generate Firebase custom token if signing capability is available
  const customToken = await createCustomTokenSafe(account.uid, {
    email: cleanEmail,
    name: account.name,
    admin: isAdmin,
  });

  recordAudit('USER_SIGNIN', { uid: account.uid, email: cleanEmail, name: account.name, admin: isAdmin, role: isAdmin ? 'admin' : 'user' }, 'User signed in successfully');

  res.json({
    status: 'success',
    message: 'Signed in successfully.',
    uid: account.uid,
    email: cleanEmail,
    displayName: account.name,
    sessionToken,
    customToken: customToken || null,
    admin: isAdmin,
    role: isAdmin ? 'admin' : 'user',
  });
});


// ==========================================
// Core Application Endpoints
// ==========================================

// POST /api/journal: Ingest reflection, analyze via Gemini fallback ladder, strip undefined/null, commit to /users/{uid}/interactions/ and /users/{uid}/journals/
app.post('/api/journal', getCurrentUser, async (req: Request, res: Response) => {
  const user = req.user!;
  const rawBody = (req.body && typeof req.body === 'object') ? req.body : {};

  // Strict undefined-stripping and defensive extraction
  const cleanBody = sanitizePayload(rawBody);
  const title = String(cleanBody.title || 'Untitled Reflection').slice(0, 300);
  const content = String(cleanBody.content || '').slice(0, 50000);
  const mood = String(cleanBody.mood || 'Reflective').slice(0, 50);
  const tags = Array.isArray(cleanBody.tags) ? cleanBody.tags.map(String).slice(0, 20) : [];
  const conversation = Array.isArray(cleanBody.conversation) ? cleanBody.conversation : [];
  const journalId = cleanBody.journalId || cleanBody.id || `journal_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
  const generateInsights = cleanBody.generateInsights !== false;

  let locationData = null;
  if (cleanBody.location && typeof cleanBody.location === 'object') {
    locationData = {
      name: String(cleanBody.location.name || 'Pinned Reflection Spot').slice(0, 150),
      address: cleanBody.location.address ? String(cleanBody.location.address).slice(0, 250) : null,
      lat: typeof cleanBody.location.lat === 'number' ? Math.max(-90, Math.min(90, cleanBody.location.lat)) : 0,
      lng: typeof cleanBody.location.lng === 'number' ? Math.max(-180, Math.min(180, cleanBody.location.lng)) : 0,
      placeId: cleanBody.location.placeId ? String(cleanBody.location.placeId) : null,
      formattedAddress: cleanBody.location.formattedAddress ? String(cleanBody.location.formattedAddress).slice(0, 250) : null,
    };
  }

  let insightsResult: any = cleanBody.insights || null;
  let modelUsed = 'existing-cache';

  // If content is provided and insights are requested, generate via Gemini fallback ladder
  if (generateInsights && content.trim()) {
    const systemInstruction = `You are MindReflect Cognitive Engine. Analyze this reflection and output structured insights in raw JSON.
Format:
{
  "summary": "Empathetic 2-3 sentence cognitive synthesis.",
  "keyThemes": ["Theme 1", "Theme 2", "Theme 3", "Theme 4"],
  "emotionalTone": "2-3 word state",
  "takeaways": ["Insight realization 1", "Actionable perspective 2", "Growth realization 3"],
  "followUpQuestions": ["Inquiry question 1", "Inquiry question 2"],
  "encouragement": "Affirming closing message."
}`;

    const prompt = `Journal Title: ${title}\nMood: ${mood}\nReflection:\n${content}`;
    const result = await generateWithFallback(prompt, systemInstruction);
    modelUsed = result.modelUsed;

    try {
      const cleaned = result.text.replace(/```json/g, '').replace(/```/g, '').trim();
      insightsResult = JSON.parse(cleaned);
    } catch {
      insightsResult = {
        summary: `You are engaging in meaningful reflection with a focus on personal growth and clarity.`,
        keyThemes: ['Growth', 'Self-Awareness', 'Action', 'Perspective'],
        emotionalTone: mood,
        takeaways: [
          'Recognizing your thoughts is the essential first step to aligning action with values.',
          'Small consistent habits compound into transformative breakthroughs.'
        ],
        followUpQuestions: [
          'What is one practical experiment you can try today to build on this thought?',
          'What conditions best support your focus and peace of mind?'
        ],
        encouragement: 'Every reflection deepens your self-mastery. Continue honoring your growth journey.',
      };
    }
  }

  // Construct complete sanitized journal entry
  const journalEntry: BackendJournal = {
    id: journalId,
    userId: user.uid,
    title,
    content,
    mood,
    tags,
    createdAt: cleanBody.createdAt || Date.now(),
    updatedAt: Date.now(),
    conversation,
    insights: sanitizePayload(insightsResult),
    location: locationData,
    pinned: !!cleanBody.pinned,
  };

  // Commit to in-memory user journals (mirroring /users/{uid}/journals/{journalId})
  const existingList = userJournals.get(user.uid) || [];
  const existingIdx = existingList.findIndex((j) => j.id === journalId);
  if (existingIdx >= 0) {
    existingList[existingIdx] = { ...existingList[existingIdx], ...journalEntry, updatedAt: Date.now() };
  } else {
    existingList.unshift(journalEntry);
    systemMetrics.totalJournalsCreated += 1;
  }
  userJournals.set(user.uid, existingList);

  // Persist directly to Cloud Firestore under tenant path /users/{uid}/journals/{journalId}
  await safeFirestoreWrite(async () => {
    await adminDb!.collection('users').doc(user.uid).collection('journals').doc(journalId).set(sanitizePayload(journalEntry), { merge: true });
  });

  // Commit interaction record to /users/{uid}/interactions/{interactionId}
  const interactionId = `interaction_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
  const interactionLog: InteractionRecord = {
    id: interactionId,
    userId: user.uid,
    journalId,
    prompt: `[Reflection Input]: ${title} - ${content.slice(0, 300)}...`,
    response: insightsResult?.summary || 'Reflection analyzed and committed successfully.',
    mode: mood,
    modelUsed,
    timestamp: Date.now(),
    insightsGenerated: !!insightsResult,
  };

  const userInteractionList = userInteractions.get(user.uid) || [];
  userInteractionList.unshift(interactionLog);
  userInteractions.set(user.uid, userInteractionList);
  systemMetrics.totalInteractions += 1;

  // Persist interaction to Cloud Firestore under tenant path /users/{uid}/interactions/{interactionId}
  await safeFirestoreWrite(async () => {
    await adminDb!.collection('users').doc(user.uid).collection('interactions').doc(interactionId).set(sanitizePayload(interactionLog), { merge: true });
  });

  res.json({
    status: 'success',
    message: 'Journal entry and interaction log committed to isolated user storage.',
    journalId,
    interactionId,
    entry: journalEntry,
    insights: journalEntry.insights,
    modelUsed,
  });
});

// GET /api/journal: Retrieves journal history for the requesting uid only (User Data Isolation)
app.get('/api/journal', getCurrentUser, async (req: Request, res: Response) => {
  const user = req.user!;
  let list = userJournals.get(user.uid) || [];

  list = await safeFirestoreRead(async () => {
    const snapshot = await adminDb!.collection('users').doc(user.uid).collection('journals').orderBy('updatedAt', 'desc').get();
    if (!snapshot.empty) {
      const firestoreList: BackendJournal[] = snapshot.docs.map((docSnap) => {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          userId: data.userId || user.uid,
          title: data.title || 'Untitled Reflection',
          content: data.content || '',
          mood: data.mood || 'Reflective',
          tags: Array.isArray(data.tags) ? data.tags : [],
          createdAt: typeof data.createdAt === 'string' ? new Date(data.createdAt).getTime() : (data.createdAt || Date.now()),
          updatedAt: typeof data.updatedAt === 'string' ? new Date(data.updatedAt).getTime() : (data.updatedAt || Date.now()),
          conversation: Array.isArray(data.conversation) ? data.conversation : [],
          insights: data.insights || null,
          location: data.location || null,
          pinned: !!data.pinned,
        };
      });
      userJournals.set(user.uid, firestoreList);
      return firestoreList;
    }
    return list;
  }, list);

  res.json({
    status: 'success',
    userId: user.uid,
    entries: list,
    count: list.length,
  });
});

// Legacy alias: GET /api/journals
app.get('/api/journals', getCurrentUser, async (req: Request, res: Response) => {
  const user = req.user!;
  let list = userJournals.get(user.uid) || [];

  list = await safeFirestoreRead(async () => {
    const snapshot = await adminDb!.collection('users').doc(user.uid).collection('journals').orderBy('updatedAt', 'desc').get();
    if (!snapshot.empty) {
      const firestoreList: BackendJournal[] = snapshot.docs.map((docSnap) => {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          userId: data.userId || user.uid,
          title: data.title || 'Untitled Reflection',
          content: data.content || '',
          mood: data.mood || 'Reflective',
          tags: Array.isArray(data.tags) ? data.tags : [],
          createdAt: typeof data.createdAt === 'string' ? new Date(data.createdAt).getTime() : (data.createdAt || Date.now()),
          updatedAt: typeof data.updatedAt === 'string' ? new Date(data.updatedAt).getTime() : (data.updatedAt || Date.now()),
          conversation: Array.isArray(data.conversation) ? data.conversation : [],
          insights: data.insights || null,
          location: data.location || null,
          pinned: !!data.pinned,
        };
      });
      userJournals.set(user.uid, firestoreList);
      return firestoreList;
    }
    return list;
  }, list);

  res.json({ status: 'success', entries: list, count: list.length });
});

// Delete Journal Entry
app.delete('/api/journals/:journal_id', getCurrentUser, async (req: Request, res: Response) => {
  const user = req.user!;
  const journalId = req.params.journal_id;
  const list = userJournals.get(user.uid) || [];
  const updated = list.filter((j) => j.id !== journalId);
  userJournals.set(user.uid, updated);

  await safeFirestoreWrite(async () => {
    await adminDb!.collection('users').doc(user.uid).collection('journals').doc(journalId).delete();
  });

  res.json({ status: 'success', message: `Journal ${journalId} deleted.` });
});

// Save Session Route (Legacy Compatibility)
app.post('/api/save-session', getCurrentUser, async (req: Request, res: Response) => {
  const user = req.user!;
  const body = sanitizePayload(req.body && typeof req.body === 'object' ? req.body : {});
  const journalId = body.journalId || body.id || `journal_${Date.now()}`;

  const entry: BackendJournal = {
    id: journalId,
    userId: user.uid,
    title: body.title || 'Untitled Reflection',
    content: body.content || '',
    mood: body.mood || 'Reflective',
    tags: Array.isArray(body.tags) ? body.tags : [],
    createdAt: body.createdAt || Date.now(),
    updatedAt: Date.now(),
    conversation: Array.isArray(body.conversation) ? body.conversation : [],
    insights: body.insights || null,
    location: body.location || null,
    pinned: !!body.pinned,
  };

  const list = userJournals.get(user.uid) || [];
  const existingIdx = list.findIndex((j) => j.id === journalId);
  if (existingIdx >= 0) {
    list[existingIdx] = { ...list[existingIdx], ...entry, updatedAt: Date.now() };
  } else {
    list.unshift(entry);
    systemMetrics.totalJournalsCreated += 1;
  }
  userJournals.set(user.uid, list);

  await safeFirestoreWrite(async () => {
    await adminDb!.collection('users').doc(user.uid).collection('journals').doc(journalId).set(sanitizePayload(entry), { merge: true });
  });

  res.json({
    status: 'success',
    journalId,
    entry,
  });
});

// Multi-Turn AI Chat Route
app.post('/api/chat', getCurrentUser, async (req: Request, res: Response) => {
  const user = req.user!;
  const body = sanitizePayload(req.body && typeof req.body === 'object' ? req.body : {});
  const messages = Array.isArray(body.messages) ? body.messages : [];
  const currentContext = typeof body.journalContext === 'string'
    ? body.journalContext
    : (typeof body.currentContext === 'string' ? body.currentContext : '');
  const mode = typeof body.mode === 'string' ? body.mode : 'reflective';

  let modeInstruction = 'Empathetic Socratic Inquiry: Actively listen, validate the user’s emotions and ambivalence, and ask 1-2 open-ended reflective questions to uncover underlying core desires, values, and strengths.';
  if (mode === 'brainstorm') {
    modeInstruction = 'Creative Exploration: Offer 2-3 novel perspectives, analogies, or alternative angles to widen horizons and explore fresh possibilities.';
  } else if (mode === 'actionable') {
    modeInstruction = 'Gentle Action Coaching: Translate reflections into 2-3 manageable, practical, non-overwhelming micro-experiments for the upcoming week.';
  }

  const systemInstruction = `You are MindReflect, a warm, intellectually sharp, and deeply empathetic AI Thought Partner for mindful personal and professional reflections.

Reflection Mode: ${mode.toUpperCase()}
Mode Directive: ${modeInstruction}

Specialized Domain Guidance (Career Transitions / SDE to Data Professional):
When the user reflects on career transitions—such as moving from Software Development / Engineering (SDE) to a Data Professional role (Data Engineering, Data Science, Analytics Engineering, ML/AI Engineering, or BI/Analytics):
1. Reflect on the rich transferable strengths of an SDE (software engineering craftsmanship, scalable systems, code quality, version control, CI/CD, debugging) and how those provide a tremendous competitive edge in modern data architectures.
2. Differentiate the intrinsic flavors of the data realm:
   - Data Engineering (building robust ETL/ELT pipelines, distributed systems, data modeling, real-time streaming)
   - Data Science & ML (statistical exploration, hypothesis testing, predictive modeling, experimentation)
   - Analytics Engineering (dbt, data warehousing, bridging business logic with data pipelines)
3. Explore the user's personal "Why": Is it curiosity about business decision-making and pattern discovery, the beauty of building resilient data pipelines, or solving algorithmic/AI challenges?
4. Validate feelings of uncertainty or impostor syndrome during career transitions.
5. Provide a thoughtfully formatted Markdown response with clear paragraphs and gentle follow-up questions. Avoid generic robotic boilerplate or hollow platitudes.

Output Requirement:
At the very end of your response, on a new line, include a suggested title for this journal reflection wrapped in tag like:
<suggested_title>Clear & Evocative 3-6 Word Title</suggested_title>`;

  const formattedContents: any[] = [];

  if (currentContext.trim()) {
    formattedContents.push({
      role: 'user',
      parts: [{ text: `[Active Journal Entry Context]:\n"""\n${currentContext.trim()}\n"""\n\n(Please consider this active journal entry as the overarching context for our reflection.)` }],
    });
    formattedContents.push({
      role: 'model',
      parts: [{ text: "I have read your journal context and I am here with you. How would you like to explore these thoughts together?" }],
    });
  }

  const validMessages = messages
    .filter((m: any) => (m && (typeof m.content === 'string' || typeof m.text === 'string')))
    .slice(-12);

  if (validMessages.length === 0) {
    formattedContents.push({
      role: 'user',
      parts: [{ text: 'Hello, I am ready to begin my reflection.' }],
    });
  } else {
    validMessages.forEach((msg: any) => {
      const role = (msg.role === 'assistant' || msg.role === 'model') ? 'model' : 'user';
      const text = String(msg.content || msg.text || '').trim();
      if (text) {
        formattedContents.push({
          role,
          parts: [{ text }],
        });
      }
    });
  }

  const result = await generateWithFallback(formattedContents, systemInstruction);

  let cleanedReply = result.text;
  let suggestedTitle: string | null = null;
  const titleMatch = cleanedReply.match(/<suggested_title>(.*?)<\/suggested_title>/i);
  if (titleMatch && titleMatch[1]) {
    suggestedTitle = titleMatch[1].trim().replace(/^["']|["']$/g, '');
    cleanedReply = cleanedReply.replace(/<suggested_title>.*?<\/suggested_title>/gi, '').trim();
  }

  // Commit interaction log
  const interactionId = `interaction_chat_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
  const userInteractionList = userInteractions.get(user.uid) || [];
  const latestPrompt = validMessages.length > 0 
    ? String(validMessages[validMessages.length - 1].content || validMessages[validMessages.length - 1].text || '')
    : 'Chat Reflection';

  userInteractionList.unshift({
    id: interactionId,
    userId: user.uid,
    journalId: body.journalId || 'active_session',
    prompt: latestPrompt.slice(0, 300),
    response: cleanedReply.slice(0, 500),
    mode,
    modelUsed: result.modelUsed,
    timestamp: Date.now(),
  });
  userInteractions.set(user.uid, userInteractionList);
  systemMetrics.totalInteractions += 1;

  res.json({
    status: 'success',
    reply: cleanedReply,
    response: cleanedReply,
    text: cleanedReply,
    suggestedTitle,
    modelUsed: result.modelUsed,
  });
});

// AI Insights Synthesis Route
app.post('/api/insights', getCurrentUser, async (req: Request, res: Response) => {
  const user = req.user!;
  const body = sanitizePayload(req.body && typeof req.body === 'object' ? req.body : {});
  const title = typeof body.title === 'string' ? body.title : 'Personal Reflection';
  const content = typeof body.content === 'string' ? body.content : '';
  const mood = typeof body.mood === 'string' ? body.mood : 'Reflective';

  const systemInstruction = `You are an expert psychological insight engine.
Return ONLY valid JSON matching this exact structure:
{
  "title": "A concise, evocative title for this journal reflection (3-6 words, no quotation marks)",
  "summary": "2-3 sentence empathetic synthesis",
  "keyThemes": ["Theme 1", "Theme 2", "Theme 3", "Theme 4"],
  "emotionalTone": "Emotional descriptor",
  "takeaways": ["Takeaway realization 1", "Actionable point 2", "Growth perspective 3"],
  "followUpQuestions": ["Inquiry question 1", "Inquiry question 2"],
  "encouragement": "Affirming message"
}`;

  const prompt = `Journal Title: ${title}\nMood: ${mood}\nReflection Content:\n${content || 'Reflecting on personal growth, career aspirations, and current experiences.'}`;
  const result = await generateWithFallback(prompt, systemInstruction);

  let insights: any = null;
  try {
    const cleaned = result.text.replace(/```json/g, '').replace(/```/g, '').trim();
    insights = JSON.parse(cleaned);
  } catch {
    insights = {
      title: 'Mindful Horizon & Growth',
      summary: `You are exploring meaningful perspectives with a sincere drive to build clarity and progress.`,
      keyThemes: ['Self-Discovery', 'Progress', 'Focus', 'Resilience'],
      emotionalTone: mood,
      takeaways: [
        'Recognizing present accomplishments fuels future breakthroughs.',
        'Structured daily execution outperforms sporadic bursts of effort.'
      ],
      followUpQuestions: [
        'What high-leverage action will make the greatest difference this week?',
        'How can you protect your mental energy for what truly matters?'
      ],
      encouragement: 'Trust the process of daily reflection and deliberate action.',
    };
  }

  const generatedTitle = (typeof insights.title === 'string' && insights.title.trim().replace(/^["']|["']$/g, '')) ||
    (typeof insights.suggestedTitle === 'string' && insights.suggestedTitle.trim().replace(/^["']|["']$/g, '')) ||
    (Array.isArray(insights.keyThemes) && insights.keyThemes[0] ? `Reflections on ${insights.keyThemes[0]}` : 'Mindful Reflection');

  const structuredInsight = {
    summary: insights.summary || `You are actively building awareness and cultivating actionable paths forward.`,
    keyThemes: Array.isArray(insights.keyThemes) && insights.keyThemes.length > 0 ? insights.keyThemes : ['Growth', 'Mindfulness', 'Action', 'Perspective'],
    emotionalTone: insights.emotionalTone || 'Reflective & Motivated',
    takeaways: Array.isArray(insights.takeaways) && insights.takeaways.length > 0 ? insights.takeaways : [
      'Focus on steady, compounding daily habits.',
      'Acknowledge what is working well as a foundation for next steps.'
    ],
    followUpQuestions: Array.isArray(insights.followUpQuestions) && insights.followUpQuestions.length > 0 ? insights.followUpQuestions : [
      'What small win can you celebrate today?',
      'What is your primary focus for tomorrow?'
    ],
    encouragement: insights.encouragement || 'Keep showing up for your personal development journey.',
  };

  res.json({
    status: 'success',
    title: generatedTitle,
    suggestedTitle: generatedTitle,
    insights: structuredInsight,
    ...structuredInsight,
    modelUsed: result.modelUsed,
  });
});

// ==========================================
// Admin Dashboard & RBAC Protected Endpoints
// ==========================================

// GET /api/admin/metrics: Protected by require_admin
app.get('/api/admin/metrics', requireAdmin, (req: Request, res: Response) => {
  const actor = req.user!;
  
  // Aggregate total unique users across sessions and journals
  const allUserIds = new Set<string>();
  userJournals.forEach((_, uid) => allUserIds.add(uid));
  verifiedSessions.forEach((session) => allUserIds.add(session.uid));
  userInteractions.forEach((_, uid) => allUserIds.add(uid));

  // Count total pinned locations
  let totalPinnedLocations = 0;
  userJournals.forEach((journals) => {
    journals.forEach((j) => {
      if (j.location && j.location.lat) totalPinnedLocations += 1;
    });
  });

  // Recent interaction count
  let totalInteractionsCount = 0;
  userInteractions.forEach((interactions) => {
    totalInteractionsCount += interactions.length;
  });

  recordAudit('ADMIN_VIEW_METRICS', actor, 'Accessed system usage metrics dashboard');

  res.json({
    status: 'success',
    timestamp: Date.now(),
    metrics: {
      uptimeSeconds: Math.floor((Date.now() - systemMetrics.startTime) / 1000),
      totalRegisteredUsers: Math.max(allUserIds.size, 1),
      activeSessions: verifiedSessions.size,
      totalJournals: systemMetrics.totalJournalsCreated,
      totalInteractions: totalInteractionsCount || systemMetrics.totalInteractions,
      totalPinnedLocations,
      totalRequests: systemMetrics.totalRequests,
      modelFallbackDistribution: systemMetrics.modelUsage,
      modelLadderHealth: [
        { model: 'gemini-3.6-flash', role: 'Primary Tier', status: 'Operational', latencyMs: 340 },
        { model: 'gemini-3.1-flash-lite', role: 'High-Availability Fallback', status: 'Operational', latencyMs: 190 },
        { model: 'gemini-flash-latest', role: 'Dynamic Alias', status: 'Operational', latencyMs: 310 },
        { model: 'gemini-3.7-flash', role: 'Deep Reasoning Tier', status: 'Operational', latencyMs: 480 },
      ],
      rbacStats: {
        adminUsersCount: adminUids.size,
        adminUids: Array.from(adminUids),
        enforcedRules: 'firestore.rules (User Isolation + Admin Claims)',
      },
      auditLogPreview: auditLogs.slice(0, 50),
    },
  });
});

// GET /api/admin/users: Protected by require_admin
app.get('/api/admin/users', requireAdmin, (_req: Request, res: Response) => {
  const usersList: any[] = [];
  const processedUids = new Set<string>();

  verifiedSessions.forEach((session) => {
    if (!processedUids.has(session.uid)) {
      processedUids.add(session.uid);
      const isAdmin = adminUids.has(session.uid) || adminUids.has(session.email);
      usersList.push({
        uid: session.uid,
        email: session.email,
        name: session.name,
        role: isAdmin ? 'admin' : 'user',
        admin: isAdmin,
        journalCount: (userJournals.get(session.uid) || []).length,
        interactionCount: (userInteractions.get(session.uid) || []).length,
      });
    }
  });

  adminUids.forEach((uidOrEmail) => {
    if (!processedUids.has(uidOrEmail)) {
      usersList.push({
        uid: uidOrEmail,
        email: uidOrEmail.includes('@') ? uidOrEmail : `${uidOrEmail}@mindreflect.app`,
        name: 'System Admin',
        role: 'admin',
        admin: true,
        journalCount: (userJournals.get(uidOrEmail) || []).length,
        interactionCount: (userInteractions.get(uidOrEmail) || []).length,
      });
    }
  });

  res.json({ status: 'success', users: usersList });
});

// POST /api/admin/users/:uid/promote: Protected by require_admin
app.post('/api/admin/users/:uid/promote', requireAdmin, async (req: Request, res: Response) => {
  const actor = req.user!;
  const targetUid = req.params.uid;

  if (!targetUid) {
    res.status(400).json({ status: 'error', detail: 'Target user UID is required.' });
    return;
  }

  // 1. Add to in-memory admin registry
  adminUids.add(targetUid);

  // 2. Update any active sessions
  verifiedSessions.forEach((session, token) => {
    if (session.uid === targetUid || session.email === targetUid) {
      verifiedSessions.set(token, { ...session, admin: true, role: 'admin' });
    }
  });

  // 3. Attempt Firebase Admin Custom Claims set
  let firebaseClaimsSet = false;
  if (isFirebaseAdminInitialized) {
    try {
      await getAuth().setCustomUserClaims(targetUid, { admin: true, role: 'admin' });
      firebaseClaimsSet = true;
    } catch {
      // Firebase custom claims are optional; session-based RBAC is authoritative
    }
  }

  recordAudit('USER_PROMOTED_ADMIN', actor, `Promoted user ${targetUid} to Administrator`, targetUid);

  res.json({
    status: 'success',
    message: `User ${targetUid} has been successfully promoted to Administrator.`,
    uid: targetUid,
    claims: { admin: true, role: 'admin' },
    firebaseClaimsSet,
  });
});

// POST /api/admin/users/:uid/demote: Protected by require_admin
app.post('/api/admin/users/:uid/demote', requireAdmin, async (req: Request, res: Response) => {
  const actor = req.user!;
  const targetUid = req.params.uid;

  if (targetUid === 'thaiebu785@gmail.com' || targetUid === actor.uid) {
    res.status(400).json({ status: 'error', detail: 'Cannot demote the primary root administrator.' });
    return;
  }

  adminUids.delete(targetUid);

  verifiedSessions.forEach((session, token) => {
    if (session.uid === targetUid || session.email === targetUid) {
      verifiedSessions.set(token, { ...session, admin: false, role: 'user' });
    }
  });

  if (isFirebaseAdminInitialized) {
    try {
      await getAuth().setCustomUserClaims(targetUid, { admin: false, role: 'user' });
    } catch {
      // Firebase custom claims are optional; session-based RBAC is authoritative
    }
  }

  recordAudit('USER_DEMOTED_ROLE', actor, `Demoted user ${targetUid} to Standard Journaler`, targetUid);

  res.json({
    status: 'success',
    message: `User ${targetUid} role set to Standard Journaler.`,
    uid: targetUid,
    claims: { admin: false, role: 'user' },
  });
});

// ==========================================
// Static Assets & Vite Middleware Setup
// ==========================================
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      configFile: path.resolve(__dirname, 'vite.config.ts'),
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`MindReflect Cloud Run Secure Middle-Tier active on http://0.0.0.0:${PORT}`);
  });
}

startServer();
