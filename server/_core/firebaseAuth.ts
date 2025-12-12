import type { Express, Request, Response } from "express";
import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import { getSessionCookieOptions } from "./cookies";
import { sdk } from "./sdk";
import { adminAuth } from "./firebaseAdmin";
import type { DecodedIdToken } from "firebase-admin/auth";
import * as db from "../db-firestore";

async function syncFirebaseUser(decoded: DecodedIdToken) {
  await db.upsertUser({
    openId: decoded.uid,
    name: decoded.name || null,
    email: decoded.email ?? null,
    loginMethod: "firebase",
    avatarUrl: decoded.picture || null,
    lastSignedIn: new Date(),
  } as any);

  return db.getUserByOpenId(decoded.uid);
}

export async function authenticateFirebaseIdToken(idToken: string) {
  const decoded = await adminAuth().verifyIdToken(idToken, true);
  const user = await syncFirebaseUser(decoded);

  if (!user) {
    throw new Error("Firebase user not found after sync");
  }

  return { decoded, user } as const;
}

export function registerFirebaseAuthRoutes(app: Express) {
  // Exchange Firebase ID token for our session cookie
  app.post("/api/auth/firebase/session", async (req: Request, res: Response) => {
    try {
      const idToken = (req.body?.idToken as string | undefined) ||
        (typeof req.headers.authorization === "string" && req.headers.authorization.startsWith("Bearer ")
          ? req.headers.authorization.slice("Bearer ".length)
          : undefined);

      if (!idToken) {
        res.status(400).json({ error: "idToken is required" });
        return;
      }

      const { user } = await authenticateFirebaseIdToken(idToken);

      // Create our own session cookie so tRPC protected routes work
      const sessionToken = await sdk.createSessionToken(user.openId, {
        name: user.name || "",
        expiresInMs: ONE_YEAR_MS,
      });

      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });
      res.status(200).json({ ok: true });
    } catch (error) {
      console.error("[FirebaseAuth] Session exchange failed", error);
      res.status(401).json({ error: "Invalid Firebase token" });
    }
  });
}
