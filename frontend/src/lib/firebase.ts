import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, browserLocalPersistence, setPersistence } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// Safely probe for local firebase-applet-config.json without failing build if gitignored or missing
const configModules = import.meta.glob('../../firebase-applet-config.json', { eager: true });
const localConfig = (configModules['../../firebase-applet-config.json'] as { default?: Record<string, string> })?.default || {};

// Environment variables take precedence (Zero-Git-Leak, 12-Factor standard)
const firebaseConfig = {
  apiKey: (import.meta.env.VITE_FIREBASE_API_KEY as string) || localConfig.apiKey || '',
  authDomain: (import.meta.env.VITE_FIREBASE_AUTH_DOMAIN as string) || localConfig.authDomain || '',
  projectId: (import.meta.env.VITE_FIREBASE_PROJECT_ID as string) || localConfig.projectId || '',
  storageBucket: (import.meta.env.VITE_FIREBASE_STORAGE_BUCKET as string) || localConfig.storageBucket || '',
  messagingSenderId: (import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID as string) || localConfig.messagingSenderId || '',
  appId: (import.meta.env.VITE_FIREBASE_APP_ID as string) || localConfig.appId || '',
  firestoreDatabaseId: (import.meta.env.VITE_FIREBASE_FIRESTORE_DATABASE_ID as string) || localConfig.firestoreDatabaseId || 'ai-studio-b0ab2b89-9e56-4128-94c6-fc84ca0e643e',
};

const app = !getApps().length
  ? firebaseConfig.apiKey
    ? initializeApp(firebaseConfig)
    : initializeApp({
        apiKey: 'unconfigured-placeholder',
        projectId: firebaseConfig.projectId || 'mindreflect',
        appId: '1:000000000000:web:000000000000',
      })
  : getApp();

export const auth = getAuth(app);
// Enable persistent auth state
setPersistence(auth, browserLocalPersistence).catch((err) => {
  console.warn('Auth persistence initialization warning:', err);
});

export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: 'select_account',
});

// Initialize Firestore with specific database ID if provided
export const db = firebaseConfig.firestoreDatabaseId && firebaseConfig.firestoreDatabaseId !== '(default)'
  ? getFirestore(app, firebaseConfig.firestoreDatabaseId)
  : getFirestore(app);

export default app;
