import { createHash, randomBytes } from "crypto";

// Jetons personnels "mtb_…" : on ne stocke que leur hash SHA-256.
export function generateToken() {
  const token = `mtb_${randomBytes(24).toString("base64url")}`;
  return { token, hash: hashToken(token), prefix: token.slice(0, 8) };
}

export function hashToken(token) {
  return createHash("sha256").update(String(token)).digest("hex");
}
