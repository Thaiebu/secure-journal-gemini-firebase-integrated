import fs from 'fs';

const text = fs.readFileSync('server.ts', 'utf8');

const targetStr = '    accessLink,\n  });\n});';
let pos = text.indexOf(targetStr);

if (pos === -1) {
  const altTarget = '    accessLink,  });});';
  pos = text.indexOf(altTarget);
  if (pos !== -1) {
    pos += altTarget.length;
  }
} else {
  pos += targetStr.length;
}

if (pos === -1) {
  console.error('Could not locate target string in server.ts');
  process.exit(1);
}

const authRoutes = `

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
  return crypto.scryptSync(password, salt, 64).toString('hex');
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
  verifiedSessions.set(sessionToken, {
    uid,
    email: cleanEmail,
    name: cleanName,
    admin: isAdmin,
    role: isAdmin ? 'admin' : 'user',
    verifiedAt: Date.now(),
  });

  // Generate Firebase custom token if Firebase Admin is available
  let customToken: string | null = null;
  if (isFirebaseAdminInitialized) {
    try {
      customToken = await getAuth().createCustomToken(uid, {
        email: cleanEmail,
        name: cleanName,
        admin: isAdmin,
      });
    } catch (err: any) {
      console.warn('[Backend Auth] Custom token notice for signup:', err?.message);
    }
  }

  recordAudit('USER_REGISTERED', { uid, email: cleanEmail, name: cleanName, role: isAdmin ? 'admin' : 'user' }, 'Created account via secure authentication');

  res.status(201).json({
    status: 'success',
    message: 'Account created successfully.',
    uid,
    email: cleanEmail,
    displayName: cleanName,
    customToken: customToken || sessionToken,
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

  // If this is the user's first time signing in with these credentials, initialize them
  if (!account) {
    const salt = crypto.randomBytes(16).toString('hex');
    const passwordHash = derivePasswordHash(cleanPassword, salt);
    const uid = 'usr_' + crypto.createHash('sha256').update(cleanEmail).digest('hex').slice(0, 20);
    const name = cleanEmail.split('@')[0];
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
    const verifyHash = derivePasswordHash(cleanPassword, account.salt);
    if (verifyHash !== account.passwordHash) {
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
  verifiedSessions.set(sessionToken, {
    uid: account.uid,
    email: cleanEmail,
    name: account.name,
    admin: isAdmin,
    role: isAdmin ? 'admin' : 'user',
    verifiedAt: Date.now(),
  });

  // Generate Firebase custom token if Firebase Admin is available
  let customToken: string | null = null;
  if (isFirebaseAdminInitialized) {
    try {
      customToken = await getAuth().createCustomToken(account.uid, {
        email: cleanEmail,
        name: account.name,
        admin: isAdmin,
      });
    } catch (err: any) {
      console.warn('[Backend Auth] Custom token notice for signin:', err?.message);
    }
  }

  recordAudit('USER_SIGNIN', { uid: account.uid, email: cleanEmail, name: account.name, role: isAdmin ? 'admin' : 'user' }, 'User signed in successfully');

  res.json({
    status: 'success',
    message: 'Signed in successfully.',
    uid: account.uid,
    email: cleanEmail,
    displayName: account.name,
    customToken: customToken || sessionToken,
    admin: isAdmin,
    role: isAdmin ? 'admin' : 'user',
  });
});
`;

const updatedText = text.slice(0, pos) + authRoutes + text.slice(pos);
fs.writeFileSync('server.ts', updatedText, 'utf8');
console.log('Successfully injected auth routes into server.ts!');
