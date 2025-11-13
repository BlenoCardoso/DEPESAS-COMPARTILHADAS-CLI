import { initializeApp, applicationDefault, cert, getApps, getApp, type App } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

function init(): App {
  if (getApps().length > 0) return getApp();

  const svc = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (svc) {
    const creds = JSON.parse(svc);
    return initializeApp({ credential: cert(creds as any) });
  }

  return initializeApp({ credential: applicationDefault() });
}

export function adminApp() {
  return init();
}

export function adminAuth() {
  return getAuth(init());
}

export function adminDb() {
  return getFirestore(init());
}
