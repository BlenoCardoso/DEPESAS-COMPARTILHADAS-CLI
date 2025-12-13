import { trpc } from "@/lib/trpc";
import { auth } from "@/lib/firebase";
import { UNAUTHED_ERR_MSG } from '@shared/const';
import { Capacitor } from "@capacitor/core";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { httpBatchLink, TRPCClientError } from "@trpc/client";
import { createRoot } from "react-dom/client";
import superjson from "superjson";
import App from "./App";
import { getLoginUrl, isUsingFirebase } from "./const";
import "./index.css";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 10 * 60_000,
      refetchOnWindowFocus: false,
      retry: 1,
    },
    mutations: {
      retry: 0,
    },
  },
});

const sanitizeBaseUrl = (url?: string | null) =>
  typeof url === "string" && url.length > 0 ? url.replace(/\/+$/, "") : "";

const isNativeRuntime = Capacitor?.isNativePlatform?.() ?? false;

if (isNativeRuntime && typeof document !== "undefined") {
  document.documentElement.classList.add("native");
}

const apiBaseUrl = (() => {
  const fromEnv = sanitizeBaseUrl(import.meta.env.VITE_API_URL ?? null);
  if (fromEnv) {
    return fromEnv;
  }
  return "";
})();

if (!apiBaseUrl && isNativeRuntime) {
  console.warn(
    "[tRPC] Native platform detected without VITE_API_URL. Configure this env var so the app can reach the backend when running outside the browser."
  );
}

const trpcEndpoint = apiBaseUrl ? `${apiBaseUrl}/api/trpc` : "/api/trpc";

const redirectToLoginIfUnauthorized = (error: unknown) => {
  if (!(error instanceof TRPCClientError)) return;
  if (typeof window === "undefined") return;

  const isUnauthorized = error.message === UNAUTHED_ERR_MSG;

  if (!isUnauthorized) return;

  if (isUsingFirebase()) {
    console.warn("[Auth] Skipping redirect because Firebase handles login flow");
    return;
  }

  window.location.href = getLoginUrl();
};

queryClient.getQueryCache().subscribe(event => {
  if (event.type === "updated" && event.action.type === "error") {
    const error = event.query.state.error;
    redirectToLoginIfUnauthorized(error);
    console.error("[API Query Error]", error);
  }
});

queryClient.getMutationCache().subscribe(event => {
  if (event.type === "updated" && event.action.type === "error") {
    const error = event.mutation.state.error;
    redirectToLoginIfUnauthorized(error);
    console.error("[API Mutation Error]", error);
  }
});

const trpcClient = trpc.createClient({
  links: [
    httpBatchLink({
      url: trpcEndpoint,
      transformer: superjson,
      async fetch(input, init) {
        const headers = new Headers(init?.headers ?? {});

        if (isUsingFirebase()) {
          try {
            const currentUser = auth.currentUser;
            if (currentUser) {
              const idToken = await currentUser.getIdToken();
              if (idToken) {
                headers.set("Authorization", `Bearer ${idToken}`);
              }
            }
          } catch (tokenError) {
            console.warn("[tRPC] Failed to attach Firebase token", tokenError);
          }
        }

        let response: Response;
        try {
          response = await globalThis.fetch(input, {
            ...(init ?? {}),
            headers,
            credentials: "include",
          });
        } catch (networkError) {
          throw new Error(
            isNativeRuntime
              ? "Sem conexão com o servidor. Para o APK funcionar sem o PC ligado, publique o backend (tRPC) em um servidor/cloud e configure VITE_API_URL com a URL HTTPS."
              : "Falha de rede ao chamar a API."
          );
        }

        // Se a API responder HTML/texto (ex: 404/500/proxy), isso vira erro de JSON no cliente.
        const contentType = response.headers.get("content-type") ?? "";
        if (!response.ok) {
          const text = await response.text().catch(() => "");
          throw new Error(
            `Erro da API (${response.status}). ${text ? text.slice(0, 180) : "Resposta vazia"}`
          );
        }

        if (!contentType.includes("application/json")) {
          const text = await response.text().catch(() => "");
          throw new Error(
            `Resposta inesperada da API (não-JSON). Verifique VITE_API_URL. ${text ? text.slice(0, 180) : ""}`
          );
        }

        return response;
      },
    }),
  ],
});

createRoot(document.getElementById("root")!).render(
  <trpc.Provider client={trpcClient} queryClient={queryClient}>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </trpc.Provider>
);
