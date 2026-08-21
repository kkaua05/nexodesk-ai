import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Launcher indirection to work around a real Node 24 + native-addon instability on
 * Windows (see README "Known Limitations" / docs/architecture.md): better-sqlite3 and
 * Puppeteer (via whatsapp-web.js) combined with Node 24's V8 cleanup-hook handling
 * crash the process natively and unpredictably. If a pinned Node 22 LTS binary is
 * present at ../../.tools (see scripts/setup-local-node.mjs), re-exec the server with
 * it; otherwise fall back to whatever Node started this script — e.g. on CI/Linux/Mac
 * where this bug doesn't apply.
 */
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const apiRoot = path.resolve(__dirname, "..");
const localNode = path.resolve(apiRoot, "../../.tools/node-v22.19.0-win-x64/node.exe");
const tsxCli = path.resolve(apiRoot, "node_modules/tsx/dist/cli.mjs");

const nodeBin = existsSync(localNode) ? localNode : process.execPath;
if (nodeBin === localNode) {
  console.log(`[run-server] usando Node local fixado (${localNode}) para evitar instabilidade nativa do Node 24 no Windows`);
}

const result = spawnSync(nodeBin, [tsxCli, ...process.argv.slice(2)], { stdio: "inherit", cwd: apiRoot });
process.exit(result.status ?? 1);
