import cors from "cors";
import express from "express";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { registerFirebaseAuthRoutes } from "./firebaseAuth";
import { appRouter } from "../routers";
import { createContext } from "./context";

export function createExpressApp() {
  const app = express();

  // Reflect request origin by default so Capacitor / mobile builds can call the API.
  // Optional env locks this down in production.
  const allowedOrigins = (process.env.CORS_ALLOWED_ORIGINS ?? "")
    .split(",")
    .map(origin => origin.trim())
    .filter(Boolean);

  const corsMiddleware = cors({
    origin: allowedOrigins.length === 0 ? true : allowedOrigins,
    credentials: true,
  });

  app.use(corsMiddleware);
  app.options("*", corsMiddleware);

  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));

  // OAuth callback under /api/oauth/callback
  registerOAuthRoutes(app);

  // Firebase auth exchange endpoint (optional)
  registerFirebaseAuthRoutes(app);

  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );

  return app;
}
