/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { initializeApp, getApp, getApps } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import firebaseConfig from "@/firebase-applet-config.json";

// Detect if we are using the default mock placeholder API key config.
export const isPlaceholderConfig =
  !firebaseConfig ||
  firebaseConfig.apiKey.includes("DummyKey") ||
  firebaseConfig.projectId === "sales-erp-demo";

let app;
let db: any = null;
let auth: any = null;
let googleProvider: any = null;

if (!isPlaceholderConfig) {
  try {
    app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
    db = getFirestore(app, (firebaseConfig as any).firestoreDatabaseId);
    auth = getAuth(app);
    googleProvider = new GoogleAuthProvider();
  } catch (error) {
    console.warn("Could not initiate real Firebase. App running in Sandbox Local Mode.", error);
  }
}

export { db, auth, googleProvider, signInWithPopup, signOut };
