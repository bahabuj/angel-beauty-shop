import { createRemoteJWKSet, jwtVerify } from 'jose'

// Firebase Auth token verification using jose (lightweight, no native modules)
// This avoids the firebase-admin SDK which requires gRPC native modules

const FIREBASE_AUTH_ISSUER = 'https://securetoken.google.com/'

let JWKS: ReturnType<typeof createRemoteJWKSet> | null = null

function getJWKS(projectId: string) {
  if (!JWKS) {
    const url = new URL(`https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com`)
    JWKS = createRemoteJWKSet(url)
  }
  return JWKS
}

interface FirebaseDecodedToken {
  uid: string
  email?: string
  name?: string
  picture?: string
  email_verified?: boolean
  [key: string]: unknown
}

/**
 * Verify a Firebase ID token using Google's public JWKs.
 * Returns the decoded token payload, or null if verification fails.
 */
export async function verifyFirebaseToken(idToken: string): Promise<FirebaseDecodedToken | null> {
  try {
    // Hardcoded fallback because .env can get wiped in the sandbox
    const projectId = process.env.FIREBASE_PROJECT_ID
      || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID
      || 'angel-beauty-2c3c1'
    if (!projectId) {
      console.error('Firebase project ID not configured')
      return null
    }

    const jwks = getJWKS(projectId)

    const { payload } = await jwtVerify(idToken, jwks, {
      issuer: `${FIREBASE_AUTH_ISSUER}${projectId}`,
      audience: projectId,
    })

    return {
      uid: payload.sub as string,
      email: payload.email as string | undefined,
      name: payload.name as string | undefined,
      picture: payload.picture as string | undefined,
      email_verified: payload.email_verified as boolean | undefined,
    }
  } catch (error) {
    console.error('Firebase token verification failed:', error instanceof Error ? error.message : error)
    return null
  }
}
