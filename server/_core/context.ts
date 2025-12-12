import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User } from "../db-firestore";
import { sdk } from "./sdk";
import { authenticateFirebaseIdToken } from "./firebaseAuth";

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: User | null;
};

export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  let user: User | null = null;

  try {
    user = await sdk.authenticateRequest(opts.req);
  } catch (error) {
    // Authentication is optional for public procedures.
    user = null;
  }

  if (!user) {
    const authHeader = opts.req.headers.authorization;
    const bearerToken = typeof authHeader === "string" && authHeader.startsWith("Bearer ")
      ? authHeader.slice("Bearer ".length).trim()
      : null;

    if (bearerToken) {
      try {
        const result = await authenticateFirebaseIdToken(bearerToken);
        user = result.user;
      } catch (firebaseError) {
        console.warn("[Auth] Firebase bearer verification failed", firebaseError);
      }
    }
  }

  return {
    req: opts.req,
    res: opts.res,
    user,
  };
}
