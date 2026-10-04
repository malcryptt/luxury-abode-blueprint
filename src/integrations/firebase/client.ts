import { initializeApp, type FirebaseOptions } from "firebase/app";
import { getAuth } from "firebase/auth";
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
export const auth = getAuth(app);
export const db = initializeFirestore(app, { ignoreUndefinedProperties: true });
