import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
export async function boot(root, files) {
  const db = new PGlite();
  await db.exec(`
    create role anon; create role authenticated; create role service_role;
    create schema auth;
    create table auth.users (id uuid primary key default gen_random_uuid(), email text);
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.uid', true), '')::uuid $$;
    create function auth.jwt() returns jsonb language sql stable as $$ select jsonb_build_object('email', current_setting('request.email', true)) $$;
    create publication supabase_realtime;
  `);
  for (const f of files) {
    try { await db.exec(readFileSync(`${root}/supabase/${f}`, "utf8")); console.log("loaded", f); }
    catch (e) { console.log("FAILED", f, String(e.message).slice(0,300)); process.exit(1); }
  }
  return db;
}
export const ALL = ["schema.sql","classes.sql","online.sql","online_adults.sql","magical_online.sql","simul.sql","community.sql","battles.sql","class_approval.sql","online_ratings.sql","online_matching.sql"];
