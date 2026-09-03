# MindReflect AI Journal - React + Vite Frontend

MindReflect is a modern, mindful journaling application built with React 19, TypeScript, Tailwind CSS, Firebase Authentication, and Cloud Firestore.

## 🚀 Features

- **Google Authentication & Federated Identity**: Secure client-side sign-in with Google via Firebase Auth.
- **Strict Data Isolation**: Real-time Firestore document subscriptions scoped to `/users/{uid}/journals`.
- **Multi-Turn AI Companion**: Conversational reflection interface with modes (`Reflective`, `Brainstorm`, `Actionable`, `Summary`).
- **Automated Synthesis**: AI-driven emotional tone detection, key takeaways, and mindful next-step questions.
- **Zero-Crash Payload Hygiene**: Recursive sanitization stripping `undefined` properties before database persistence.

## 🛠️ Local Development

```bash
cd frontend
npm install
npm run dev
```

The frontend development server starts on `http://localhost:3000` and automatically proxies `/api` calls to the backend running at `http://127.0.0.1:8000`.

## 📦 Build for Production

```bash
npm run build
```
Outputs static production assets into `dist/`.
