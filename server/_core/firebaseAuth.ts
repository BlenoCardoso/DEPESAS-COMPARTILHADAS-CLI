import type { Express, Request, Response } from "express";
import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import { getSessionCookieOptions } from "./cookies";
import { sdk } from "./sdk";
import { adminAuth } from "./firebaseAdmin";

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

      const decoded = await adminAuth().verifyIdToken(idToken, true);

      const openId = decoded.uid;
      const name = decoded.name || "";
      const email = decoded.email || null;
      const picture = decoded.picture || null;

      // Create or update user in our DB
      await (await import("../db-firestore")).upsertUser({
        openId,
        name: name || null,
        email,
        loginMethod: "firebase",
        avatarUrl: picture,
        lastSignedIn: new Date(),
      } as any);

      // Create our own session cookie so tRPC protected routes work
      const sessionToken = await sdk.createSessionToken(openId, {
        name,
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
