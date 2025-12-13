import { build } from "esbuild";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const repoRoot = path.resolve(__dirname, "..",);

await build({
  entryPoints: [path.join(repoRoot, "functions", "src", "index.ts")],
  outfile: path.join(repoRoot, "functions", "lib", "index.cjs"),
  bundle: true,
  platform: "node",
  target: "node20",
  format: "cjs",
  sourcemap: true,
  logLevel: "info",
  external: ["firebase-admin", "firebase-functions"],
});
