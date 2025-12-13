import "dotenv/config";
import express from "express";
import { createServer as createHttpServer } from "http";
import { createServer as createHttpsServer } from "https";
import net from "net";
import os from "os";
import fs from "node:fs";
import { serveStatic, setupVite } from "./vite";
import { createExpressApp } from "./app";

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function startServer() {
  const app = createExpressApp();
  const useHttps = process.env.DEV_HTTPS === "true" || process.env.NODE_ENV === "production";

  const server = (() => {
    if (useHttps) {
      const pfxPath = process.env.DEV_SSL_PFX;
      const keyPath = process.env.DEV_SSL_KEY;
      const certPath = process.env.DEV_SSL_CERT;
      try {
        if (pfxPath && fs.existsSync(pfxPath)) {
          const passphrase = process.env.DEV_SSL_PASSPHRASE || undefined;
          return createHttpsServer({ pfx: fs.readFileSync(pfxPath), passphrase }, app);
        }
        if (keyPath && certPath && fs.existsSync(keyPath) && fs.existsSync(certPath)) {
          return createHttpsServer({ key: fs.readFileSync(keyPath), cert: fs.readFileSync(certPath) }, app);
        }
        console.warn("[Dev HTTPS] Certificado não encontrado. Caindo para HTTP. Configure DEV_SSL_PFX ou DEV_SSL_KEY/DEV_SSL_CERT.");
        return createHttpServer(app);
      } catch (e) {
        console.warn("[Dev HTTPS] Falha ao carregar certificado:", e);
        return createHttpServer(app);
      }
    }
    return createHttpServer(app);
  })();
  // development mode uses Vite, production mode uses static files
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  server.listen(port, "0.0.0.0", () => {
    const proto = useHttps ? "https" : "http";
    console.log(`Server running on ${proto}://localhost:${port}/`);
    const nets = os.networkInterfaces();
    const lanIps = Object.values(nets)
      .flatMap(ifaces => ifaces ?? [])
      .filter(iface => iface && iface.family === "IPv4" && !iface.internal)
      .map(iface => iface!.address);
    if (lanIps.length) {
      console.log(`LAN access:`);
      for (const ip of lanIps) {
        console.log(`  -> ${proto}://${ip}:${port}/`);
      }
    }
  });
}

startServer().catch(console.error);
