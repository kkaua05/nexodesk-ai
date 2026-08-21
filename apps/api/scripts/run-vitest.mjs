import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Same rationale as run-server.mjs: better-sqlite3 is rebuilt against the pinned
 * local Node 22 (see pnpm setup:node22), so tests must run under that same Node —
 * otherwise the native addon's ABI won't match whatever Node ran `pnpm test`.
 */
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const apiRoot = path.resolve(__dirname, "..");
const localNode = path.resolve(apiRoot, "../../.tools/node-v22.19.0-win-x64/node.exe");
const vitestCli = path.resolve(apiRoot, "node_modules/vitest/vitest.mjs");

const nodeBin = existsSync(localNode) ? localNode : process.execPath;

const result = spawnSync(nodeBin, [vitestCli, ...process.argv.slice(2)], { stdio: "inherit", cwd: apiRoot });
process.exit(result.status ?? 1);
