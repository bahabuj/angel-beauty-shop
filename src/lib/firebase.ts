import { getApp, getApps, initializeApp } from 'firebase/app'
import { browserLocalPersistence, getAuth, GoogleAuthProvider, setPersistence } from 'firebase/auth'

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || 'AIzaSyCvf-DK-JQLr5TSqcI7bUz2g6EHEeCXEgc',
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || 'angel-beauty-2c3c1.web.app',
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'angel-beauty-2c3c1',
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || 'angel-beauty-2c3c1.firebasestorage.app',
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '534472179686',
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || '1:534472179686:web:f8029f15fb4c795ea32027',
}

const app = getApps().length ? getApp() : initializeApp(firebaseConfig)

export default app
export const auth = getAuth(app)
setPersistence(auth, browserLocalPersistence).catch(() => {})
export const googleProvider = new GoogleAuthProvider()
googleProvider.setCustomParameters({ prompt: 'select_account' })
