import { onRequest } from "firebase-functions/v2/https";
import { setGlobalOptions } from "firebase-functions/v2/options";
import { createExpressApp } from "../../server/_core/app";

// You can change region later if you want (e.g., southamerica-east1).
setGlobalOptions({ region: "us-central1" });

const app = createExpressApp();

export const backend = onRequest(app);
