import { createHash, randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scryptAsync = promisify(scrypt);

export async function hashPassword(password, salt = randomBytes(16).toString("base64url")) {
  const derived = await scryptAsync(password, salt, 64);
  return { hash: Buffer.from(derived).toString("base64url"), salt };
}

export async function verifyPassword(password, salt, expectedHash) {
  const derived = Buffer.from(await scryptAsync(password, salt, 64));
  const expected = Buffer.from(String(expectedHash || ""), "base64url");
  return derived.length === expected.length && timingSafeEqual(derived, expected);
}

export function hashRegistrationCode(code) {
  return createHash("sha256").update(String(code || "").trim()).digest("hex");
}

export function hashAuthAttemptKey(action, ip, username) {
  return createHash("sha256")
    .update(`${action}\u0000${ip}\u0000${username}`)
    .digest("hex");
}
