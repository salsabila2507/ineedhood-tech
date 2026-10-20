// Usage: node server/set-pass.mjs <password>
// Stores a scrypt hash of the password; the plaintext is never written anywhere.
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const DATA = process.env.DATA_DIR || path.join(ROOT, "data");
const FILE = path.join(DATA, "auth.json");
const pw = String(process.argv[2] || "");

if (pw.length < 4) {
  console.error("usage: node set-pass.mjs <password, min 4 characters>");
  process.exit(1);
}
fs.mkdirSync(DATA, { recursive: true });
const salt = crypto.randomBytes(16).toString("hex");
const hash = crypto.scryptSync(pw, salt, 64).toString("hex");
fs.writeFileSync(FILE, JSON.stringify({ salt, hash, createdAt: new Date().toISOString() }, null, 2) + "\n");
fs.chmodSync(FILE, 0o600);
console.log("password hash saved to " + FILE + " (chmod 600)");
