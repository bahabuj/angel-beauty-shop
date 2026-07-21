import { initializeApp, getApps, getApp } from 'firebase/app'
import { getAuth, GoogleAuthProvider, setPersistence, browserLocalPersistence } from 'firebase/auth'

// Firebase client configuration
// Using fallback values directly in code because the .env file can get wiped
// in the sandbox environment. Environment variables take priority when available.
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || 'AIzaSyCvf-DK-JQLr5TSqcI7bUz2g6EHEeCXEgc',
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || 'angel-beauty-2c3c1.web.app',
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'angel-beauty-2c3c1',
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || 'angel-beauty-2c3c1.firebasestorage.app',
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '534472179686',
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || '1:534472179686:web:f8029f15fb4c795ea32027',
}

// Lazy-initialize Firebase to avoid breaking the page if config is missing
let _app: ReturnType<typeof initializeApp> | null = null
let _auth: ReturnType<typeof getAuth> | null = null
let _googleProvider: GoogleAuthProvider | null = null

function getApp_() {
  if (!_app) {
    _app = getApps().length ? getApp() : initializeApp(firebaseConfig)
  }
  return _app
}

export function getFirebaseAuth() {
  if (!_auth) {
    _auth = getAuth(getApp_())
    // Enable persistent authentication across browser sessions
    setPersistence(_auth, browserLocalPersistence).catch(err => {
      console.warn('Could not enable Firebase persistence:', err)
    })
  }
  return _auth
}

export function getGoogleProvider() {
  if (!_googleProvider) {
    _googleProvider = new GoogleAuthProvider()
    // Use select_account to let users choose between multiple Google accounts
    // Remove this line if you want automatic sign-in with the first available account
    _googleProvider.setCustomParameters({
      prompt: 'select_account',
    })
  }
  return _googleProvider
}
