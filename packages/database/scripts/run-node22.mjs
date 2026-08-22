import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Same rationale as apps/api/scripts/run-server.mjs: better-sqlite3 is rebuilt
 * against the pinned local Node 22 (see `pnpm setup:node22` at the repo root), so
 * anything that opens the database — migrate, seed — must run under that same Node.
 */
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const packageRoot = path.resolve(__dirname, "..");
const localNode = path.resolve(packageRoot, "../../.tools/node-v22.19.0-win-x64/node.exe");
const tsxCli = path.resolve(packageRoot, "node_modules/tsx/dist/cli.mjs");

const nodeBin = existsSync(localNode) ? localNode : process.execPath;

const result = spawnSync(nodeBin, [tsxCli, ...process.argv.slice(2)], { stdio: "inherit", cwd: packageRoot });
process.exit(result.status ?? 1);
