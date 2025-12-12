import { initializeApp, applicationDefault, cert, getApps, getApp, type App } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

function init(): App {
  if (getApps().length > 0) return getApp();

  const svc = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (svc) {
    try {
      const creds = JSON.parse(svc);
      if (typeof creds.private_key === "string") {
        creds.private_key = creds.private_key.replace(/\\n/g, "\n");
      }
      return initializeApp({ credential: cert(creds as any) });
    } catch (error) {
      console.warn("[Firebase Admin] Failed to parse FIREBASE_SERVICE_ACCOUNT, falling back to applicationDefault", error);
    }
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
  const db = getFirestore(init());
  // Garante ignoreUndefinedProperties no ambiente admin (evita erros ao gravar campos undefined)
  try {
    db.settings({ ignoreUndefinedProperties: true });
  } catch (_) {
    // settings só pode ser chamada antes de qualquer operação; se já foi chamada ignoramos
  }
  return db;
}
