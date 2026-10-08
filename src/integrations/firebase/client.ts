import { initializeApp, type FirebaseApp, type FirebaseOptions } from "firebase/app";
import { initializeAppCheck, ReCaptchaV3Provider } from "firebase/app-check";
import { browserLocalPersistence, indexedDBLocalPersistence, inMemoryPersistence, initializeAuth } from "firebase/auth";
import { initializeFirestore } from "firebase/firestore";

const env = import.meta.env;

/** Web config for the WSL Realty Firebase project. These values are public identifiers, not secrets. */
export const firebaseConfig: FirebaseOptions = {
  apiKey: env.VITE_FIREBASE_API_KEY || "not-configured",
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: env.VITE_FIREBASE_PROJECT_ID || "not-configured",
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: env.VITE_FIREBASE_APP_ID,
};

/** False until the VITE_FIREBASE_* variables are filled in. Public pages then fall back to built-in content. */
export const firebaseConfigured = !!env.VITE_FIREBASE_API_KEY && !!env.VITE_FIREBASE_PROJECT_ID;

export const app = initializeApp(firebaseConfig);

/**
 * Optional bot protection (Firebase App Check with reCAPTCHA v3, free, no card). It is on only when
 * VITE_RECAPTCHA_SITE_KEY is set; see FIREBASE_SETUP.md. Turn on enforcement in the Firebase console afterwards.
 */
const recaptchaKey = env.VITE_RECAPTCHA_SITE_KEY as string | undefined;
if (recaptchaKey) {
  try { initializeAppCheck(app, { provider: new ReCaptchaV3Provider(recaptchaKey), isTokenAutoRefreshEnabled: true }); } catch { /* the site still works without it */ }
}

/**
 * Email and password sign-in only. Using initializeAuth (instead of getAuth) skips Firebase's popup and redirect
 * helper, which would load Google's gapi script and an extra iframe on every page. Fewer third-party scripts, tighter CSP.
 */
export const makeAuth = (a: FirebaseApp, temporary = false) =>
  initializeAuth(a, { persistence: temporary ? inMemoryPersistence : [indexedDBLocalPersistence, browserLocalPersistence] });
export const auth = makeAuth(app);
export const db = initializeFirestore(app, { ignoreUndefinedProperties: true });
