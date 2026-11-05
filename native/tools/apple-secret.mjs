// Makes Supabase's "Secret Key" for Sign in with Apple from the .p8 file, and puts it on the clipboard only.
// Run in your own Terminal:  node tools/apple-secret.mjs ~/Downloads/AuthKey_P88MR54NNH.p8
// It lasts 180 days (Apple's limit is six months): make a new one before then.
import { readFileSync } from "node:fs";
import { createPrivateKey, sign } from "node:crypto";
import { execSync } from "node:child_process";
const file = process.argv[2];
if (!file) { console.error("Give the path to the .p8 file."); process.exit(1); }
const TEAM = "98PW75RXDC", KEY_ID = "P88MR54NNH", CLIENT = "com.sikhworldchampionship.chess.signin";
const b64 = o => Buffer.from(JSON.stringify(o)).toString("base64url");
const now = Math.floor(Date.now() / 1000), exp = now + 180 * 86400;
const data = `${b64({ alg: "ES256", kid: KEY_ID, typ: "JWT" })}.${b64({ iss: TEAM, iat: now, exp, aud: "https://appleid.apple.com", sub: CLIENT })}`;
const sig = sign("sha256", Buffer.from(data), { key: createPrivateKey(readFileSync(file)), dsaEncoding: "ieee-p1363" }).toString("base64url");
execSync("pbcopy", { input: `${data}.${sig}` });
console.log(`Copied to the clipboard. It expires on ${new Date(exp * 1000).toDateString()}: put a reminder in the calendar.`);
