/**
 * BlueChain Authentication Module
 *
 * Supports two modes:
 *  1. DEMO_MODE  — local credential check, no real backend
 *  2. FIREBASE   — real Firebase Auth (requires env credentials)
 *
 * Public API:
 *   BlueChainAuth.login(email, password)  → Promise<user>
 *   BlueChainAuth.signup(data)            → Promise<user>
 *   BlueChainAuth.logout()               → Promise<void>
 *   BlueChainAuth.getCurrentUser()       → user | null
 *   BlueChainAuth.onAuthChange(cb)       → unsubscribe fn
 *   BlueChainAuth.isDemoMode             → boolean
 */

const BlueChainAuth = (() => {
  // ── Config ──────────────────────────────────────────────────────────────────
  const STORAGE_KEY = 'bluechain_user';

  // Demo credentials (clearly labelled — not production)
  const DEMO_CREDENTIALS = [
    { email: 'demo@bluechain.io',    password: 'demo1234', name: 'Demo User',   org: 'BlueChain Demo',     role: 'Carbon Manager' },
    { email: 'admin@bluechain.io',   password: 'admin1234', name: 'Admin User',  org: 'BlueChain Platform', role: 'Organization Admin' },
  ];

  // Firebase config — populated from window.__FIREBASE_CONFIG__ (injected by page)
  // or left null to fall back to demo mode automatically.
  let firebaseApp  = null;
  let firebaseAuth = null;

  // Subscriber list for auth state changes
  const subscribers = new Set();

  // ── Determine mode ──────────────────────────────────────────────────────────
  function isFirebaseConfigured() {
    const cfg = window.__FIREBASE_CONFIG__;
    return cfg && cfg.apiKey && cfg.apiKey !== 'YOUR_API_KEY';
  }

  const isDemoMode = !isFirebaseConfigured();

  // ── Internal helpers ────────────────────────────────────────────────────────
  function saveUser(user) {
    if (user) {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(user));
    } else {
      sessionStorage.removeItem(STORAGE_KEY);
    }
    subscribers.forEach(cb => cb(user));
  }

  function buildDemoUser(cred, extra = {}) {
    return {
      uid:          'demo-' + btoa(cred.email),
      email:        cred.email,
      displayName:  extra.name  || cred.name,
      organization: extra.org   || cred.org,
      role:         extra.role  || cred.role,
      isDemoUser:   true,
      createdAt:    new Date().toISOString(),
    };
  }

  // ── Demo mode login ─────────────────────────────────────────────────────────
  async function demoLogin(email, password) {
    await new Promise(r => setTimeout(r, 600)); // simulate network delay
    const cred = DEMO_CREDENTIALS.find(
      c => c.email === email && c.password === password
    );
    if (!cred) throw new Error('Invalid demo credentials. Try demo@bluechain.io / demo1234');
    const user = buildDemoUser(cred);
    saveUser(user);
    return user;
  }

  // ── Demo mode signup ────────────────────────────────────────────────────────
  async function demoSignup({ name, email, org, role, password }) {
    await new Promise(r => setTimeout(r, 800));
    // In demo mode, always succeeds and creates a session
    const user = buildDemoUser(
      { email, name, org, role },
      { name, org, role }
    );
    saveUser(user);
    return user;
  }

  // ── Firebase mode login ─────────────────────────────────────────────────────
  async function firebaseLogin(email, password) {
    if (!firebaseAuth) throw new Error('Firebase not initialised');
    const { signInWithEmailAndPassword } = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js');
    const cred = await signInWithEmailAndPassword(firebaseAuth, email, password);
    const user = mapFirebaseUser(cred.user);
    saveUser(user);
    return user;
  }

  // ── Firebase mode signup ────────────────────────────────────────────────────
  async function firebaseSignup({ name, email, org, role, password }) {
    if (!firebaseAuth) throw new Error('Firebase not initialised');
    const {
      createUserWithEmailAndPassword,
      updateProfile
    } = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js');
    const cred = await createUserWithEmailAndPassword(firebaseAuth, email, password);
    await updateProfile(cred.user, { displayName: name });
    const user = mapFirebaseUser(cred.user, { organization: org, role });
    saveUser(user);
    return user;
  }

  // ── Firebase user mapper ────────────────────────────────────────────────────
  function mapFirebaseUser(fbUser, extra = {}) {
    return {
      uid:          fbUser.uid,
      email:        fbUser.email,
      displayName:  fbUser.displayName || fbUser.email,
      organization: extra.organization || '',
      role:         extra.role         || 'Viewer',
      isDemoUser:   false,
      createdAt:    fbUser.metadata?.creationTime || new Date().toISOString(),
    };
  }

  // ── Firebase initialisation ─────────────────────────────────────────────────
  async function initFirebase() {
    if (!isFirebaseConfigured()) return;
    try {
      const { initializeApp }   = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js');
      const { getAuth, onAuthStateChanged } = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js');
      firebaseApp  = initializeApp(window.__FIREBASE_CONFIG__);
      firebaseAuth = getAuth(firebaseApp);
      onAuthStateChanged(firebaseAuth, fbUser => {
        if (fbUser) {
          const user = mapFirebaseUser(fbUser);
          saveUser(user);
        } else {
          saveUser(null);
        }
      });
    } catch (e) {
      console.warn('[BlueChainAuth] Firebase init failed, falling back to demo mode:', e.message);
    }
  }

  // ── Public API ──────────────────────────────────────────────────────────────
  async function login(email, password) {
    if (isDemoMode || !isFirebaseConfigured()) {
      return demoLogin(email, password);
    }
    return firebaseLogin(email, password);
  }

  async function signup(data) {
    if (isDemoMode || !isFirebaseConfigured()) {
      return demoSignup(data);
    }
    return firebaseSignup(data);
  }

  async function logout() {
    if (firebaseAuth) {
      const { signOut } = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js');
      await signOut(firebaseAuth);
    }
    saveUser(null);
    window.location.href = '/static/landing.html';
  }

  function getCurrentUser() {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    try { return JSON.parse(raw); } catch { return null; }
  }

  function onAuthChange(cb) {
    subscribers.add(cb);
    return () => subscribers.delete(cb);
  }

  // Initialise Firebase in the background (non-blocking)
  initFirebase().catch(() => {});

  return { login, signup, logout, getCurrentUser, onAuthChange, isDemoMode };
})();
