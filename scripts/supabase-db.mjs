// Runs a Supabase CLI database command against DIRECT_URL from .env.local,
// so there's no need to `supabase link` or paste the connection string.
//
//   npm run db:push                 apply migrations not yet applied
//   npm run db:push -- --dry-run    list what would be applied
//   npm run db:repair -- 0014       mark a migration as already applied
//
// Loaded via `node --env-file=.env.local` (see package.json).
import { spawnSync } from "node:child_process";

const url = process.env.DIRECT_URL;
if (!url) {
  console.error("DIRECT_URL is missing from .env.local");
  process.exit(1);
}

const [command, ...args] = process.argv.slice(2);
const cli = {
  push: ["db", "push", "--db-url", url],
  repair: ["migration", "repair", "--db-url", url, "--status", "applied"],
}[command];
if (!cli) {
  console.error("Usage: node scripts/supabase-db.mjs <push|repair> [...args]");
  process.exit(1);
}

// shell: true is needed to run npx on Windows; quote anything the shell might mangle.
const quote = (a) => (/^[\w.:/=-]+$/.test(a) ? a : `"${a.replace(/"/g, '\\"')}"`);
const result = spawnSync("npx", ["supabase", ...cli, ...args].map(quote), { stdio: "inherit", shell: true });
process.exit(result.status ?? 1);
